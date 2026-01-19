// src/config/firebase-admin.ts
import "dotenv/config";
import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

export function initFirebaseAdmin() {
  if (app) return app;

  // Recompose le JSON service account depuis l'env
  const privateKey = process.env.PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!privateKey) {
    throw new Error("PRIVATE_KEY manquant dans l'environnement");
  }

  const clientEmail = process.env.CLIENT_EMAIL;
  const projectId = process.env.PROJECT_ID;
  const storageBucket = process.env.STORAGE_BUCKET;
  const databaseURL = process.env.DATABASE_URL; // optionnel (RTDB)

  if (!clientEmail || !projectId || !storageBucket) {
    throw new Error(
      "Variables Firebase manquantes (clientEmail/projectId/storageBucket)."
    );
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
    databaseURL, // utile si tu utilises la RTDB
  });

  return app;
}
