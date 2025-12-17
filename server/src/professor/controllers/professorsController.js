const Professor = require('../models/Professor')

const getAllProfessors = async (request, reply) => {
  try {
    const filters = {}
    if (request.query.department) {
      filters.department = request.query.department
    }

    const professors = await Professor.findAll(filters)
    return professors
  } catch (error) {
    throw error
  }
}

const getProfessorByEmail = async (request, reply) => {
  try {
    const email = request.params.email || request.query.email
    if (!email) {
      return reply.code(400).send({ error: 'Email is required' })
    }

    const professor = await Professor.findByEmail(email)
    if (!professor) {
      return reply.code(404).send({ error: 'Professor not found' })
    }
    return professor
  } catch (error) {
    throw error
  }
}

const getProfessorById = async (request, reply) => {
  try {
    const professor = await Professor.findById(request.params.id)
    if (!professor) {
      return reply.code(404).send({ error: 'Professor not found' })
    }
    return professor
  } catch (error) {
    throw error
  }
}

const getProfessorByFirebaseUid = async (request, reply) => {
  try {
    const professor = await Professor.findByFirebaseUid(request.params.uid)
    if (!professor) {
      return reply.code(404).send({ error: 'Professor not found' })
    }
    return professor
  } catch (error) {
    throw error
  }
}

const createProfessor = async (request, reply) => {
  try {
    console.log('📥 CREATE PROFESSOR REQUEST:', {
      body: {
        ...request.body,
        photoUrl: request.body.photoUrl ? `[${request.body.photoUrl.length} chars]` : undefined,
        photo_url: request.body.photo_url ? `[${request.body.photo_url.length} chars]` : undefined
      },
      user: request.user ? { uid: request.user.uid, email: request.user.email } : null,
      headers: {
        authorization: request.headers.authorization ? 'Bearer [token]' : 'none'
      }
    })

    const firebaseUid = request.body.firebase_uid || request.user?.uid
    if (!firebaseUid) {
      console.error('❌ Missing Firebase UID')
      return reply.code(400).send({ error: 'Firebase UID is required' })
    }

    const email = request.body.email?.trim()
    const name = request.body.name?.trim()

    console.log('📋 Parsed data:', { firebaseUid, email, name, hasDepartment: !!request.body.department })

    if (!name || name.length === 0) {
      console.error('❌ Missing name')
      return reply.code(400).send({ error: 'Name is required' })
    }
    if (!email || email.length === 0) {
      console.error('❌ Missing email')
      return reply.code(400).send({ error: 'Email is required' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('❌ Invalid email format:', email)
      return reply.code(400).send({ error: 'Invalid email format' })
    }

    let existingProfessor = null
    if (email) {
      existingProfessor = await Professor.findByEmail(email)
    }

    if (existingProfessor) {
      if (!existingProfessor.firebase_uid || existingProfessor.firebase_uid !== firebaseUid) {
        // Update existing professor with Firebase UID
        const updated = await Professor.update(existingProfessor.id, {
          firebase_uid: firebaseUid,
          name: name || existingProfessor.name,
          email: email || existingProfessor.email,
          department: request.body.department?.trim() || existingProfessor.department,
          photo_url: request.body.photoUrl || request.body.photo_url || existingProfessor.photo_url
        })
        return reply.code(200).send(updated)
      } else {
        // Professor already exists with this Firebase UID
        return reply.code(200).send(existingProfessor)
      }
    }

    // Create new professor
    console.log('📝 Creating professor with data:', {
      firebase_uid: firebaseUid,
      name: name,
      email: email,
      department: request.body.department?.trim() || null,
      hasPhoto: !!(request.body.photoUrl || request.body.photo_url)
    })

    const professor = await Professor.create({
      firebase_uid: firebaseUid,
      name: name,
      email: email,
      department: request.body.department?.trim() || null,
      photo_url: request.body.photoUrl || request.body.photo_url || null
    })
    
    console.log('✅ Professor created successfully:', { id: professor.id, name: professor.name })
    return reply.code(201).send(professor)
  } catch (error) {
    console.error('❌ ERROR creating professor:', error)
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      stack: error.stack
    })

    if (error.code === 'ER_DUP_ENTRY') {
      return reply.code(409).send({ error: 'Professor with this email or Firebase UID already exists' })
    }
    throw error
  }
}

const updateProfessor = async (request, reply) => {
  try {
    // Validate professor ID
    const professorId = parseInt(request.params.id)
    if (isNaN(professorId)) {
      return reply.code(400).send({ error: 'Invalid professor ID' })
    }

    console.log('Update professor request:', {
      id: professorId,
      hasName: !!request.body.name,
      hasEmail: !!request.body.email,
      hasDepartment: !!request.body.department,
      hasPhotoUrl: !!(request.body.photoUrl || request.body.photo_url),
      photoUrlLength: (request.body.photoUrl || request.body.photo_url)?.length
    })

    // Check if professor exists first
    const existingProfessor = await Professor.findById(professorId)
    if (!existingProfessor) {
      return reply.code(404).send({ error: 'Professor not found' })
    }

    const updateData = {}
    if (request.body.name !== undefined && request.body.name !== null) {
      const trimmedName = request.body.name.trim()
      if (trimmedName) {
        updateData.name = trimmedName
      }
    }
    if (request.body.email !== undefined && request.body.email !== null) {
      const trimmedEmail = request.body.email.trim()
      if (trimmedEmail) {
        updateData.email = trimmedEmail
      }
    }
    if (request.body.department !== undefined) {
      updateData.department = request.body.department?.trim() || null
    }
    if (request.body.photoUrl !== undefined || request.body.photo_url !== undefined) {
      const photoData = request.body.photoUrl || request.body.photo_url || null

      if (photoData && photoData.length > 5000000) {
        console.warn('Photo data too large:', photoData.length, 'bytes')
        return reply.code(400).send({
          error: 'Photo data is too large. Please use a smaller image (max 5MB).',
          details: `Image size: ${(photoData.length / 1024 / 1024).toFixed(2)}MB`
        })
      } else {
        updateData.photo_url = photoData
      }
    }

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ error: 'No fields to update' })
    }

    console.log('Update data prepared:', {
      hasName: !!updateData.name,
      hasEmail: !!updateData.email,
      hasDepartment: updateData.department !== undefined,
      hasPhoto: updateData.photo_url !== undefined,
      photo_url_length: updateData.photo_url?.length || 0
    })

    try {
      const professor = await Professor.update(professorId, updateData)
      if (!professor) {
        return reply.code(404).send({ error: 'Professor not found after update' })
      }
      console.log('Professor updated successfully:', professor.id)
      return professor
    } catch (dbError) {
      console.error('Database error updating professor:', dbError)
      console.error('Database error details:', {
        code: dbError.code,
        errno: dbError.errno,
        sqlMessage: dbError.sqlMessage,
        sqlState: dbError.sqlState
      })

      if (dbError.code === 'ER_DATA_TOO_LONG') {
        return reply.code(400).send({
          error: 'Photo data is too large for the database. The image needs to be compressed further. Please try a smaller image or the system will automatically compress it.',
          details: dbError.message
        })
      }
      throw dbError
    }
  } catch (error) {
    console.error('Error updating professor:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    })
    throw error
  }
}

const deleteProfessor = async (request, reply) => {
  try {
    await Professor.delete(request.params.id)
    return { message: 'Professor deleted successfully' }
  } catch (error) {
    throw error
  }
}

module.exports = {
  getAllProfessors,
  getProfessorById,
  getProfessorByFirebaseUid,
  getProfessorByEmail,
  createProfessor,
  updateProfessor,
  deleteProfessor
}

