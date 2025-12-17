require('dotenv').config()
const admin = require('firebase-admin')

console.log('🔍 Testing Firebase Admin SDK Configuration...\n')

// Check environment variables
console.log('📋 Environment Variables:')
console.log('   FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? `✅ ${process.env.FIREBASE_PROJECT_ID}` : '❌ Missing')
console.log('   FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? `✅ ${process.env.FIREBASE_CLIENT_EMAIL}` : '❌ Missing')

const privateKey = process.env.FIREBASE_PRIVATE_KEY
if (privateKey) {
  console.log('   FIREBASE_PRIVATE_KEY:', `✅ Set (${privateKey.length} characters)`)
  
  // Check if it has BEGIN and END markers
  if (privateKey.includes('BEGIN PRIVATE KEY') && privateKey.includes('END PRIVATE KEY')) {
    console.log('   ✅ Private key has BEGIN and END markers')
  } else {
    console.log('   ❌ Private key missing BEGIN or END markers')
  }
  
  // Check for newlines
  if (privateKey.includes('\\n') || privateKey.includes('\n')) {
    console.log('   ✅ Private key contains newline characters')
  } else {
    console.log('   ⚠️ Private key may need newline characters (\\n)')
  }
} else {
  console.log('   FIREBASE_PRIVATE_KEY: ❌ Missing')
}

console.log('\n🔧 Attempting Firebase Admin SDK initialization...\n')

// Clean up the private key
let cleanedKey = privateKey
if (cleanedKey) {
  // Remove quotes if present
  cleanedKey = cleanedKey.replace(/^["']|["']$/g, '')
  // Replace escaped newlines with actual newlines
  cleanedKey = cleanedKey.replace(/\\n/g, '\n')
}

try {
  // Delete existing apps if any
  if (admin.apps.length > 0) {
    admin.apps.forEach(app => admin.app().delete())
  }
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: cleanedKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  })
  
  console.log('✅ Firebase Admin SDK initialized successfully!')
  console.log('✅ Configuration is correct\n')
  
  // Test token verification (this will fail without a real token, but shows SDK is working)
  console.log('📝 Note: To fully test, you need a valid Firebase ID token from the frontend')
  console.log('   The SDK is initialized and ready to verify tokens\n')
  
  process.exit(0)
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed!\n')
  console.error('Error:', error.message)
  console.error('Error code:', error.code || 'N/A')
  console.error('\n💡 Common issues:')
  console.error('   1. Private key format - should be on one line with \\n for newlines')
  console.error('   2. Private key incomplete - must include BEGIN and END markers')
  console.error('   3. Wrong credentials - verify project ID, email, and private key match')
  console.error('   4. Quotes in .env - private key should be in quotes: FIREBASE_PRIVATE_KEY="..."')
  
  if (error.message.includes('private key')) {
    console.error('\n🔧 Try this format in .env:')
    console.error('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"')
  }
  
  process.exit(1)
}

