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

// ✅ JSON UTF-8 partout (évite les "Ã©")
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

// ✅ Paramètres
const MAX_FILES = 8;
const MAX_CHARS_PER_FILE = 6000;

// ✅ Verrou projectId (souple par défaut)
// - false : si le doc n’a pas de projectId, on le garde (pratique en phase dev)
// - true  : si projectId est fourni et doc.projectId != projectId => rejet strict
const STRICT_PROJECT_LOCK = false;

function clampStr(s, max = MAX_CHARS_PER_FILE) {
  const t = (s ?? "").toString();
  return t.length > max ? t.slice(0, max) : t;
}

function safeTrim(x) {
  return (x ?? "").toString().trim();
}

function extractOutputText(data) {
  // ✅ Réponse "simple"
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  // ✅ Fallback : parcours de data.output[*].content[*]
  if (Array.isArray(data?.output)) {
    const chunks = [];
    for (const item of data.output) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;

      for (const c of content) {
        // Responses API peut renvoyer {type:"output_text", text:"..."}
        if (c?.type === "output_text" && typeof c?.text === "string") {
          chunks.push(c.text);
          continue;
        }
        // Best-effort si jamais c’est sous une autre forme
        if (typeof c?.text === "string") {
          chunks.push(c.text);
        }
      }
    }
    return chunks.join("\n").trim();
  }

  return "";
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
        { status: 500, headers: JSON_HEADERS }
      );
    }

    const body = await req.json().catch(() => null);

    const message = safeTrim(body?.message);
    const projectId = safeTrim(body?.projectId);

    const fileIds = Array.isArray(body?.fileIds)
      ? body.fileIds.map(safeTrim).filter(Boolean)
      : [];

    if (!message) {
      return new Response(JSON.stringify({ error: "Message vide" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    // ✅ Guard clair : on veut du doc-based
    if (!fileIds.length) {
      return new Response(
        JSON.stringify({ error: "fileIds manquant (au moins 1 document requis)" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

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

      // 🔒 Verrou projectId : souple ou strict selon le flag
      if (projectId) {
        if (STRICT_PROJECT_LOCK) {
          // strict : le doc DOIT avoir le même projectId
          if (d.projectId !== projectId) {
            missing.push(`${fileId} (mauvais projectId)`);
            continue;
          }
        } else {
          // souple : si le doc a un projectId différent => rejet ; sinon on accepte
          if (d.projectId && d.projectId !== projectId) {
            missing.push(`${fileId} (mauvais projectId)`);
            continue;
          }
        }
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
          details: {
            receivedProjectId: projectId || null,
            receivedFileIds: fileIds,
            pickedFileIds,
            missing,
          },
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const userContent = `${message}\n\nDocuments sélectionnés:\n${documentsContext}`;

    // ✅ Appel OpenAI (Responses API)
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
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
        { status: 502, headers: JSON_HEADERS }
      );
    }

    const data = await upstream.json();
    const outputText = extractOutputText(data);

    return new Response(
      JSON.stringify({
        response: outputText || "OK",
        used: {
          projectId: projectId || null,
          fileIds: pickedFileIds,
          missing,
        },
        meta: {
          model: "gpt-4.1-mini",
        },
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Erreur inconnue" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
