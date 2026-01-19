import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, User, FolderKanban, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { ProfileService } from "../services/profile.service";
import { Profile, Project } from "../models"; // ton modèle
import { getRandomColor } from "../utils/colors";
import ProjectDialog from "./ProjectDialog";

interface HeaderProps {
  showNewProject?: boolean;
}

export default function Header({ showNewProject = true }: HeaderProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleProjectCreated = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  // 🔹 Récupère le profil Firestore du currentUser
  const fetchProfile = async () => {
    if (!currentUser?.uid) return;

    try {
      const prof = await ProfileService.getByUid(currentUser.uid);
      if (prof) {
        setProfile(prof);
      } else {
        // fallback : crée le profil si inexistant
        const newProfile = await ProfileService.syncWithAuthUser(currentUser);
        setProfile(newProfile);
      }
    } catch (err) {
      console.error("Erreur récupération profil :", err);
    }
  };

  useEffect(() => {
    if (currentUser) fetchProfile();
  }, [currentUser]);

  // Ferme le menu si clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <>
      <ProjectDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-blue-600 cursor-pointer select-none"
            onClick={() => navigate("/")}
          >
            ZÉTO
          </h1>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Barre de recherche */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Recherche"
                className="pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 lg:w-80"
              />
            </div>

            {/* Bouton mobile recherche */}
            <button className="sm:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Search className="w-5 h-5" />
            </button>

            {/* Bouton "Nouveau projet" */}
            {showNewProject && (
              <button
                onClick={() => setIsDialogOpen(true)}
                className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau projet</span>
              </button>
            )}

            {/* Avatar utilisateur */}
            {profile && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="ml-2 flex items-center"
                  title={profile.email || "Mon profil"}
                >
                  {!imgError && profile.photoURL ? (
                    <img
                      src={profile.photoURL}
                      alt={profile.displayName || "Avatar"}
                      onError={() => setImgError(true)}
                      className="w-9 h-9 rounded-full border border-gray-300 object-cover"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white select-none"
                      style={{
                        backgroundColor: profile.color || getRandomColor(),
                      }}
                    >
                      {profile.displayName
                        ? profile.displayName.charAt(0).toUpperCase()
                        : "U"}
                    </div>
                  )}
                </button>

                {/* Menu déroulant */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-3 w-48 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50 animate-fadeIn">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <User className="w-4 h-4 mr-2" /> Profil
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/projects");
                      }}
                      className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <FolderKanban className="w-4 h-4 mr-2" /> Mes projets
                    </button>

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
