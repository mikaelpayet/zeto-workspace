// netlify/functions/extractPdf.js
import pdf from "pdf-parse";
import admin from "firebase-admin";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT missing");
  return JSON.parse(raw);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  });
}

const db = admin.firestore();

// ✅ JSON UTF-8 partout
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function safeTrim(x) {
  return (x ?? "").toString().trim();
}

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // fileId + fileName + projectId via query string
    const url = new URL(req.url);
    const fileId = safeTrim(url.searchParams.get("fileId"));
    const fileName = safeTrim(url.searchParams.get("fileName")) || "upload.pdf";
    const projectId = safeTrim(url.searchParams.get("projectId")); // optionnel

    if (!fileId) {
      return new Response(JSON.stringify({ error: "fileId manquant dans l'URL" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    // ✅ Support PDF binaire brut (application/pdf) : body = bytes
    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ error: "Fichier PDF manquant" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const buffer = Buffer.from(arrayBuffer);

    // ✅ Extraction PDF
    const data = await pdf(buffer);
    const text = (data?.text || "").trim();

    if (!text) {
      return new Response(JSON.stringify({ error: "Aucun texte extrait du PDF" }), {
        status: 422,
        headers: JSON_HEADERS,
      });
    }

    const ref = db.collection("files").doc(fileId);

    // ✅ UPSERT : crée ou met à jour sans planter en NOT_FOUND
    await ref.set(
      {
        fileName,
        // Champ standard (optionnel mais utile)
        name: fileName,

        // Project lock (si fourni)
        ...(projectId ? { projectId } : {}),

        // Extraction
        extractedText: text,
        extractedAt: admin.firestore.FieldValue.serverTimestamp(),

        // Métadonnées utiles
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return new Response(
      JSON.stringify({
        fileId,
        extracted: true,
        textPreview: text.slice(0, 200),
        meta: { fileName, projectId: projectId || null },
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Erreur extraction PDF" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
