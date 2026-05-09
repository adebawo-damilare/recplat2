import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";
import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const serverDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);