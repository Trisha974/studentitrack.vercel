const Professor = require('../professor/models/Professor')

const getAllProfessors = async (filters = {}) => {
  return await Professor.findAll(filters)
}

const getProfessorById = async (id) => {
  return await Professor.findById(id)
}

const getProfessorByEmail = async (email) => {
  return await Professor.findByEmail(email)
}

const createProfessor = async (data) => {
  let existingProfessor = null
  if (data.email) {
    existingProfessor = await Professor.findByEmail(data.email)
  }

  if (existingProfessor) {
    return await Professor.update(existingProfessor.id, {
      name: data.name || existingProfessor.name,
      email: data.email || existingProfessor.email,
      department: data.department || existingProfessor.department,
      photo_url: data.photoUrl || data.photo_url || existingProfessor.photo_url
    })
  }

  return await Professor.create({
    firebase_uid: null, // No longer using Firebase
    name: data.name,
    email: data.email,
    department: data.department,
    photo_url: data.photoUrl || data.photo_url
  })
}

const updateProfessor = async (id, data) => {
  return await Professor.update(id, {
    name: data.name,
    email: data.email,
    department: data.department,
    photo_url: data.photoUrl || data.photo_url
  })
}

const deleteProfessor = async (id) => {
  return await Professor.delete(id)
}

module.exports = {
  getAllProfessors,
  getProfessorById,
  getProfessorByEmail,
  createProfessor,
  updateProfessor,
  deleteProfessor
}

