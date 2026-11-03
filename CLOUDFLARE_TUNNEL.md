# Cloudflare Tunnel Setup for Mobile Sync

Enable mobile access to dashboard anywhere via encrypted Cloudflare Tunnel.

## Prerequisites

- Dashboard MCP server running locally (stdio on Claude)
- REST API running on port 3000
- Cloudflare account (free tier OK)
- `cloudflared` CLI installed

## Step 1: Install cloudflared

**macOS:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**Linux/Windows:** https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

## Step 2: Authenticate

```bash
cloudflared login
```

Opens browser → authorize your Cloudflare account → returns certificate.

## Step 3: Create Tunnel

```bash
cloudflared tunnel create dashboard
```

Output:
```
Tunnel credentials written to ~/.cloudflared/UUID.json
```

Note the **tunnel ID** for later.

## Step 4: Route DNS (Optional)

If you have a Cloudflare domain:

```bash
cloudflared tunnel route dns dashboard your-domain.com
```

Creates CNAME pointing tunnel → your domain.

## Step 5: Run Tunnel

Keep running in background terminal:

```bash
cloudflared tunnel run dashboard --url http://localhost:3000
```

Output:
```
Tunnel ID: abc123...
Route: https://dashboard-abc123.trycloudflare.com available
```

**Copy the public URL** — use this from mobile.

## Step 6: Mobile Access

From phone/tablet on any network:

```
https://dashboard-abc123.trycloudflare.com/api/dashboard/default
```

Returns dashboard state JSON.

### Mobile Web Client (Optional)

Create simple HTML at `mcp-server/mobile.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard Mobile</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
    .habit { padding: 10px; background: white; margin: 5px 0; border-radius: 4px; }
    .done { background: #d4edda; }
  </style>
</head>
<body>
  <h1>📊 My Dashboard</h1>
  <div id="content"></div>
  <script>
    (async () => {
      // Replace with your tunnel URL
      const url = "https://YOUR-TUNNEL-URL/api/dashboard/default";
      const res = await fetch(url);
      const data = await res.json();

      const html = `
        <h2>${data.habitCompletionRate}% Habits Done</h2>
        <h3>Habits</h3>
        ${(data.habits || []).map(h => `
          <div class="habit ${h.status}">
            ${h.status === 'done' ? '✓' : '○'} ${h.name}
          </div>
        `).join('')}
      `;

      document.getElementById("content").innerHTML = html;
    })();
  </script>
</body>
</html>
```

Serve locally, replace `YOUR-TUNNEL-URL` with actual URL.

## Step 7: Keep Tunnel Running

The tunnel needs to stay running for mobile access. Options:

### Option A: Always-On (Macbook)
```bash
# Create systemd service (Linux) or launchd agent (macOS)
# Auto-start on login
```

### Option B: Manual (Dev/Testing)
Keep terminal tab open with:
```bash
cloudflared tunnel run dashboard --url http://localhost:3000
```

### Option C: Managed Connector
Use Cloudflare Zero Trust dashboard to manage tunnel connector.

## Accessing from Mobile

1. **Local network only** (no tunnel):
   ```
   http://192.168.1.X:3000/api/dashboard/default
   ```

2. **From anywhere** (with tunnel):
   ```
   https://dashboard-abc123.trycloudflare.com/api/dashboard/default
   ```

## Security Notes

- Tunnel traffic encrypted end-to-end
- Cloudflare terminates TLS, then re-encrypts to local server
- No port forwarding needed
- Localhost not exposed to internet directly

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid hostname" | Cloudflare account not authorized — run `cloudflared login` again |
| Tunnel offline | Check `cloudflared tunnel run` still running |
| Mobile can't reach URL | Verify tunnel URL is correct, tunnel process active |
| 502 errors | Check `npm start` running, REST API on port 3000 |

## Cleanup

To remove tunnel:

```bash
cloudflared tunnel delete dashboard
rm ~/.cloudflared/UUID.json
```

## Next: Scheduled Digests

Once mobile access working, add scheduled tasks:
- Daily digest via email or SMS
- Weekly report automation
- Alert on habit streaks

See CLAUDE.md "Next Steps" section.
