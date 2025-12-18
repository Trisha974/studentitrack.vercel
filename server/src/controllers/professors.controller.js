const professorsService = require('../services/professors.service')

const getAllProfessors = async (request, reply) => {
  try {
    const filters = {}
    if (request.query.department) {
      filters.department = request.query.department
    }
    const professors = await professorsService.getAllProfessors(filters)
    return professors
  } catch (error) {
    throw error
  }
}

const getProfessorById = async (request, reply) => {
  try {
    const professor = await professorsService.getProfessorById(request.params.id)
    if (!professor) {
      return reply.code(404).send({ error: 'Professor not found' })
    }
    return professor
  } catch (error) {
    throw error
  }
}

const getCurrentProfessor = async (request, reply) => {
  try {
    // Get professor from authenticated user's user_id
    if (!request.user || !request.user.user_id) {
      return reply.code(404).send({ error: 'Professor profile not found' })
    }
    const professor = await professorsService.getProfessorById(request.user.user_id)
    if (!professor) {
      return reply.code(404).send({ error: 'Professor not found' })
    }
    return professor
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
    const professor = await professorsService.getProfessorByEmail(email)
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
    const email = request.body.email?.trim()
    const name = request.body.name?.trim()

    if (!name || name.length === 0) {
      return reply.code(400).send({ error: 'Name is required' })
    }
    if (!email || email.length === 0) {
      return reply.code(400).send({ error: 'Email is required' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.code(400).send({ error: 'Invalid email format' })
    }

    const professor = await professorsService.createProfessor({
      name: name,
      email: email,
      department: request.body.department?.trim() || null,
      photoUrl: request.body.photoUrl || request.body.photo_url
    })

    return reply.code(201).send(professor)
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return reply.code(409).send({ error: 'Professor with this email already exists' })
    }
    throw error
  }
}

const updateProfessor = async (request, reply) => {
  try {
    const professorId = parseInt(request.params.id)
    if (isNaN(professorId)) {
      return reply.code(400).send({ error: 'Invalid professor ID' })
    }

    const existingProfessor = await professorsService.getProfessorById(professorId)
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
        return reply.code(400).send({
          error: 'Photo data is too large. Please use a smaller image (max 5MB).',
          details: `Image size: ${(photoData.length / 1024 / 1024).toFixed(2)}MB`
        })
      }
      updateData.photo_url = photoData
    }

    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ error: 'No fields to update' })
    }

    const professor = await professorsService.updateProfessor(professorId, updateData)
    if (!professor) {
      return reply.code(404).send({ error: 'Professor not found after update' })
    }

    return professor
  } catch (error) {
    if (error.code === 'ER_DATA_TOO_LONG') {
      return reply.code(400).send({
        error: 'Photo data is too large for the database. Please use a smaller image.',
        details: error.message
      })
    }
    throw error
  }
}

const deleteProfessor = async (request, reply) => {
  try {
    await professorsService.deleteProfessor(request.params.id)
    return { message: 'Professor deleted successfully' }
  } catch (error) {
    throw error
  }
}

module.exports = {
  getAllProfessors,
  getProfessorById,
  getCurrentProfessor,
  getProfessorByEmail,
  createProfessor,
  updateProfessor,
  deleteProfessor
}

