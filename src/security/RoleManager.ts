import { ProjectMemberRole, Role } from "../models/index";

type AppPage =
  | "dashboard"
  | "projects"
  | "admin"
  | "profile"
  | "settings"
  | "users";

type Action =
  | "create_project"
  | "edit_project"
  | "delete_project"
  | "manage_users"
  | "view_stats"
  | "update_profile";

/**
 * Classe de gestion hiérarchique des rôles et permissions
 */
export class RoleManager {
  /**
   * Hiérarchie des rôles : plus la valeur est grande, plus le rôle est élevé
   */
  private static hierarchy: Record<Role, number> = {
    user: 1,
    admin: 2,
  };

  /**
   * Définition des permissions par rôle
   */
  private static permissions: Record<
    Role,
    {
      pages: AppPage[];
      actions: Action[];
    }
  > = {
    user: {
      pages: ["dashboard", "projects", "profile", "settings"],
      actions: ["create_project", "edit_project", "update_profile"],
    },
    admin: {
      pages: ["dashboard", "projects", "profile", "settings", "admin", "users"],
      actions: [
        "create_project",
        "edit_project",
        "delete_project",
        "manage_users",
        "view_stats",
        "update_profile",
      ],
    },
  };

  /**
   * Vérifie si un rôle a accès à une page
   */
  static canAccessPage(role: Role, page: AppPage): boolean {
    return this.permissions[role]?.pages.includes(page) || false;
  }

  /**
   * Vérifie si un rôle a droit d’effectuer une action
   */
  static canPerformAction(role: Role, action: Action): boolean {
    return this.permissions[role]?.actions.includes(action) || false;
  }

  /**
   * Vérifie si un rôle est supérieur ou égal à un autre
   */
  static isHigherOrEqual(roleA: Role, roleB: Role): boolean {
    return this.hierarchy[roleA] >= this.hierarchy[roleB];
  }

  /**
   * Liste les pages autorisées pour un rôle
   */
  static getAllowedPages(role: Role): AppPage[] {
    return this.permissions[role]?.pages ?? [];
  }

  /**
   * Liste les actions autorisées pour un rôle
   */
  static getAllowedActions(role: Role): Action[] {
    return this.permissions[role]?.actions ?? [];
  }

  static roleLabels: Record<ProjectMemberRole, string> = {
    owner: "Propriétaire",
    editor: "Éditeur",
    reader: "Lecteur",
    guest: "Invité",
  };

  static roleColors: Record<ProjectMemberRole, string> = {
    owner: "bg-yellow-100 text-yellow-800",
    editor: "bg-blue-100 text-blue-800",
    reader: "bg-green-100 text-green-800",
    guest: "bg-gray-100 text-gray-700",
  };
}
