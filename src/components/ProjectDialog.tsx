import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { Project } from "../models";
import { FirebaseServices } from "../services/firebase.service";
import { ProjectService } from "../services/project.service";
import { projectIcons } from "../utils/project-icons";
import { useAuth } from "../contexts/AuthContext";
import dayjs from "dayjs";

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
  editMode?: boolean;
  projectToEdit?: Project | null;
}

const projectColors = [
  { name: "Indigo", value: "#4F46E5" },
  { name: "Bleu", value: "#2563EB" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Émeraude", value: "#10B981" },
  { name: "Vert", value: "#16A34A" },
  { name: "Lime", value: "#65A30D" },
  { name: "Jaune", value: "#EAB308" },
  { name: "Orange", value: "#F97316" },
  { name: "Rouge", value: "#DC2626" },
  { name: "Rose", value: "#E11D48" },
  { name: "Violet", value: "#7C3AED" },
  { name: "Gris", value: "#6B7280" },
];

export default function ProjectDialog({
  isOpen,
  onClose,
  onProjectCreated,
  editMode = false,
  projectToEdit,
}: ProjectDialogProps) {
  const { currentUser, userProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    iconName: "Folder",
    iconColor: "#4F46E5",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconDropdown, setShowIconDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  const iconDropdownRef = useRef<HTMLDivElement>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);

  // Initialiser le formulaire en mode édition
  useEffect(() => {
    if (editMode && projectToEdit) {
      setFormData({
        name: projectToEdit.name,
        description: projectToEdit.description,
        iconName: projectToEdit.iconName || "Folder",
        iconColor: projectToEdit.iconColor,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        iconName: "Folder",
        iconColor: "#4F46E5",
      });
    }
  }, [editMode, projectToEdit, isOpen]);

  // Fermer les dropdowns quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        iconDropdownRef.current &&
        !iconDropdownRef.current.contains(event.target as Node)
      ) {
        setShowIconDropdown(false);
      }
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(event.target as Node)
      ) {
        setShowColorDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editMode && projectToEdit) {
        // Mode édition
        const updatedProject: Project = {
          ...projectToEdit,
          name: formData.name,
          description: formData.description,
          iconName: formData.iconName,
          iconColor: formData.iconColor,
          updatedAt: new Date().toISOString(),
        };

        const result = await ProjectService.update(
          projectToEdit.id,
          updatedProject
        );

        if (result.success) {
          onProjectCreated(updatedProject);
        }
      } else {
        if (!currentUser) {
          throw new Error("Utilisateur non détecté.");
        }

        if (!userProfile) {
          throw new Error("Profil non détecté.");
        }

        // Mode création
        const newProject: Project = {
          id: `${Date.now()}`,
          name: formData.name,
          description: formData.description,
          date: dayjs().format(),
          iconColor: formData.iconColor,
          iconName: formData.iconName,
          createdAt: dayjs().format(),
          updatedAt: dayjs().format(),
        };

        const { createdProject } = await ProjectService.create(
          newProject,
          userProfile
        );

        if (createdProject) {
          onProjectCreated(createdProject);
        }
      }

      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedIcon = projectIcons.find(
    (icon) => icon.name === formData.iconName
  );
  const selectedColor = projectColors.find(
    (color) => color.value === formData.iconColor
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {editMode ? "Modifier le projet" : "Créer un nouveau projet"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du projet
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Entrez le nom du projet"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description du projet (optionnel)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icône
            </label>
            <div className="relative" ref={iconDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowIconDropdown(!showIconDropdown);
                  setShowColorDropdown(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <div className="flex items-center space-x-2">
                  {selectedIcon && (
                    <selectedIcon.component
                      className="w-4 h-4"
                      style={{ color: formData.iconColor }}
                    />
                  )}
                  <span className="text-sm text-gray-700">
                    {formData.iconName}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    showIconDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showIconDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                  {projectIcons.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, iconName: icon.name });
                        setShowIconDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                        formData.iconName === icon.name
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700"
                      }`}
                    >
                      <icon.component
                        className="w-4 h-4"
                        style={{ color: formData.iconColor }}
                      />
                      <span className="text-sm">{icon.name}</span>
                      {formData.iconName === icon.name && (
                        <Check className="w-4 h-4 ml-auto text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Couleur
            </label>
            <div className="relative" ref={colorDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowColorDropdown(!showColorDropdown);
                  setShowIconDropdown(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: formData.iconColor }}
                  />
                  <span className="text-sm text-gray-700">
                    {selectedColor?.name || "Couleur personnalisée"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    showColorDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showColorDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                  {projectColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, iconColor: color.value });
                        setShowColorDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                        formData.iconColor === color.value
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700"
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-sm">{color.name}</span>
                      {formData.iconColor === color.value && (
                        <Check className="w-4 h-4 ml-auto text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? editMode
                  ? "Modification..."
                  : "Création..."
                : editMode
                ? "Modifier"
                : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
