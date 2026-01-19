/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryConstraint, where, or } from "firebase/firestore";
import { FirebaseServices } from "./firebase.service";
import { Invitation, ProjectByMember } from "../models";
import { MemberService } from "./member.service";
import { Tables } from "../models/tables";

export class InvitationService {
  private static tableName: keyof Tables = "invitations";

  public static get initialData() {
    const data: Invitation = {
      id: "",
      projectId: "",
      projectOwnerId: "",
      guestUserId: "",
      guestUserRole: "owner",
      status: "accepted",
      createdAt: "",
    };
    return data;
  }

  public static async create(data: Invitation) {
    return await FirebaseServices.add<Invitation>(this.tableName, data);
  }

  public static async delete(id: string) {
    return await FirebaseServices.delete(this.tableName, id);
  }

  public static async getAll(constraints?: QueryConstraint[]) {
    return await FirebaseServices.getDocs<Invitation>(
      this.tableName,
      ...(constraints ?? [])
    );
  }

  public static async update(projectId: string, data: Partial<Invitation>) {
    return await FirebaseServices.update(this.tableName, projectId, data);
  }

  public static async getById(id: string) {
    return await FirebaseServices.getDoc<Invitation>(
      this.tableName,
      where("id", "==", id)
    );
  }

  public static async getByUserId(userId: string) {
    return await FirebaseServices.getDocs<Invitation>(
      this.tableName,
      where("guestUserId", "==", userId)
    );
  }

  public static async getByProjectId(projectId: string) {
    return await FirebaseServices.getDocs<Invitation>(
      this.tableName,
      where("projectId", "==", projectId)
    );
  }
}
