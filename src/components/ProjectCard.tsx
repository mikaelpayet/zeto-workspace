import React from "react";
import * as LucideIcons from "lucide-react";
import { Project, ProjectMemberRole } from "../models";

type ProjectCardProps = {
  project: Project;
  onClick?: (project: Project) => void;
  userRole?: ProjectMemberRole;
  className?: string;
  footer?: React.ReactNode;
};

const roleLabels: Record<ProjectMemberRole, string> = {
  owner: "👑 Propriétaire",
  editor: "🛠️ Éditeur",
  reader: "📖 Lecteur",
  guest: "👥 Invité",
};

export default function ProjectCard({
  project,
  onClick,
  userRole,
  className = "",
  footer,
}: ProjectCardProps) {
  if (!project) return null;

  const handleClick = () => {
    if (onClick) {
      onClick(project);
    }
  };

  const iconColor = project.iconColor || "#3B82F6";
  const IconComponent =
    project.iconName && (LucideIcons as any)[project.iconName]
      ? (LucideIcons as any)[project.iconName]
      : LucideIcons.FolderKanban;

  return (
    <div
      onClick={handleClick}
      className={`bg-white border border-gray-200 rounded-xl shadow-sm p-5 transition-all ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-blue-400" : ""
      } ${className}`}
      role={onClick ? "button" : undefined}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${iconColor}20` }}
          >
            <IconComponent className="w-6 h-6" style={{ color: iconColor }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg truncate">
              {project.name}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2">
              {project.description || "Pas de description."}
            </p>
          </div>
        </div>
      </div>

      {userRole && (
        <div className="mb-4 text-sm text-gray-600">
          Rôle :{" "}
          <span className="font-medium text-gray-800">
            {roleLabels[userRole] ?? userRole}
          </span>
        </div>
      )}

      {footer && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          {footer}
        </div>
      )}
    </div>
  );
}
