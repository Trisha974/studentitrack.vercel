const pool = require('../../shared/config/database')

class Enrollment {
  static async create(data) {
    const { student_id, course_id } = data
    const [result] = await pool.execute(
      `INSERT INTO enrollments (student_id, course_id)
       VALUES (?, ?)`,
      [student_id, course_id]
    )
    return this.findById(result.insertId)
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    )
    return rows[0] || null
  }

  static async findByStudentAndCourse(student_id, course_id) {
    const [rows] = await pool.execute(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [student_id, course_id]
    )
    return rows[0] || null
  }

  static async findByStudent(student_id) {
    const [rows] = await pool.execute(
      `SELECT e.*, 
              c.code, c.name as course_name, c.credits, c.professor_id, c.term,
              p.name as professor_name, p.photo_url as professor_photo_url
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN professors p ON c.professor_id = p.id
       WHERE e.student_id = ?
       ORDER BY c.code ASC`,
      [student_id]
    )
    return rows
  }

  static async findByCourse(course_id) {
    const [rows] = await pool.execute(
      `SELECT e.*, s.name as student_name, s.email, s.student_id as student_number
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.course_id = ?
       ORDER BY s.name ASC`,
      [course_id]
    )
    return rows
  }

  static async delete(id) {
    await pool.execute('DELETE FROM enrollments WHERE id = ?', [id])
    return true
  }

  static async deleteByStudentAndCourse(student_id, course_id) {
    await pool.execute(
      'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
      [student_id, course_id]
    )
    return true
  }
}

module.exports = Enrollment


