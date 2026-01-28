interface SelectedFile {
  id: string;      // Firestore doc id (ex: kOFoINSH7YGC...)
  name?: string;
  type?: string;
  url?: string;
}

interface ChatRequest {
  message: string;
  projectId?: string;
  fileIds: string[];
}

interface ChatResponse {
  response: string;
  used?: {
    projectId: string | null;
    fileIds: string[];
    missing: string[];
  };
  error?: string;
}

class OpenAIService {
  private readonly apiUrl = "/.netlify/functions/chat";

  /**
   * Envoie un message au backend "chat" en mode doc-based:
   * - message
   * - projectId (optionnel mais recommandé)
   * - fileIds (obligatoire)
   */
  async sendMessage(
    message: string,
    selectedFiles: SelectedFile[] = [],
    projectId?: string
  ): Promise<string> {
    const fileIds = (selectedFiles || [])
      .map((f) => (f?.id || "").trim())
      .filter(Boolean);

    // ✅ Guard côté front : évite les 400 inutiles
    if (!fileIds.length) {
      throw new Error("Aucun document sélectionné (fileIds vide).");
    }

    const payload: ChatRequest = {
      message,
      projectId,
      fileIds,
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const data: ChatResponse = await response.json().catch(() => ({
        response: "",
        error: `Réponse non-JSON (HTTP ${response.status})`,
      }));

      if (!response.ok) {
        throw new Error(data?.error || `Erreur HTTP: ${response.status}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data.response;
    } catch (error) {
      console.error("Erreur OpenAI Service:", error);
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();
