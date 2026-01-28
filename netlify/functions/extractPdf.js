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
    // 1️⃣ Méthode
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

    // 3️⃣ PDF binaire
    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: "Fichier PDF manquant" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const buffer = Buffer.from(arrayBuffer);

    // 4️⃣ Extraction
    const data = await pdf(buffer);
    const text = (data?.text || "").trim();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Aucun
