import { Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import dayjs from "dayjs";
import { FirebaseService } from "./firebase.service";
import { Tables } from "../models/tables";

export class DataService {
  public create = async <T extends keyof Tables>(
    collection: T,
    data: Tables[T]
  ) => {
    try {
      if (!collection) throw new Error(`Invalid collection: ${collection}`);

      const timestamp = Timestamp.now().toMillis();

      const docId =
        (data.id as string | undefined) ||
        [collection.slice(0, 2), timestamp].join("").toUpperCase();

      const collectionRef = admin.firestore().collection(collection);
      const docRef = collectionRef.doc(docId);
      const docSnap = await docRef.get();

      const newDoc: Tables[T] & { createdAt?: string; id: string } = {
        ...data,
        id: docId,
      };

      if (!docSnap.exists && !newDoc.createdAt) {
        newDoc.createdAt = dayjs(timestamp).toISOString();
      }

      await docRef.set(newDoc, { merge: true });

      return newDoc;
    } catch (error) {
      console.error("Erreur lors de la création du document:", error);
      throw error;
    }
  };

  public get = async <T>(
    collectionName: keyof Tables,
    constraints: {
      fieldPath: string;
      opStr: FirebaseFirestore.WhereFilterOp;
      value: any;
    }[]
  ) => {
    const firebaseService = new FirebaseService();

    return (await firebaseService.getDocByFilters<T>(
      collectionName,
      constraints
    )) as T;
  };

  public getAll = async <T>(
    collectionName: keyof Tables,
    constraints?: {
      fieldPath: string;
      opStr: FirebaseFirestore.WhereFilterOp;
      value: any;
    }[]
  ) => {
    const firebaseService = new FirebaseService();

    return await firebaseService.getCollectionDocs<T>(
      collectionName,
      constraints
    );
  };

  public update = async <T extends keyof Tables>(
    collection: T,
    id: string,
    updates: Partial<Tables[T]>
  ): Promise<void> => {
    try {
      const docRef = admin.firestore().collection(collection).doc(id);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        throw new Error(
          `Le document avec l'ID "${id}" n'existe pas dans "${collection}".`
        );
      }

      const currentData = snapshot.data() as Tables[T];

      // Ne garder que les champs qui ont réellement changé
      const filteredUpdates: Partial<Tables[T]> = {};
      for (const key in updates) {
        if (
          Object.prototype.hasOwnProperty.call(updates, key) &&
          updates[key] !== currentData[key as keyof Tables[T]]
        ) {
          filteredUpdates[key] = updates[key];
        }
      }

      if (Object.keys(filteredUpdates).length > 0) {
        await docRef.update(filteredUpdates);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du document:", error);
      throw error;
    }
  };

  public delete = async <T extends keyof Tables>(
    collection: T,
    id: string
  ): Promise<void> => {
    try {
      const docRef = admin.firestore().collection(collection).doc(id);
      await docRef.delete();
    } catch (error) {
      console.error("Erreur lors de la suppression du document:", error);
      throw error;
    }
  };

  async uploadJsonToStorage(
    jsonObject: any,
    destinationPath: string
  ): Promise<string> {
    const bucket = admin.storage().bucket();

    const file = bucket.file(destinationPath);
    const buffer = Buffer.from(JSON.stringify(jsonObject));

    await file.save(buffer, {
      contentType: "application/json",
      resumable: false,
    });

    // Optionnel : rendre le fichier public
    await file.makePublic();

    // Retourner l'URL publique
    return `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
  }
}
