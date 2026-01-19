/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryConstraint, where, or } from "firebase/firestore";
import { FirebaseServices } from "./firebase.service";
import { Member, Profile, Project, ProjectByMember } from "../models";
import { MemberService } from "./member.service";
import { Tables } from "../models/tables";

export class ProjectService {
  private static tableName: keyof Tables = "projects";

  public static get initialData() {
    const data: Project = {
      id: "",
      name: "",
      description: "",
      date: "",
      iconColor: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return data;
  }

  public static async create(data: Project, userProfile: Profile) {
    const createdProject = await FirebaseServices.add<Project>(
      this.tableName,
      data
    );

    const newMember = {
      ...MemberService.initialData,
      projectId: data.id,
      userId: userProfile.id,
      userRole: "owner",
      invitationId: "",
    };

    const createdMember = await FirebaseServices.add<Member>(
      "members",
      newMember
    );

    return {
      createdProject,
      createdMember,
    };
  }

  public static async delete(id: string) {
    return await FirebaseServices.delete(this.tableName, id);
  }

  public static async getAll(constraints?: QueryConstraint[]) {
    return await FirebaseServices.getDocs<Project>(
      this.tableName,
      ...(constraints ?? [])
    );
  }

  public static async update(projectId: string, data: Partial<Project>) {
    return await FirebaseServices.update(this.tableName, projectId, data);
  }

  public static async getById(projectId: string) {
    return await FirebaseServices.getDoc<Project>(
      this.tableName,
      where("id", "==", projectId)
    );
  }

  public static async getByUserId(userId: string): Promise<ProjectByMember[]> {
    if (!userId) return [];

    try {
      // 1️⃣ Récupère tous les membres associés à cet utilisateur
      const userMembers = await FirebaseServices.getDocs<Member>(
        "members",
        where("userId", "==", userId)
      );

      if (!userMembers.length) return [];

      // 2️⃣ Pour chaque membre → récupérer le projet associé
      const projectPromises = userMembers.map(async (member) => {
        const projects = await FirebaseServices.getDocs<Project>(
          "projects",
          where("id", "==", member.projectId)
        );

        // On suppose que l'ID est unique → on prend le premier résultat
        const project = projects[0];

        return {
          project,
          userRole: member.userRole,
        };
      });

      // 3️⃣ Attend toutes les requêtes Firestore
      const projectResults = await Promise.all(projectPromises);

      // 4️⃣ Supprime les entrées où le projet n'existe pas (au cas où)
      const validProjects = projectResults.filter((p) => !!p.project);

      // 5️⃣ Trie par dernière interaction (updatedAt > createdAt > date)
      const getTimestamp = (project: Project | undefined) => {
        if (!project) return 0;
        const value =
          project.updatedAt ||
          project.createdAt ||
          project.date ||
          project.id;
        const timestamp = Number(value);
        if (!Number.isNaN(timestamp)) return timestamp;
        const parsed = new Date(value).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      return validProjects.sort(
        (a, b) => getTimestamp(b.project) - getTimestamp(a.project)
      );
    } catch (err) {
      console.error("❌ Erreur getByUserId :", err);
      return [];
    }
  }
}
