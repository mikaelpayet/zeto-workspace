import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC3nZ3Bhp2sq492MiaGLSsa5-YHeMzz3iY",
  authDomain: "zeto-82b32.firebaseapp.com",
  projectId: "zeto-82b32",
  storageBucket: "zeto-82b32.firebasestorage.app",
  messagingSenderId: "266422864681",
  appId: "1:266422864681:web:deb8c763237f1e3f7d0538",
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDB = getDatabase(app);
