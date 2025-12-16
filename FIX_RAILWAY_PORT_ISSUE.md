# Fix Railway PORT Binding Issue

## 🔴 Error: "App is not binding to Railway's required PORT"

Railway requires your app to use the `PORT` environment variable they provide. Your code already does this, but Railway might not be detecting it correctly.

---

## ✅ Solution 1: Remove PORT from Railway Variables (Recommended)

**Railway automatically assigns a PORT** - you don't need to set it manually.

1. Go to **Railway Dashboard** → Your Service → **Variables** tab
2. Look for `PORT` variable
3. **If `PORT = 5000` exists, DELETE it** (or leave it empty)
4. Railway will automatically assign a PORT and inject it as `process.env.PORT`
5. Your server code will use it: `const PORT = process.env.PORT || 5000`

**Why this works:**
- Railway auto-assigns a port (usually something like 3000, 5000, or a random port)
- Your code already uses `process.env.PORT || 5000`
- Railway will inject the PORT automatically

---

## ✅ Solution 2: Verify Server is Binding Correctly

Your server code should be:

```javascript
const PORT = process.env.PORT || 5000
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
```

**This is already correct in your code!** ✅

The key points:
- ✅ Uses `process.env.PORT` (Railway's variable)
- ✅ Falls back to `5000` for local development
- ✅ Binds to `0.0.0.0` (all interfaces - required for Railway)
- ✅ Logs the port being used

---

## ✅ Solution 3: Check Railway Service Configuration

1. Railway Dashboard → Your Service → **Settings** tab
2. Check **"Start Command"**:
   - Should be: `cd server && npm start` OR `node src/server.js`
   - Make sure it's pointing to your server file

3. Check **"Root Directory"**:
   - Should be: `server` (if your server code is in `server/` folder)
   - OR leave empty if Railway auto-detects

---

## ✅ Solution 4: Verify PORT is Being Used

After removing/not setting PORT in Railway:

1. Check Railway Deploy Logs
2. Look for this line:
   ```
   🔌 Using PORT: [some number] (from Railway)
   ```
3. The port number should match what Railway assigned

**If you see:**
```
🔌 Using PORT: 5000 (from fallback)
```
This means Railway's PORT wasn't set - which is fine, your fallback will work.

**If you see:**
```
🔌 Using PORT: [random number] (from Railway)
```
This is correct! Railway assigned a port and your app is using it.

---

## 🔍 Why This Error Happens

Railway checks if your app is:
1. ✅ Listening on the PORT they provide
2. ✅ Binding to `0.0.0.0` (not `localhost` or `127.0.0.1`)
3. ✅ Starting successfully

If any of these fail, Railway shows the error.

---

## 📋 Quick Checklist

- [ ] **Remove `PORT` from Railway Variables** (let Railway auto-assign)
- [ ] Server code uses `process.env.PORT || 5000` ✅ (already correct)
- [ ] Server binds to `0.0.0.0` ✅ (already correct)
- [ ] Start command is correct in Railway Settings
- [ ] Root directory is set correctly (if needed)
- [ ] Redeploy after making changes

---

## 🚀 Steps to Fix

1. **Go to Railway Variables**
   - Remove `PORT = 5000` if it exists
   - OR ensure it's not set

2. **Redeploy Service**
   - Railway Dashboard → Your Service
   - Click **"Redeploy"** or wait for auto-redeploy

3. **Check Logs**
   - Look for: `🔌 Using PORT: [number] (from Railway)`
   - Look for: `🚀 Server running on port [number]`

4. **Verify**
   - Railway should stop showing the PORT binding error
   - Service should show as "Running" (green)

---

## 🎯 Expected Result

After fixing:

**Railway Logs should show:**
```
🔌 Using PORT: 3000 (from Railway)  ← or whatever Railway assigns
🚀 Server running on port 3000
📡 API available at http://0.0.0.0:3000/api
```

**Railway Dashboard:**
- ✅ Service status: Green (Running)
- ✅ No PORT binding errors
- ✅ Public URL works

---

## 📞 If Still Not Working

If you still get the error after removing PORT:

1. **Check Railway Deploy Logs** - What port is Railway trying to use?
2. **Check Start Command** - Is it correct?
3. **Check Root Directory** - Is it set correctly?
4. **Share the error message** - Exact text from Railway

The most common fix is simply **removing the PORT variable** from Railway and letting Railway auto-assign it!

