const pool = require('../../shared/config/database')

class Attendance {
  static async create(data) {
    const { student_id, course_id, date, status } = data
    const [result] = await pool.execute(
      `INSERT INTO attendance (student_id, course_id, date, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP`,
      [student_id, course_id, date, status]
    )
    return this.findByStudentCourseAndDate(student_id, course_id, date)
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM attendance WHERE id = ?',
      [id]
    )
    return rows[0] || null
  }

  static async findByStudentCourseAndDate(student_id, course_id, date) {
    const [rows] = await pool.execute(
      'SELECT * FROM attendance WHERE student_id = ? AND course_id = ? AND date = ?',
      [student_id, course_id, date]
    )
    return rows[0] || null
  }

  static async findByStudent(student_id) {
    const [rows] = await pool.execute(
      `SELECT a.*, c.code as course_code, c.name as course_name
       FROM attendance a
       JOIN courses c ON a.course_id = c.id
       WHERE a.student_id = ?
       ORDER BY a.date DESC`,
      [student_id]
    )
    return rows
  }

  static async findByCourse(course_id) {
    const [rows] = await pool.execute(
      `SELECT a.*, s.name as student_name, s.student_id as student_number
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE a.course_id = ?
       ORDER BY a.date DESC, s.name ASC`,
      [course_id]
    )
    return rows
  }

  static async findByStudentAndCourse(student_id, course_id) {
    const [rows] = await pool.execute(
      `SELECT a.*, c.code as course_code, c.name as course_name
       FROM attendance a
       JOIN courses c ON a.course_id = c.id
       WHERE a.student_id = ? AND a.course_id = ?
       ORDER BY a.date DESC`,
      [student_id, course_id]
    )
    return rows
  }

  static async update(id, data) {
    const fields = []
    const values = []

    if (data.status !== undefined) {
      fields.push('status = ?')
      values.push(data.status)
    }
    if (data.date !== undefined) {
      fields.push('date = ?')
      values.push(data.date)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    await pool.execute(
      `UPDATE attendance SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    return this.findById(id)
  }

  static async delete(id) {
    await pool.execute('DELETE FROM attendance WHERE id = ?', [id])
    return true
  }
}

module.exports = Attendance

