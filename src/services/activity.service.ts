/* eslint-disable @typescript-eslint/no-explicit-any */

import { QueryConstraint, where } from "firebase/firestore";
import { FirebaseServices } from "./firebase.service";
import { Activity } from "../models";
import dayjs from "dayjs";
import { Tables } from "../models/tables";
import { ProjectService } from "./project.service";

export class ActivityService {
  private static tableName: keyof Tables = "activities";

  public static get initialData() {
    const result: Activity = {
      id: Date.now().toString(),
      projectId: "",
      type: "created",
      description: "",
      createdAt: dayjs().format(),
      userId: "",
    };
    return result;
  }

  public static async create(data: Activity) {
    const created = await FirebaseServices.add<Activity>(
      this.tableName,
      data
    );

    if (data.projectId) {
      try {
        await ProjectService.update(data.projectId, {
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(
          "Erreur lors de la mise à jour du projet après création d'activité :",
          error
        );
      }
    }

    return created;
  }

  public static async delete(id: string) {
    return await FirebaseServices.delete(this.tableName, id);
  }

  public static async getAll(constraints?: QueryConstraint[]) {
    return await FirebaseServices.getDocs<Activity>(
      this.tableName,
      ...(constraints ?? [])
    );
  }

  public static async update(id: string, data: Partial<Activity>) {
    return await FirebaseServices.update(this.tableName, id, data);
  }

  public static async getById(id: string) {
    return await FirebaseServices.getDoc<Activity>(
      this.tableName,
      where("id", "==", id)
    );
  }

  public static async getByProjectId(
    projectId: string,
    constraints?: QueryConstraint[]
  ) {
    return await FirebaseServices.getDocs<Activity>(
      this.tableName,
      where("projectId", "==", projectId),
      ...(constraints ?? [])
    );
  }
}
