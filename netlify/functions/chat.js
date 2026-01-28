// netlify/functions/chat.js
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

function clampStr(s, max = 6000) {
  const t = (s ?? "").toString();
  return t.length > max ? t.slice(0, max) : t;
}

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY manquante sur Netlify" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => null);
    const message = body?.message?.toString?.().trim?.() ?? "";
    const projectId = (body?.projectId || "").toString().trim();
    const fileIds = Array.isArray(body?.fileIds)
      ? body.fileIds.map((x) => (x ?? "").toString().trim()).filter(Boolean)
      : [];

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message vide" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ Garde-fous
    const MAX_FILES = 8;
    const MAX_CHARS_PER_FILE = 6000;

    const pickedFileIds = fileIds.slice(0, MAX_FILES);

    // ✅ Charger uniquement les docs sélectionnés depuis `files`
    let documentsContext = "";
    const missing = [];

    for (const fileId of pickedFileIds) {
      const snap = await db.collection("files").doc(fileId).get();
      if (!snap.exists) {
        missing.push(fileId);
        continue;
      }

      const d = snap.data() || {};
      // Optionnel : verrou "projectId" si tu veux éviter de mixer des projets
      if (projectId && d.projectId && d.projectId !== projectId) {
        // On le met en "missing" pour être safe (évite fuite inter-projets)
        missing.push(`${fileId} (mauvais projectId)`);
        continue;
      }

      const name = d.name || d.fileName || fileId;
      const extracted = d.extractedText || "";

      if (!extracted) {
        missing.push(`${fileId} (extractedText vide)`);
        continue;
      }

      documentsContext += `\n--- DOCUMENT: ${name} | fileId=${fileId} ---\n${clampStr(
        extracted,
        MAX_CHARS_PER_FILE
      )}\n`;
    }

    if (!documentsContext) {
      return new Response(
        JSON.stringify({
          error:
            "Aucun document exploitable. Vérifie que fileIds est bien envoyé et que files/{fileId}.extractedText existe.",
          details: { receivedProjectId: projectId || null, receivedFileIds: fileIds, missing },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userContent = `${message}\n\nDocuments sélectionnés:\n${documentsContext}`;

    // ✅ Appel OpenAI (Responses API)
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "Tu es un assistant IA pour ZÉTO Workspace. Réponds en français, clairement, de façon utile et structurée. N'invente pas : base-toi uniquement sur les documents fournis. Si l'info n'est pas dans les documents, dis-le.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error ${upstream.status}: ${errText}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await upstream.json();

    // Extraction texte (best-effort)
    let outputText = "";
    if (typeof data.output_text === "string") outputText = data.output_text;

    if (!outputText && Array.isArray(data.output)) {
      const chunks = [];
      for (const item of data.output) {
        if (item?.content) {
          for (const c of item.content) {
            if (c?.type === "output_text" && c?.text) chunks.push(c.text);
          }
        }
      }
      outputText = chunks.join("\n").trim();
    }

    return new Response(
      JSON.stringify({
        response: outputText || "OK",
        used: {
          projectId: projectId || null,
          fileIds: pickedFileIds,
          missing,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || "Erreur inconnue" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
