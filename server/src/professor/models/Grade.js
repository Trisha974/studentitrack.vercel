const pool = require('../../shared/config/database')

class Grade {
  static async create(data) {
    const { student_id, course_id, assessment_type, assessment_title, score, max_points, date } = data
    
    console.log('📝 Grade.create called with:', {
      student_id,
      course_id,
      assessment_type,
      assessment_title,
      score,
      max_points,
      date: date || null
    })

    try {
      const [result] = await pool.execute(
        `INSERT INTO grades (student_id, course_id, assessment_type, assessment_title, score, max_points, date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [student_id, course_id, assessment_type, assessment_title, score, max_points, date || null]
      )
      console.log('✅ Grade inserted into database, insertId:', result.insertId)
      return this.findById(result.insertId)
    } catch (error) {
      console.error('❌ Error in Grade.create:', error)
      console.error('❌ SQL Error details:', {
        code: error.code,
        errno: error.errno,
        sqlMessage: error.sqlMessage,
        sqlState: error.sqlState,
        data: { student_id, course_id, assessment_type, assessment_title, score, max_points, date }
      })
      throw error
    }
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM grades WHERE id = ?',
      [id]
    )
    return rows[0] || null
  }

  static async findByStudent(student_id) {
    // Ensure student_id is a number
    const studentIdNum = typeof student_id === 'number' ? student_id : parseInt(student_id, 10)
    
    if (isNaN(studentIdNum)) {
      console.error('❌ Grade.findByStudent: Invalid student_id:', student_id, '(type:', typeof student_id, ')')
      return []
    }
    
    console.log('🔍 Grade.findByStudent querying with student_id:', studentIdNum, '(type:', typeof studentIdNum, ')')
    
    try {
      // First, check if any grades exist for this student
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM grades WHERE student_id = ?',
        [studentIdNum]
      )
      const totalGrades = countRows[0]?.count || 0
      console.log('📊 Total grades in database for student_id', studentIdNum, ':', totalGrades)
      
      if (totalGrades === 0) {
        console.warn('⚠️ No grades found in database for student_id:', studentIdNum)
        // Check if there are any grades at all
        const [allGradesCount] = await pool.execute('SELECT COUNT(*) as count FROM grades')
        console.log('📊 Total grades in database (all students):', allGradesCount[0]?.count || 0)
        
        // Check what student_ids exist in grades table
        const [studentIds] = await pool.execute('SELECT DISTINCT student_id FROM grades LIMIT 10')
        console.log('📊 Sample student_ids in grades table:', studentIds.map(r => ({
          student_id: r.student_id,
          student_idType: typeof r.student_id
        })))
      }
      
      const [rows] = await pool.execute(
        `SELECT g.*, c.code as course_code, c.name as course_name
         FROM grades g
         JOIN courses c ON g.course_id = c.id
         WHERE g.student_id = ?
         ORDER BY g.date DESC, g.created_at DESC`,
        [studentIdNum]
      )
      
      console.log('✅ Grade.findByStudent found', rows.length, 'grades for student_id', studentIdNum)
      
      if (rows.length > 0) {
        console.log('📊 Grade details:', rows.map(r => ({
          id: r.id,
          student_id: r.student_id,
          student_idType: typeof r.student_id,
          course_id: r.course_id,
          assessment_title: r.assessment_title,
          score: r.score,
          max_points: r.max_points
        })))
      }
      
      return rows
    } catch (error) {
      console.error('❌ Error in Grade.findByStudent:', error)
      console.error('❌ Error details:', {
        message: error.message,
        sqlMessage: error.sqlMessage,
        code: error.code,
        student_id: studentIdNum
      })
      throw error
    }
  }

  static async findByCourse(course_id) {
    const [rows] = await pool.execute(
      `SELECT g.*, s.name as student_name, s.student_id as student_number
       FROM grades g
       JOIN students s ON g.student_id = s.id
       WHERE g.course_id = ?
       ORDER BY g.date DESC, g.created_at DESC`,
      [course_id]
    )
    return rows
  }

  static async findByStudentAndCourse(student_id, course_id) {
    const [rows] = await pool.execute(
      `SELECT g.*, c.code as course_code, c.name as course_name
       FROM grades g
       JOIN courses c ON g.course_id = c.id
       WHERE g.student_id = ? AND g.course_id = ?
       ORDER BY g.date DESC, g.created_at DESC`,
      [student_id, course_id]
    )
    return rows
  }

  static async update(id, data) {
    const fields = []
    const values = []

    if (data.assessment_type !== undefined) {
      fields.push('assessment_type = ?')
      values.push(data.assessment_type)
    }
    if (data.assessment_title !== undefined) {
      fields.push('assessment_title = ?')
      values.push(data.assessment_title)
    }
    if (data.score !== undefined) {
      fields.push('score = ?')
      values.push(data.score)
    }
    if (data.max_points !== undefined) {
      fields.push('max_points = ?')
      values.push(data.max_points)
    }
    if (data.date !== undefined) {
      fields.push('date = ?')
      values.push(data.date)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    await pool.execute(
      `UPDATE grades SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    return this.findById(id)
  }

  static async delete(id) {
    await pool.execute('DELETE FROM grades WHERE id = ?', [id])
    return true
  }
}

module.exports = Grade

