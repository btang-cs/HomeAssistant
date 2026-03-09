# Home Assistant 多端客户端

> English version: [README.md](./README.md)

本仓库现在包含三层结构：

- `backend`：Node.js API 网关，支持 Home Assistant 代理模式、Mock 模式和跨端统一认证
- `miniapp`：原生微信小程序工程，保留为微信专用入口
- `app`：基于 `uni-app` 的跨端客户端，目标覆盖 `iOS / Android / 鸿蒙 / 微信小程序 / H5`

## 功能亮点

- 设备页：支持关键词搜索、域分类筛选、仅在线过滤、设备收藏、快捷开关控制。
- 场景页：支持关键词搜索和最近执行时间记录（本地持久化）。
- 自动化页：支持自动化 / 脚本分类筛选、搜索和一键执行。
- 后端接口：支持设备列表过滤、设备统计、设备详情、显式状态控制（开/关/切换）。
- 跨端认证：微信小程序继续走 `/auth/wx-login`，其他平台走 `/auth/device-login`。

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

## 3）运行跨端 App

1. 用 `HBuilderX` 打开 `app/`
2. 选择目标平台进行编译：
   - `iOS`
   - `Android`
   - `鸿蒙`
   - `微信小程序`
   - `H5`
3. 打开「我的」页，设置后端地址
4. 真机调试时：
   - 不要使用 `127.0.0.1`
   - 改为局域网 IP 或 HTTPS 域名
5. 登录后进入「设备」「场景」页验证链路

说明：[app/README.md](./app/README.md) 包含跨端客户端的目录说明。

## 4）运行微信小程序旧版入口

1. 打开微信开发者工具
2. 导入项目目录：
   - 推荐导入仓库根目录 `HomeAssistant`
   - 或直接导入 `miniapp`
3. 在「我的」页设置后端地址并登录

## 5）API 列表

- `POST /auth/wx-login`：使用 `wx.login` 的 `code` 换取应用会话 Token
- `POST /auth/device-login`：供 `iOS / Android / 鸿蒙 / H5` 等非微信小程序端登录
- `GET /api/health`
- `GET /api/devices`：支持可选查询参数 `q`、`domain`、`available`、`controllable`
- `GET /api/devices/:entityId`
- `POST /api/devices/:entityId/state`：请求体 `{ \"action\": \"turn_on|turn_off|toggle\" }`
- `POST /api/devices/:entityId/toggle`
- `GET /api/scenes`：支持可选查询参数 `q`
- `POST /api/scenes/:entityId/activate`
- `GET /api/automations`：支持可选查询参数 `q`、`kind`
- `POST /api/automations/:entityId/run`

说明：所有 `/api/*` 接口都需要请求头 `Authorization: Bearer <sessionToken>`。

## 6）隐私与安全建议

- 不要把 `.env`、API Key、Token、私钥文件提交到 Git
- 仓库已配置本地 `pre-commit` 隐私扫描（`.githooks/pre-commit`）
- 如需接入生产环境，建议增加：
  - 服务端 JWT/Redis 会话管理
  - 细粒度权限与审计日志
  - HTTPS 与网关限流策略

## 7）后续迭代建议

- 用 Redis/JWT 替代内存会话
- 增加 Home Assistant WebSocket 桥接，实现设备实时状态
- 增加房间分组、自动化管理和摄像头能力
- 增加角色权限控制（管理员/家庭成员/访客）
