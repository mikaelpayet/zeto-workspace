import pdf from "pdf-parse";
import admin from "firebase-admin";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT missing");
  }
  return JSON.parse(raw);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  });
}

const db = admin.firestore();

export default async (req) => {
  try {
    // 1️⃣ Méthode HTTP
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // 2️⃣ Paramètres URL
    const url = new URL(req.url);
    const fileId = (url.searchParams.get("fileId") || "").trim();
    const fileName = (url.searchParams.get("fileName") || "upload.pdf").trim();

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: "fileId manquant dans l'URL" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3️⃣ Récupération du PDF
    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: "Fichier PDF manquant" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const buffer = Buffer.from(arrayBuffer);

    // 4️⃣ Extraction du texte
    const data = await pdf(buffer);
    const text = (data?.text || "").trim();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Aucun texte extrait du PDF" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5️⃣ Écriture Firestore : files/{fileId}
    await db.collection("files").doc(fileId).update({
      fileName,
      extractedText: text,
      extractedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 6️⃣ Réponse OK
    return new Response(
      JSON.stringify({
        fileId,
        extracted: true,
        textPreview: text.slice(0, 200),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e?.message || "Erreur extraction PDF",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
