# Home Assistant Cross-Platform App

`app/` is a `uni-app` client intended to cover:

- `iOS`
- `Android`
- `HarmonyOS`
- `WeChat Mini Program`
- `H5`

It reuses the existing `backend/` API gateway and keeps the old `miniapp/` directory as the original WeChat-native implementation.

## Pages

- `pages/devices/index.vue`: devices, filters, favorites, quick actions
- `pages/scenes/index.vue`: scenes, keyword search, recent activation history
- `pages/automations/index.vue`: automation/script search, type filters, run actions
- `pages/profile/index.vue`: backend URL, login, health check

## Login Strategy

- `MP-WEIXIN`: uses `/auth/wx-login`
- other platforms: uses `/auth/device-login`

## Backend APIs used by app

- `POST /auth/device-login`
- `GET /api/health`
- `GET /api/devices`
- `POST /api/devices/:entityId/state`
- `GET /api/scenes`
- `POST /api/scenes/:entityId/activate`
- `GET /api/automations`
- `POST /api/automations/:entityId/run`

## Recommended Workflow

1. Open `app/` in `HBuilderX`
2. Set the backend URL in the Profile page
3. Build to the required target platform
