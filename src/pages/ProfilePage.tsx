import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ProfileService } from "../services/profile.service";
import {
  Invitation,
  Profile,
  Project,
  ProjectByMember,
} from "../models";
import { getRandomColor } from "../utils/colors";
import dayjs from "dayjs";
import {
  User,
  Lock,
  Bell,
  FolderKanban,
  LogOut,
  Mail,
  Key,
  Save,
  Plus,
  Menu,
  X,
  Inbox,
  Loader2,
  Check,
  MailIcon,
} from "lucide-react";
import { signOut, updatePassword, updateEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import { useNavigate, useParams } from "react-router-dom";
import { RoleManager } from "../security/RoleManager";
import { ProjectService } from "../services/project.service";
import ProjectDialog from "../components/ProjectDialog";
import ProjectCard from "../components/ProjectCard";
import { useToast } from "../contexts/ToastContext";
import { MemberService } from "../services/member.service";
import { InvitationService } from "../services/invitation.service";
import { FaGithub, FaGoogle, FaFacebook, FaApple } from "react-icons/fa";

/* -------------------------------------------------------------------------- */
/* 🧩 PAGE PROFIL PRINCIPALE                                                 */
/* -------------------------------------------------------------------------- */

export default function ProfilePage() {
  const { tab } = useParams();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState(tab ?? "");

  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        const p = await ProfileService.getByUid(currentUser.uid);
        setProfile(p);
      } catch (err) {
        console.error("Erreur de chargement du profil :", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  useEffect(() => {
    if (activeTab === "") {
      navigate(`/profile`);
    } else {
      navigate(`/profile/${activeTab}`);
    }
  }, [activeTab]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Chargement du profil...
      </div>
    );

  if (!currentUser)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Utilisateur non connecté.
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
      {/* --- SIDEBAR (desktop) --- */}
      <aside className="hidden md:flex w-80 bg-white border-r border-gray-200 p-6 flex-col justify-between">
        <SidebarContent
          profile={profile}
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          handleLogout={handleLogout}
          imgError={imgError}
          setImgError={setImgError}
        />
      </aside>

      {/* --- CONTENU PRINCIPAL --- */}
      <main className="flex-1 p-6 md:p-10">
        {/* Header mobile */}
        <div className="md:hidden mb-6">
          {/* Titre */}
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Mon compte</h1>

          {/* Dropdown custom */}
          <div className="relative w-full">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {/* Label actif */}
              <span>
                {activeTab === ""
                  ? "Profil"
                  : activeTab === "account"
                  ? "Compte"
                  : activeTab === "projects"
                  ? "Projets"
                  : activeTab === "security"
                  ? "Sécurité"
                  : activeTab === "invitations"
                  ? "Invitations"
                  : "Notifications"}
              </span>

              {/* Flèche rotation */}
              <svg
                className={`w-4 h-4 text-gray-500 transform transition-transform duration-200 ${
                  sidebarOpen ? "rotate-180" : "rotate-0"
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Menu déroulant */}
            {sidebarOpen && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden animate-fadeIn">
                {[
                  { key: "", label: "Profil" },
                  { key: "account", label: "Compte" },
                  { key: "projects", label: "Projets" },
                  { key: "invitations", label: "Invitations" },
                  { key: "security", label: "Sécurité" },
                  { key: "notifications", label: "Notifications" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveTab(item.key);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      activeTab === item.key
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeTab === "" && profile && (
          <EditableProfileSection
            profile={profile}
            setProfile={setProfile}
            saving={saving}
            setSaving={setSaving}
          />
        )}
        {activeTab === "account" && (
          <AccountSection currentUser={currentUser} profile={profile} />
        )}
        {activeTab === "security" && <SecuritySection />}
        {activeTab === "notifications" && <NotificationsSection />}
        {activeTab === "projects" && <ProjectsSection />}
        {activeTab === "invitations" && <InvitationsSection />}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 🔹 Sidebar content réutilisable                                           */
/* -------------------------------------------------------------------------- */
function SidebarContent({
  profile,
  currentUser,
  activeTab,
  setActiveTab,
  handleLogout,
  imgError,
  setImgError,
}: any) {
  return (
    <>
      <div>
        <div className="flex items-center space-x-3 mb-8">
          {!imgError && profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt="Avatar"
              onError={() => setImgError(true)}
              className="w-12 h-12 rounded-full border border-gray-300 object-cover aspect-square"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white text-lg aspect-square"
              style={{ backgroundColor: profile?.color || getRandomColor() }}
            >
              {profile?.displayName
                ? profile.displayName.charAt(0).toUpperCase()
                : "U"}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-800">
              {profile?.displayName || "Utilisateur"}
            </p>
            <p className="text-sm text-gray-500">{currentUser.email}</p>
          </div>
        </div>

        <nav className="space-y-2">
          <SidebarLink
            label="Projets"
            icon={<FolderKanban className="w-4 h-4" />}
            active={activeTab === "projects"}
            onClick={() => setActiveTab("projects")}
          />
          <SidebarLink
            label="Invitations"
            icon={<Inbox className="w-4 h-4" />}
            active={activeTab === "invitations"}
            onClick={() => setActiveTab("invitations")}
          />
          <SidebarLink
            label="Profil"
            icon={<User className="w-4 h-4" />}
            active={activeTab === ""}
            onClick={() => setActiveTab("")}
          />
          <SidebarLink
            label="Compte"
            icon={<Mail className="w-4 h-4" />}
            active={activeTab === "account"}
            onClick={() => setActiveTab("account")}
          />
          <SidebarLink
            label="Sécurité"
            icon={<Lock className="w-4 h-4" />}
            active={activeTab === "security"}
            onClick={() => setActiveTab("security")}
          />
          <SidebarLink
            label="Notifications"
            icon={<Bell className="w-4 h-4" />}
            active={activeTab === "notifications"}
            onClick={() => setActiveTab("notifications")}
          />
        </nav>
      </div>

      <div className="border-t border-gray-200 mt-6 pt-4">
        <SidebarLink
          label="Déconnexion"
          icon={<LogOut className="w-4 h-4" />}
          onClick={handleLogout}
          danger
        />
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 🔹 Composant SidebarLink                                                  */
/* -------------------------------------------------------------------------- */
function SidebarLink({ label, icon, active, onClick, danger }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : active
          ? "bg-blue-50 text-blue-600 font-semibold"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span className="mr-2">{icon}</span> {label}
    </button>
  );
}

function EditableProfileSection({
  profile,
  setProfile,
  saving,
  setSaving,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  saving: boolean;
  setSaving: (b: boolean) => void;
}) {
  const { showToast } = useToast(); // 👈 ici
  const handleChange = (field: keyof Profile, value: any) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const result = await ProfileService.update(profile.id, profile);

      if (result.success) {
        showToast("Profil mis à jour avec succès ✅", "success");
      } else {
        showToast(result.error || "Erreur lors de la mise à jour ❌", "error");
      }
    } catch (err: any) {
      console.error("Erreur de mise à jour du profil :", err);
      showToast("Une erreur est survenue ❌", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        <User className="w-5 h-5 text-blue-600" /> Profil
      </h1>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6 max-w-2xl">
        {/* Nom d'affichage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom complet
          </label>
          <input
            type="text"
            value={profile.displayName || ""}
            onChange={(e) => handleChange("displayName", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Email (lecture seule) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adresse e-mail
          </label>
          <input
            type="text"
            value={profile.email}
            readOnly
            className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-gray-500"
          />
        </div>

        {/* Téléphone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro de téléphone
          </label>
          <input
            type="tel"
            value={profile.phoneNumber || ""}
            onChange={(e) => handleChange("phoneNumber", e.target.value)}
            placeholder="+262 ..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Couleur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Couleur de profil
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={profile.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="w-10 h-10 border rounded cursor-pointer"
            />
            <span className="text-sm text-gray-600">{profile.color}</span>
          </div>
        </div>

        {/* 🧩 Rôle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rôle
          </label>

          {RoleManager.isHigherOrEqual(profile.role, "admin") ? (
            // 👉 Si l’utilisateur est admin → il peut modifier le rôle
            <select
              value={profile.role || "user"}
              onChange={(e) =>
                handleChange("role", e.target.value as "user" | "admin")
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          ) : (
            // 👉 Sinon → affichage en lecture seule
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
              {profile.role === "admin" ? "Administrateur" : "Utilisateur"}
            </div>
          )}
        </div>

        {/* Bouton sauvegarder */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- SECTION COMPTE ---------------- */

function AccountSection({
  currentUser,
  profile,
}: {
  currentUser: any;
  profile: Profile | null;
}) {
  const { showToast } = useToast();
  const [email, setEmail] = useState(currentUser.email);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser?.providerData) return;
    const providerList = currentUser.providerData.map((p: any) => p.providerId);
    setProviders(providerList);
  }, [currentUser]);

  const handleUpdateEmail = async () => {
    try {
      setLoading(true);
      await updateEmail(currentUser, email);
      showToast("✅ Adresse e-mail mise à jour avec succès !", "success");
    } catch (err: any) {
      console.error("Erreur update email :", err);
      showToast(`❌ Erreur : ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      setLoading(true);
      await updatePassword(currentUser, password);
      showToast("✅ Mot de passe mis à jour avec succès !", "success");
      setPassword("");
    } catch (err: any) {
      console.error("Erreur update password :", err);
      showToast(`❌ Erreur : ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // 🧩 Déterminer la méthode de connexion lisible
  const getProviderLabel = (providerId: string) => {
    switch (providerId) {
      case "password":
        return "Email / Mot de passe";
      case "google.com":
        return "Google";
      case "github.com":
        return "GitHub";
      case "facebook.com":
        return "Facebook";
      case "apple.com":
        return "Apple";
      default:
        return providerId;
    }
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case "password":
        return <Mail className="w-5 h-5" />;
      case "google.com":
        return <FaGoogle className="w-5 h-5]" />;
      case "github.com":
        return <FaGithub className="w-5 h-5" />;
      case "facebook.com":
        return <FaFacebook className="w-5 h-5]" />;
      case "apple.com":
        return <FaApple className="w-5 h-5" />;
      default:
        return <span className="text-gray-500">{providerId}</span>;
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        <Mail className="w-5 h-5 text-blue-600" /> Compte
      </h1>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 max-w-2xl space-y-6">
        {/* Informations utilisateur */}
        <ul className="text-sm text-gray-700 space-y-2">
          <li>
            <strong>ID :</strong> {profile?.id ?? "Non disponible"}
          </li>
          <li>
            <strong>Adresse e-mail :</strong> {currentUser.email}
          </li>
          <li className="flex gap-2">
            <strong>Méthode de connexion :</strong>{" "}
            {providers.length > 0 ? (
              <div className="flex  gap-3">
                {providers.map((provider) => (
                  <div
                    key={provider}
                    className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-1 rounded-full"
                  >
                    {getProviderIcon(provider)}
                    <span className="text-gray-800 text-sm font-medium">
                      {getProviderLabel(provider)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              "Inconnue"
            )}
          </li>
          <li>
            <strong>Email vérifié :</strong>{" "}
            {currentUser.emailVerified ? "✅ Oui" : "❌ Non"}
          </li>
          <li>
            <strong>Date de création :</strong>{" "}
            {dayjs(currentUser.metadata.creationTime).format(
              "DD MMM YYYY à HH:mm"
            )}
          </li>
          <li>
            <strong>Dernière connexion :</strong>{" "}
            {dayjs(currentUser.metadata.lastSignInTime).format(
              "DD MMM YYYY à HH:mm"
            )}
          </li>
        </ul>

        {/* Si l'utilisateur est connecté avec email/password, afficher les options */}
        {providers.includes("password") && (
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" /> Modifier les
              identifiants
            </h3>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nouvelle adresse e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
              <button
                onClick={handleUpdateEmail}
                disabled={loading}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
              >
                {loading ? "Mise à jour..." : "Mettre à jour l’e-mail"}
              </button>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
              <button
                onClick={handleUpdatePassword}
                disabled={loading || !password}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
              >
                {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* --- autres sections --- */
function SecuritySection() {
  return (
    <section>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">🔒 Sécurité</h1>
      <p className="text-gray-500 text-sm">
        Gestion des sessions et authentification à deux facteurs.
      </p>
    </section>
  );
}

function NotificationsSection() {
  return (
    <section>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">
        🔔 Notifications
      </h1>
      <p className="text-gray-500 text-sm">
        Personnalisez vos préférences de notification ici.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 SECTION PROJETS (séparation owner / membre + rôle visible)              */
/* -------------------------------------------------------------------------- */

export function ProjectsSection() {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<ProjectByMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // 🔹 Charge les projets depuis le service
        if (!userProfile) {
          return;
        }

        const data = await ProjectService.getByUserId(userProfile.id);

        setProjects(data);
      } catch (err) {
        console.error("Erreur chargement projets :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [userProfile]);

  const handleProjectCreated = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  if (loading)
    return (
      <section>
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          🚀 Mes projets
        </h1>
        <p className="text-gray-500 text-sm">Chargement des projets...</p>
      </section>
    );

  // 🔹 Séparation propriétaire / membre
  const ownedProjects = projects.filter((p) => p.userRole === "owner");
  const memberProjects = projects.filter((p) => p.userRole !== "owner");

  return (
    <>
      <ProjectDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      <section>
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          🚀 Mes projets
        </h1>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center bg-gray-50 border border-gray-200 rounded-xl p-8 shadow-sm">
            <p className="text-gray-600 mb-4 text-sm italic">
              Aucun projet trouvé.
            </p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un projet</span>
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* 🔹 Projets créés par l’utilisateur */}
            {ownedProjects.length > 0 && (
              <div>
                <h2 className="text-md mb-4 text-gray-600 italic">
                  Mes projets
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ownedProjects.map((p, i) => (
                    <ProjectCard
                      project={p.project}
                      userRole={p.userRole}
                      key={i}
                      onClick={() => navigate(`/projects/${p.project.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 🔹 Projets partagés */}
            {memberProjects.length > 0 && (
              <div>
                <h2 className="text-md mb-4 text-gray-600 italic">
                  Projets partagés
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {memberProjects.map((p, i) => (
                    <ProjectCard
                      project={p.project}
                      userRole={p.userRole}
                      key={i}
                      onClick={() => navigate(`/projects/${p.project.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}

interface EnrichedInvitation {
  invitation: Invitation;
  projectName: string;
  senderProfile: Profile;
}

export function InvitationsSection() {
  const { userProfile } = useAuth();
  const [invitations, setInvitations] = useState<EnrichedInvitation[]>([]);
  const [activeTab, setActiveTab] = useState<
    "pending" | "accepted" | "declined"
  >("pending");
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        if (!userProfile) return;

        const invites = await InvitationService.getByUserId(userProfile.id);

        const enriched = (await Promise.all(
          invites.map(async (inv) => {
            try {
              const project = await ProjectService.getById(inv.projectId);
              const owner = await ProfileService.getById(inv.projectOwnerId);

              return {
                invitation: inv,
                projectName: project?.name || "Projet inconnu",
                senderProfile: owner,
              };
            } catch (err) {
              console.error("Erreur enrichissement invitation :", err);
              return {
                invitation: inv,
                projectName: "Projet inconnu",
                senderProfile: { displayName: "Utilisateur inconnu" },
              };
            }
          })
        )) as EnrichedInvitation[];

        setInvitations(enriched);
      } catch (err) {
        console.error("Erreur chargement invitations :", err);
        showToast("Erreur lors du chargement des invitations ❌", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, [userProfile]);

  // ─── Actions ───────────────────────────────
  const handleAccept = async (inv: Invitation) => {
    try {
      await InvitationService.update(inv.id, {
        status: "accepted",
        respondedAt: new Date().toISOString(),
      });

      /* Créer un membre du projet */
      const newMember = {
        ...MemberService.initialData,
        projectId: inv.projectId,
        userId: inv.guestUserId,
        userRole: inv.guestUserRole,
        invitationId: inv.id,
      };

      await MemberService.create(newMember);

      showToast(`✅ Invitation acceptée`, "success");

      setInvitations((prev) =>
        prev.map((i) =>
          i.invitation.id === inv.id
            ? { ...i, invitation: { ...i.invitation, status: "accepted" } }
            : i
        )
      );
    } catch (err) {
      console.error("Erreur acceptation :", err);
      showToast("Erreur lors de l’acceptation ❌", "error");
    }
  };

  const handleDecline = async (inv: Invitation) => {
    try {
      await InvitationService.update(inv.id, {
        status: "declined",
        respondedAt: new Date().toISOString(),
      });
      showToast(`❌ Invitation refusée`, "info");
      setInvitations((prev) =>
        prev.map((i) =>
          i.invitation.id === inv.id
            ? { ...i, invitation: { ...i.invitation, status: "declined" } }
            : i
        )
      );
    } catch (err) {
      console.error("Erreur refus :", err);
      showToast("Erreur lors du refus ❌", "error");
    }
  };

  // ─── Rendu ───────────────────────────────
  const filtered = invitations.filter((i) => i.invitation.status === activeTab);

  const statusLabels = {
    pending: "En attente",
    accepted: "Acceptées",
    declined: "Refusées",
  };

  if (loading)
    return (
      <section>
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          📩 Invitations
        </h1>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement des
          invitations...
        </div>
      </section>
    );

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">📩 Invitations</h1>

      {/* Onglets de statut */}
      <div className="flex gap-3 mb-6 border-b border-gray-200">
        {(["pending", "accepted", "declined"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-all ${
              activeTab === status
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {statusLabels[status]}{" "}
            <span className="ml-1 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
              {invitations.filter((i) => i.invitation.status === status).length}
            </span>
          </button>
        ))}
      </div>

      {/* Tableau d'invitations */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-gray-50 border border-gray-200 rounded-xl p-8 shadow-sm">
          <p className="text-gray-600 text-sm italic">
            Aucune invitation {statusLabels[activeTab].toLowerCase()}.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700 text-left">
              <tr>
                <th className="px-4 py-2">Projet</th>
                <th className="px-4 py-2">Invité par</th>
                <th className="px-4 py-2">Rôle</th>
                <th className="px-4 py-2">Date</th>
                {activeTab === "pending" && (
                  <th className="px-4 py-2">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ invitation, projectName, senderProfile }) => (
                <tr
                  key={invitation.id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  {/* Nom du projet */}
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {projectName}
                  </td>

                  {/* Propriétaire */}
                  <td className="px-4 py-3 flex items-center gap-2">
                    {senderProfile.photoURL ? (
                      <img
                        src={senderProfile.photoURL}
                        alt={senderProfile.displayName || ""}
                        className="w-8 h-8 rounded-full border object-cover"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 text-white flex items-center justify-center rounded-full font-medium"
                        style={{
                          backgroundColor: senderProfile.color || "#3B82F6",
                        }} // fallback bleu si pas de couleur
                      >
                        {senderProfile.displayName?.charAt(0)?.toUpperCase() ||
                          "?"}
                      </div>
                    )}

                    <span className="text-gray-800">
                      {senderProfile.displayName}
                    </span>
                  </td>

                  {/* Rôle */}
                  <td className="px-4 py-3 text-gray-700">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        RoleManager.roleColors[
                          invitation.guestUserRole as keyof typeof RoleManager.roleColors
                        ]
                      }`}
                    >
                      {
                        RoleManager.roleLabels[
                          invitation.guestUserRole as keyof typeof RoleManager.roleLabels
                        ]
                      }
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(invitation.createdAt).toLocaleDateString("fr-FR")}
                  </td>

                  {/* Actions (uniquement pour les "pending") */}
                  {activeTab === "pending" && (
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleAccept(invitation)}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs transition"
                      >
                        <Check className="w-4 h-4" /> Accepter
                      </button>
                      <button
                        onClick={() => handleDecline(invitation)}
                        className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs transition"
                      >
                        <X className="w-4 h-4" /> Refuser
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
