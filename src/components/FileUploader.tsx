import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  File,
  FileText,
  Image,
  X,
  Download,
  Eye,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { UploadedFile } from "../models";
import { FirebaseServices } from "../services/firebase.service";
import { where } from "firebase/firestore";
import { ActivityService } from "../services/activity.service";
import { useAuth } from "../contexts/AuthContext";

interface FileUploaderProps {
  projectId: string;
}

export default function FileUploader({ projectId }: FileUploaderProps) {
  const { userProfile } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [projectFiles, setProjectFiles] = useState<UploadedFile[]>([]);
  const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null); // 👈 fichier en attente de suppression
  const [isDeleting, setIsDeleting] = useState(false);

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

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    if (type.includes("text") || type.includes("pdf")) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const uploadFile = async (file: File) => {
    const result = await FirebaseServices.upload({
      file,
      destDir: `uploads/${projectId}`,
      onProgress: (p) => setUploadProgress(Number(p.toFixed(1))),
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

    await ActivityService.create({
      ...ActivityService.initialData,
      projectId,
      type: "completed",
      description: `a ajouté le fichier ${file.name}`,
      userId: userProfile?.id || "",
    });
  };

  const handleFileSelect = async (selectedFiles: FileList) => {
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(selectedFiles).map(uploadFile);
      await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFileConfirmed = async () => {
    if (!fileToDelete) return;
    try {
      setIsDeleting(true);
      setProjectFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      await FirebaseServices.delete("files", fileToDelete.id);
      await FirebaseServices.deleteFromStorage(
        `uploads/${fileToDelete.projectId}/${fileToDelete.name}`
      );
      await ActivityService.create({
        ...ActivityService.initialData,
        projectId,
        type: "completed",
        description: `a supprimé le fichier ${fileToDelete.name}`,
        userId: userProfile?.id || "",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression du fichier:", error);
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Zone Drag & Drop */}
      <div
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0)
            handleFileSelect(e.dataTransfer.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
          accept=".pdf,.txt,.md,.json,.csv,.xml,.html,.doc,.docx,.png,.jpg,.jpeg,.gif"
        />

        <Upload
          className={`w-12 h-12 mx-auto mb-4 ${
            isDragging ? "text-blue-500" : "text-gray-400"
          }`}
        />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isUploading ? "Upload en cours..." : "Glissez vos fichiers ici"}
        </h3>
        <p className="text-gray-600 mb-4">
          ou{" "}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:text-blue-700 font-medium"
            disabled={isUploading}
          >
            parcourez vos fichiers
          </button>
        </p>
        <p className="text-sm text-gray-500">
          Formats supportés: PDF, TXT, DOC, PNG, JPG...
        </p>
      </div>

      {/* Liste de fichiers */}
      {projectFiles.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Documents du projet ({projectFiles.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {projectFiles.map((file) => {
              const IconComponent = getFileIcon(file.type);
              return (
                <div
                  key={file.id}
                  className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <IconComponent className="w-6 h-6 text-gray-500" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} —{" "}
                        {new Date(file.uploadedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Prévisualiser"
                      onClick={() => window.open(file.url)}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-green-600"
                      title="Télécharger"
                      onClick={() => window.open(file.url)}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsDeleting(false);
                        setFileToDelete(file);
                      }} // 👈 ouvre la dialog
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Supprimer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <File className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucun document uploadé pour ce projet</p>
        </div>
      )}

      {/* 🧱 Dialog de confirmation */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500 w-6 h-6" />
              <h2 className="text-lg font-semibold text-gray-900">
                Supprimer le fichier ?
              </h2>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Êtes-vous sûr de vouloir supprimer <b>{fileToDelete.name}</b> ?
              Cette action est irréversible.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  if (isDeleting) return;
                  setFileToDelete(null);
                }}
                className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                onClick={removeFileConfirmed}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-70"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Suppression...
                  </span>
                ) : (
                  "Supprimer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
