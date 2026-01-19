import { where } from "firebase/firestore";
import { getRandomColor } from "../utils/colors";
import { Profile } from "../models/index";
import { FirebaseServices } from "./firebase.service";

const COLLECTION = "profiles";

export const ProfileService = {
  /**
   * 🔍 Récupère un profil via l’e-mail du user
   */
  async getByEmail(email: string): Promise<Profile | null> {
    if (!email) return null;
    return await FirebaseServices.getDoc<Profile>(
      COLLECTION,
      where("email", "==", email)
    );
  },

  /**
   * 🔍 Récupère un profil via l’UID Firebase
   */
  async getByUid(uid: string): Promise<Profile | null> {
    if (!uid) return null;
    const data = await FirebaseServices.getDoc<Profile>(
      COLLECTION,
      where("uid", "==", uid)
    );
    return data;
  },

  async getById(id: string): Promise<Profile | null> {
    if (!id) return null;
    const data = await FirebaseServices.getDoc<Profile>(
      COLLECTION,
      where("id", "==", id)
    );
    return data;
  },

  /**
   * ➕ Crée un profil (avec l’UID comme ID du document)
   */
  async create(profile: Profile) {
    return await FirebaseServices.create<Profile>(COLLECTION, profile);
  },

  /**
   * 🔁 Synchronise le profil avec Firebase Auth
   * (crée s’il n’existe pas, sinon met à jour)
   */
  async syncWithAuthUser(user: any): Promise<Profile | null> {
    if (!user?.uid || !user?.email) return null;

    const existing = await this.getByUid(user.uid);

    const profileData: Profile = {
      id: Date.now().toString(),
      uid: user.uid,
      role: "user",
      displayName: user.displayName || user.email.split("@")[0],
      email: user.email,
      phoneNumber: user.phoneNumber || null,
      photoURL: user.photoURL || null,
      color: existing?.color || getRandomColor(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    if (!existing) {
      console.log("🆕 Création du profil Firestore…");
      await this.create(profileData);
    } else {
      console.log("♻️ Mise à jour du profil Firestore…");
      await FirebaseServices.update<Profile>(COLLECTION, user.id, profileData);
    }

    return profileData;
  },

  /**
   * ✏️ Met à jour un profil via son UID
   */
  async update(id: string, data: Partial<Profile>) {
    if (!id) throw new Error("id manquant pour la mise à jour du profil.");
    return await FirebaseServices.update<Profile>(COLLECTION, id, data);
  },

  /**
   * ❌ Supprime un profil via son UID
   */
  async delete(uid: string) {
    if (!uid) throw new Error("UID manquant pour la suppression du profil.");
    return await FirebaseServices.delete(COLLECTION, uid);
  },

  /**
   * 📋 Liste tous les profils
   */
  async getAll(): Promise<Profile[]> {
    return await FirebaseServices.getDocs<Profile>(COLLECTION);
  },
};
