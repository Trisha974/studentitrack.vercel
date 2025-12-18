

import * as professorsApi from './api/professorsApi'

async function addProfessor(profile) {
  const professor = await professorsApi.createProfessor(profile)
  return professor.id
}

async function setProfessor(profile) {
  const professor = await professorsApi.setProfessor(profile)
  return professor ? { ...professor, role: 'Professor' } : null
}

async function getCurrentProfessor() {
  const professor = await professorsApi.getCurrentProfessor()
  return professor ? { ...professor, role: 'Professor' } : null
}

// Backwards compatibility - maps to getCurrentProfessor
async function getProfessorByUid(uid) {
  return getCurrentProfessor()
}

async function getProfessorByEmail(email) {
  const professor = await professorsApi.getProfessorByEmail(email)
  return professor ? { ...professor, role: 'Professor' } : null
}

async function listProfessors(filter = {}) {
  const professors = await professorsApi.listProfessors(filter)
  return professors.map(p => ({ ...p, role: 'Professor' }))
}

async function updateProfessor(id, updates) {
  let professorId = id

if (id && typeof id !== 'number' && !/^\d+$/.test(String(id))) {
    const professor = await getProfessorByUid(id)
    if (!professor) {
      return null
    }
    professorId = professor.id
  }

  const professor = await professorsApi.updateProfessor(professorId, updates)
  return professor ? { ...professor, role: 'Professor' } : null
}

async function deleteProfessor(id) {
  let professorId = id

if (id && typeof id !== 'number' && !/^\d+$/.test(String(id))) {
    const professor = await getProfessorByUid(id)
    if (!professor) {
      return false
    }
    professorId = professor.id
  }

  await professorsApi.deleteProfessor(professorId)
  return true
}

export { addProfessor, setProfessor, getCurrentProfessor, getProfessorByUid, getProfessorByEmail, listProfessors, updateProfessor, deleteProfessor }
