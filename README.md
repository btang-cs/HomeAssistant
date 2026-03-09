# Home Assistant Multi-Platform Client

中文文档: [README.zh-CN.md](./README.zh-CN.md)

This repository now contains three layers:

- `backend`: Node.js API gateway with Home Assistant proxy, mock mode, and unified multi-platform auth.
- `miniapp`: Native WeChat Mini Program project kept as the WeChat-specific entry.
- `app`: `uni-app` client targeting `iOS / Android / HarmonyOS / WeChat Mini Program / H5`.

## Feature Highlights

- Devices page: keyword search, domain tabs, online-only filter, favorites, and quick actions (`turn_on` / `turn_off` / `toggle`).
- Scenes page: keyword search and local recent-activation history.
- Automation page: automation/script type filters, search, and run actions.
- Backend device APIs: list filtering, summary stats, single-device detail, and explicit state actions.
- Platform auth split: `wx-login` for WeChat Mini Program, `device-login` for other app targets.

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

## 3) Run cross-platform app

1. Open `app/` in `HBuilderX`.
2. Build to one of the supported targets:
   - `iOS`
   - `Android`
   - `HarmonyOS`
   - `WeChat Mini Program`
   - `H5`
3. In the Profile page, set the backend URL.
4. On real devices, do not use `127.0.0.1`; use a LAN IP or HTTPS domain instead.

Client details: [app/README.md](./app/README.md)

## 4) Run legacy miniapp

1. Open WeChat DevTools.
2. Import the repository root or `miniapp/`.
3. Configure the backend URL in the Profile tab and log in.

## 5) APIs

- `POST /auth/wx-login`: create app session token from `wx.login` code
- `POST /auth/device-login`: create app session token for non-WeChat app targets
- `GET /api/health`
- `GET /api/devices`: supports optional query params `q`, `domain`, `available`, `controllable`
- `GET /api/devices/:entityId`
- `POST /api/devices/:entityId/state` with body `{ \"action\": \"turn_on|turn_off|toggle\" }`
- `POST /api/devices/:entityId/toggle`
- `GET /api/scenes`: supports optional query param `q`
- `POST /api/scenes/:entityId/activate`
- `GET /api/automations`: supports optional query params `q`, `kind`
- `POST /api/automations/:entityId/run`

All `/api/*` routes require `Authorization: Bearer <sessionToken>`.

## 6) Next iteration suggestions

- Replace in-memory session with Redis/JWT.
- Add Home Assistant WebSocket bridge for real-time state updates.
- Add area/group views and automation controls.
- Add camera stream proxy and granular role-based permissions.
