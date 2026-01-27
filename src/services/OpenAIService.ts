interface FileData {
  name: string;
  type: string;
  content: string;
}

interface ChatRequest {
  message: string;
  files?: FileData[];
}

interface ChatResponse {
  response: string;
  error?: string;
}

class OpenAIService {
  private readonly apiUrl = '/.netlify/functions/chat';

  async sendMessage(message: string, files: FileData[] = []): Promise<string> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          files
        } as ChatRequest)
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data.response;
    } catch (error) {
      console.error('Erreur OpenAI Service:', error);
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();
