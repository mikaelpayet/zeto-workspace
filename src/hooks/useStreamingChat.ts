// hooks/useStreamingChat.ts
import { useRef, useState } from "react";

export function useStreamingChat(apiUrl = "/api/chat") {
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  async function send(message: string, files: any[] = []) {
    // reset
    setText("");
    setStreaming(true);
    setThinking(true); // 🔵 affiche les trois points animés “en réflexion”
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, files, stream: true }),
      signal: controllerRef.current.signal,
    });

    if (!res.ok || !res.body) {
      setStreaming(false);
      setThinking(false);
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // stream SSE: décoder ligne par ligne
      const lines = buffer.split("\n");
      // on garde la dernière (peut être incomplète) pour la prochaine boucle
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payloadRaw = line.slice(5).trim();
        if (!payloadRaw) continue;

        let payload: any;
        try {
          payload = JSON.parse(payloadRaw);
        } catch {
          continue;
        }

        if (payload.delta) {
          // 🔵 on a reçu le 1er token → stop “thinking”
          if (thinking) setThinking(false);
          setText((t) => t + payload.delta);
        }
        if (payload.error) {
          setThinking(false);
          setStreaming(false);
          throw new Error(payload.error);
        }
        if (payload.done) {
          setStreaming(false);
        }
      }
    }

    // flush du dernier bout
    if (buffer.trim().startsWith("data:")) {
      try {
        const payload = JSON.parse(buffer.trim().slice(5));
        if (payload?.delta) {
          if (thinking) setThinking(false);
          setText((t) => t + payload.delta);
        }
      } catch {}
    }
    setThinking(false);
    setStreaming(false);
  }

  function abort() {
    controllerRef.current?.abort();
    setThinking(false);
    setStreaming(false);
  }

  return { text, thinking, streaming, send, abort };
}
