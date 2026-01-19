import { where, QueryConstraint } from "firebase/firestore";
import { Member } from "../../api/src/models";
import { Tables } from "../../api/src/models/tables";
import { FirebaseServices } from "./firebase.service";

export class MemberService {
  private static COLLECTION: keyof Tables = "members";

  static get initialData(): Member {
    return {
      id: `${Date.now()}`,
      projectId: "",
      userId: "",
      userRole: "guest",
      invitationId: "",
      createdAt: new Date().toISOString(),
    };
  }

  static async create(data: Member): Promise<Member | null> {
    try {
      const result = await FirebaseServices.add<Member>(this.COLLECTION, data);

      if (!result?.id) throw new Error("Aucun ID renvoyé par Firebase");
      return { ...data, id: result.id };
    } catch (err) {
      console.error("❌ Erreur création membre :", err);
      return null;
    }
  }

  static async getAll(): Promise<Member[]> {
    try {
      return await FirebaseServices.getDocs<Member>(this.COLLECTION);
    } catch (err) {
      console.error("❌ Erreur récupération membres :", err);
      return [];
    }
  }

  static async get(constraints?: QueryConstraint[]): Promise<Member[]> {
    try {
      return await FirebaseServices.getDocs<Member>(
        this.COLLECTION,
        ...(constraints || [])
      );
    } catch (err) {
      console.error("❌ Erreur récupération membres :", err);
      return [];
    }
  }

  static async getByProjectId(projectId: string): Promise<Member[]> {
    try {
      return await FirebaseServices.getDocs<Member>(
        this.COLLECTION,
        where("projectId", "==", projectId)
      );
    } catch (err) {
      console.error("❌ Erreur getByProjectId :", err);
      return [];
    }
  }

  static async update(id: string, updates: Partial<Member>): Promise<boolean> {
    try {
      const result = await FirebaseServices.update<Member>(
        this.COLLECTION,
        id,
        updates
      );
      return !!result?.success;
    } catch (err) {
      console.error("❌ Erreur update member :", err);
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await FirebaseServices.delete(this.COLLECTION, id);
      return !!result?.success;
    } catch (err) {
      console.error("❌ Erreur suppression membre :", err);
      return false;
    }
  }
}
