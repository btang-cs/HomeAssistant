# Home Assistant 微信小程序 MVP

> English version: [README.md](./README.md)

本仓库包含一个可运行的微信小程序版 Home Assistant MVP 骨架：

- `backend`：Node.js API 网关，支持 Home Assistant 代理模式和 Mock 模式
- `miniapp`：原生微信小程序工程（可直接导入微信开发者工具）

## 1）启动后端

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

默认后端地址：`http://127.0.0.1:3000`

## 2）配置后端运行模式

编辑 `backend/.env`：

```env
HOST=127.0.0.1
PORT=3000
HA_MOCK_MODE=true
HA_BASE_URL=
HA_LONG_LIVED_TOKEN=
HA_VERIFY_SSL=true
SESSION_TTL_SECONDS=86400
```

- `HA_MOCK_MODE=true`：不依赖真实 Home Assistant，直接返回内置模拟设备和场景
- `HA_MOCK_MODE=false`：启用真实 Home Assistant 代理，需配置 `HA_BASE_URL` 与 `HA_LONG_LIVED_TOKEN`

## 3）运行小程序

1. 打开微信开发者工具
2. 导入项目目录（二选一）：
   - 推荐：导入仓库根目录 `HomeAssistant`（根目录 `project.config.json` 已指向 `miniapp/`）
   - 备选：直接导入 `miniapp`
3. 本地联调时，在开发者工具中开启“忽略域名 / TLS 校验”等本地调试选项
4. 在小程序「我的」页：
   - 设置后端地址（默认 `http://127.0.0.1:3000`）
   - 点击「微信登录」
5. 进入「设备」「场景」页验证列表与控制链路

## 4）MVP API 列表

- `POST /auth/wx-login`：使用 `wx.login` 的 `code` 换取应用会话 Token
- `GET /api/health`
- `GET /api/devices`
- `POST /api/devices/:entityId/toggle`
- `GET /api/scenes`
- `POST /api/scenes/:entityId/activate`

说明：所有 `/api/*` 接口都需要请求头 `Authorization: Bearer <sessionToken>`。

## 5）隐私与安全建议

- 不要把 `.env`、API Key、Token、私钥文件提交到 Git
- 仓库已配置本地 `pre-commit` 隐私扫描（`.githooks/pre-commit`）
- 如需接入生产环境，建议增加：
  - 服务端 JWT/Redis 会话管理
  - 细粒度权限与审计日志
  - HTTPS 与网关限流策略

## 6）后续迭代建议

- 用 Redis/JWT 替代内存会话
- 增加 Home Assistant WebSocket 桥接，实现设备实时状态
- 增加房间分组、自动化管理和摄像头能力
- 增加角色权限控制（管理员/家庭成员/访客）
