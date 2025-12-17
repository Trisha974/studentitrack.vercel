require('dotenv').config()
const admin = require('firebase-admin')

console.log('🔍 Testing Firebase Admin SDK with actual token verification...\n')

// Reinitialize Firebase Admin SDK (same code as auth.js)
let firebaseAdminInitialized = false

if (!admin.apps.length) {
  const hasFirebaseConfig =
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL

  if (hasFirebaseConfig) {
    try {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY
      if (privateKey) {
        privateKey = privateKey.replace(/^["']|["']$/g, '')
        privateKey = privateKey.replace(/\\n/g, '\n')
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: privateKey,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      })
      firebaseAdminInitialized = true
      console.log('✅ Firebase Admin SDK initialized successfully')
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization failed:', error.message)
      process.exit(1)
    }
  } else {
    console.error('❌ Firebase configuration missing')
    process.exit(1)
  }
} else {
  firebaseAdminInitialized = true
}

if (firebaseAdminInitialized) {
  console.log('✅ Firebase Admin SDK is ready to verify tokens\n')
  console.log('📝 To test with a real token:')
  console.log('   1. Get a Firebase ID token from your frontend')
  console.log('   2. Run: node scripts/test-firebase-auth.js <token>')
  
  // If token provided as argument, test it
  const testToken = process.argv[2]
  if (testToken) {
    console.log('\n🔍 Testing token verification...')
    admin.auth().verifyIdToken(testToken)
      .then(decodedToken => {
        console.log('✅ Token verified successfully!')
        console.log('   UID:', decodedToken.uid)
        console.log('   Email:', decodedToken.email)
        process.exit(0)
      })
      .catch(error => {
        console.error('❌ Token verification failed:', error.message)
        console.error('   Error code:', error.code)
        process.exit(1)
      })
  } else {
    process.exit(0)
  }
} else {
  console.error('❌ Firebase Admin SDK not initialized')
  process.exit(1)
}

