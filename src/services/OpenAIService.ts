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
    const payload: ChatRequest = {
      message: (message ?? "").toString(),
      fileIds: Array.isArray(fileIds) ? fileIds : [],
      ...(projectId ? { projectId: (projectId ?? "").toString() } : {}),
    };

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data: ChatResponse = await response.json().catch(() => ({
      response: "",
      error: "Réponse serveur non JSON",
    }));

    if (!response.ok) {
      throw new Error(data?.error || `Erreur HTTP: ${response.status}`);
    }

    if (data.error) throw new Error(data.error);

    return data.response;
  }
}

export const openAIService = new OpenAIService();
