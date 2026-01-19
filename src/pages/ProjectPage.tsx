import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Project } from "../models";
import ChatInterface from "../components/ChatInterface";
import ActivitySidebar from "../components/ActivitySidebar";
import FileUploader from "../components/FileUploader";
import ProjectSettings from "../components/ProjectSettings";
import {
  Users,
  ChevronDown,
  Settings,
  MoreVertical,
  Trash2,
  X,
  Lock,
} from "lucide-react";
import ProjectDialog from "../components/ProjectDialog";
import { ProjectService } from "../services/project.service";
import { projectIcons } from "../utils/project-icons";
import { useAuth } from "../contexts/AuthContext";
import { UserGuard } from "../guards/user.guard";

export default function ProjectPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const projectId = params.id as string;
  const tab = params.tab as string;

  const [project, setProject] = useState<Project | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null); // null = en cours de vérification
  const [activeTab, setActiveTab] = useState(tab || "chat");
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMobileActivity, setShowMobileActivity] = useState(false);

  // Charger le projet
  useEffect(() => {
    if (!projectId) {
      return;
    }
    const loadProject = async () => {
      try {
        const foundProject = await ProjectService.getById(projectId);
        if (foundProject) setProject(foundProject);
        else navigate("/");
      } catch (error) {
        console.error("Erreur lors du chargement du projet:", error);
        navigate("/");
      }
    };

    loadProject();
  }, [projectId, navigate]);

  // Vérifier si l’utilisateur a accès au projet
  useEffect(() => {
    (async () => {
      if (userProfile && projectId) {
        try {
          const isMember = await UserGuard.userIsProjectMember(
            userProfile.id,
            projectId
          );
          setHasAccess(isMember);
        } catch (err) {
          console.error("Erreur de vérification d'accès :", err);
          setHasAccess(false);
        }
      }
    })();
  }, [userProfile, projectId]);

  // Fermer le dropdown actions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".actions-dropdown")) {
        setShowActionsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    console.log(activeTab);
    navigate(`/projects/${projectId}/${activeTab}`);
  }, [activeTab, projectId]);

  // 🌀 En cours de chargement
  if (!project || hasAccess === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500">Chargement du projet...</span>
        </div>
      </div>
    );
  }

  // 🚫 Accès refusé
  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="bg-white shadow-md border border-gray-200 rounded-xl p-8 max-w-md">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100 text-red-600">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Accès refusé
            </h2>
            <p className="text-gray-500 text-sm">
              Vous n’êtes pas membre de ce projet ou votre accès a été révoqué.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Retour à l’accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Accès autorisé
  const tabs = [
    { id: "chat", label: "Chat IA" },
    { id: "documents", label: "Documents" },
    { id: "tasks", label: "Tâches & suivi" },
    { id: "settings", label: "Paramètres" },
  ];

  const activeTabLabel =
    tabs.find((tab) => tab.id === activeTab)?.label || "Chat IA";

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setShowMobileDropdown(false);
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProject(updatedProject);
    setIsEditDialogOpen(false);
    setShowActionsDropdown(false);
  };

  const handleDeleteProject = async () => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible."
      )
    )
      return;

    setIsDeleting(true);
    try {
      const result = await ProjectService.delete(projectId);
      if (result.success) navigate("/");
      else alert("Erreur lors de la suppression du projet");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression du projet");
    } finally {
      setIsDeleting(false);
      setShowActionsDropdown(false);
    }
  };

  const handleUpdateProject = async (updates: Partial<Project>) => {
    await ProjectService.update(projectId, updates);
    setProject((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const projectIcon = projectIcons.find(
    (icon) => icon.name === project.iconName
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1">
          {/* Project Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex justify-between sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: project.iconColor + "20" }}
                >
                  <span
                    className="text-lg sm:text-xl"
                    style={{ color: project.iconColor }}
                  >
                    {projectIcon && (
                      <projectIcon.component
                        className="w-4 h-4"
                        style={{ color: project.iconColor }}
                      />
                    )}
                  </span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                    {project.name}
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-32 sm:w-48 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: "75%" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative actions-dropdown">
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors self-start sm:self-auto"
                  title="Actions du projet"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* Dropdown Actions */}
                {showActionsDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-48">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowMobileActivity(true);
                          setShowActionsDropdown(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors lg:hidden"
                      >
                        <Users className="w-4 h-4 mr-3" />
                        Activité
                      </button>
                      <button
                        onClick={() => {
                          setIsEditDialogOpen(true);
                          setShowActionsDropdown(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        Modifier
                      </button>

                      <button
                        onClick={handleDeleteProject}
                        disabled={isDeleting}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        {isDeleting ? "Suppression..." : "Supprimer le projet"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs - Desktop */}
          <div className="hidden md:block bg-white border-b border-gray-200 px-4 sm:px-6 overflow-x-auto">
            <div className="flex space-x-4 sm:space-x-8 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs - Mobile Dropdown */}
          <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 relative">
            <button
              onClick={() => setShowMobileDropdown(!showMobileDropdown)}
              className="w-full flex items-center justify-between text-left bg-gray-50 hover:bg-gray-100 px-4 py-3 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">
                {activeTabLabel}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  showMobileDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {showMobileDropdown && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tab Content - Tous rendus en même temps */}
          <div className="p-4 sm:p-6">
            {/* Chat Tab */}
            <div style={{ display: activeTab === "chat" ? "block" : "none" }}>
              <ChatInterface projectId={projectId} />
            </div>

            {/* Documents Tab */}
            <div
              style={{ display: activeTab === "documents" ? "block" : "none" }}
            >
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                Documents du projet
              </h2>
              <FileUploader projectId={projectId} />
            </div>

            {/* Tasks Tab */}
            <div style={{ display: activeTab === "tasks" ? "block" : "none" }}>
              <div className="text-center py-12">
                <p className="text-sm sm:text-base text-gray-500">
                  Onglet Tâches & suivi - Contenu à implémenter
                </p>
              </div>
            </div>

            {/* Settings Tab */}
            <div
              style={{ display: activeTab === "settings" ? "block" : "none" }}
            >
              <ProjectSettings
                project={project}
                onUpdateProject={handleUpdateProject}
              />
            </div>
          </div>
        </div>

        {/* Activity Sidebar - Hidden on mobile */}
        <div className="lg:block hidden">
          <ActivitySidebar projectId={projectId} />
        </div>
      </div>

      {/* Project Edit Dialog */}
      <ProjectDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onProjectCreated={handleProjectUpdated}
        editMode={true}
        projectToEdit={project}
      />

      {/* Mobile Activity Modal */}
      {showMobileActivity && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Activité du projet
              </h3>
              <button
                onClick={() => setShowMobileActivity(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              <ActivitySidebar projectId={projectId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
