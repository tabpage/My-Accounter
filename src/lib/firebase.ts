// Firebase initialisation for My Accounter
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBH1cRSWSqIMTn78dr0hadxcZkYJyyo3yc",
  authDomain: "my-data-studio-122130.firebaseapp.com",
  databaseURL: "https://my-data-studio-122130-default-rtdb.firebaseio.com",
  projectId: "my-data-studio-122130",
  storageBucket: "my-data-studio-122130.firebasestorage.app",
  messagingSenderId: "36383936175",
  appId: "1:36383936175:web:c1475753cc23c589734e5a",
  measurementId: "G-L0M1L68ZDC",
};

// Initialize Firebase (guarded against double init during hot reloads)
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

let database: Database | null = null;
/** Lazily resolve the Realtime Database (used for optional cloud sync). */
export function getDb(): Database {
  if (!database) database = getDatabase(app);
  return database;
}

// Analytics is optional — only initialise where the browser supports it.
isSupported()
  .then((ok) => {
    if (ok) {
      try {
        getAnalytics(app);
      } catch {
        /* analytics unavailable — ignore */
      }
    }
  })
  .catch(() => undefined);
