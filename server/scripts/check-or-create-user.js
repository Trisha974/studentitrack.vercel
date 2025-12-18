require('dotenv').config()
const User = require('../src/models/User')
const Professor = require('../src/professor/models/Professor')
const Student = require('../src/student/models/Student')

async function checkOrCreateUser() {
  const email = process.argv[2]
  const password = process.argv[3]
  const role = process.argv[4] || 'Professor' // Default to Professor
  const name = process.argv[5] || email.split('@')[0]

  if (!email) {
    console.error('Usage: node check-or-create-user.js <email> [password] [role] [name]')
    console.error('Example: node check-or-create-user.js ljorcullo@umindanao.edu.ph mypassword Professor "L. Jorcullo"')
    process.exit(1)
  }

  try {
    console.log(`\n🔍 Checking user: ${email}`)
    
    // Check if user exists
    const existingUser = await User.findByEmail(email)
    
    if (existingUser) {
      console.log('✅ User found in database:')
      console.log(`   ID: ${existingUser.id}`)
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Role: ${existingUser.role}`)
      console.log(`   Active: ${existingUser.is_active}`)
      console.log(`   User ID (profile link): ${existingUser.user_id || 'None'}`)
      
      if (existingUser.user_id) {
        if (existingUser.role === 'Professor') {
          const prof = await Professor.findById(existingUser.user_id)
          if (prof) {
            console.log(`   Profile: ${prof.name} - ${prof.department || 'No department'}`)
          }
        } else if (existingUser.role === 'Student') {
          const student = await Student.findById(existingUser.user_id)
          if (student) {
            console.log(`   Profile: ${student.name} - ${student.student_id || 'No student ID'}`)
          }
        }
      }
      
      console.log('\n💡 User exists! You can log in with this account.')
      if (!password) {
        console.log('⚠️  If you forgot your password, you can reset it or create a new account.')
      }
    } else {
      console.log('❌ User NOT found in database')
      
      if (password) {
        console.log(`\n📝 Creating new user account...`)
        console.log(`   Email: ${email}`)
        console.log(`   Role: ${role}`)
        console.log(`   Name: ${name}`)
        
        // Create profile first
        let user_id = null
        if (role === 'Professor') {
          let professor = await Professor.findByEmail(email)
          if (!professor) {
            professor = await Professor.create({
              firebase_uid: null,
              name: name,
              email: email,
              department: null,
              photo_url: null
            })
          }
          user_id = professor.id
        } else if (role === 'Student') {
          let student = await Student.findByEmail(email)
          if (!student) {
            student = await Student.create({
              firebase_uid: null,
              name: name,
              email: email,
              student_id: null,
              department: null,
              photo_url: null
            })
          }
          user_id = student.id
        }
        
        // Create user account
        const newUser = await User.create({
          email: email,
          password: password,
          role: role,
          user_id: user_id
        })
        
        console.log('✅ User created successfully!')
        console.log(`   User ID: ${newUser.id}`)
        console.log(`   Profile ID: ${user_id}`)
        console.log(`\n🎉 You can now log in with:`)
        console.log(`   Email: ${email}`)
        console.log(`   Password: ${password}`)
      } else {
        console.log('\n💡 To create this user, run:')
        console.log(`   node check-or-create-user.js ${email} <password> ${role} "${name}"`)
        console.log('\n   Or use the Sign Up button on the login page.')
      }
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

checkOrCreateUser()

