// src/services/openai.service.ts
import OpenAI from "openai";
import { UploadedFile } from "../models";

export interface ChatWithFilesInput {
  message: string;
  files?: UploadedFile[];
  systemText?: string;
  model?: string;
  /** timeout total pour l'indexation d'un fichier uploadé chez OpenAI (non utilisé ici) */
  fileIndexTimeoutMs?: number;
  /** polling interval pour l'indexation (non utilisé ici) */
  fileIndexPollMs?: number;
}

export class OpenAIService {
  private client: OpenAI;
  private defaultModel: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const apiKey = opts?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY manquante.");
    }
    this.client = new OpenAI({ apiKey });
    // ⚠️ “gpt-5” n’est pas garanti. On met un fallback safe pour le stream.
    this.defaultModel = opts?.model || "gpt-4o-mini";
  }

  /**
   * Réponse non-stream via Responses API (conforme à ton implémentation initiale).
   * Injecte systemText + fichiers (en tant que `input_file` avec file_url).
   */
  async chatWithFiles(input: ChatWithFilesInput): Promise<string> {
    const {
      message,
      files = [],
      systemText = defaultSystemPrompt,
      model = this.defaultModel,
    } = input;

    if (!message || typeof message !== "string") {
      throw new Error("Paramètre 'message' requis (string).");
    }

    // Construire les content parts pour Responses API
    const contentParts: any[] = [{ type: "input_text", text: systemText }];

    // Ajouter les fichiers (URLs)
    for (const f of files) {
      if (f?.url) {
        contentParts.push({
          type: "input_file",
          file_url: f.url,
        });
      }
    }

    // Ajouter la question de l'utilisateur
    contentParts.push({ type: "input_text", text: message });

    const resp = await this.client.responses.create({
      model,
      input: [
        {
          role: "user",
          content: contentParts,
        },
      ],
    });

    // Selon la version du SDK, `output_text` est soit dispo, soit il faut reconstruire.
    // Ici, on garde output_text qui concat les morceaux.
    // @ts-ignore - certaines defs n’exposent pas output_text
    return (resp as any).output_text ?? "";
  }

  /**
   * Réponse STREAM — retourne un AsyncIterable<string> de “delta” (tokens).
   * Implémenté via Chat Completions pour un streaming simple et robuste.
   */
  async chatWithFilesStream(
    input: ChatWithFilesInput
  ): Promise<AsyncIterable<string>> {
    const {
      message,
      files = [],
      systemText = defaultSystemPrompt,
      model = this.defaultModel || "gpt-4o-mini",
    } = input;

    if (!message || typeof message !== "string") {
      throw new Error("Paramètre 'message' requis (string).");
    }

    // On inclut juste une courte liste des fichiers pour le contexte textuel
    const fileLines = files
      .filter((f) => !!f?.url)
      .map((f) => `- ${f.name ?? "document"}: ${f.url}`)
      .join("\n");

    const userContent =
      fileLines.length > 0
        ? `Documents fournis (URLs):\n${fileLines}\n\nQuestion:\n${message}`
        : message;

    // Démarrage du stream
    const stream = await this.client.chat.completions.create({
      model, // ex: "gpt-4o-mini"
      stream: true,
      messages: [
        { role: "system", content: systemText },
        { role: "user", content: userContent },
      ],
    });

    // On retourne un AsyncIterable<string>
    async function* iterator() {
      for await (const part of stream) {
        const delta = part.choices?.[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    }
    return iterator();
  }
}

// Prompt système corrigé (orthographe + consignes claires)
const defaultSystemPrompt =
  "Tu es un assistant IA expert en analyse de documents. " +
  "Si des fichiers sont fournis, utilise leur contenu (ou les informations disponibles) pour répondre au mieux. " +
  "Cite le nom du fichier (et la page/section si possible). " +
  "Si l'information n'est pas présente ou insuffisante, dis-le clairement et propose une démarche pour la trouver.";
