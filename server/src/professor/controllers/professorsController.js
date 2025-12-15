const Professor = require('../models/Professor')

const getAllProfessors = async (req, res, next) => {
  try {
    const filters = {}
    if (req.query.department) {
      filters.department = req.query.department
    }

    const professors = await Professor.findAll(filters)
    res.json(professors)
  } catch (error) {
    next(error)
  }
}

const getProfessorByEmail = async (req, res, next) => {
  try {
    const email = req.params.email || req.query.email
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const professor = await Professor.findByEmail(email)
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' })
    }
    res.json(professor)
  } catch (error) {
    next(error)
  }
}

const getProfessorById = async (req, res, next) => {
  try {
    const professor = await Professor.findById(req.params.id)
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' })
    }
    res.json(professor)
  } catch (error) {
    next(error)
  }
}

const getProfessorByFirebaseUid = async (req, res, next) => {
  try {
    const professor = await Professor.findByFirebaseUid(req.params.uid)
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' })
    }
    res.json(professor)
  } catch (error) {
    next(error)
  }
}

const createProfessor = async (req, res, next) => {
  try {
    console.log('📥 CREATE PROFESSOR REQUEST:', {
      body: {
        ...req.body,
        photoUrl: req.body.photoUrl ? `[${req.body.photoUrl.length} chars]` : undefined,
        photo_url: req.body.photo_url ? `[${req.body.photo_url.length} chars]` : undefined
      },
      user: req.user ? { uid: req.user.uid, email: req.user.email } : null,
      headers: {
        authorization: req.headers.authorization ? 'Bearer [token]' : 'none'
      }
    })

    const firebaseUid = req.body.firebase_uid || req.user?.uid
    if (!firebaseUid) {
      console.error('❌ Missing Firebase UID')
      return res.status(400).json({ error: 'Firebase UID is required' })
    }

    const email = req.body.email?.trim()
    const name = req.body.name?.trim()

    console.log('📋 Parsed data:', { firebaseUid, email, name, hasDepartment: !!req.body.department })

    if (!name || name.length === 0) {
      console.error('❌ Missing name')
      return res.status(400).json({ error: 'Name is required' })
    }
    if (!email || email.length === 0) {
      console.error('❌ Missing email')
      return res.status(400).json({ error: 'Email is required' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('❌ Invalid email format:', email)
      return res.status(400).json({ error: 'Invalid email format' })
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
          department: req.body.department?.trim() || existingProfessor.department,
          photo_url: req.body.photoUrl || req.body.photo_url || existingProfessor.photo_url
        })
        return res.status(200).json(updated)
      } else {
        // Professor already exists with this Firebase UID
        return res.status(200).json(existingProfessor)
      }
    }

    // Create new professor
    console.log('📝 Creating professor with data:', {
      firebase_uid: firebaseUid,
      name: name,
      email: email,
      department: req.body.department?.trim() || null,
      hasPhoto: !!(req.body.photoUrl || req.body.photo_url)
    })

    const professor = await Professor.create({
      firebase_uid: firebaseUid,
      name: name,
      email: email,
      department: req.body.department?.trim() || null,
      photo_url: req.body.photoUrl || req.body.photo_url || null
    })
    
    console.log('✅ Professor created successfully:', { id: professor.id, name: professor.name })
    res.status(201).json(professor)
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
      return res.status(409).json({ error: 'Professor with this email or Firebase UID already exists' })
    }
    next(error)
  }
}

const updateProfessor = async (req, res, next) => {
  try {
    // Validate professor ID
    const professorId = parseInt(req.params.id)
    if (isNaN(professorId)) {
      return res.status(400).json({ error: 'Invalid professor ID' })
    }

    console.log('Update professor request:', {
      id: professorId,
      hasName: !!req.body.name,
      hasEmail: !!req.body.email,
      hasDepartment: !!req.body.department,
      hasPhotoUrl: !!(req.body.photoUrl || req.body.photo_url),
      photoUrlLength: (req.body.photoUrl || req.body.photo_url)?.length
    })

    // Check if professor exists first
    const existingProfessor = await Professor.findById(professorId)
    if (!existingProfessor) {
      return res.status(404).json({ error: 'Professor not found' })
    }

    const updateData = {}
    if (req.body.name !== undefined && req.body.name !== null) {
      const trimmedName = req.body.name.trim()
      if (trimmedName) {
        updateData.name = trimmedName
      }
    }
    if (req.body.email !== undefined && req.body.email !== null) {
      const trimmedEmail = req.body.email.trim()
      if (trimmedEmail) {
        updateData.email = trimmedEmail
      }
    }
    if (req.body.department !== undefined) {
      updateData.department = req.body.department?.trim() || null
    }
    if (req.body.photoUrl !== undefined || req.body.photo_url !== undefined) {
      const photoData = req.body.photoUrl || req.body.photo_url || null

      if (photoData && photoData.length > 5000000) {
        console.warn('Photo data too large:', photoData.length, 'bytes')
        return res.status(400).json({
          error: 'Photo data is too large. Please use a smaller image (max 5MB).',
          details: `Image size: ${(photoData.length / 1024 / 1024).toFixed(2)}MB`
        })
      } else {
        updateData.photo_url = photoData
      }
    }

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
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
        return res.status(404).json({ error: 'Professor not found after update' })
      }
      console.log('Professor updated successfully:', professor.id)
      res.json(professor)
    } catch (dbError) {
      console.error('Database error updating professor:', dbError)
      console.error('Database error details:', {
        code: dbError.code,
        errno: dbError.errno,
        sqlMessage: dbError.sqlMessage,
        sqlState: dbError.sqlState
      })

      if (dbError.code === 'ER_DATA_TOO_LONG') {
        return res.status(400).json({
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
    next(error)
  }
}

const deleteProfessor = async (req, res, next) => {
  try {
    await Professor.delete(req.params.id)
    res.json({ message: 'Professor deleted successfully' })
  } catch (error) {
    next(error)
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

