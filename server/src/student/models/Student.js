const pool = require('../../shared/config/database')

class Student {
  static async create(data) {
    const { firebase_uid, name, email, student_id, department, photo_url } = data
    try {
      const [result] = await pool.execute(
        `INSERT INTO students (firebase_uid, name, email, student_id, department, photo_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [firebase_uid || null, name, email, student_id || null, department || null, photo_url || null]
      )
      return this.findById(result.insertId)
    } catch (error) {
      console.error('Student.create error:', error.message)
      console.error('SQL Error Code:', error.code)
      console.error('SQL Error SQL State:', error.sqlState)
      console.error('SQL Error SQL Message:', error.sqlMessage)
      throw error
    }
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [id]
    )
    return rows[0] || null
  }

  static async findByFirebaseUid(firebase_uid) {
    const [rows] = await pool.execute(
      'SELECT * FROM students WHERE firebase_uid = ?',
      [firebase_uid]
    )
    return rows[0] || null
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM students WHERE email = ?',
      [email]
    )
    return rows[0] || null
  }

  static async findByStudentId(student_id) {
    const [rows] = await pool.execute(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id]
    )
    return rows[0] || null
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM students WHERE 1=1'
    const params = []

    if (filters.department) {
      query += ' AND department = ?'
      params.push(filters.department)
    }

    query += ' ORDER BY name ASC'

    const [rows] = await pool.execute(query, params)
    return rows
  }

  static async update(id, data) {
    const fields = []
    const values = []

    if (data.firebase_uid !== undefined) {
      fields.push('firebase_uid = ?')
      values.push(data.firebase_uid)
    }
    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }
    if (data.email !== undefined) {
      fields.push('email = ?')
      values.push(data.email)
    }
    if (data.student_id !== undefined) {
      fields.push('student_id = ?')
      values.push(data.student_id)
    }
    if (data.department !== undefined) {
      fields.push('department = ?')
      values.push(data.department)
    }
    if (data.photo_url !== undefined) {
      fields.push('photo_url = ?')
      values.push(data.photo_url)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    await pool.execute(
      `UPDATE students SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    return this.findById(id)
  }

  static async delete(id) {
    await pool.execute('DELETE FROM students WHERE id = ?', [id])
    return true
  }
}

module.exports = Student

