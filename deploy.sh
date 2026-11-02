#!/bin/bash
# Quick Deploy Script for MCP Dashboard Server
# Run: bash deploy.sh

set -e

echo "🚀 MCP Dashboard Deployment"
echo "======================================"
echo ""

# Step 1: Check dependencies
echo "✓ Checking dependencies..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git not found. Install from https://git-scm.com"; exit 1; }
echo "✓ Node $(node --version)"
echo "✓ Git $(git --version)"
echo ""

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
cd mcp-server
npm install --silent
echo "✓ Dependencies installed"
echo ""

# Step 3: Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo "✓ Build successful"
echo ""

# Step 4: Local test
echo "🧪 Testing local server..."
timeout 5s npm start &
PID=$!
sleep 2
if curl -s http://localhost:3000/health | grep -q "ok"; then
  echo "✓ Local health check passed"
  kill $PID 2>/dev/null || true
else
  echo "❌ Health check failed"
  kill $PID 2>/dev/null || true
  exit 1
fi
echo ""

# Step 5: Git setup
echo "📝 Setting up Git..."
git init
git add .
git commit -m "Initial MCP dashboard server commit" || echo "⚠ Repository already initialized"
echo "✓ Git ready"
echo ""

# Summary
echo "======================================"
echo "✅ LOCAL DEPLOYMENT READY"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1️⃣  SUPABASE SETUP (2 min)"
echo "   - Go to https://app.supabase.com"
echo "   - Create new project"
echo "   - Copy Project URL + Anon Key"
echo "   - Run: supabase-schema.sql in SQL Editor"
echo ""
echo "2️⃣  CREATE .env.local"
echo "   SUPABASE_URL=https://xxxxx.supabase.co"
echo "   SUPABASE_KEY=eyJxxx..."
echo ""
echo "3️⃣  PUSH TO GITHUB"
echo "   git remote add origin https://github.com/YOUR_USERNAME/dashboard-mcp.git"
echo "   git push -u origin main"
echo ""
echo "4️⃣  DEPLOY TO RAILWAY (5 min)"
echo "   - Go to https://railway.app/dashboard"
echo "   - New Project → Deploy from GitHub"
echo "   - Select dashboard-mcp repo"
echo "   - Add variables: SUPABASE_URL, SUPABASE_KEY"
echo "   - Copy public URL when ready"
echo ""
echo "5️⃣  UPDATE CLAUDE CONFIG"
echo "   ~/.config/Claude/claude_desktop_config.json"
echo "   Replace server URL with Railway public URL"
echo "   Restart Claude Desktop"
echo ""
echo "6️⃣  TEST IN CLAUDE"
echo "   Try: 'Show my dashboard'"
echo ""
