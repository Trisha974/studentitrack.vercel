# Database INSERT Values - Sample Data

This guide shows example INSERT statements for your database tables.

## 📋 Important Notes

- **Replace placeholder values** with your actual data
- **Firebase UIDs** must match actual Firebase user UIDs
- **Foreign keys** (professor_id, student_id, course_id) must reference existing records
- **Email addresses** should match Firebase authentication emails

---

## 🎓 Table: `professors`

### Structure:
- `id` (auto-increment)
- `firebase_uid` (required, unique)
- `email` (required)
- `name` (required)
- `department` (optional)
- `photo_url` (optional)

### Example INSERT:
```sql
INSERT INTO professors (firebase_uid, email, name, department, photo_url) 
VALUES 
  ('firebase-uid-here-123', 'professor@university.edu', 'Dr. John Smith', 'Computer Science', NULL),
  ('firebase-uid-here-456', 'professor2@university.edu', 'Dr. Jane Doe', 'Mathematics', NULL);
```

**To get Firebase UID:**
- Check Firebase Console → Authentication → Users
- Or use the UID from your Firebase authentication token

---

## 👨‍🎓 Table: `students`

### Structure:
- `id` (auto-increment)
- `firebase_uid` (required, unique)
- `student_id` (optional - student number)
- `email` (required)
- `name` (required)
- `department` (optional)
- `photo_url` (optional)
- `is_archived` (default: 0)

### Example INSERT:
```sql
INSERT INTO students (firebase_uid, student_id, email, name, department, photo_url, is_archived) 
VALUES 
  ('2xqwuYFm94PeBrQ3JWgpusfZee93', '141714', 't.talamillo.141714.tc@umindanao.edu.ph', 'Talamillo, T', 'Computer Science', NULL, 0),
  ('another-firebase-uid', '141715', 'student2@umindanao.edu.ph', 'Student Name', 'Mathematics', NULL, 0);
```

**Note:** The Firebase UID `2xqwuYFm94PeBrQ3JWgpusfZee93` is from your error logs - this student exists in Firebase but needs to be in MySQL.

---

## 📚 Table: `courses`

### Structure:
- `id` (auto-increment)
- `code` (required, e.g., "CS101")
- `name` (required)
- `credits` (default: 0)
- `term` (enum: 'first' or 'second', default: 'first')
- `status` (enum: 'active', 'archived', 'recycle_bin', default: 'active')
- `professor_id` (required - must reference professors.id)

### Example INSERT:
```sql
-- First, get a professor_id (assume professor with id=1 exists)
INSERT INTO courses (code, name, credits, term, status, professor_id) 
VALUES 
  ('CS101', 'Introduction to Computer Science', 3, 'first', 'active', 1),
  ('MATH201', 'Calculus I', 4, 'first', 'active', 1),
  ('CS102', 'Data Structures', 3, 'second', 'active', 1);
```

---

## 📝 Table: `enrollments`

### Structure:
- `id` (auto-increment)
- `student_id` (required - references students.id)
- `course_id` (required - references courses.id)
- `enrolled_at` (auto-timestamp)

### Example INSERT:
```sql
-- Enroll student (id=1) in course (id=1)
INSERT INTO enrollments (student_id, course_id) 
VALUES 
  (1, 1),  -- Student 1 enrolled in Course 1
  (1, 2),  -- Student 1 enrolled in Course 2
  (2, 1);  -- Student 2 enrolled in Course 1
```

---

## 📊 Table: `grades`

### Structure:
- `id` (auto-increment)
- `student_id` (required)
- `course_id` (required)
- `assessment_type` (enum: 'quiz', 'exam', 'assignment', 'project', 'participation', 'laboratory', 'midterm', 'final')
- `assessment_title` (required)
- `score` (required)
- `max_points` (required)
- `date` (optional)
- `due_date` (optional)
- `notes` (optional)

### Example INSERT:
```sql
INSERT INTO grades (student_id, course_id, assessment_type, assessment_title, score, max_points, date, due_date, notes) 
VALUES 
  (1, 1, 'quiz', 'Quiz 1', 85, 100, '2025-01-15', '2025-01-15', 'Good work'),
  (1, 1, 'exam', 'Midterm Exam', 92, 100, '2025-02-20', '2025-02-20', NULL),
  (1, 1, 'assignment', 'Homework 1', 95, 100, '2025-01-10', '2025-01-10', NULL);
```

---

## ✅ Table: `attendance`

### Structure:
- `id` (auto-increment)
- `student_id` (required)
- `course_id` (required)
- `date` (required)
- `status` (enum: 'present', 'absent', 'late', 'excused', default: 'absent')

### Example INSERT:
```sql
INSERT INTO attendance (student_id, course_id, date, status) 
VALUES 
  (1, 1, '2025-01-15', 'present'),
  (1, 1, '2025-01-16', 'present'),
  (1, 1, '2025-01-17', 'absent'),
  (1, 1, '2025-01-18', 'late');
```

---

## 🔔 Table: `notifications`

### Structure:
- `id` (auto-increment)
- `user_id` (required - student.id or professor.id)
- `user_type` (enum: 'Student' or 'Professor')
- `type` (enum: 'grade', 'attendance', 'enrollment', 'course', 'system')
- `title` (required)
- `message` (required)
- `course_id` (optional)
- `grade_id` (optional)
- `attendance_id` (optional)
- `enrollment_id` (optional)
- `read` (default: 0)

### Example INSERT:
```sql
INSERT INTO notifications (user_id, user_type, type, title, message, course_id, read) 
VALUES 
  (1, 'Student', 'grade', 'New Grade Posted', 'You received a grade for Quiz 1', 1, 0),
  (1, 'Student', 'attendance', 'Attendance Recorded', 'Your attendance for today has been recorded', 1, 0),
  (1, 'Student', 'enrollment', 'Enrolled in Course', 'You have been enrolled in CS101', 1, 0);
```

---

## 🔧 How to Insert Data

### Option 1: Via Railway MySQL Console

1. Railway Dashboard → MySQL Service → **Database** tab
2. Click **"Query"** or **"Console"**
3. Paste and execute INSERT statements

### Option 2: Via Script

Create a script file and run it:
```bash
railway run node scripts/insert-sample-data.js
```

### Option 3: Via API (Recommended)

Use your API endpoints to create records:
- `POST /api/students` - Create student
- `POST /api/professors` - Create professor
- `POST /api/courses` - Create course
- `POST /api/enrollments` - Enroll student

---

## 🎯 Most Important: Fix Your Current Student

Based on your error logs, you have a student with Firebase UID `2xqwuYFm94PeBrQ3JWgpusfZee93` that needs to be in MySQL:

```sql
INSERT INTO students (firebase_uid, student_id, email, name, department, photo_url, is_archived) 
VALUES 
  ('2xqwuYFm94PeBrQ3JWgpusfZee93', '141714', 't.talamillo.141714.tc@umindanao.edu.ph', 'Talamillo, T', 'Computer Science', NULL, 0);
```

**This will fix the login issue!**

---

## 📝 Complete Setup Example

Here's a complete example to set up a working system:

```sql
-- 1. Create a Professor
INSERT INTO professors (firebase_uid, email, name, department) 
VALUES ('professor-firebase-uid', 'professor@university.edu', 'Dr. Smith', 'Computer Science');

-- 2. Create a Student (your current user)
INSERT INTO students (firebase_uid, student_id, email, name, department) 
VALUES ('2xqwuYFm94PeBrQ3JWgpusfZee93', '141714', 't.talamillo.141714.tc@umindanao.edu.ph', 'Talamillo, T', 'Computer Science');

-- 3. Create a Course (assuming professor id = 1)
INSERT INTO courses (code, name, credits, professor_id) 
VALUES ('CS101', 'Introduction to Computer Science', 3, 1);

-- 4. Enroll Student in Course (assuming student id = 1, course id = 1)
INSERT INTO enrollments (student_id, course_id) 
VALUES (1, 1);
```

---

## ⚠️ Important Notes

1. **Firebase UIDs** must match actual Firebase authentication UIDs
2. **Foreign keys** must reference existing records
3. **Email addresses** should match Firebase authentication emails
4. **Student ID** should match the format from the email (e.g., '141714' from 't.talamillo.141714.tc@umindanao.edu.ph')

---

## 🚀 Quick Fix for Your Current Issue

To fix your login issue right now, run this in Railway MySQL Console:

```sql
INSERT INTO students (firebase_uid, student_id, email, name, department, is_archived) 
VALUES ('2xqwuYFm94PeBrQ3JWgpusfZee93', '141714', 't.talamillo.141714.tc@umindanao.edu.ph', 'Talamillo, T', 'Computer Science', 0);
```

This will create the student record that's missing, allowing login to work!

