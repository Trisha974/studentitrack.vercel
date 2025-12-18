# Email Domain Security - Login Restrictions

## Overview

The system now enforces strict email domain validation to ensure only authorized users from the University of Mindanao can access the system.

## Email Requirements

### Professors
- **Format**: Must end with `@umindanao.edu.ph`
- **Examples**:
  - ✅ `professor@umindanao.edu.ph`
  - ✅ `john.doe@umindanao.edu.ph`
  - ✅ `laila.smith@umindanao.edu.ph`
  - ❌ `professor@gmail.com`
  - ❌ `professor@umindanao.edu`

### Students
- **Format**: Must follow pattern `{studentId}.tc@umindanao.edu.ph`
- **Examples**:
  - ✅ `123456.tc@umindanao.edu.ph`
  - ✅ `2021-12345.tc@umindanao.edu.ph`
  - ✅ `987654.tc@umindanao.edu.ph`
  - ❌ `123456@umindanao.edu.ph` (missing `.tc`)
  - ❌ `student@gmail.com`
  - ❌ `123456.tc@gmail.com`

## How It Works

### Registration
1. **Email Validation**: System checks email format based on selected role
2. **Student ID Extraction**: For students, the student ID is automatically extracted from the email
   - Example: `123456.tc@umindanao.edu.ph` → Student ID: `123456`
3. **Rejection**: Invalid email formats are rejected with clear error messages

### Login
1. **Email Format Check**: System validates email format matches the user's role
2. **Security**: Even if password is correct, login fails if email format is invalid
3. **Error Messages**: Clear error messages explain the required format

### Password Reset
1. **Email Format Validation**: System validates email format before processing reset
2. **Role Validation**: Email format must match the user's role in the system

## Student ID Extraction

When a student registers with email `123456.tc@umindanao.edu.ph`:
- Student ID `123456` is automatically extracted
- If `student_id` is also provided, it must match the email's student ID
- If no `student_id` is provided, the one from email is used

## Error Messages

### Registration Errors
- **Invalid Professor Email**: `"Professor email must end with @umindanao.edu.ph"`
- **Invalid Student Email**: `"Student email must follow the pattern: {studentId}.tc@umindanao.edu.ph (e.g., 123456.tc@umindanao.edu.ph)"`
- **Mismatched Student ID**: `"Student ID in email (123456) does not match provided student ID (789012)"`

### Login Errors
- **Invalid Email Format**: `"Invalid email format: Professor email must end with @umindanao.edu.ph"`
- **Invalid Email Format**: `"Invalid email format: Student email must follow the pattern: {studentId}.tc@umindanao.edu.ph (e.g., 123456.tc@umindanao.edu.ph)"`

## Security Benefits

1. **Domain Restriction**: Only `@umindanao.edu.ph` emails are accepted
2. **Role-Specific Format**: Different formats for professors and students prevent role confusion
3. **Student ID Verification**: Student emails include student ID for verification
4. **Consistent Validation**: Email format is checked at registration, login, and password reset

## Technical Implementation

### Validation Functions
- `isValidProfessorEmail(email)` - Checks if email ends with `@umindanao.edu.ph`
- `isValidStudentEmail(email)` - Checks if email matches `{studentId}.tc@umindanao.edu.ph` pattern
- `extractStudentIdFromEmail(email)` - Extracts student ID from student email
- `validateEmailByRole(email, role)` - Validates email format based on user role

### Where Validation Occurs
1. **Registration** (`auth.service.js` → `register()`)
2. **Login** (`auth.service.js` → `login()`)
3. **Password Reset** (`auth.service.js` → `requestPasswordReset()`, `resetPassword()`)

## Examples

### Valid Registrations

**Professor:**
```json
{
  "email": "john.doe@umindanao.edu.ph",
  "password": "securepassword123",
  "role": "Professor",
  "name": "John Doe"
}
```

**Student:**
```json
{
  "email": "123456.tc@umindanao.edu.ph",
  "password": "securepassword123",
  "role": "Student",
  "name": "Jane Smith"
}
```

### Invalid Registrations

**Professor with wrong domain:**
```json
{
  "email": "john.doe@gmail.com",  // ❌ Wrong domain
  "role": "Professor"
}
```
Error: `"Professor email must end with @umindanao.edu.ph"`

**Student with wrong format:**
```json
{
  "email": "123456@umindanao.edu.ph",  // ❌ Missing .tc
  "role": "Student"
}
```
Error: `"Student email must follow the pattern: {studentId}.tc@umindanao.edu.ph (e.g., 123456.tc@umindanao.edu.ph)"`

## Migration Notes

If you have existing users with different email formats:
1. They will need to update their emails to match the new requirements
2. Login will fail until email format is corrected
3. Consider creating a migration script to update existing emails

## Testing

To test email validation:

1. **Test Professor Registration**:
   - ✅ `test@umindanao.edu.ph` - Should succeed
   - ❌ `test@gmail.com` - Should fail

2. **Test Student Registration**:
   - ✅ `123456.tc@umindanao.edu.ph` - Should succeed
   - ❌ `123456@umindanao.edu.ph` - Should fail (missing .tc)
   - ❌ `student@gmail.com` - Should fail

3. **Test Login**:
   - Valid email + correct password → Success
   - Invalid email format + correct password → Fail
   - Valid email + wrong password → Fail

