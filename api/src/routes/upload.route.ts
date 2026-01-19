// src/routes/upload.ts
import { Router } from "express";

import { FirebaseService } from "../services/firebase.service";

const router = Router();

// POST /upload  (form-data: file)
router.post("/upload", async (req: any, res: any) => {
  const storage = new FirebaseService();

  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });

    const result = await storage.upload({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      destDir: `uploads/${req.body.projectId}`,
      public: false, // passe à true si tu veux une URL publique
    });

    return res.json(result);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
