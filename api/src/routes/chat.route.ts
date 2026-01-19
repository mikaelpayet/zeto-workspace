// src/routes/openai.ts
import { Router, Request, Response } from "express";
import { OpenAIService } from "../services/openai.service";

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  const { message, files = [], stream } = req.body ?? {};

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Clé API OpenAI non configurée" });
  }
  if (!message) {
    return res.status(400).json({ error: "Le champ 'message' est requis." });
  }

  // ---- Mode STREAM (SSE) demandé par le front ----
  if (stream === true) {
    // Headers SSE
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // @ts-ignore
    res.flushHeaders?.();

    // Keep-alive pour éviter les timeouts proxy
    const keepAlive = setInterval(() => res.write(`: ping\n\n`), 15000);

    try {
      const service = new OpenAIService();

      if (!files || files.length === 0) {
        // === CAS 1 : PAS DE DOCUMENTS -> stream token par token (effet ChatGPT immédiat) ===
        // (Optionnel) petit kick pour couper "thinking" côté front dès le 1er octet
        res.write(`data: ${JSON.stringify({ delta: "" })}\n\n`);

        const iter = await service.chatWithFilesStream({ message, files });

        for await (const chunk of iter) {
          res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      // === CAS 2 : AVEC DOCUMENTS -> on "réfléchit", puis on envoie tout d'un coup ===
      // Ici on N'ENVOIE PAS de kick initial : le front garde l'animation "thinking".
      // On calcule la réponse côté serveur (analyse docs), puis on push le résultat en une fois.
      const finalAnswer = await service.chatWithFiles({ message, files });

      // Une seule salve, puis fin
      res.write(`data: ${JSON.stringify({ delta: finalAnswer || "" })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    } catch (err: any) {
      res.write(
        `data: ${JSON.stringify({
          error: err?.message || "Erreur streaming OpenAI",
        })}\n\n`
      );
      res.end();
    } finally {
      clearInterval(keepAlive);
    }
    return;
  }

  // ---- Mode non-stream (fallback JSON classique) ----
  try {
    const service = new OpenAIService();
    const answer = await service.chatWithFiles({ message, files });
    return res.json({ response: answer });
  } catch (error: any) {
    console.error("Erreur OpenAI:", error);
    if (error?.status === 401) {
      return res.status(401).json({
        error: "Clé API OpenAI invalide. Vérifiez votre configuration.",
      });
    }
    if (error?.status === 400) {
      return res
        .status(400)
        .json({ error: error?.message || "Requête OpenAI invalide" });
    }
    return res
      .status(500)
      .json({ error: "Erreur lors de la communication avec OpenAI" });
  }
});

export default router;
