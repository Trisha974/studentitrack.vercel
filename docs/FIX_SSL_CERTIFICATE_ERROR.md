# Fix SSL Certificate Error - Certbot ACME Challenge Failed

## The Problem

Certbot can't verify your domain because it can't access the challenge files. This happens when:
- DNS isn't pointing to your VPS yet
- OpenLiteSpeed isn't configured to serve files
- Webroot path is incorrect

---

## Solution 1: Check DNS Configuration (Do This First!)

### Step 1: Verify DNS is Pointing to Your VPS

**On your local Windows machine:**

```powershell
# Check DNS resolution
nslookup studentitrack.org
nslookup www.studentitrack.org
```

**What to check:**
- Do they resolve to your VPS IP address?
- If not, DNS hasn't propagated yet

### Step 2: Configure DNS Records

**In your domain registrar (or Hostinger DNS settings):**

1. **Add A Record for main domain:**
   - Type: `A`
   - Name: `@` (or leave blank)
   - Value: `your-vps-ip`
   - TTL: `3600`

2. **Add A Record for www subdomain:**
   - Type: `A`
   - Name: `www`
   - Value: `your-vps-ip`
   - TTL: `3600`

3. **Wait 5-30 minutes** for DNS to propagate

### Step 3: Verify DNS Before Retrying

**On your VPS:**

```bash
# Check if domain resolves to your VPS IP
dig studentitrack.org +short
dig www.studentitrack.org +short

# Should show your VPS IP address
```

---

## Solution 2: Configure OpenLiteSpeed Webroot First

The issue is that OpenLiteSpeed needs to serve files from a webroot. Let's set that up:

### Step 1: Create Webroot Directory

```bash
# Create directory for web files
mkdir -p /var/www/studentitrack.org/public_html

# Create a test file
echo "Hello World" > /var/www/studentitrack.org/public_html/index.html

# Set permissions
chown -R lsadm:lsadm /var/www/studentitrack.org
chmod -R 755 /var/www/studentitrack.org
```

### Step 2: Configure OpenLiteSpeed Virtual Host

**Access Web Admin:**
```bash
# Get admin password
cat /root/.litespeed_password
```

**Go to:** `http://your-vps-ip:7080`

**Configure Virtual Host:**

1. **Go to:** Virtual Hosts → `studentitrack.org`
2. **Set Document Root:** `/var/www/studentitrack.org/public_html`
3. **Save and Graceful Restart**

### Step 3: Test Web Server

```bash
# Test if web server is serving files
curl http://studentitrack.org
# Should show "Hello World"
```

---

## Solution 3: Retry SSL Certificate with Correct Webroot

Once DNS and webroot are configured:

```bash
# Retry SSL certificate with explicit webroot
certbot certonly --webroot \
  -w /var/www/studentitrack.org/public_html \
  -d studentitrack.org \
  -d www.studentitrack.org
```

---

## Solution 4: Use Standalone Mode (If Webroot Doesn't Work)

This method temporarily stops OpenLiteSpeed to verify:

```bash
# Stop OpenLiteSpeed temporarily
systemctl stop lsws

# Get certificate in standalone mode
certbot certonly --standalone \
  -d studentitrack.org \
  -d www.studentitrack.org

# Start OpenLiteSpeed again
systemctl start lsws
```

**Note:** This requires ports 80 and 443 to be free, so OpenLiteSpeed must be stopped.

---

## Solution 5: Use DNS Challenge (No Web Server Needed)

If web server configuration is complex, use DNS challenge:

```bash
# Install DNS plugin (if using Cloudflare, etc.)
# For manual DNS challenge:
certbot certonly --manual --preferred-challenges dns \
  -d studentitrack.org \
  -d www.studentitrack.org
```

**Follow prompts:**
- Certbot will give you TXT records to add to DNS
- Add them to your DNS settings
- Wait for propagation
- Press Enter to continue

---

## Quick Fix: Try This First

**On your VPS, run these commands:**

```bash
# 1. Check if domain resolves
nslookup studentitrack.org

# 2. Create webroot
mkdir -p /var/www/studentitrack.org/public_html
echo "test" > /var/www/studentitrack.org/public_html/index.html
chown -R lsadm:lsadm /var/www/studentitrack.org

# 3. Configure OpenLiteSpeed webroot via Web Admin
# Go to: http://your-vps-ip:7080
# Virtual Hosts → studentitrack.org → General
# Set Document Root: /var/www/studentitrack.org/public_html
# Save and Graceful Restart

# 4. Test web server
curl http://studentitrack.org

# 5. Retry SSL with webroot
certbot certonly --webroot \
  -w /var/www/studentitrack.org/public_html \
  -d studentitrack.org \
  -d www.studentitrack.org
```

---

## Recommended Approach

**For Hostinger VPS with OpenLiteSpeed:**

1. **First:** Make sure DNS is configured and propagated
2. **Second:** Configure OpenLiteSpeed virtual host with proper webroot
3. **Third:** Retry SSL certificate with `--webroot` flag

---

## After SSL Certificate is Obtained

Once you have the certificate:

1. **OpenLiteSpeed will auto-configure SSL** (if using their script)
2. **Or manually configure** in Web Admin → SSL tab
3. **Test HTTPS:**
   ```bash
   curl https://studentitrack.org
   ```

---

## Troubleshooting Commands

```bash
# Check DNS
dig studentitrack.org +short
nslookup studentitrack.org

# Check if web server is running
systemctl status lsws

# Check OpenLiteSpeed logs
tail -f /usr/local/lsws/logs/error.log

# Test HTTP access
curl -I http://studentitrack.org

# Check Certbot logs
cat /var/log/letsencrypt/letsencrypt.log

# List certificates
certbot certificates
```

---

## Common Issues

### DNS Not Propagated
- **Wait:** DNS can take up to 48 hours (usually 5-30 minutes)
- **Check:** Use `nslookup` or `dig` to verify

### Port 80 Blocked
- **Check firewall:** `ufw status`
- **Allow port 80:** `ufw allow 80/tcp`

### OpenLiteSpeed Not Serving Files
- **Check virtual host:** Web Admin → Virtual Hosts
- **Check document root:** Must exist and be readable
- **Check permissions:** `chown -R lsadm:lsadm /var/www/`

---

**Start with Solution 1 (DNS check), then Solution 2 (webroot setup), then retry SSL!**


