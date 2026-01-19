import React, { useEffect, useState } from "react";
import { auth } from "../config/firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { translateFirebaseError } from "../utils/firebaseErrors";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Profile } from "../models";
import { ProfileService } from "../services/profile.service";

export const GOOGLE_ICON = "https://www.google.com/favicon.ico";

export default function LoginPage() {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const googleProvider = new GoogleAuthProvider();

  function handleRedirect() {
    navigate("/");
  }

  // 🔹 Vérifie et crée un profil Firestore si inexistant
  const createProfileIfNotExists = async (user: any) => {
    if (!user) return;

    try {
      // 🔹 Vérifie si un profil existe déjà via l’UID
      const existing = await ProfileService.getByUid(user.uid);

      if (!existing) {
        const profileData: Profile = {
          id: Date.now().toString(),
          uid: user.uid,
          displayName: user.displayName || user.email.split("@")[0],
          email: user.email,
          phoneNumber: user.phoneNumber || null,
          photoURL: user.photoURL || null,
          color: getRandomColor(),
          createdAt: new Date().toISOString(),
          role: "user",
        };

        // 🔹 Utilise la fonction centralisée du ProfileService
        await ProfileService.create(profileData);
        console.log("✅ Profil créé :", profileData);
      }
    } catch (error) {
      console.error("❌ Erreur lors de la création du profil :", error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createProfileIfNotExists(result.user);
      handleRedirect();
    } catch (error: any) {
      setError(translateFirebaseError(error));
    }
  };

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      handleRedirect();
    } catch (error: any) {
      console.log(error);
      setError(translateFirebaseError(error));
    }
  };

  const handleEmailPasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Optionnel : définir le displayName localement
      await updateProfile(user, {
        displayName: email.split("@")[0],
      });

      // 🔹 Crée le profil Firestore
      await createProfileIfNotExists({
        ...user,
        displayName: email.split("@")[0],
      });

      handleRedirect();
    } catch (error: any) {
      setError(translateFirebaseError(error));
    }
  };

  useEffect(() => {
    if (currentUser) {
      handleRedirect();
    }
  }, [currentUser]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">
          {isSignUp ? "Créer un compte" : "Se connecter"}
        </h2>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <form
          className="space-y-6"
          onSubmit={
            isSignUp ? handleEmailPasswordSignUp : handleEmailPasswordSignIn
          }
        >
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isSignUp ? "S'inscrire" : "Se connecter"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Ou continuer avec
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex gap-1 justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <img src={GOOGLE_ICON} alt="Google" style={{ width: 20 }} />
          Google
        </button>

        <div className="text-sm text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {isSignUp
              ? "Vous avez déjà un compte ? Se connecter"
              : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}
function getRandomColor(): string {
  throw new Error("Function not implemented.");
}
