# Quick Setup: OpenLiteSpeed + Node.js Backend on Hostinger VPS

## Current Status

✅ Domain added: `studentitrack.org`  
✅ SSL certificate: Answer `y` to get Let's Encrypt certificate  
⏭️ Next: Configure OpenLiteSpeed to proxy to Node.js backend  

---

## After SSL Certificate Setup

Once you've answered `y` and SSL is configured, follow these steps:

---

## Step 1: Make Sure Backend is Running

**On your VPS (via SSH):**

```bash
# Check if backend is running
pm2 status

# If not running, start it:
cd /var/www/server
pm2 start ecosystem.config.js
pm2 save

# Check it's responding
curl http://localhost:5000/api/health
```

---

## Step 2: Access OpenLiteSpeed Web Admin

**On your VPS:**

```bash
# Get admin password
cat /root/.litespeed_password
```

**On your browser:**
- Go to: `http://your-vps-ip:7080`
- Username: `admin`
- Password: (from command above)

---

## Step 3: Configure Reverse Proxy (Web Admin Method)

### In OpenLiteSpeed Web Admin:

1. **Go to:** Virtual Hosts → `studentitrack.org`

2. **Go to:** Script Handler tab

3. **Add Script Handler:**
   - Click "Add"
   - **Suffixes:** `*` (asterisk)
   - **Type:** Select `Proxy`
   - **Handler:** `http://127.0.0.1:5000`
   - Click "Save"

4. **Go to:** Rewrite tab

5. **Enable Rewrite:** Set to `Yes`

6. **Add Rewrite Rule:**
   - Click "Add"
   - **Rewrite Rule:** `^(.*)$`
   - **Action:** `http://127.0.0.1:5000$1`
   - **Flag:** `P,L`
   - Click "Save"

7. **Click "Graceful Restart"** at the top

---

## Step 4: Test Your Setup

```bash
# Test backend directly
curl http://localhost:5000/api/health

# Test via domain (after DNS propagates)
curl https://studentitrack.org/api/health
```

---

## Alternative: Command Line Configuration

If you prefer command line:

```bash
# Edit virtual host config
nano /usr/local/lsws/conf/vhosts/studentitrack/vhost.conf
```

**Add this inside `<virtualHost>` section:**

```xml
<scriptHandlers>
  <scriptHandler>
    <type>proxy</type>
    <uri>/*</uri>
    <handler>http://127.0.0.1:5000</handler>
  </scriptHandler>
</scriptHandlers>

<rewrite>
  <enable>1</enable>
  <rules>
    <rule>
      <name>Proxy to Node.js</name>
      <match>.*</match>
      <action>http://127.0.0.1:5000</action>
      <flag>[P,L]</flag>
    </rule>
  </rules>
</rewrite>
```

**Then restart:**
```bash
systemctl restart lsws
```

---

## Step 5: Update Environment Variables

**On your VPS:**

```bash
cd /var/www/server
nano .env
```

**Update:**
```env
FRONTEND_URL=https://studentitrack.org
```

**Restart backend:**
```bash
pm2 restart student-itrack-api
```

---

## Step 6: Update Frontend

**On your local Windows machine:**

1. **Edit `client/.env.production`:**
   ```env
   VITE_API_URL=https://studentitrack.org/api
   ```

2. **Rebuild frontend:**
   ```powershell
   cd client
   npm run build
   ```

3. **Upload `dist` folder** to Hostinger shared hosting

---

## Verify Everything Works

```bash
# On VPS - test backend
curl https://studentitrack.org/api/health

# Should return:
# {"status":"ok","message":"Server is running"}
```

---

## Common Issues

### 502 Bad Gateway
- **Check:** Is backend running? `pm2 status`
- **Check:** Is backend on port 5000? `netstat -tulpn | grep 5000`

### SSL Not Working
- **Check:** DNS propagated? `nslookup studentitrack.org`
- **Check:** Certificate issued? `certbot certificates`

### CORS Errors
- **Check:** `FRONTEND_URL` in `.env` matches your domain
- **Restart:** `pm2 restart student-itrack-api`

---

## Summary

1. ✅ Answer `y` to SSL certificate prompt
2. ✅ Access OpenLiteSpeed Web Admin (`http://your-vps-ip:7080`)
3. ✅ Configure Script Handler (proxy to `http://127.0.0.1:5000`)
4. ✅ Enable Rewrite rules
5. ✅ Restart OpenLiteSpeed
6. ✅ Test: `curl https://studentitrack.org/api/health`
7. ✅ Update frontend to use new URL

---

**After SSL setup, configure the reverse proxy and you're done! 🚀**


