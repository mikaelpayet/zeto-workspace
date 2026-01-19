import * as admin from "firebase-admin";

export default function setFirebaseConfig() {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.PROJECT_ID,
          clientEmail: process.env.CLIENT_EMAIL,
          privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.DATABASE_URL,
        storageBucket: process.env.STORAGE_BUCKET,
      });
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);

    if (!admin.apps.length) {
      admin.initializeApp();
    }
  }
}
