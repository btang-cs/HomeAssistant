# Home Assistant WeChat Mini Program MVP

中文文档: [README.zh-CN.md](./README.zh-CN.md)

This repository now contains a runnable MVP skeleton:

- `backend`: Node.js API gateway for WeChat Mini Program, with Home Assistant proxy + mock mode.
- `miniapp`: Native WeChat Mini Program project (import into WeChat DevTools).

## 1) Start backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Default backend URL: `http://127.0.0.1:3000`

## 2) Configure backend mode

Edit `backend/.env`:

```env
HOST=127.0.0.1
PORT=3000
HA_MOCK_MODE=true
HA_BASE_URL=
HA_LONG_LIVED_TOKEN=
HA_VERIFY_SSL=true
SESSION_TTL_SECONDS=86400
```

- `HA_MOCK_MODE=true`: runnable without Home Assistant, returns built-in mock devices/scenes.
- `HA_MOCK_MODE=false`: enable real Home Assistant proxy mode, requires `HA_BASE_URL` and `HA_LONG_LIVED_TOKEN`.

## 3) Run miniapp

1. Open WeChat DevTools.
2. Import project directory:
   - recommended: repository root (`HomeAssistant`) because root `project.config.json` points to `miniapp/`
   - alternative: import `miniapp` directly
3. In DevTools, for local testing, enable settings that skip domain/TLS checks.
4. Open tab "My" in miniapp:
   - set backend URL (default already `http://127.0.0.1:3000`)
   - tap "WeChat Login"
5. Open tab "Devices" and "Scenes" to verify list/control flows.

## 4) MVP APIs

- `POST /auth/wx-login`: create app session token from `wx.login` code
- `GET /api/health`
- `GET /api/devices`
- `POST /api/devices/:entityId/toggle`
- `GET /api/scenes`
- `POST /api/scenes/:entityId/activate`

All `/api/*` routes require `Authorization: Bearer <sessionToken>`.

## 5) Next iteration suggestions

- Replace in-memory session with Redis/JWT.
- Add Home Assistant WebSocket bridge for real-time state updates.
- Add area/group views and automation controls.
- Add camera stream proxy and granular role-based permissions.
