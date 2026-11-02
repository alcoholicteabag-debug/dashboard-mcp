# MCP Dashboard Server — Setup & Deployment Guide

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ (`node --version`)
- Supabase account (free tier OK)
- Railway account (optional, for cloud deploy)
- Cloudflare account (optional, for mobile tunnel)

### 2. Supabase Setup

1. Go to https://app.supabase.com → New Project
2. Name it `dashboard`, region near you, strong password
3. Wait for initialization (~2 min)
4. Copy your **Project URL** and **Anon Key** from Settings → API
5. Open SQL Editor, paste contents of `supabase-schema.sql`, run it
   - This creates the `dashboard_state` table + demo data
6. Verify: Go to Table Editor → `dashboard_state` → should see one row with `user_id: "default"`

### 3. Local Setup

```bash
# Clone and navigate
cd mcp-server

# Install deps
npm install

# Create .env.local
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# SUPABASE_URL=https://xxxxx.supabase.co
# SUPABASE_KEY=eyJxxx...

# Build TypeScript
npm run build

# Start server
npm start
```

Expected output:
```
Dashboard MCP server running on port 3000
MCP endpoint: http://localhost:3000/mcp
Health check: http://localhost:3000/health
```

### 4. Test MCP Endpoint

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2026-10-31T11:00:00.000Z"}
```

---

## Deploy to Railway (5 min)

Railway hosts the MCP server so Claude can call it from anywhere. **Free tier includes $5/month credits** (plenty for this use case).

### Steps

1. **Push to GitHub**
   ```bash
   cd mcp-server
   git init
   git add .
   git commit -m "MCP dashboard server"
   git remote add origin https://github.com/YOUR_USERNAME/dashboard-mcp.git
   git push -u origin main
   ```

2. **Deploy on Railway**
   - Go to https://railway.app/dashboard
   - Click **New Project** → **Deploy from GitHub**
   - Select the repo above
   - Railway auto-detects `railway.toml` and deploys
   - Wait ~2 min for build + startup

3. **Set Environment Variables**
   - In Railway dashboard, go to your project → Variables
   - Add:
     - `SUPABASE_URL` = your Supabase URL
     - `SUPABASE_KEY` = your Supabase anon key
   - Railway redeploys automatically

4. **Get Public URL**
   - In Railway, go to Deployments → your deployment
   - Copy the **Public URL** (looks like `https://dashboard-mcp-production.up.railway.app`)

### Test

```bash
curl https://your-railway-url/health
# {"status":"ok",...}
```

---

## Mobile Sync via Cloudflare Tunnel (Optional)

If you want your mobile to sync even when outside home WiFi, use a Cloudflare Tunnel. This creates a secure encrypted bridge.

### Setup

1. **Install Cloudflare Tunnel CLI**
   ```bash
   # macOS
   brew install cloudflare/cloudflare/cloudflared

   # Or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
   ```

2. **Authenticate**
   ```bash
   cloudflared login
   # Opens browser, authorize your Cloudflare account
   ```

3. **Create Tunnel**
   ```bash
   # If running local server (port 3000)
   cloudflared tunnel create dashboard
   cloudflared tunnel route dns dashboard yourname.trycloudflare.com

   # If using Railway
   cloudflared tunnel run dashboard \
     --url https://your-railway-url
   ```

4. **Get Tunnel URL**
   - Cloudflared outputs: `https://dashboard-xxxxx.trycloudflare.com`
   - This is your mobile sync URL (shareable, encrypted)

5. **Save for Later**
   ```bash
   # Tunnel config saved to ~/.cloudflared/
   # To restart anytime:
   cloudflared tunnel run dashboard
   ```

---

## Connect Claude Desktop (MCP Client)

### Using mcp-remote wrapper (required for now)

Claude Desktop doesn't natively support streamable HTTP yet. Use `mcp-remote` to wrap your MCP server:

```json
{
  "mcpServers": {
    "dashboard": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-railway-url/mcp",
        "--allow-http",
        "--transport",
        "http-only"
      ]
    }
  }
}
```

**Location:**
- **macOS/Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**After editing**, restart Claude Desktop (fully quit + relaunch).

**Test:**
1. Open Claude Desktop
2. Start a conversation
3. You should see dashboard tools available (get_dashboard_state, add_habit, toggle_habit, etc.)
4. Try: "Show me my dashboard"
   - Claude calls `get_dashboard_state`
   - The live metrics widget renders inline showing your habits, tasks, metrics

---

## Build Mobile Web Client (Optional)

The server exposes REST endpoints for mobile:

```javascript
// GET dashboard state
fetch('https://your-tunnel-url/api/dashboard/default')
  .then(r => r.json())
  .then(data => console.log(data))

// POST new habit
fetch('https://your-tunnel-url/api/dashboard/default/habit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Yoga' })
})

// Toggle habit
fetch('https://your-tunnel-url/api/dashboard/default/habit/123/toggle', {
  method: 'POST'
})
```

**Mobile Web Client Scaffold** (save as `mobile.html`):
```html
<!doctype html>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard Mobile</title>
<style>
  body { font-family: system-ui; padding: 16px; background: #0F1419; color: #fff; }
  .container { max-width: 400px; margin: 0 auto; }
  button { padding: 10px 16px; background: #6366F1; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%; margin: 8px 0; }
  .habit { background: #22C55E; padding: 12px; margin: 8px 0; border-radius: 6px; cursor: pointer; }
  .habit.pending { background: #FF3B3B; }
</style>

<div class="container">
  <h1>📊 Dashboard</h1>
  <button onclick="addHabit()">+ Add Habit</button>
  <div id="habits"></div>
</div>

<script>
const API_URL = 'https://your-tunnel-url';

async function loadDashboard() {
  const res = await fetch(`${API_URL}/api/dashboard/default`);
  const data = await res.json();
  const habitsList = document.getElementById('habits');
  habitsList.innerHTML = (data.data?.habits || []).map(h => `
    <div class="habit ${h.status}" onclick="toggle(${h.id})">
      ${h.name} (${h.streak || 0}d)
    </div>
  `).join('');
}

async function addHabit() {
  const name = prompt('Habit name:');
  if (!name) return;
  await fetch(`${API_URL}/api/dashboard/default/habit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  loadDashboard();
}

async function toggle(id) {
  await fetch(`${API_URL}/api/dashboard/default/habit/${id}/toggle`, {
    method: 'POST'
  });
  loadDashboard();
}

loadDashboard();
setInterval(loadDashboard, 5000); // Sync every 5s
</script>
```

---

## Architecture Summary

```
┌─────────────────────────────────┐
│      Claude Desktop             │
│  (MCP client via mcp-remote)    │
└────────────┬────────────────────┘
             │ HTTP POST/GET
    ┌────────▼────────────────┐
    │  Railway (Cloud)         │
    │  → MCP Server            │
    │  → REST API              │
    │  → Widget resources      │
    └────────┬────────────────┘
             │ PostgreSQL
    ┌────────▼────────────────┐
    │    Supabase Database     │
    │  (dashboard_state table) │
    └─────────────────────────┘

Mobile clients connect via Cloudflare Tunnel:
┌──────────────────┐
│   Mobile (iOS)   │
│   Web Browser    │
└────────┬─────────┘
         │ HTTPS (encrypted)
    Cloudflare Tunnel
         │
    Railway MCP Server
```

---

## Troubleshooting

### "Cannot find module" error
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Supabase connection refused
- Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env.local`
- Check they're from the same Supabase project
- Restart server: `npm start`

### Widget not rendering in Claude
- Make sure `mcp-remote` is installed: `npm install -g mcp-remote`
- Restart Claude Desktop completely (⌘Q then reopen)
- Check Claude version: Settings → About (need v2.1.76+)

### Mobile can't reach tunnel
- Keep `cloudflared tunnel run dashboard` running in background
- Verify tunnel URL works: `curl https://your-tunnel-url/health`
- Check Cloudflare account permissions

---

## Next Steps

1. ✅ Deploy server to Railway
2. ✅ Test MCP connection in Claude Desktop
3. ✅ Try tools: "Show my dashboard", "Add exercise habit"
4. ✅ Build mobile web client (optional)
5. ✅ Set up Cloudflare Tunnel for mobile sync
6. ✅ Customize widget colors/layout as needed

---

## Support

- MCP Spec: https://spec.modelcontextprotocol.io
- Claude Desktop Docs: https://claude.com/docs/connectors
- Supabase Docs: https://supabase.com/docs
- Railway Docs: https://docs.railway.app
- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/
