
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup as firebaseSignIn, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDbkXfpMD538ZTs8IEcNnDwJU1t3zRtdA",
  authDomain: "localtournamentmanagment.firebaseapp.com",
  projectId: "localtournamentmanagment",
  storageBucket: "localtournamentmanagment.firebasestorage.app",
  messagingSenderId: "86883931756",
  appId: "1:86883931756:web:d795a4bf3583160798aa49",
  measurementId: "G-W2BSK1L00Y"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Wrappers
export const signInWithPopup = async (authInstance: any, provider: any) => {
  return firebaseSignIn(authInstance, provider);
};

export const signOut = async (authInstance: any) => {
  return firebaseSignOut(authInstance);
};

export const onAuthStateChanged = (authInstance: any, callback: any) => {
  return firebaseOnAuth(authInstance, callback);
};

export type User = import("firebase/auth").User;
