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

export default async (req) => {
  try {
    const url = new URL(req.url);
const projectId = (url.searchParams.get("projectId") || "default").trim();
const fileName = (url.searchParams.get("fileName") || "upload.pdf").trim();
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
    const docRef = await db
  .collection("projects")
  .doc(projectId)
  .collection("documents")
  .add({
    fileName,
    text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

const docId = docRef.id;

    return new Response(
      JSON.stringify({ docId, text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || "Erreur extraction PDF" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
