import {
  QueryConstraint,
  QueryFieldFilterConstraint,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { db } from "../config/firebase";
import { Tables } from "../models/tables";

export const FirebaseServices = {
  async getDoc<T>(
    collectionName: string,
    ...constraints: QueryConstraint[]
  ): Promise<T | null> {
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnapshot = querySnapshot.docs[0]; // Premier document trouvé
        return { id: docSnapshot.id, ...docSnapshot.data() } as T;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du document :", error);
      throw error;
    }
  },

  async getDocs<T>(
    collectionName: keyof Tables,
    ...constraints: QueryConstraint[]
  ): Promise<T[]> {
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(
        collectionRef,
        ...[orderBy("createdAt", "desc"), ...constraints]
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
      } else {
        return [];
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des documents :", error);
      throw error;
    }
  },

  async getCount(
    collectionName: string,
    filter?: QueryFieldFilterConstraint
  ): Promise<number> {
    try {
      const collRef = collection(db, collectionName);
      const q = filter ? query(collRef, filter) : collRef;
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error(
        `Erreur lors du comptage de la collection ${collectionName}:`,
        error
      );
      return 0;
    }
  },

  async create<T>(
    collectionName: string,
    data: T
  ): Promise<{ id: string; data: T } | null> {
    try {
      const collRef = collection(db, collectionName);

      // 🔹 Création du document
      const docRef = await addDoc(collRef, {
        ...data,
        createdAt: (data as any).createdAt || new Date().toISOString(),
      });

      // 🔹 Mise à jour du champ "id" dans le document
      await updateDoc(docRef, { id: docRef.id });

      console.log(
        `✅ Document ajouté dans ${collectionName} (ID: ${docRef.id})`
      );

      // 🔹 Retourne l’ID + les données mises à jour
      return { id: docRef.id, data: { ...data, id: docRef.id } as T };
    } catch (error) {
      console.error("❌ Erreur lors de la création du document :", error);
      return null;
    }
  },

  async update<T>(
    collectionName: string,
    docId: string,
    updatedData: Partial<T>
  ): Promise<{ success: boolean; error: string | null }> {
    if (!collectionName || !docId || !updatedData) {
      throw new Error(
        "Les paramètres collectionName, docId et updatedData sont requis."
      );
    }

    try {
      const documentRef = doc(db, collectionName, docId);

      // Mise à jour du document
      await updateDoc(documentRef, updatedData);

      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || "Erreur inconnue",
      };
    }
  },

  async add<T>(collectionName: string, docValue: any) {
    try {
      const docRef = doc(db, collectionName, docValue.id);
      await setDoc(docRef, {
        ...docValue,
      });
      return docValue as T;
    } catch (error) {
      console.error("Erreur lors de l'ajout du document :", error);
      return null;
    }
  },

  async getDocumentById<T>(
    collectionName: string,
    docId: string
  ): Promise<{ data: T | null; error: boolean }> {
    try {
      const documentRef = doc(db, collectionName, docId);
      const documentSnapshot = await getDoc(documentRef);

      if (documentSnapshot.exists()) {
        return { data: documentSnapshot.data() as T, error: false };
      } else {
        console.warn(`Le document avec l'ID "${docId}" n'existe pas.`);
        return { data: null, error: false };
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du document :", error);
      return { data: null, error: true };
    }
  },

  async delete(collection: string, id: string) {
    try {
      const docRef = doc(db, collection, id);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        const message = `Aucun document trouvé avec l'ID ${id} dans la collection ${collection}`;
        console.warn(message);
        return { success: false, message };
      }

      await deleteDoc(docRef);
      const message = `Document avec l'ID ${id} supprimé de la collection ${collection}`;
      console.log(message);
      return { success: true, message };
    } catch (error) {
      const message = `Erreur lors de la suppression du document : ${error}`;
      console.error(message);
      return { success: false, message };
    }
  },

  async generateDocId(collectionName: string, docName?: string) {
    const key = (await this.getCollectionSize(collectionName)) || 0;
    const id = [docName, key + 1].join("-");

    return id;
  },

  async getCollectionSize(
    collectionName: string,
    where?: QueryFieldFilterConstraint
  ): Promise<number | null> {
    try {
      const collRef = collection(db, collectionName);
      const q = where ? query(collRef, where) : query(collRef);
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error("Error fetching collection size:", error);
      return null;
    }
  },

  listenToDocumentById<T>(
    collectionName: string,
    docId: string,
    callback: (data: T | null, error: boolean) => void
  ) {
    try {
      const documentRef = doc(db, collectionName, docId);

      const unsubscribe = onSnapshot(
        documentRef,
        (documentSnapshot) => {
          if (documentSnapshot.exists()) {
            callback(documentSnapshot.data() as T, false);
          } else {
            console.warn(`Le document avec l'ID "${docId}" n'existe pas.`);
            callback(null, false);
          }
        },
        (error) => {
          console.error("Erreur lors de l'écoute du document :", error);
          callback(null, true);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Erreur lors de la configuration de l'écoute :", error);
      callback(null, true);
      return () => {};
    }
  },

  // Méthode spécifique pour récupérer un chat par projectId
  async getChatByProjectId(projectId: string) {
    try {
      const chats = await this.getDocs<any>(
        "chats",
        where("projectId", "==", projectId)
      );
      return chats.length > 0 ? chats[0] : null;
    } catch (error) {
      console.error("Erreur lors de la récupération du chat:", error);
      return null;
    }
  },

  async deleteFromStorage(filePath: string) {
    try {
      const storage = getStorage();
      const fileRef = ref(storage, filePath);

      await deleteObject(fileRef);
      console.log(`Fichier supprimé du storage à l'emplacement : ${filePath}`);
    } catch (error) {
      console.error("Erreur lors de la suppression du fichier :", error);
      throw error;
    }
  },

  async upload({
    file,
    destDir,
    onProgress,
    makePublic,
  }: {
    file: File | Blob;
    destDir: string;
    onProgress?: (pct: number) => void;
    makePublic?: boolean;
  }): Promise<{
    path: string;
    downloadURL: string;
    size: number;
    contentType: string | null;
  }> {
    const storage = getStorage();
    const filename = (file as File).name ?? `file_${Date.now()}`;

    const objectPath = `${destDir}/${filename}`;
    const objectRef = ref(storage, objectPath);

    const task = uploadBytesResumable(objectRef, file);

    const res = await new Promise<{
      path: string;
      downloadURL: string;
      size: number;
      contentType: string | null;
    }>((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(pct);
        },
        (err) => reject(err),
        async () => {
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          resolve({
            path: task.snapshot.ref.fullPath,
            downloadURL,
            size: task.snapshot.totalBytes,
            contentType: task.snapshot.metadata?.contentType ?? null,
          });
        }
      );
    });

    return res;
  },

  async getDocsPaginated<T>(
    collectionName: string,
    conditions: any[]
  ): Promise<{ docs: T[]; lastVisible: any }> {
    const q = query(collection(db, collectionName), ...conditions);
    const snap = await getDocs(q);

    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
    const lastVisible = snap.docs[snap.docs.length - 1] || null;

    return { docs, lastVisible };
  },
};
