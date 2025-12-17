const pool = require('../../shared/config/database')

class DashboardState {
  static async findByProfessorId(professor_id) {
    // Ensure professor_id is a number
    const professorIdNum = parseInt(professor_id, 10)
    if (isNaN(professorIdNum)) {
      console.error('Invalid professor_id:', professor_id)
      throw new Error(`Invalid professor_id: ${professor_id}`)
    }
    
    const [rows] = await pool.execute(
      'SELECT * FROM dashboard_state WHERE professor_id = ?',
      [professorIdNum]
    )
    return rows[0] || null
  }

  static async createOrUpdate(professor_id, data) {
    const { subjects, removedSubjects, recycleBinSubjects, students, records, grades, alerts } = data
    
    // Ensure professor_id is a number
    const professorIdNum = parseInt(professor_id, 10)
    if (isNaN(professorIdNum)) {
      console.error('Invalid professor_id:', professor_id)
      throw new Error(`Invalid professor_id: ${professor_id}`)
    }
    
    // Check if dashboard state exists
    const existing = await this.findByProfessorId(professorIdNum)
    
    if (existing) {
      // Update existing
      const [result] = await pool.execute(
        `UPDATE dashboard_state 
         SET subjects = ?, 
             removed_subjects = ?,
             recycle_bin_subjects = ?,
             students_cache = ?,
             records_cache = ?,
             grades_cache = ?,
             alerts = ?,
             updated_at = NOW()
         WHERE professor_id = ?`,
        [
          JSON.stringify(subjects || []),
          JSON.stringify(removedSubjects || []),
          JSON.stringify(recycleBinSubjects || []),
          JSON.stringify(students || []),
          JSON.stringify(records || {}),
          JSON.stringify(grades || {}),
          JSON.stringify(alerts || []),
          professorIdNum
        ]
      )
      return this.findByProfessorId(professorIdNum)
    } else {
      // Create new
      const [result] = await pool.execute(
        `INSERT INTO dashboard_state 
         (professor_id, subjects, removed_subjects, recycle_bin_subjects, students_cache, records_cache, grades_cache, alerts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          professorIdNum,
          JSON.stringify(subjects || []),
          JSON.stringify(removedSubjects || []),
          JSON.stringify(recycleBinSubjects || []),
          JSON.stringify(students || []),
          JSON.stringify(records || {}),
          JSON.stringify(grades || {}),
          JSON.stringify(alerts || [])
        ]
      )
      return this.findByProfessorId(professorIdNum)
    }
  }

  static async delete(professor_id) {
    const professorIdNum = parseInt(professor_id, 10)
    if (isNaN(professorIdNum)) {
      throw new Error(`Invalid professor_id: ${professor_id}`)
    }
    await pool.execute('DELETE FROM dashboard_state WHERE professor_id = ?', [professorIdNum])
    return true
  }

  // Helper to parse JSON fields
  static parseDashboardState(row) {
    if (!row) return null
    
    // Helper function to safely parse JSON
    const safeParseJSON = (value, defaultValue) => {
      if (!value || value === null || value === 'null' || value === '') {
        return defaultValue
      }
      try {
        // If already an object/array, return as-is (MySQL2 might auto-parse in some cases)
        if (typeof value === 'object') {
          return value
        }
        // Otherwise parse the string
        if (typeof value === 'string') {
          const parsed = JSON.parse(value)
          return parsed
        }
        return defaultValue
      } catch (error) {
        console.error('Error parsing JSON:', error, 'Value:', value)
        return defaultValue
      }
    }
    
    return {
      id: row.id,
      professor_id: row.professor_id,
      subjects: safeParseJSON(row.subjects, []),
      removedSubjects: safeParseJSON(row.removed_subjects, []),
      recycleBinSubjects: safeParseJSON(row.recycle_bin_subjects, []),
      students: safeParseJSON(row.students_cache, []),
      records: safeParseJSON(row.records_cache, {}),
      grades: safeParseJSON(row.grades_cache, {}),
      alerts: safeParseJSON(row.alerts, []),
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}

module.exports = DashboardState

