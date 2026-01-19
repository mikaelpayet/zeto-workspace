// src/services/FirebaseService.ts
import * as admin from "firebase-admin";
import { initFirebaseAdmin } from "../config/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Bucket } from "@google-cloud/storage";

/* -------------------- TYPES -------------------- */
type UploadInput =
  | {
      buffer: Buffer;
      filename: string;
      mimeType?: string;
      destDir?: string;
      public?: boolean;
      cacheControl?: string;
    }
  | {
      localPath: string;
      filename?: string;
      mimeType?: string;
      destDir?: string;
      public?: boolean;
      cacheControl?: string;
    };

export type OrderDirection = "asc" | "desc";
export type WhereOp =
  | "<"
  | "<="
  | "=="
  | ">="
  | ">"
  | "!="
  | "array-contains"
  | "in"
  | "array-contains-any"
  | "not-in";

/** Options pour list/query */
export interface ListOptions {
  limit?: number;
  orderBy?: string;
  direction?: OrderDirection;
  startAfterId?: string; // paginate sur un id doc connu
}

/* -------------------- SERVICE -------------------- */
export class FirebaseService {
  private bucket: Bucket;

  constructor(opts?: { bucketName?: string }) {
    const app = initFirebaseAdmin();
    const bucketName = opts?.bucketName || process.env.STORAGE_BUCKET!;
    this.bucket = admin.storage(app).bucket(bucketName);
  }

  /* ======== STORAGE: upload/delete ======== */
  async upload(input: UploadInput) {
    const token = uuidv4();
    const destDir = (
      ("destDir" in input && input.destDir) ||
      "uploads"
    ).replace(/^\/+|\/+$/g, "");
    const filename =
      "filename" in input && input.filename
        ? sanitizeFilename(input.filename)
        : this.basename(
            ("localPath" in input && input.localPath) || `file-${Date.now()}`
          );
    const objectPath = [destDir, filename]
      .filter(Boolean)
      .join("/")
      .replace(/\/+/g, "/");

    const file = this.bucket.file(objectPath);
    const commonMetadata = {
      contentType:
        "mimeType" in input && input.mimeType ? input.mimeType : undefined,
      metadata: { firebaseStorageDownloadTokens: token },
      cacheControl:
        ("cacheControl" in input && input.cacheControl) || undefined,
    } as const;

    if ("buffer" in input) {
      await file.save(input.buffer, {
        contentType: input.mimeType,
        resumable: false,
        metadata: commonMetadata,
        validation: "crc32c",
      });
    } else {
      await this.bucket.upload(input.localPath, {
        destination: objectPath,
        resumable: false,
        metadata: commonMetadata,
        validation: "crc32c",
      });
    }

    const isPublic = ("public" in input && input.public) === true;
    if (isPublic) await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${
      this.bucket.name
    }/${encodeURI(objectPath)}`;
    const tokenUrl = `https://firebasestorage.googleapis.com/v0/b/${
      this.bucket.name
    }/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    return {
      path: objectPath,
      bucket: this.bucket.name,
      contentType: commonMetadata.contentType,
      signedUrl,
      publicUrl: isPublic ? publicUrl : undefined,
      tokenUrl: isPublic ? undefined : tokenUrl,
    };
  }

  async delete(objectPath: string) {
    const cleanPath = objectPath.replace(/^\/+/, "");
    await this.bucket.file(cleanPath).delete({ ignoreNotFound: true });
  }

  /* ------------------- utils ------------------- */
  private basename(p: string) {
    return (p.split(/[\\/]/).pop() || p).trim();
  }

  /* ======== FIRESTORE: CRUD ======== */

  public async getDocumentById<T>(collection: string, docId: string) {
    try {
      const docRef = admin.firestore().collection(collection).doc(docId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        return null;
      }

      return {
        id: docSnapshot.id,
        ...docSnapshot.data(),
      } as T;
    } catch (error) {
      console.error("Erreur lors de la récupération du document:", error);
      throw new Error("Erreur lors de la récupération du document");
    }
  }

  public async getCollectionDocs<T>(
    collection: string,
    constraints?: {
      fieldPath: string;
      opStr: FirebaseFirestore.WhereFilterOp;
      value: any;
    }[]
  ): Promise<T[]> {
    try {
      let query: FirebaseFirestore.Query = admin
        .firestore()
        .collection(collection);

      if (constraints && constraints.length > 0) {
        for (const constraint of constraints) {
          query = query.where(
            constraint.fieldPath,
            constraint.opStr,
            constraint.value
          );
        }
      }

      const querySnapshot = await query.get();

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
  }

  public async getDocByFilters<T>(
    collection: string,
    constraints: {
      fieldPath: string;
      opStr: FirebaseFirestore.WhereFilterOp;
      value: any;
    }[]
  ): Promise<T | null> {
    try {
      let query: FirebaseFirestore.Query = admin
        .firestore()
        .collection(collection);

      // Enchaîne les filtres manuellement
      for (const constraint of constraints) {
        query = query.where(
          constraint.fieldPath,
          constraint.opStr,
          constraint.value
        );
      }

      const querySnapshot = await query.limit(1).get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
        } as T;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des documents :", error);
      throw error;
    }
  }
}

function sanitizeFilename(name: string) {
  return name.replace(/[/\\?%*:|"<>]/g, "_").trim() || `file-${Date.now()}`;
}
