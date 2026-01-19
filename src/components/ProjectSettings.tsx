import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Crown,
  Loader2,
  Mail,
  X,
  Calendar,
  Check,
  ChevronDown,
  Settings,
  Tag,
} from "lucide-react";
import { Invitation, Profile, Project, ProjectMemberRole } from "../models";
import { InvitationService } from "../services/invitation.service";
import { ProfileService } from "../services/profile.service";
import { MemberService } from "../services/member.service";
import { useAuth } from "../contexts/AuthContext";
import { RoleManager } from "../security/RoleManager";
import { projectIcons, getColorName } from "../utils/project-icons";
import { ActivityService } from "../services/activity.service";
import dayjs from "dayjs";
import "dayjs/locale/fr";

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

interface ProjectSettingsProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => Promise<void> | void;
}

type ProfileWithRole = { profile: Profile; role: string };
type ProfileWithInvite = { profile: Profile | null; invitation: Invitation };

export default function ProjectSettings({
  project,
  onUpdateProject,
}: ProjectSettingsProps) {
  const { userProfile } = useAuth();

  // 🧭 Onglets principaux
  const [mainTab, setMainTab] = useState<
    "info" | "collaborators" | "invitations"
  >("info");

  // 🧩 Sous-états existants
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectMemberRole>("reader");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<ProfileWithRole[]>([]);
  const [invitations, setInvitations] = useState<ProfileWithInvite[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState(project);
  const [showIconDropdown, setShowIconDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  const selectedIcon = projectIcons.find(
    (icon) => icon.name === editedProject.iconName
  );

  const formatDisplayDate = (value?: string) => {
    if (!value) return "—";
    const parsed = dayjs(value);
    if (!parsed.isValid()) return "—";
    return parsed.locale("fr").format("DD MMM YYYY [à] HH:mm");
  };

  const handleSaveProject = async () => {
    try {
      await Promise.resolve(onUpdateProject(editedProject));
      if (userProfile) {
        await ActivityService.create({
          ...ActivityService.initialData,
          projectId: project.id,
          type: "updated",
          description: `a modifié le projet ${editedProject.name}`,
          userId: userProfile.id,
        });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du projet :", error);
    } finally {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const members = await MemberService.getByProjectId(project.id);

        const profiles = await Promise.all(
          members.map(async (member) => {
            const profile = await ProfileService.getById(member.userId);
            return profile ? { profile, role: member.userRole } : null;
          })
        );
        setCollaborators(profiles.filter(Boolean) as ProfileWithRole[]);

        const invs = await InvitationService.getByProjectId(project.id);
        const pending = invs.filter((i) => i.status === "pending");
        const inviteProfiles = await Promise.all(
          pending.map(async (inv) => {
            const profile = await ProfileService.getById(inv.guestUserId);
            return { profile, invitation: inv };
          })
        );

        setInvitations(inviteProfiles);
      } catch (err) {
        console.error("❌ Erreur chargement :", err);
      } finally {
        setLoading(false);
      }
    };

    if (project.id) loadData();
  }, [project.id]);

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim() || !userProfile) return;
    setSendingInvite(true);

    try {
      const user = await ProfileService.getByEmail(inviteEmail.trim());
      if (!user) {
        alert("❌ Aucun utilisateur trouvé avec cet email.");
        return;
      }

      const invitation: Invitation = {
        id: Date.now().toString(),
        projectId: project.id,
        projectOwnerId: userProfile.id,
        guestUserId: user.id,
        guestUserRole: inviteRole,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await InvitationService.create(invitation);
      alert(`✅ Invitation envoyée à ${user.email}`);
      setInviteEmail("");
      setInviteRole("reader");
      setShowInviteModal(false);
    } catch (error) {
      console.error("❌ Erreur envoi invitation :", error);
      alert("Erreur lors de l’envoi de l’invitation.");
    } finally {
      setSendingInvite(false);
    }
  };
  const renderInfoTab = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
      {/* ────────────────
         🧾 Infos générales
      ──────────────── */}
      <section>
        <div className="flex items-center space-x-3 mb-4">
          <Tag className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">
            Informations générales
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <label className="block text-gray-500 mb-1">ID du projet</label>
            <p className="bg-gray-50 px-3 py-2 rounded-md font-mono text-gray-800">
              {project.id}
            </p>
          </div>

          <div>
            <label className="block text-gray-500 mb-1">Icône</label>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
              {selectedIcon ? (
                <selectedIcon.component
                  className="w-5 h-5 text-gray-600"
                  style={{ color: project.iconColor }}
                />
              ) : (
                <span className="text-sm text-gray-500">Aucune icône</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-500 mb-1">Créé le</label>
            <p className="bg-gray-50 px-3 py-2 rounded-md text-gray-800">
              {formatDisplayDate(project.createdAt)}
            </p>
          </div>

          <div>
            <label className="block text-gray-500 mb-1">
              Dernière mise à jour
            </label>
            <p className="bg-gray-50 px-3 py-2 rounded-md text-gray-800">
              {formatDisplayDate(project.updatedAt)}
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────
         ⚙️ Paramètres modifiables
      ──────────────── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Paramètres</h2>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition"
            >
              Modifier
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nom */}
          <div>
            <label className="text-sm font-medium text-gray-700">Nom</label>
            {isEditing ? (
              <input
                type="text"
                value={editedProject.name}
                onChange={(e) =>
                  setEditedProject({ ...editedProject, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="bg-gray-50 px-3 py-2 rounded-md">{project.name}</p>
            )}
          </div>

          {/* Couleur */}
          <div className="relative">
            <label className="text-sm font-medium text-gray-700">Couleur</label>
            {isEditing ? (
              <>
                <button
                  onClick={() => setShowColorDropdown(!showColorDropdown)}
                  className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border"
                      style={{ backgroundColor: editedProject.iconColor }}
                    />
                    <span>
                      {getColorName(editedProject.iconColor) || "Choisir"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showColorDropdown && (
                  <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg w-full grid grid-cols-2 gap-2 p-3">
                    {projectColors.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => {
                          setEditedProject({
                            ...editedProject,
                            iconColor: color.value,
                          });
                          setShowColorDropdown(false);
                        }}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded"
                      >
                        <div
                          className="w-5 h-5 rounded-full border"
                          style={{ backgroundColor: color.value }}
                        />
                        <span className="text-sm">{color.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
                <div
                  className="w-5 h-5 rounded-full border"
                  style={{ backgroundColor: project.iconColor }}
                />
                <span>{getColorName(project.iconColor)}</span>
              </div>
            )}
          </div>

          {/* Icône */}
          <div className="relative">
            <label className="text-sm font-medium text-gray-700">Icône</label>
            {isEditing ? (
              <>
                <button
                  onClick={() => setShowIconDropdown(!showIconDropdown)}
                  className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    {selectedIcon && (
                      <selectedIcon.component
                        className="w-5 h-5"
                        style={{ color: editedProject.iconColor }}
                      />
                    )}
                    <span>{selectedIcon?.name || "Choisir une icône"}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showIconDropdown && (
                  <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto w-full">
                    {projectIcons.map((icon) => (
                      <button
                        key={icon.name}
                        onClick={() => {
                          setEditedProject({
                            ...editedProject,
                            iconName: icon.name,
                          });
                          setShowIconDropdown(false);
                        }}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        <icon.component className="w-4 h-4" /> {icon.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
                {selectedIcon && (
                  <selectedIcon.component
                    className="w-5 h-5"
                    style={{ color: project.iconColor }}
                  />
                )}
                <span>{selectedIcon?.name || "—"}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Description
            </label>
            {isEditing ? (
              <textarea
                value={editedProject.description}
                onChange={(e) =>
                  setEditedProject({
                    ...editedProject,
                    description: e.target.value,
                  })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="bg-gray-50 px-3 py-2 rounded-md min-h-[80px]">
                {project.description || "Aucune description"}
              </p>
            )}
          </div>
        </div>

        {/* Boutons */}
        {isEditing && (
          <div className="flex justify-end gap-3 mt-6 border-t pt-4">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveProject}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
            >
              Sauvegarder
            </button>
          </div>
        )}
      </section>
    </div>
  );

  const renderCollaboratorsTab = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Collaborateurs</h2>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" /> Inviter
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-gray-500">
          <Loader2 className="animate-spin w-5 h-5 mr-2" /> Chargement...
        </div>
      ) : collaborators.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Aucun membre actif.</p>
      ) : (
        <table className="min-w-full border border-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Nom</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Rôle</th>
            </tr>
          </thead>
          <tbody>
            {collaborators.map((c) => (
              <tr key={c.profile.uid} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 flex items-center gap-2">
                  {c.profile.photoURL ? (
                    <img
                      src={c.profile.photoURL}
                      alt={c.profile.displayName || ""}
                      className="w-8 h-8 rounded-full border object-cover"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 text-white flex items-center justify-center rounded-full font-medium"
                      style={{
                        backgroundColor: c.profile.color || "#3B82F6",
                      }} // fallback bleu si pas de couleur
                    >
                      {c.profile.displayName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}

                  <span className="text-gray-800">{c.profile.displayName}</span>
                </td>

                <td className="px-4 py-2">{c.profile.email}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      RoleManager.roleColors[
                        c.role as keyof typeof RoleManager.roleColors
                      ]
                    }`}
                  >
                    {
                      RoleManager.roleLabels[
                        c.role as keyof typeof RoleManager.roleLabels
                      ]
                    }
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderInvitationsTab = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">
        Invitations en attente
      </h2>
      {loading ? (
        <div className="flex justify-center py-10 text-gray-500">
          <Loader2 className="animate-spin w-5 h-5 mr-2" /> Chargement...
        </div>
      ) : invitations.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          Aucune invitation en attente.
        </p>
      ) : (
        <table className="min-w-full border border-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Nom</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Rôle</th>
              <th className="px-4 py-2 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv.invitation.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 flex items-center gap-2">
                  {inv.profile?.photoURL ? (
                    <img
                      src={inv.profile?.photoURL}
                      alt={inv.profile?.displayName || ""}
                      className="w-8 h-8 rounded-full border object-cover"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 text-white flex items-center justify-center rounded-full font-medium"
                      style={{
                        backgroundColor: inv.profile?.color || "#3B82F6",
                      }} // fallback bleu si pas de couleur
                    >
                      {inv.profile?.displayName?.charAt(0)?.toUpperCase() ||
                        "?"}
                    </div>
                  )}

                  <span className="text-gray-800">
                    {inv.profile?.displayName}
                  </span>
                </td>
                <td className="px-4 py-2">{inv.profile?.email || "—"}</td>
                <td className="px-4 py-2">
                  {
                    RoleManager.roleLabels[
                      inv.invitation
                        .guestUserRole as keyof typeof RoleManager.roleLabels
                    ]
                  }
                </td>
                <td className="px-4 py-2 text-yellow-600 italic">En attente</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Tabs globaux */}
      <div className="flex space-x-2 border-b border-gray-200">
        {[
          { key: "info", label: "Informations" },
          { key: "collaborators", label: "Collaborateurs" },
          { key: "invitations", label: "Invitations" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              mainTab === tab.key
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu selon l’onglet */}
      {mainTab === "info" && renderInfoTab()}
      {mainTab === "collaborators" && renderCollaboratorsTab()}
      {mainTab === "invitations" && renderInvitationsTab()}

      {/* Modal d’invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Inviter un collaborateur
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rôle
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(
                      e.target.value as "editor" | "reader" | "guest"
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="editor">Éditeur</option>
                  <option value="reader">Lecteur</option>
                  <option value="guest">Invité</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={handleSendInvitation}
                disabled={!inviteEmail.trim() || sendingInvite}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition disabled:opacity-50"
              >
                {sendingInvite ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
