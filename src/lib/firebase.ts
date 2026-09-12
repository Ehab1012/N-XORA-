import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

export {
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
};
export type { FirebaseUser };
