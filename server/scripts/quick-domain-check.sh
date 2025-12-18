#!/bin/bash
# Quick script to check if domain is connected to VPS

echo "🔍 Checking domain connection..."
echo ""

VPS_IP=$(hostname -I | awk '{print $1}')
DOMAIN="studentitrack.org"

echo "Your VPS IP: $VPS_IP"
echo "Domain: $DOMAIN"
echo ""

# Check DNS
echo "Checking DNS..."
DNS_IP=$(dig +short $DOMAIN | tail -n1)

if [ -z "$DNS_IP" ]; then
    echo "❌ DNS not configured yet!"
    echo ""
    echo "Go to Hostinger → Domains → studentitrack.org → DNS"
    echo "Add A record: @ → $VPS_IP"
    echo "Add A record: www → $VPS_IP"
else
    echo "DNS resolves to: $DNS_IP"
    
    if [ "$DNS_IP" = "$VPS_IP" ]; then
        echo "✅ DNS is correctly pointing to your VPS!"
    else
        echo "⚠️ DNS points to $DNS_IP, but VPS IP is $VPS_IP"
        echo "Update DNS in Hostinger to point to: $VPS_IP"
    fi
fi

echo ""
echo "Testing domain access..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "✅ Domain is accessible! (HTTP $HTTP_CODE)"
else
    echo "⚠️ Domain not accessible yet (HTTP $HTTP_CODE)"
    echo "This might be DNS propagation delay. Wait a few minutes and try again."
fi

echo ""
echo "Test in browser: http://$DOMAIN"


