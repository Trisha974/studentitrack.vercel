const pool = require('../shared/config/database')
const bcrypt = require('bcrypt')

class User {
  static async create(data) {
    const { email, password, role, user_id } = data
    
    // Hash password
    const saltRounds = 10
    const password_hash = await bcrypt.hash(password, saltRounds)
    
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, role, user_id)
       VALUES (?, ?, ?, ?)`,
      [email, password_hash, role, user_id || null]
    )
    return this.findById(result.insertId)
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, email, role, user_id, is_active, email_verified, last_login, created_at FROM users WHERE id = ?',
      [id]
    )
    return rows[0] || null
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    )
    return rows[0] || null
  }

  static async findByUserId(user_id, role) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE user_id = ? AND role = ?',
      [user_id, role]
    )
    return rows[0] || null
  }

  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash)
  }

  static async updateLastLogin(id) {
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [id]
    )
  }

  static async updatePassword(id, newPassword) {
    const saltRounds = 10
    const password_hash = await bcrypt.hash(newPassword, saltRounds)
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [password_hash, id]
    )
  }

  static async activate(id) {
    await pool.execute(
      'UPDATE users SET is_active = TRUE WHERE id = ?',
      [id]
    )
  }

  static async deactivate(id) {
    await pool.execute(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [id]
    )
  }
}

module.exports = User

