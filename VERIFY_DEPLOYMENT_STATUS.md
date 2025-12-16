# Verify Your Deployment Status

## 🎯 Quick Status Check

Use this guide to verify if your website is properly deployed and connected.

---

## ✅ Step 1: Test Backend (Railway)

### Test 1: Health Endpoint
Open this URL in your browser:
```
https://studentitrack1-production.up.railway.app/api/health
```

**Expected Result:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "...",
  "environment": "production"
}
```

**If you see this:** ✅ Backend is running!

**If you see:**
- ❌ "Connection refused" → Backend is not running
- ❌ "502 Bad Gateway" → Backend crashed
- ❌ "404 Not Found" → Route doesn't exist

---

### Test 2: Students Endpoint
Open this URL:
```
https://studentitrack1-production.up.railway.app/api/students
```

**Expected Result:**
- ✅ JSON array of students (even if empty `[]`)
- ✅ Or authentication required message

**If you see:** ✅ Backend API is working!

---

### Test 3: Professors Endpoint
Open this URL:
```
https://studentitrack1-production.up.railway.app/api/professors
```

**Expected Result:**
- ✅ JSON array of professors (even if empty `[]`)
- ✅ Or authentication required message

**If you see:** ✅ Professors API is working!

---

## ✅ Step 2: Test Frontend (Vercel)

### Test 1: Visit Your Website
Open this URL:
```
https://studentitrack1.vercel.app
```

**Expected Result:**
- ✅ Website loads
- ✅ Login page appears
- ✅ No console errors (check F12)

**If you see errors:** Check browser console (F12) for details

---

### Test 2: Check API Connection
1. Open your website: `https://studentitrack1.vercel.app`
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for API calls

**Expected:**
- ✅ API calls go to: `https://studentitrack1-production.up.railway.app/api/...`
- ❌ NOT to: `http://localhost:5000/api/...`

**If you see `localhost:5000`:**
- ❌ `VITE_API_URL` is not set in Vercel
- ❌ Or Vercel wasn't redeployed after setting it

---

### Test 3: Check Network Requests
1. Open your website
2. Press **F12** → **Network** tab
3. Try to login or load data
4. Look for API requests

**Expected:**
- ✅ Requests to: `studentitrack1-production.up.railway.app`
- ✅ Status: 200 (OK) or 401 (Unauthorized - but connected!)
- ❌ NOT: `localhost:5000`
- ❌ NOT: CORS errors

**If you see CORS errors:**
- ❌ `FRONTEND_URL` not set in Railway
- ❌ Or Railway wasn't redeployed

---

## ✅ Step 3: Verify Environment Variables

### Vercel Environment Variables

Go to: **Vercel Dashboard → studentitrack1 → Settings → Environment Variables**

**Required Variables:**
- [ ] `VITE_API_URL = https://studentitrack1-production.up.railway.app/api`
- [ ] `VITE_FIREBASE_API_KEY = ...`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN = ...`
- [ ] `VITE_FIREBASE_PROJECT_ID = ...`
- [ ] All other Firebase variables

**Check:**
- ✅ `VITE_API_URL` includes `/api` at the end
- ✅ All variables are set for **Production**, **Preview**, and **Development**
- ✅ You redeployed after setting `VITE_API_URL`

---

### Railway Environment Variables

Go to: **Railway Dashboard → studentitrack1 → Variables**

**Required Variables:**
- [ ] `FRONTEND_URL = https://studentitrack1.vercel.app`
- [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}` (should show `mysql.railway.internal`)
- [ ] `DB_USER = ${{MySQL.MYSQLUSER}}`
- [ ] `DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}`
- [ ] `DB_NAME = ${{MySQL.MYSQLDATABASE}}`
- [ ] `NODE_ENV = production`
- [ ] `FIREBASE_PROJECT_ID = studitrack-54f69`
- [ ] `FIREBASE_PRIVATE_KEY = ...`
- [ ] `FIREBASE_CLIENT_EMAIL = ...`

**Check:**
- ✅ `FRONTEND_URL` matches your Vercel URL exactly
- ✅ `DB_HOST` shows `mysql.railway.internal` (NOT `localhost`)
- ✅ All variables are set

---

## ✅ Step 4: Test Student-Professor Connection

### Test 1: Login as Student
1. Go to: `https://studentitrack1.vercel.app`
2. Login with a student account
3. Check if you can see:
   - ✅ Your profile
   - ✅ Courses assigned to you
   - ✅ Professors teaching your courses

**If you can see courses/professors:** ✅ Student-Professor connection works!

---

### Test 2: Login as Professor
1. Go to: `https://studentitrack1.vercel.app`
2. Login with a professor account
3. Check if you can see:
   - ✅ Your profile
   - ✅ Courses you're teaching
   - ✅ Students enrolled in your courses

**If you can see students/courses:** ✅ Professor-Student connection works!

---

### Test 3: Check Database Relationships

The connection between students and professors happens through **courses**:

```
Student → Course → Professor
```

**Database Structure:**
- `students` table: Contains student data
- `professors` table: Contains professor data
- `courses` table: Links students to professors via `professor_id`
- `enrollments` table: Links students to courses (if exists)

**To verify:**
1. Check if courses have `professor_id` set
2. Check if students are enrolled in courses
3. Check if professors are assigned to courses

---

## 🔍 Troubleshooting

### Problem: Backend Not Responding

**Check:**
1. Railway Dashboard → Service Status (should be green)
2. Railway Dashboard → Deploy Logs (check for errors)
3. Test health endpoint: `/api/health`

**Fix:**
- Restart Railway service
- Check environment variables
- Check database connection

---

### Problem: Frontend Shows `localhost:5000`

**Check:**
1. Vercel → Environment Variables → `VITE_API_URL`
2. Did you redeploy after setting it?

**Fix:**
1. Set `VITE_API_URL = https://studentitrack1-production.up.railway.app/api`
2. Redeploy Vercel
3. Clear browser cache

---

### Problem: CORS Errors

**Check:**
1. Railway → Variables → `FRONTEND_URL`
2. Should be: `https://studentitrack1.vercel.app`

**Fix:**
1. Set `FRONTEND_URL` in Railway
2. Redeploy Railway
3. Check Railway logs for CORS messages

---

### Problem: Students Can't See Professors

**Check:**
1. Are courses created in database?
2. Do courses have `professor_id` set?
3. Are students enrolled in courses?

**Fix:**
1. Create courses with `professor_id`
2. Enroll students in courses
3. Check API endpoints return correct data

---

### Problem: Professors Can't See Students

**Check:**
1. Are students enrolled in courses?
2. Do courses have `professor_id` matching the professor?
3. Is the API returning enrollment data?

**Fix:**
1. Enroll students in courses
2. Verify `professor_id` in courses table
3. Check API endpoints

---

## 📋 Quick Checklist

### Backend (Railway)
- [ ] Service status is green
- [ ] `/api/health` returns OK
- [ ] `/api/students` works
- [ ] `/api/professors` works
- [ ] `FRONTEND_URL` is set
- [ ] Database variables are set
- [ ] Firebase variables are set

### Frontend (Vercel)
- [ ] Website loads
- [ ] `VITE_API_URL` is set correctly
- [ ] All Firebase variables are set
- [ ] No console errors
- [ ] API calls go to Railway (not localhost)

### Database
- [ ] Students exist in database
- [ ] Professors exist in database
- [ ] Courses exist in database
- [ ] Courses have `professor_id` set
- [ ] Students are enrolled in courses (if using enrollments table)

---

## 🎯 Final Verification

**Test the complete flow:**

1. ✅ Backend health check works
2. ✅ Frontend loads without errors
3. ✅ Login works (Firebase authentication)
4. ✅ API calls go to Railway
5. ✅ Students can see their courses/professors
6. ✅ Professors can see their courses/students

**If all these work:** 🎉 Your website is fully deployed and connected!

---

## 📞 Need Help?

If something doesn't work:
1. Check the specific error message
2. Check Railway logs
3. Check browser console (F12)
4. Verify environment variables
5. Test each endpoint individually

Share the specific error or issue, and I can help you fix it!

