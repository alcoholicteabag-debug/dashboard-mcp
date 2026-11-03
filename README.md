# Dashboard MCP App Server

> Remote HTTP MCP server with live dashboard widgets, mobile sync, and Claude integration.

**Live in Claude Desktop.** Built for your personal dashboard with Monday.com design aesthetics.

## What It Does

- **MCP Tools**: `get_dashboard_state`, `add_habit`, `toggle_habit`, `get_metrics` (callable from Claude)
- **Live Widget**: Renders Monday.com-styled metrics dashboard inline in Claude chat
- **Mobile Sync**: REST API endpoints for your mobile client to read/write habits, tasks
- **Real-time Sync**: Supabase PostgreSQL backend with automatic persistence
- **Cloudflare Tunnel**: Secure encrypted bridge for mobile access outside home network

## Architecture

```
Claude Desktop ──(MCP via mcp-remote)──> Railway ──(PostgreSQL)──> Supabase
                                            │
                                     REST API endpoints
                                            ↓
                                    Mobile Web Client
                                    (via Cloudflare Tunnel)
```

## Quick Start

### 1. Supabase Setup (2 min)
```bash
# Create free account at https://app.supabase.com
# New Project → choose region
# Get Project URL + Anon Key from Settings → API
# Run SQL schema from supabase-schema.sql in SQL Editor
```

### 2. Local Development (5 min)
```bash
cd mcp-server
npm install
cp .env.example .env.local
# Edit .env.local with Supabase credentials
npm run build
npm start
# Server runs on http://localhost:3000
```

### 3. Deploy to Railway (5 min)
```bash
# Push to GitHub
git push origin main

# Go to https://railway.app/dashboard
# New Project → Deploy from GitHub
# Select this repo → Railway auto-deploys
# Add SUPABASE_URL + SUPABASE_KEY to Variables
# Copy public URL
```

### 4. Connect Claude Desktop (2 min)
Edit `~/.config/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "dashboard": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-railway-url/mcp", "--allow-http", "--transport", "http-only"]
    }
  }
}
```

Restart Claude → you'll see dashboard tools available.

### 5. Optional: Mobile Sync (5 min)
```bash
# Install Cloudflare CLI
brew install cloudflare/cloudflare/cloudflared

# Create tunnel
cloudflared login
cloudflared tunnel create dashboard
cloudflared tunnel route dns dashboard yourname.trycloudflare.com
cloudflared tunnel run dashboard --url https://your-railway-url

# Share tunnel URL with mobile client
```

## Tools

| Tool | Description | Widget |
|------|-------------|--------|
| `get_dashboard_state` | Fetch habits, tasks, metrics, goals | 📊 Live dashboard display |
| `add_habit` | Add new habit to track | - |
| `toggle_habit` | Mark habit done/pending | - |
| `get_metrics` | Weekly/monthly analytics | - |

## Mobile API

```javascript
// Get state
GET /api/dashboard/{userId}

// Add habit
POST /api/dashboard/{userId}/habit
{ "name": "Exercise" }

// Toggle habit
POST /api/dashboard/{userId}/habit/{habitId}/toggle

// Example
fetch('https://tunnel-url/api/dashboard/default')
  .then(r => r.json())
  .then(data => console.log(data.data.habits))
```

## File Structure

```
mcp-server/
├── src/
│   └── server.ts           # Main MPC + Express server
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── railway.toml            # Railway deployment
├── supabase-schema.sql     # Database schema
├── .env.example            # Environment template
├── SETUP.md                # Detailed setup guide
└── README.md               # This file
```

## Environment Variables

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJxxx...
PORT=3000
NODE_ENV=development
```

## Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Build only
npm run build

# Start production
npm start

# Test MCP health
curl http://localhost:3000/health
```

## Deployment Checklist

- [ ] Supabase project created + schema applied
- [ ] .env.local has SUPABASE_URL + SUPABASE_KEY
- [ ] `npm run build` succeeds
- [ ] `npm start` runs without errors
- [ ] `curl http://localhost:3000/health` returns OK
- [ ] GitHub repo created + pushed
- [ ] Railway project linked to GitHub
- [ ] SUPABASE_* env vars set in Railway
- [ ] Public Railway URL copied
- [ ] Claude Desktop config updated + restarted
- [ ] "Show my dashboard" works in Claude
- [ ] (Optional) Cloudflare tunnel running for mobile

## Next: Extend the Server

Add more tools (e.g., `export_digest`, `take_screenshot`, `get_goals`):

```typescript
registerAppTool(server, "your_tool", {
  description: "What it does",
  inputSchema: z.object({ /* args */ }),
}, async (args) => {
  // Your logic
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
```

## Support

- Full setup guide: `SETUP.md`
- MCP spec: https://spec.modelcontextprotocol.io
- Claude docs: https://claude.com/docs/connectors
- Questions: Start with SETUP.md troubleshooting section

---

**Status**: 🚀 Ready to deploy

Built with: TypeScript, Express, Supabase, Railway, Cloudflare, MCP SDK
# dashboard-mcp
