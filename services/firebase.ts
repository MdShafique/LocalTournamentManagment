import { initializeApp } from "firebase/app";
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
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Export it so other files can use it
export const db = getFirestore(app);