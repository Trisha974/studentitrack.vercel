#!/bin/bash
# Script to help connect VPS to studentitrack.org domain
# Run this on your VPS after configuring DNS

set -e

echo "🔗 Setting up domain connection for studentitrack.org..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="studentitrack.org"
WEBROOT="/var/www/studentitrack.org/public_html"
VPS_IP=$(hostname -I | awk '{print $1}')

echo -e "${BLUE}Your VPS IP: $VPS_IP${NC}"
echo ""

# Step 1: Check DNS
echo -e "${YELLOW}Step 1: Checking DNS configuration...${NC}"
DNS_IP=$(dig +short $DOMAIN | tail -n1)
if [ -z "$DNS_IP" ]; then
    echo -e "${RED}❌ DNS not configured yet!${NC}"
    echo ""
    echo "Please configure DNS in Hostinger:"
    echo "  1. Login to Hostinger hPanel"
    echo "  2. Go to: Domains → studentitrack.org → DNS"
    echo "  3. Add A Record:"
    echo "     - Type: A"
    echo "     - Name: @ (or leave blank)"
    echo "     - Value: $VPS_IP"
    echo "     - TTL: 3600"
    echo "  4. Add A Record for www:"
    echo "     - Type: A"
    echo "     - Name: www"
    echo "     - Value: $VPS_IP"
    echo "     - TTL: 3600"
    echo "  5. Wait 5-30 minutes for DNS propagation"
    echo ""
    echo "Then run this script again."
    exit 1
elif [ "$DNS_IP" != "$VPS_IP" ]; then
    echo -e "${RED}⚠ DNS points to $DNS_IP, but VPS IP is $VPS_IP${NC}"
    echo "Please update DNS A record to point to: $VPS_IP"
    exit 1
else
    echo -e "${GREEN}✓ DNS is correctly configured (points to $DNS_IP)${NC}"
fi
echo ""

# Step 2: Create web directory
echo -e "${YELLOW}Step 2: Creating web directory...${NC}"
mkdir -p "$WEBROOT"
cat > "$WEBROOT/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>studentitrack.org</title>
</head>
<body>
    <h1>studentitrack.org is connected!</h1>
    <p>Domain is working correctly.</p>
</body>
</html>
EOF

# Set permissions
if id "lsadm" &>/dev/null; then
    chown -R lsadm:lsadm /var/www/studentitrack.org
else
    chown -R www-data:www-data /var/www/studentitrack.org
fi
chmod -R 755 /var/www/studentitrack.org
echo -e "${GREEN}✓ Web directory created: $WEBROOT${NC}"
echo ""

# Step 3: Check OpenLiteSpeed
echo -e "${YELLOW}Step 3: Checking OpenLiteSpeed...${NC}"
if systemctl is-active --quiet lsws; then
    echo -e "${GREEN}✓ OpenLiteSpeed is running${NC}"
else
    echo -e "${YELLOW}⚠ Starting OpenLiteSpeed...${NC}"
    systemctl start lsws
fi
echo ""

# Step 4: Get admin credentials
echo -e "${YELLOW}Step 4: OpenLiteSpeed Admin Access${NC}"
if [ -f "/root/.litespeed_password" ]; then
    ADMIN_PASS=$(cat /root/.litespeed_password | grep "password" | awk '{print $3}')
    echo -e "${BLUE}Web Admin URL: http://$VPS_IP:7080${NC}"
    echo -e "${BLUE}Username: admin${NC}"
    echo -e "${BLUE}Password: $ADMIN_PASS${NC}"
    echo ""
    echo "Please configure Virtual Host in OpenLiteSpeed Web Admin:"
    echo "  1. Go to: http://$VPS_IP:7080"
    echo "  2. Login with admin and password above"
    echo "  3. Go to: Virtual Hosts → Add (or edit studentitrack.org)"
    echo "  4. Set Domain: studentitrack.org, www.studentitrack.org"
    echo "  5. Set Document Root: $WEBROOT"
    echo "  6. Save and Graceful Restart"
    echo ""
    read -p "Press Enter after configuring OpenLiteSpeed virtual host..."
else
    echo -e "${YELLOW}⚠ Admin password file not found${NC}"
    echo "You may need to set up OpenLiteSpeed admin password manually"
fi
echo ""

# Step 5: Test web server
echo -e "${YELLOW}Step 5: Testing web server...${NC}"
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓ Web server is responding${NC}"
else
    echo -e "${YELLOW}⚠ Web server may need configuration${NC}"
fi

# Test domain
DOMAIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "000")
if [ "$DOMAIN_CODE" = "200" ] || [ "$DOMAIN_CODE" = "301" ] || [ "$DOMAIN_CODE" = "302" ]; then
    echo -e "${GREEN}✓ Domain is accessible via HTTP${NC}"
else
    echo -e "${YELLOW}⚠ Domain not accessible yet (HTTP $DOMAIN_CODE)${NC}"
    echo "This might be DNS propagation delay or OpenLiteSpeed configuration"
fi
echo ""

# Step 6: SSL Certificate Setup
echo -e "${YELLOW}Step 6: SSL Certificate Setup${NC}"
echo "Do you want to set up SSL certificate now? (y/n)"
read -p "> " SETUP_SSL

if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    echo "Setting up SSL certificate..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        echo "Installing Certbot..."
        apt-get update -qq
        apt-get install -y certbot
    fi
    
    # Try webroot method first
    echo "Attempting webroot method..."
    certbot certonly --webroot \
      -w "$WEBROOT" \
      -d "$DOMAIN" \
      -d "www.$DOMAIN" \
      --email a.pancho.142177.tc@umindanao.edu.ph \
      --agree-tos \
      --non-interactive || {
        echo -e "${YELLOW}Webroot method failed. Trying standalone method...${NC}"
        echo "This will temporarily stop OpenLiteSpeed..."
        read -p "Continue? [y/N] " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            systemctl stop lsws
            certbot certonly --standalone \
              -d "$DOMAIN" \
              -d "www.$DOMAIN" \
              --email a.pancho.142177.tc@umindanao.edu.ph \
              --agree-tos \
              --non-interactive
            systemctl start lsws
            
            if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
                echo -e "${GREEN}✓ SSL certificate obtained!${NC}"
                echo ""
                echo "Next: Configure SSL in OpenLiteSpeed Web Admin:"
                echo "  1. Go to: Virtual Hosts → studentitrack.org → SSL"
                echo "  2. Enable SSL: Yes"
                echo "  3. Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
                echo "  4. Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
                echo "  5. Save and Graceful Restart"
            fi
        fi
    }
else
    echo "Skipping SSL setup. You can set it up later."
fi
echo ""

# Step 7: Backend Configuration
echo -e "${YELLOW}Step 7: Backend Configuration${NC}"
if [ -d "/var/www/server" ]; then
    echo "Found backend directory. Updating .env file..."
    cd /var/www/server
    
    if [ -f ".env" ]; then
        # Update FRONTEND_URL
        if grep -q "FRONTEND_URL" .env; then
            sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" .env
        else
            echo "FRONTEND_URL=https://$DOMAIN" >> .env
        fi
        echo -e "${GREEN}✓ Updated FRONTEND_URL in .env${NC}"
        
        # Restart backend if PM2 is running
        if command -v pm2 &> /dev/null; then
            if pm2 list | grep -q "student-itrack-api"; then
                echo "Restarting backend..."
                pm2 restart student-itrack-api
                echo -e "${GREEN}✓ Backend restarted${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠ .env file not found. Please create it manually.${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Backend directory not found at /var/www/server${NC}"
    echo "Please update backend .env file manually:"
    echo "  FRONTEND_URL=https://$DOMAIN"
fi
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Domain Setup Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Domain: $DOMAIN"
echo "VPS IP: $VPS_IP"
echo "DNS IP: $DNS_IP"
echo "Webroot: $WEBROOT"
echo ""
echo "Next steps:"
echo "  1. ✅ DNS configured"
echo "  2. ✅ Web directory created"
echo "  3. ⏭️ Configure OpenLiteSpeed virtual host (if not done)"
echo "  4. ⏭️ Configure SSL in OpenLiteSpeed (if certificate obtained)"
echo "  5. ⏭️ Configure reverse proxy to backend (port 5000)"
echo "  6. ⏭️ Update frontend with new API URL"
echo ""
echo "Test your domain:"
echo "  curl http://$DOMAIN"
echo "  curl https://$DOMAIN/api/health"
echo ""


