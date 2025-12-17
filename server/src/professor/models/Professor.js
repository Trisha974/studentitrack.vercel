const pool = require('../../shared/config/database')

class Professor {
  static async create(data) {
    const { firebase_uid, name, email, department, photo_url } = data
    try {
      const [result] = await pool.execute(
        `INSERT INTO professors (firebase_uid, name, email, department, photo_url)
         VALUES (?, ?, ?, ?, ?)`,
        [firebase_uid || null, name, email, department || null, photo_url || null]
      )
      return this.findById(result.insertId)
    } catch (error) {
      console.error('Professor.create error:', error.message)
      console.error('SQL Error Code:', error.code)
      console.error('SQL Error SQL State:', error.sqlState)
      console.error('SQL Error SQL Message:', error.sqlMessage)
      throw error
    }
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM professors WHERE id = ?',
      [id]
    )
    return rows[0] || null
  }

  static async findByFirebaseUid(firebase_uid) {
    const [rows] = await pool.execute(
      'SELECT * FROM professors WHERE firebase_uid = ?',
      [firebase_uid]
    )
    return rows[0] || null
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM professors WHERE email = ?',
      [email]
    )
    return rows[0] || null
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM professors WHERE 1=1'
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
    try {
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
    if (data.department !== undefined) {
      fields.push('department = ?')
      values.push(data.department)
    }
    if (data.photo_url !== undefined) {
      fields.push('photo_url = ?')

        values.push(data.photo_url || null)
    }

      if (fields.length === 0) {
        console.log('No fields to update, returning existing record')
        return this.findById(id)
      }

    values.push(id)
      console.log('Executing UPDATE query:', {
        fields: fields.length,
        id: id,
        hasPhoto: data.photo_url !== undefined
      })

    await pool.execute(
      `UPDATE professors SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

      const updated = await this.findById(id)
      console.log('Professor updated successfully in database')
      return updated
    } catch (error) {
      console.error('Error in Professor.update:', error)
      console.error('SQL Error details:', {
        code: error.code,
        errno: error.errno,
        sqlMessage: error.sqlMessage,
        sqlState: error.sqlState
      })
      throw error
    }
  }

  static async delete(id) {
    await pool.execute('DELETE FROM professors WHERE id = ?', [id])
    return true
  }
}

module.exports = Professor

