import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBV-D6--lLiniEfUbuNNIubGt7m8BcEF_c",
  authDomain: "smart-medicine-monitoring.firebaseapp.com",
  projectId: "smart-medicine-monitoring",
  storageBucket: "smart-medicine-monitoring.firebasestorage.app",
  messagingSenderId: "923390892855",
  appId: "1:923390892855:web:7f67891da360bcecd558b2",
  measurementId: "G-GX747C1Z2L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };