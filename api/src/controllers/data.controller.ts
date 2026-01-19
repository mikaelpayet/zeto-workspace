import { Request, Response, Router } from "express";
import dayjs from "dayjs";
import * as admin from "firebase-admin";
import { DataService } from "../services/data.service";

export class DataController {
  public router = Router();

  private dataService = new DataService();

  constructor() {
    const router = this.router;
    router.post("/create", this.create);
    router.put("/update", this.update);
    router.get("/:collection/:docId", this.get);
    router.get("/:collection", this.getAll);
    router.delete("/delete/:collection/:docId", this.delete);
  }

  public create = async (req: Request, res: Response) => {
    const { collection, data } = req.body;
    try {
      const newDoc = await this.dataService.create(collection, data);

      res.status(200).json({
        message: `Doc in ${collection} id=${data.id} created successfully`,
        data: newDoc,
      });
    } catch (error) {
      console.error("Error creating mock document:", error);
      res.status(500).json({
        error: (error as Error).message || "An error occurred",
      });
    }
  };

  public update = async (req: Request, res: Response) => {
    try {
      const { collection, data, docId } = req.body;

      if (!collection || !docId) {
        return res.status(400).json({
          error: `Invalid collection or docId: ${collection}, ${docId}`,
        });
      }

      const collectionRef = admin.firestore().collection(collection);
      const docRef = collectionRef.doc(docId);

      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        return res.status(404).json({
          error: `Document with id ${docId} not found in collection ${collection}`,
        });
      }

      const updatedDoc = {
        ...data,
        updatedAt: dayjs().format(),
      };

      await docRef.update(updatedDoc);

      return res.status(200).json({
        message: `Document in ${collection} id=${docId} updated successfully`,
        data: updatedDoc,
      });
    } catch (error) {
      console.error("Error updating document:", error);
      return res.status(500).json({
        error: (error as Error).message || "An error occurred",
      });
    }
  };

  public get = async (req: Request, res: Response) => {
    try {
      const { collection, docId } = req.params;

      if (!collection || !docId) {
        return res.status(400).json({
          error: `Invalid collection or docId: ${collection}, ${docId}`,
        });
      }

      const collectionRef = admin.firestore().collection(collection);
      const docRef = collectionRef.doc(docId);

      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        return res.status(404).json({
          error: `Document with id ${docId} not found in collection ${collection}`,
        });
      }

      return res.status(200).json({
        message: `Document in ${collection} with id=${docId} found successfully`,
        data: docSnapshot.data(),
      });
    } catch (error) {
      console.error("Error retrieving document:", error);
      return res.status(500).json({
        error: (error as Error).message || "An error occurred",
      });
    }
  };

  public getAll = async (req: Request, res: Response) => {
    try {
      const { collection } = req.params;
      const { orderBy, direction, limit, offset } = req.query;

      if (!collection) {
        return res.status(400).json({ error: "Collection name is required." });
      }

      let query: FirebaseFirestore.Query = admin
        .firestore()
        .collection(collection);

      if (String(orderBy)) {
        query = query.orderBy(
          String(orderBy),
          (direction as "asc" | "desc") || "asc"
        );
      }

      if (offset && !isNaN(Number(offset))) {
        query = query.offset(Number(offset));
      }

      if (limit && !isNaN(Number(limit))) {
        query = query.limit(Number(limit));
      }

      const snapshot = await query.get();

      const getcollectionSize = async () => {
        const countSnapshot = await admin
          .firestore()
          .collection(collection)
          .count()
          .get();
        return countSnapshot.data().count;
      };

      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.status(200).json({
        data: docs,
        collectionSize: await getcollectionSize(),
      });
    } catch (error) {
      console.error("Error retrieving documents:", error);
      return res.status(500).json({
        error: (error as Error).message || "An error occurred",
      });
    }
  };

  public delete = async (req: Request, res: Response) => {
    try {
      const { collection, docId } = req.params;

      if (!collection || !docId) {
        return res.status(400).json({
          error: `Invalid collection or docId: ${collection}, ${docId}`,
        });
      }

      const collectionRef = admin.firestore().collection(collection);
      const docRef = collectionRef.doc(docId);

      // Vérifie si le document existe avant de tenter de le supprimer
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        return res.status(404).json({
          error: `Document with id ${docId} not found in collection ${collection}`,
        });
      }

      await docRef.delete(); // Suppression du document

      return res.status(200).json({
        message: `Document with id=${docId} in collection ${collection} deleted successfully`,
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      return res.status(500).json({
        error: (error as Error).message || "An error occurred",
      });
    }
  };
}
