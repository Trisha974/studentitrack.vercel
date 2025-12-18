#!/bin/bash
# Deployment script for Hostinger VPS
# Run this script on your VPS after uploading backend files

set -e  # Exit on error

echo "🚀 Starting Backend Deployment to Hostinger VPS..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVER_DIR"

echo -e "${YELLOW}Current directory: $SERVER_DIR${NC}"
echo ""

# Step 1: Update system
echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
apt-get update -qq
apt-get upgrade -y -qq
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# Step 2: Check Node.js installation
echo -e "${YELLOW}Step 2: Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found. Installing Node.js 18.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo -e "${GREEN}✓ Node.js already installed: $(node --version)${NC}"
fi
echo ""

# Step 3: Check Git installation
echo -e "${YELLOW}Step 3: Checking Git installation...${NC}"
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    apt-get install -y git
    echo -e "${GREEN}✓ Git installed${NC}"
else
    echo -e "${GREEN}✓ Git already installed${NC}"
fi
echo ""

# Step 4: Install dependencies
echo -e "${YELLOW}Step 4: Installing backend dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install --omit=dev
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi
echo ""

# Step 5: Check .env file
echo -e "${YELLOW}Step 5: Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}⚠ .env file not found!${NC}"
    echo "Creating .env from template..."
    if [ -f "env.production.template" ]; then
        cp env.production.template .env
        echo -e "${YELLOW}⚠ Please edit .env file with your actual values:${NC}"
        echo "   nano .env"
        echo ""
        read -p "Press Enter after you've configured .env file..."
    else
        echo -e "${RED}Template file not found. Please create .env manually.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi
echo ""

# Step 6: Create logs directory
echo -e "${YELLOW}Step 6: Creating logs directory...${NC}"
mkdir -p logs
echo -e "${GREEN}✓ Logs directory created${NC}"
echo ""

# Step 7: Check PM2 installation
echo -e "${YELLOW}Step 7: Checking PM2 installation...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 installed${NC}"
else
    echo -e "${GREEN}✓ PM2 already installed: $(pm2 --version)${NC}"
fi
echo ""

# Step 8: Test database connection
echo -e "${YELLOW}Step 8: Testing database connection...${NC}"
if [ -f "scripts/test-db-connection.js" ]; then
    if node scripts/test-db-connection.js; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${RED}⚠ Database connection failed. Please check your .env file.${NC}"
        echo "You can continue, but the backend may not work properly."
        read -p "Press Enter to continue..."
    fi
else
    echo -e "${YELLOW}⚠ Database test script not found. Skipping...${NC}"
fi
echo ""

# Step 9: Start/restart with PM2
echo -e "${YELLOW}Step 9: Starting backend with PM2...${NC}"
if pm2 list | grep -q "student-itrack-api"; then
    echo "App already running. Restarting..."
    pm2 restart student-itrack-api
else
    echo "Starting new PM2 process..."
    pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✓ Backend started with PM2${NC}"
echo ""

# Step 10: Show status
echo -e "${YELLOW}Step 10: PM2 Status:${NC}"
pm2 status
echo ""

# Step 11: Show logs
echo -e "${YELLOW}Recent logs:${NC}"
pm2 logs student-itrack-api --lines 10 --nostream
echo ""

# Step 12: Test backend
echo -e "${YELLOW}Step 11: Testing backend...${NC}"
sleep 2
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is responding!${NC}"
    curl -s http://localhost:5000/api/health | head -c 100
    echo ""
else
    echo -e "${RED}⚠ Backend is not responding. Check logs:${NC}"
    echo "   pm2 logs student-itrack-api"
fi
echo ""

# Final instructions
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 status                    - Check app status"
echo "  pm2 logs student-itrack-api   - View logs"
echo "  pm2 restart student-itrack-api - Restart app"
echo "  pm2 stop student-itrack-api   - Stop app"
echo ""
echo "Next steps:"
echo "  1. Configure Nginx reverse proxy (see HOSTINGER_VPS_DEPLOYMENT.md)"
echo "  2. Set up SSL certificate with Certbot"
echo "  3. Configure firewall (ufw allow 5000/tcp)"
echo "  4. Update frontend to use new backend URL"
echo ""
echo -e "${YELLOW}View full deployment guide: HOSTINGER_VPS_DEPLOYMENT.md${NC}"


