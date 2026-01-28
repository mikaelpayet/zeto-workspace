interface ChatRequest {
  message: string;
  projectId?: string;
  fileIds: string[];
}

interface ChatResponse {
  response: string;
  error?: string;
  used?: {
    projectId: string | null;
    fileIds: string[];
    missing: string[];
  };
}

class OpenAIService {
  private readonly apiUrl = "/.netlify/functions/chat";

  async sendMessage(
    message: string,
    fileIds: string[] = [],
    projectId?: string
  ): Promise<string> {
    try {
      const payload: ChatRequest = {
        message,
        fileIds,
        ...(projectId ? { projectId } : {}),
      };

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ChatResponse = await response.json().catch(() => ({
        response: "",
        error: "Réponse serveur non-JSON",
      }));

      if (!response.ok) {
        // on remonte l’erreur côté API si disponible
        throw new Error(data?.error || `Erreur HTTP: ${response.status}`);
      }

      if (data.error) throw new Error(data.error);

      return data.response;
    } catch (error) {
      console.error("Erreur OpenAI Service:", error);
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();
