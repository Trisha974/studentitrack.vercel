# OpenLiteSpeed Configuration for Hostinger VPS

Hostinger VPS uses **OpenLiteSpeed** instead of Nginx. This guide shows how to configure it to work with your Node.js backend.

---

## Step 1: SSL Certificate Setup (You're Doing This Now!)

When prompted:
```
Do you wish to issue a Let's encrypt certificate for this domain? [y/N]
```

**Answer: `y`** ✅

This will:
- ✅ Issue a free SSL certificate for `studentitrack.org`
- ✅ Configure HTTPS automatically
- ✅ Set up auto-renewal

---

## Step 2: Configure OpenLiteSpeed Web Admin

### Access Web Admin Panel

1. **Get your admin credentials:**
   ```bash
   cat /root/.litespeed_password
   ```
   This shows your admin username and password.

2. **Access Web Admin:**
   - URL: `http://your-vps-ip:7080`
   - Or: `https://your-vps-ip:7080` (if SSL is set up)
   - Username: Usually `admin`
   - Password: From the file above

### Alternative: Command Line Setup

You can also configure via command line (easier for beginners).

---

## Step 3: Create Virtual Host for API

### Option A: Using Web Admin Panel

1. **Login to Web Admin** (`http://your-vps-ip:7080`)
2. **Go to:** Virtual Hosts → Add
3. **Configure:**
   - **Virtual Host Name:** `api-studentitrack`
   - **Domain:** `api.studentitrack.org` (or `studentitrack.org`)
   - **Document Root:** `/var/www/server` (or your server path)

### Option B: Using Command Line (Recommended)

```bash
# Navigate to OpenLiteSpeed config directory
cd /usr/local/lsws/conf/

# Edit virtual host configuration
nano vhosts/studentitrack/vhost.conf
```

---

## Step 4: Configure Reverse Proxy to Node.js Backend

Your backend runs on `localhost:5000`. Configure OpenLiteSpeed to proxy requests to it.

### Method 1: Web Admin Panel

1. **Login to Web Admin** (`http://your-vps-ip:7080`)
2. **Go to:** Virtual Hosts → `studentitrack.org` → Script Handler
3. **Add Script Handler:**
   - **Suffixes:** `*`
   - **Type:** `Proxy`
   - **Handler:** `http://127.0.0.1:5000`
   - **Notes:** `Node.js Backend Proxy`

4. **Go to:** Virtual Hosts → `studentitrack.org` → Rewrite
5. **Enable Rewrite:** `Yes`
6. **Rewrite Rules:** Add:
   ```
   RewriteRule ^(.*)$ http://127.0.0.1:5000$1 [P,L]
   ```

### Method 2: Edit Configuration File Directly

```bash
# Edit virtual host config
nano /usr/local/lsws/conf/vhosts/studentitrack/vhost.conf
```

**Add or modify these sections:**

```xml
<virtualHost studentitrack.org>
  <docRoot>/var/www/server</docRoot>
  
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
</virtualHost>
```

---

## Step 5: Restart OpenLiteSpeed

After making changes:

```bash
# Restart OpenLiteSpeed
systemctl restart lsws

# Or using command:
/usr/local/lsws/bin/lswsctrl restart
```

---

## Step 6: Verify Configuration

### Test Backend Directly (on VPS):

```bash
curl http://localhost:5000/api/health
```

### Test via Domain:

```bash
curl https://studentitrack.org/api/health
```

**Expected response:**
```json
{"status":"ok","message":"Server is running"}
```

---

## Alternative: Use Subdomain for API

If you want to separate API from frontend:

### Setup `api.studentitrack.org`:

1. **Add DNS A Record:**
   - Type: `A`
   - Name: `api`
   - Value: `your-vps-ip`
   - TTL: `3600`

2. **Add Virtual Host in OpenLiteSpeed:**
   - Domain: `api.studentitrack.org`
   - Configure proxy to `http://127.0.0.1:5000`

3. **Get SSL for subdomain:**
   ```bash
   # Run the domain setup script again for api.studentitrack.org
   # Or use certbot manually
   ```

---

## Complete Configuration Example

For `studentitrack.org` pointing to your backend API:

**Virtual Host Config** (`/usr/local/lsws/conf/vhosts/studentitrack/vhost.conf`):

```xml
<virtualHost studentitrack.org>
  <docRoot>/var/www/server</docRoot>
  
  <index>
    <file>index.html</file>
  </index>
  
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
        <name>Proxy All to Node.js</name>
        <match>.*</match>
        <action>http://127.0.0.1:5000</action>
        <flag>[P,L]</flag>
      </rule>
    </rules>
  </rewrite>
  
  <extProcessor>
    <type>lsphp81</type>
  </extProcessor>
</virtualHost>
```

---

## Troubleshooting

### Backend Not Responding

1. **Check if backend is running:**
   ```bash
   pm2 status
   ```

2. **Check backend logs:**
   ```bash
   pm2 logs student-itrack-api
   ```

3. **Test backend directly:**
   ```bash
   curl http://localhost:5000/api/health
   ```

### OpenLiteSpeed Not Proxying

1. **Check OpenLiteSpeed error logs:**
   ```bash
   tail -f /usr/local/lsws/logs/error.log
   ```

2. **Verify virtual host configuration:**
   ```bash
   /usr/local/lsws/bin/lswsctrl status
   ```

3. **Restart OpenLiteSpeed:**
   ```bash
   systemctl restart lsws
   ```

### SSL Certificate Issues

1. **Check certificate status:**
   ```bash
   certbot certificates
   ```

2. **Renew certificate manually:**
   ```bash
   certbot renew
   ```

3. **Check OpenLiteSpeed SSL configuration** in Web Admin

---

## Quick Commands Reference

```bash
# OpenLiteSpeed Control
systemctl status lsws          # Check status
systemctl restart lsws          # Restart
systemctl stop lsws             # Stop
systemctl start lsws            # Start

# View Logs
tail -f /usr/local/lsws/logs/error.log
tail -f /usr/local/lsws/logs/access.log

# Get Admin Password
cat /root/.litespeed_password

# Test Configuration
/usr/local/lsws/bin/lswsctrl status
```

---

## After SSL Setup

Once SSL is configured:

1. ✅ **Update your backend `.env` file:**
   ```env
   FRONTEND_URL=https://studentitrack.org
   ```

2. ✅ **Update frontend to use HTTPS:**
   ```env
   VITE_API_URL=https://studentitrack.org/api
   ```

3. ✅ **Rebuild frontend:**
   ```bash
   cd client
   npm run build
   ```

4. ✅ **Test API:**
   ```bash
   curl https://studentitrack.org/api/health
   ```

---

**Your domain `studentitrack.org` is now set up with SSL! Next, configure OpenLiteSpeed to proxy to your Node.js backend on port 5000.** 🚀


