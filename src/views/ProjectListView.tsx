import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Project } from "../models";
import { projectIcons } from "../utils/project-icons";
import * as LucideIcons from "lucide-react";

interface ProjectListViewProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onCreateProject: (name: string, description: string) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

export default function ProjectListView({ 
  projects, 
  onProjectClick, 
  onCreateProject, 
  isModalOpen, 
  setIsModalOpen 
}: ProjectListViewProps) {
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProject.name.trim()) {
      onCreateProject(
        newProject.name,
        newProject.description
      );
      setNewProject({ name: "", description: "" });
      setIsModalOpen(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Projets</h1>
        <p className="text-gray-600">Gérez vos projets de développement</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const matchedIcon = project.iconName
            ? projectIcons.find((icon) => icon.name === project.iconName)
            : null;
          const IconComponent =
            matchedIcon?.component || (LucideIcons as any).FolderKanban;
          return (
            <div
              key={project.id}
              onClick={() => onProjectClick(project)}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1 p-6"
            >
              <div className="flex items-center mb-4">
                <IconComponent 
                  className="w-6 h-6 mr-3" 
                  style={{ color: project.iconColor }} 
                />
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
              </div>
              
              <p className="text-gray-600 mb-4 text-sm">{project.description}</p>
              
              <div className="flex justify-end">
                <span className="text-xs text-gray-500">{project.date}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Créer un nouveau projet</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du projet
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
