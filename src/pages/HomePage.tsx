import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ProjectDialog from "../components/ProjectDialog";
import { Project } from "../models";
import { useAuth } from "../contexts/AuthContext";
import { ProjectService } from "../services/project.service";
import * as LucideIcons from "lucide-react";
import ProjectCard from "../components/ProjectCard";

export default function HomePage() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
  }, [currentUser]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        if (!userProfile) return;
        const projectsData = await ProjectService.getByUserId(userProfile.id);
        const allProjects = projectsData.map((e) => e.project);
        setProjects(allProjects);
      } catch (error) {
        console.error("Erreur lors du chargement des projets:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, [userProfile]);

  const handleProjectClick = (project: Project) =>
    navigate(`/projects/${project.id}`);
  const handleProjectCreated = (newProject: Project) =>
    setProjects((prev) => [newProject, ...prev]);

  const renderSkeletons = () =>
    Array(5)
      .fill(null)
      .map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg p-4 border border-gray-200 animate-pulse"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-gray-200"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Mes projets</h2>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Nouveau projet
            </button>
          </div>
        </div>

        {/* 🌀 Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-3">{renderSkeletons()}</div>
        ) : projects.length === 0 ? (
          // 📂 Aucun projet
          <div className="text-center py-16">
            <LucideIcons.Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun projet
            </h3>
            <p className="text-gray-500 mb-4">
              Créez votre premier projet pour commencer
            </p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Créer un projet
            </button>
          </div>
        ) : (
          // ✅ Liste des projets
          <div className="transition-opacity duration-500 opacity-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={handleProjectClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ProjectDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
