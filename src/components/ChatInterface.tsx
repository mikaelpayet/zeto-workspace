import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Upload,
  AlertCircle,
  X,
  FileText,
  File,
  Search,
  Check,
} from "lucide-react";
import { FirebaseServices } from "../services/firebase.service";
import { UploadedFile, Chat, Message } from "../models";
import { limit, orderBy, startAfter, where } from "firebase/firestore";

interface ChatInterfaceProps {
  projectId: string;
  onSetInputMessage?: (setMessage: (message: string) => void) => void;
}

const DOMAIN = import.meta.env[
  import.meta.env.DEV ? "VITE_API_URL_LOCAL" : "VITE_API_URL"
];

export default function ChatInterface({
  projectId,
  onSetInputMessage,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string>("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectFiles, setProjectFiles] = useState<UploadedFile[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<UploadedFile[]>(
    []
  );
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [tempSelectedDocs, setTempSelectedDocs] = useState<UploadedFile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Charger ou créer le chat du projet
  useEffect(() => {
    const loadOrCreateChat = async () => {
      try {
        setIsLoadingHistory(true);

        // Chercher un chat existant pour ce projet avec le bon filtre
        const existingChats = await FirebaseServices.getDocs<Chat>(
          "chats",
          where("projectId", "==", projectId)
        );

        if (existingChats.length > 0) {
          // Chat existant trouvé
          const existingChat = existingChats[0];
          setChatId(existingChat.id);
          setMessages(existingChat.messages || []);
        } else {
          // Créer un nouveau chat
          const newChatId = `chat-${projectId}`;
          const welcomeMessage: Message = {
            id: `msg-${Date.now()}`,
            type: "ai",
            content:
              "Bonjour ! Je suis votre assistant IA pour ce projet. Sélectionnez des documents à analyser et je pourrai répondre à vos questions avec une recherche contextuelle avancée.",
            timestamp: new Date().toISOString(),
          };

          const newChat: Chat = {
            id: newChatId,
            projectId,
            title: `Chat - ${new Date().toLocaleDateString("fr-FR")}`,
            messages: [welcomeMessage],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await FirebaseServices.create("chats", newChat);
          setChatId(newChatId);
          setMessages([welcomeMessage]);
          //console.log("Nouveau chat créé:", newChatId);
        }
      } catch (error) {
        console.error("Erreur lors du chargement/création du chat:", error);
        // Message de fallback en cas d'erreur
        const fallbackMessage: Message = {
          id: "fallback",
          type: "ai",
          content: "Bonjour ! Je suis votre assistant IA pour ce projet.",
          timestamp: new Date().toISOString(),
        };
        setMessages([fallbackMessage]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadOrCreateChat();
  }, [projectId]);

  // Charger les fichiers du projet
  useEffect(() => {
    const fetchProjectFiles = async () => {
      try {
        const files = await FirebaseServices.getDocs<UploadedFile>(
          "files",
          where("projectId", "==", projectId)
        );

        setProjectFiles(files);
      } catch (error) {
        console.error("Erreur lors du chargement des fichiers:", error);
      }
    };

    fetchProjectFiles();
  }, [projectId]);

  // Exposer setInputMessage au parent
  useEffect(() => {
    if (onSetInputMessage) {
      onSetInputMessage(setInputMessage);
    }
  }, [onSetInputMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const hasFiles = selectedDocuments.length > 0;
    if (hasFiles) setIsSearching(true);

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    // message IA "thinking" qui sera remplacé en streaming
    const loadingId = `loading-${Date.now()}`;
    const loadingMessage: Message = {
      id: loadingId,
      type: "ai",
      content: hasFiles
        ? "Analyse des documents sélectionnés..."
        : "En train de réfléchir...",
      timestamp: new Date().toISOString(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError(null);

    // on scrolle dès qu’on ajoute
    requestAnimationFrame(() =>
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    );

    try {
      const processedFiles = selectedDocuments.map((file) => ({
        name: file.name,
        type: file.type,
        id: file.id,
        url: file.url,
      }));

      // --- STREAMING SSE ---
      const res = await fetch(`${DOMAIN}/api/openai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_CENTRAL_API_KEY,
        },
        body: JSON.stringify({
          message: inputMessage,
          files: processedFiles,
          projectId,
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Erreur HTTP: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let gotFirst = false;
      let accumulated = ""; // on garde la version finale pour persistance

      const flushDelta = (delta: string) => {
        accumulated += delta;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  isLoading: false,
                  content: (m.content && gotFirst ? m.content : "") + delta,
                }
              : m
          )
        );
        // auto-scroll
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
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
            if (!gotFirst) {
              // 1er token → on efface le texte de “réflexion” et on commence à écrire
              gotFirst = true;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === loadingId
                    ? { ...m, isLoading: false, content: "" }
                    : m
                )
              );
            }
            flushDelta(payload.delta as string);
          }

          if (payload.error) {
            throw new Error(payload.error);
          }

          if (payload.done) {
            // fin du stream
          }
        }
      }

      // au cas où un dernier “data:” traîne dans buffer
      if (buffer.trim().startsWith("data:")) {
        try {
          const payload = JSON.parse(buffer.trim().slice(5));
          if (payload?.delta) {
            if (!gotFirst) {
              gotFirst = true;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === loadingId
                    ? { ...m, isLoading: false, content: "" }
                    : m
                )
              );
            }
            flushDelta(payload.delta as string);
          }
        } catch {}
      }

      // Persistance Firestore : remplace le loader par le message final
      if (chatId) {
        const aiMessageFinal: Message = {
          id: `msg-${Date.now()}-ai`,
          type: "ai",
          content: accumulated || "Réponse vide.",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === loadingId ? aiMessageFinal : m))
        );

        const updatedMessages = messages
          .filter((m) => m.id !== loadingId)
          .concat([userMessage, aiMessageFinal]);

        await FirebaseServices.update("chats", chatId, {
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // pas de chatId ? on remplace juste visuellement
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { ...m, isLoading: false, content: accumulated }
              : m
          )
        );
      }
    } catch (e: any) {
      const errorMessage = e?.message || "Erreur inconnue";
      setError(errorMessage);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, content: `Erreur: ${errorMessage}`, isLoading: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const getFileIcon = (type: string) =>
    type.includes("text") || type.includes("pdf") ? FileText : File;

  const handleDocumentSelection = () => {
    setTempSelectedDocs([...selectedDocuments]);
    setShowDocumentSelector(true);
  };

  const handleDocumentToggle = (doc: UploadedFile) => {
    setTempSelectedDocs((prev) => {
      const isSelected = prev.some((d) => d.id === doc.id);
      if (isSelected) {
        return prev.filter((d) => d.id !== doc.id);
      } else {
        return [...prev, doc];
      }
    });
  };

  const handleValidateSelection = () => {
    setSelectedDocuments(tempSelectedDocs);
    setShowDocumentSelector(false);
  };

  const handleCancelSelection = () => {
    setTempSelectedDocs([]);
    setShowDocumentSelector(false);
  };

  const removeSelectedDocument = (docId: string) => {
    setSelectedDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  useEffect(() => {
    const fetchInitialFiles = async () => {
      try {
        const queryConditions = [
          where("projectId", "==", projectId),
          orderBy("createdAt", "desc"),
          limit(20),
        ];

        const { docs, lastVisible } =
          await FirebaseServices.getDocsPaginated<UploadedFile>(
            "files",
            queryConditions
          );

        setProjectFiles(docs);
        setLastDoc(lastVisible);
        setHasMore(docs.length === 20);
      } catch (error) {
        console.error("Erreur chargement fichiers:", error);
      }
    };

    fetchInitialFiles();
  }, [projectId]);

  return (
    <>
      <div
        className="bg-white rounded-lg border border-gray-200 flex flex-col"
        style={{ height: "calc(100vh - 300px)" }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-semibold text-gray-900">Chat IA</h3>
            {isSearching && (
              <div className="ml-3 flex items-center text-blue-600 text-sm">
                <Search className="w-4 h-4 mr-1 animate-spin" />
                <span>Analyse en cours...</span>
              </div>
            )}
          </div>
          {error && (
            <div className="flex items-center text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span>Erreur de connexion</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingHistory ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-500">
                Chargement de l'historique...
              </span>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="flex items-start space-x-3 max-w-xs lg:max-w-md">
                    {message.type === "ai" && (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-medium">
                          IA
                        </span>
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 ${
                        message.type === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      } ${message.isLoading ? "animate-pulse" : ""}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <span
                        className={`text-xs mt-1 block ${
                          message.type === "user"
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString(
                          "fr-FR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                    {message.type === "user" && (
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-medium">
                          U
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Zone d'entrée */}
        <div className="p-4 border-t border-gray-200">
          {/* Document Selection */}
          {selectedDocuments.length > 0 && (
            <div className="mb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Documents sélectionnés:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDocuments.map((doc) => {
                    const IconComponent = getFileIcon(doc.type);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 text-sm"
                      >
                        <IconComponent className="w-4 h-4 mr-2 text-blue-600" />
                        <span className="text-blue-800 truncate max-w-32">
                          {doc.name}
                        </span>
                        <button
                          onClick={() => removeSelectedDocument(doc.id)}
                          className="ml-2 text-blue-400 hover:text-red-500 transition-colors"
                          title="Retirer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {selectedDocuments.length > 0 && (
            <div className="flex space-x-2 mb-4">
              {/* Quick Actions */}
              <button
                onClick={() =>
                  setInputMessage("Fais un résumé des documents sélectionnés")
                }
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
              >
                Résumé
              </button>
              <button
                onClick={() =>
                  setInputMessage(
                    "Identifie et synthétise les points clés des documents"
                  )
                }
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
              >
                Synthèse points clés
              </button>
              <button
                onClick={() =>
                  setInputMessage(
                    "Vérifie la cohérence entre les différents documents"
                  )
                }
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
              >
                Vérifier cohérence
              </button>
              <button
                onClick={() =>
                  setInputMessage(
                    "Propose des améliorations basées sur l'analyse des documents"
                  )
                }
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
              >
                Proposer
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSendMessage()
              }
              placeholder="Écrire un message…"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            {/* Bouton analyse document (icône seule avec badge) */}
            <button
              onClick={handleDocumentSelection}
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
              title="Analyser un document"
            >
              <FileText className="w-5 h-5 text-gray-600" />

              {/* 🔹 Badge nombre de documents sélectionnés */}
              {selectedDocuments.length > 0 && (
                <span className="flex justify-center absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-semibold rounded-full w-4 h-4 p-0.5 items-center shadow">
                  {selectedDocuments.length > 9
                    ? "9+"
                    : selectedDocuments.length}
                </span>
              )}
            </button>

            {/* Bouton envoyer */}
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition"
              title="Envoyer"
            >
              <Send className="w-4 h-4 mr-1" />
              Envoyer
            </button>
          </div>
        </div>

        {/* Document Selection Modal */}
        {showDocumentSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
              <h2 className="text-xl font-bold mb-4">
                Sélectionner les documents
              </h2>

              {/* 🔹 Liste scrollable */}
              <div className="flex-1 overflow-y-auto mb-4">
                {projectFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">
                      Aucun document disponible
                    </p>
                    <p className="text-sm text-gray-400">
                      Vous pouvez uploader un document ci-dessous.
                    </p>
                  </div>
                ) : (
                  <div
                    className="space-y-2 overflow-y-auto"
                    style={{ maxHeight: "60vh" }}
                    onScroll={async (e) => {
                      const target = e.currentTarget;
                      const bottom =
                        target.scrollHeight - target.scrollTop <=
                        target.clientHeight + 100;

                      if (bottom && hasMore && !isLoadingMore) {
                        setIsLoadingMore(true);
                        try {
                          const queryConditions = [
                            where("projectId", "==", projectId),
                            orderBy("uploadedAt", "desc"),
                            startAfter(lastDoc),
                            limit(20),
                          ];

                          const { docs, lastVisible } =
                            await FirebaseServices.getDocsPaginated<UploadedFile>(
                              "files",
                              queryConditions
                            );

                          setProjectFiles((prev) => [...prev, ...docs]);
                          setLastDoc(lastVisible);
                          setHasMore(docs.length === 20);
                        } catch (error) {
                          console.error("Erreur pagination fichiers:", error);
                        } finally {
                          setIsLoadingMore(false);
                        }
                      }
                    }}
                  >
                    {projectFiles.map((file) => {
                      const IconComponent = getFileIcon(file.type);
                      const isSelected = tempSelectedDocs.some(
                        (d) => d.id === file.id
                      );

                      return (
                        <div
                          key={file.id}
                          onClick={() => handleDocumentToggle(file)}
                          className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 border-2 border-blue-200"
                              : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                              isSelected
                                ? "bg-blue-600 border-blue-600"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <IconComponent className="w-5 h-5 mr-3 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {isLoadingMore && (
                      <div className="py-4 text-center text-gray-500 text-sm">
                        Chargement...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 🔹 Zone d’upload + barre de progression */}
              <div className="border-t border-gray-200 pt-4 mt-auto">
                <div className="flex items-center justify-between mb-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition text-sm">
                    <Upload className="w-4 h-4" />
                    Uploader un document
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.txt,.doc,.docx,.json,.csv,.png,.jpg,.jpeg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setUploading(true);
                          setUploadProgress(0);

                          const result = await FirebaseServices.upload({
                            file,
                            destDir: `uploads/${projectId}`,
                            onProgress: (p) =>
                              setUploadProgress(Number(p.toFixed(1))),
                          });

                          const newFile: UploadedFile = {
                            id: Date.now().toString(),
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            uploadedAt: new Date().toISOString(),
                            url: result.downloadURL,
                            projectId,
                          };

                          await FirebaseServices.create("files", newFile);
                          setProjectFiles((prev) => [...prev, newFile]);
                        } catch (error) {
                          console.error("Erreur upload:", error);
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                  </label>

                  {uploading && (
                    <p className="text-sm text-gray-500">{uploadProgress}%</p>
                  )}
                </div>

                {uploading && (
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-4">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}

                {/* 🔹 Boutons d’action */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={handleCancelSelection}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleValidateSelection}
                    disabled={tempSelectedDocs.length === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    Valider ({tempSelectedDocs.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
