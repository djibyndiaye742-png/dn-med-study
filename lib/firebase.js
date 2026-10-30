import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "COLLE_TA_CLE_API_EXISTANTE",
  authDomain: "dn-med-study.firebaseapp.com",
  projectId: "dn-med-study",
  storageBucket: "dn-med-study.firebasestorage.app",
  messagingSenderId: "615413381308",
  appId: "1:615413381308:web:fd79bd6449dbd7c3da38b9"
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
