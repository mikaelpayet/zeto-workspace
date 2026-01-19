// src/utils/firebaseErrors.ts

/**
 * Dictionnaire des codes d'erreurs Firebase → message traduit en français.
 */
export const firebaseErrorMessages: Record<string, string> = {
  // 🔐 Authentification
  "auth/invalid-email": "L'adresse e-mail est invalide.",
  "auth/user-disabled": "Ce compte a été désactivé.",
  "auth/user-not-found": "Aucun utilisateur trouvé avec cette adresse e-mail.",
  "auth/wrong-password": "Le mot de passe est incorrect.",
  "auth/email-already-in-use": "Cette adresse e-mail est déjà utilisée.",
  "auth/weak-password":
    "Le mot de passe est trop faible (minimum 6 caractères).",
  "auth/missing-password": "Veuillez saisir un mot de passe.",
  "auth/too-many-requests":
    "Trop de tentatives échouées. Veuillez réessayer plus tard.",
  "auth/popup-closed-by-user":
    "La fenêtre de connexion a été fermée avant la fin du processus.",
  "auth/cancelled-popup-request":
    "Une autre tentative de connexion est déjà en cours.",
  "auth/popup-blocked":
    "Le navigateur a bloqué la fenêtre de connexion. Veuillez autoriser les pop-ups.",
  "auth/network-request-failed":
    "Problème de connexion réseau. Vérifiez votre internet.",
  "auth/invalid-credential":
    "Les identifiants de connexion sont invalides ou ont expiré.",
  "auth/operation-not-allowed":
    "Cette méthode de connexion n'est pas autorisée.",
  "auth/internal-error":
    "Une erreur interne est survenue. Veuillez réessayer plus tard.",
  "auth/argument-error": "Une erreur est survenue lors de la requête.",

  // 📧 Vérification email
  "auth/missing-email": "Veuillez renseigner une adresse e-mail.",
  "auth/invalid-verification-code":
    "Le code de vérification est invalide ou a expiré.",
  "auth/invalid-verification-id":
    "L’identifiant de vérification est invalide ou expiré.",

  // 🧾 Firestore / Realtime DB
  "permission-denied":
    "Vous n'avez pas la permission d'effectuer cette action.",
  unavailable:
    "Le service Firestore est temporairement indisponible. Réessayez plus tard.",
  "not-found": "L'élément demandé n'existe pas.",

  // 🔑 Storage
  "storage/unauthorized":
    "Vous n'avez pas l'autorisation d'accéder à ce fichier.",
  "storage/canceled": "Le transfert a été annulé.",
  "storage/unknown": "Une erreur inconnue est survenue avec le stockage.",
};

/**
 * Retourne un message traduit à partir du code d'erreur Firebase.
 */
export function translateFirebaseError(error: any): string {
  if (!error) return "Une erreur inconnue est survenue.";
  const code = error.code || error.message || "unknown";
  return (
    firebaseErrorMessages[code] ||
    "Une erreur est survenue. Veuillez réessayer."
  );
}
