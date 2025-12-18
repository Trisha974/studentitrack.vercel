#!/bin/bash
# Quick fix script for SSL certificate error on Hostinger VPS

set -e

echo "🔧 Fixing SSL Certificate Error..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Check DNS
echo -e "${YELLOW}Step 1: Checking DNS configuration...${NC}"
DOMAIN="studentitrack.org"
VPS_IP=$(hostname -I | awk '{print $1}')

echo "Your VPS IP: $VPS_IP"
echo "Checking DNS for $DOMAIN..."

DNS_IP=$(dig +short $DOMAIN | tail -n1)
if [ -z "$DNS_IP" ]; then
    echo -e "${RED}⚠ DNS not configured or not propagated yet${NC}"
    echo "Please configure DNS A record pointing to: $VPS_IP"
    echo "Then wait 5-30 minutes and run this script again"
    exit 1
else
    echo "DNS resolves to: $DNS_IP"
    if [ "$DNS_IP" != "$VPS_IP" ]; then
        echo -e "${RED}⚠ DNS points to $DNS_IP, but VPS IP is $VPS_IP${NC}"
        echo "Please update DNS A record to point to: $VPS_IP"
        exit 1
    else
        echo -e "${GREEN}✓ DNS is correctly configured${NC}"
    fi
fi
echo ""

# Step 2: Create webroot directory
echo -e "${YELLOW}Step 2: Creating webroot directory...${NC}"
WEBROOT="/var/www/studentitrack.org/public_html"
mkdir -p "$WEBROOT"
echo "test" > "$WEBROOT/index.html"
chown -R lsadm:lsadm /var/www/studentitrack.org 2>/dev/null || chown -R www-data:www-data /var/www/studentitrack.org
chmod -R 755 /var/www/studentitrack.org
echo -e "${GREEN}✓ Webroot created: $WEBROOT${NC}"
echo ""

# Step 3: Check OpenLiteSpeed
echo -e "${YELLOW}Step 3: Checking OpenLiteSpeed...${NC}"
if systemctl is-active --quiet lsws; then
    echo -e "${GREEN}✓ OpenLiteSpeed is running${NC}"
else
    echo -e "${YELLOW}⚠ OpenLiteSpeed is not running. Starting...${NC}"
    systemctl start lsws
fi
echo ""

# Step 4: Test web server
echo -e "${YELLOW}Step 4: Testing web server...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Web server is responding${NC}"
else
    echo -e "${YELLOW}⚠ Web server may not be configured correctly${NC}"
    echo "Please configure OpenLiteSpeed virtual host:"
    echo "  1. Go to: http://$(hostname -I | awk '{print $1}'):7080"
    echo "  2. Virtual Hosts → studentitrack.org"
    echo "  3. Set Document Root: $WEBROOT"
    echo "  4. Save and Graceful Restart"
    read -p "Press Enter after configuring OpenLiteSpeed..."
fi
echo ""

# Step 5: Test domain access
echo -e "${YELLOW}Step 5: Testing domain access...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓ Domain is accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}⚠ Domain not accessible (HTTP $HTTP_CODE)${NC}"
    echo "This might be a DNS propagation issue. Wait a few minutes and try again."
    echo "Or check OpenLiteSpeed virtual host configuration."
    exit 1
fi
echo ""

# Step 6: Retry SSL certificate
echo -e "${YELLOW}Step 6: Retrying SSL certificate...${NC}"
echo "Using webroot method with: $WEBROOT"
echo ""

certbot certonly --webroot \
  -w "$WEBROOT" \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email a.pancho.142177.tc@umindanao.edu.ph || {
    echo -e "${RED}SSL certificate failed. Trying standalone method...${NC}"
    echo ""
    echo "This will temporarily stop OpenLiteSpeed..."
    read -p "Continue? [y/N] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        systemctl stop lsws
        certbot certonly --standalone \
          -d "$DOMAIN" \
          -d "www.$DOMAIN" \
          --non-interactive \
          --agree-tos \
          --email a.pancho.142177.tc@umindanao.edu.ph
        systemctl start lsws
    else
        echo "Cancelled. Please configure OpenLiteSpeed webroot manually and retry."
        exit 1
    fi
}

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SSL Certificate Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Configure OpenLiteSpeed to use the certificate"
echo "  2. Set up reverse proxy to Node.js backend (port 5000)"
echo "  3. Test: curl https://$DOMAIN"
echo ""


