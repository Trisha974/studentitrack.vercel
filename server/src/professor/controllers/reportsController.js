const pool = require('../../shared/config/database')

const getStudentReport = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.query.studentId
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' })
    }

const [students] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [studentId]
    )
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' })
    }
    const student = students[0]

const [enrollments] = await pool.execute(
      `SELECT e.*, c.code, c.name as course_name, c.credits
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ?`,
      [studentId]
    )

const [gradesSummary] = await pool.execute(
      `SELECT
        course_id,
        c.code as course_code,
        c.name as course_name,
        COUNT(*) as total_assessments,
        AVG(score / max_points * 100) as average_percentage,
        SUM(score) as total_score,
        SUM(max_points) as total_max_points
       FROM grades g
       JOIN courses c ON g.course_id = c.id
       WHERE g.student_id = ?
       GROUP BY course_id, c.code, c.name`,
      [studentId]
    )

const [attendanceSummary] = await pool.execute(
      `SELECT
        course_id,
        c.code as course_code,
        c.name as course_name,
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count
       FROM attendance a
       JOIN courses c ON a.course_id = c.id
       WHERE a.student_id = ?
       GROUP BY course_id, c.code, c.name`,
      [studentId]
    )

    res.json({
      student,
      enrollments,
      gradesSummary,
      attendanceSummary
    })
  } catch (error) {
    next(error)
  }
}

const getCourseReport = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.query.courseId
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' })
    }

const [courses] = await pool.execute(
      'SELECT * FROM courses WHERE id = ?',
      [courseId]
    )
    if (courses.length === 0) {
      return res.status(404).json({ error: 'Course not found' })
    }
    const course = courses[0]

const [enrollments] = await pool.execute(
      `SELECT e.*, s.name as student_name, s.email, s.student_id as student_number
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.course_id = ?
       ORDER BY s.name ASC`,
      [courseId]
    )

const [gradesSummary] = await pool.execute(
      `SELECT
        student_id,
        s.name as student_name,
        s.student_id as student_number,
        COUNT(*) as total_assessments,
        AVG(score / max_points * 100) as average_percentage
       FROM grades g
       JOIN students s ON g.student_id = s.id
       WHERE g.course_id = ?
       GROUP BY student_id, s.name, s.student_id`,
      [courseId]
    )

const [attendanceSummary] = await pool.execute(
      `SELECT
        student_id,
        s.name as student_name,
        s.student_id as student_number,
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE a.course_id = ?
       GROUP BY student_id, s.name, s.student_id`,
      [courseId]
    )

    res.json({
      course,
      enrollments,
      gradesSummary,
      attendanceSummary
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getStudentReport,
  getCourseReport
}

