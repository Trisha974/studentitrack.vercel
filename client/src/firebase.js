
import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged as firebaseOnAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs } from 'firebase/firestore'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
]

const missingVars = requiredEnvVars.filter(key => !import.meta.env[key])
if (missingVars.length > 0) {
  console.error('❌ Missing Firebase environment variables:', missingVars.join(', '))
  console.error('💡 Please check your .env file in client/ directory')
}

let app
try {
  app = initializeApp(firebaseConfig)
  console.log('✅ Firebase initialized successfully')
} catch (error) {
  console.error('❌ Firebase initialization failed:', error)
  throw error
}

let analytics = null
try {
  if (typeof window !== 'undefined') analytics = getAnalytics(app)
} catch (e) {
  analytics = null
}

const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

async function registerWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

async function signOutUser() {
  return signOut(auth)
}

async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback)
}

async function saveUserProfile(uid, profile) {

  const userDoc = doc(db, 'users', uid)
  await setDoc(userDoc, { ...profile, updatedAt: new Date().toISOString() }, { merge: true })
  return (await getDoc(userDoc)).data()
}

async function getUserProfile(uid) {
  const userDoc = doc(db, 'users', uid)
  const snap = await getDoc(userDoc)
  return snap.exists() ? snap.data() : null
}

async function saveDashboardData(uid, data) {
  const col = collection(db, 'users', uid, 'dashboard')
  const docRef = await addDoc(col, { ...data, createdAt: new Date().toISOString() })
  return docRef.id
}

async function getDashboardData(uid) {
  const col = collection(db, 'users', uid, 'dashboard')
  const snap = await getDocs(col)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function uploadProfileImage(uid, file) {

  const ref = storageRef(storage, `profiles/${uid}/${file.name}`)
  const snapshot = await uploadBytes(ref, file)
  const url = await getDownloadURL(snapshot.ref)
  return url
}

export {
  app,
  analytics,
  auth,
  db,
  storage,
  registerWithEmail,
  signIn,
  signOutUser,
  resetPassword,
  onAuthStateChanged,
  saveUserProfile,
  getUserProfile,
  saveDashboardData,
  getDashboardData,
  uploadProfileImage,
}
