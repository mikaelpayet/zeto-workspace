import pdf from "pdf-parse";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Reçoit un PDF en binaire (ArrayBuffer)
    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: "Fichier PDF manquant" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const buffer = Buffer.from(arrayBuffer);

    const data = await pdf(buffer);
    const text = (data?.text || "").trim();

    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || "Erreur extraction PDF" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
