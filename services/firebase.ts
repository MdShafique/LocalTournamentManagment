
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup as firebaseSignIn, 
  signOut as firebaseSignOut, 
  onAuthStateChanged as firebaseOnAuth,
  User 
} from "firebase/auth";
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
// Fix: Use a safer initialization pattern for Firebase modular SDK ensuring app instance is singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Fix: Exporting modular instances with correct initialization
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Wrappers
// Fix: Providing functional wrappers that call standard Firebase methods
export const signInWithPopup = async (authInstance: any, provider: any) => {
  return firebaseSignIn(authInstance, provider);
};

export const signOut = async (authInstance: any) => {
  return firebaseSignOut(authInstance);
};

export const onAuthStateChanged = (authInstance: any, callback: any) => {
  return firebaseOnAuth(authInstance, callback);
};

// Fix: Correctly exporting the User type from firebase/auth to avoid namespace resolution errors
export type { User };