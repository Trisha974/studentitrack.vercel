const pool = require('../../shared/config/database')

class Course {
  static async create(data) {
    const { code, name, credits, professor_id, term } = data
    const [result] = await pool.execute(
      `INSERT INTO courses (code, name, credits, professor_id, term)
       VALUES (?, ?, ?, ?, ?)`,
      [code, name, credits || 0, professor_id || null, term || 'first']
    )
    return this.findById(result.insertId)
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT c.*, 
              p.name as professor_name, p.photo_url as professor_photo_url
       FROM courses c
       LEFT JOIN professors p ON c.professor_id = p.id
       WHERE c.id = ?`,
      [id]
    )
    return rows[0] || null
  }

  static async findByCode(code, professor_id = null) {
    let query = `SELECT c.*, 
                        p.name as professor_name, p.photo_url as professor_photo_url
                 FROM courses c
                 LEFT JOIN professors p ON c.professor_id = p.id
                 WHERE c.code = ?`
    const params = [code]

    if (professor_id) {
      query += ' AND c.professor_id = ?'
      params.push(professor_id)
    }

    const [rows] = await pool.execute(query, params)
    return rows[0] || null
  }

  static async findByProfessor(professor_id) {
    const [rows] = await pool.execute(
      `SELECT c.*, 
              p.name as professor_name, p.photo_url as professor_photo_url
       FROM courses c
       LEFT JOIN professors p ON c.professor_id = p.id
       WHERE c.professor_id = ? 
       ORDER BY c.code ASC`,
      [professor_id]
    )
    return rows
  }

  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT c.*, 
              p.name as professor_name, p.photo_url as professor_photo_url
       FROM courses c
       LEFT JOIN professors p ON c.professor_id = p.id
       ORDER BY c.code ASC`
    )
    return rows
  }

  static async update(id, data) {
    const fields = []
    const values = []

    if (data.code !== undefined) {
      fields.push('code = ?')
      values.push(data.code)
    }
    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }
    if (data.credits !== undefined) {
      fields.push('credits = ?')
      values.push(data.credits)
    }
    if (data.professor_id !== undefined) {
      fields.push('professor_id = ?')
      values.push(data.professor_id)
    }
    if (data.term !== undefined) {
      fields.push('term = ?')
      values.push(data.term)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    await pool.execute(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    return this.findById(id)
  }

  static async delete(id) {
    await pool.execute('DELETE FROM courses WHERE id = ?', [id])
    return true
  }
}

module.exports = Course


