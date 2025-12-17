require('dotenv').config()
const User = require('../src/models/User')

async function resetPassword() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.error('Usage: node reset-user-password.js <email> <new_password>')
    console.error('Example: node reset-user-password.js ljorcullo@umindanao.edu.ph mynewpassword')
    process.exit(1)
  }

  try {
    console.log(`\n🔍 Finding user: ${email}`)
    
    const user = await User.findByEmail(email)
    
    if (!user) {
      console.error(`❌ User not found: ${email}`)
      console.error('💡 Use the Sign Up button on the login page to create an account.')
      process.exit(1)
    }
    
    console.log(`✅ User found: ${user.email} (ID: ${user.id}, Role: ${user.role})`)
    console.log(`\n🔐 Resetting password...`)
    
    await User.updatePassword(user.id, newPassword)
    
    console.log('✅ Password reset successfully!')
    console.log(`\n🎉 You can now log in with:`)
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${newPassword}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

resetPassword()

