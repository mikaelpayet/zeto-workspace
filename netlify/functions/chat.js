// netlify/functions/chat.js
export default async (req, context) => {
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
    const files = Array.isArray(body?.files) ? body.files : [];

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message vide" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Contexte fichiers (simple, sans faire exploser le payload)
    const filesContext = files
      .slice(0, 5)
      .map((f, i) => {
        const name = f?.name ?? `file_${i + 1}`;
        const type = f?.type ?? "unknown";
        const content = (f?.content ?? "").toString();
        return `--- Fichier ${i + 1}: ${name} (${type}) ---\n${content.slice(0, 6000)}`;
      })
      .join("\n\n");

    const userContent = filesContext
      ? `${message}\n\nContexte fichiers:\n${filesContext}`
      : message;

    // Appel OpenAI (Responses API)
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "Tu es un assistant IA pour ZÉTO Workspace. Réponds en français, clairement, de façon utile et structurée.",
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
      // fallback si structure différente
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
      JSON.stringify({ response: outputText || "OK" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || "Erreur inconnue" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
