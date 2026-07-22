# Starbud Frontend

家长 Web 后台，部署目标为 Cloudflare Pages。

## Scope

- 创建儿童任务
- 用户登录
- 选择任务对象
- 创建和维护家庭、成员与家庭关系
- 查看今日任务
- 完成记录预览
- 调用 `starbud-backend` API

所有后台逻辑、数据写入、实时同步能力都放在 `starbud-backend`。

## Default Accounts

The backend seeds the default usernames. Passwords are derived from the username
and the backend `INITIAL_PASSWORD_SUFFIX` secret.

| Username | Role |
| --- | --- |
| `wangyamei` | Parent |
| `zhaotao` | Parent |
| `zhaoyouning` | Child |
| `zhaojianing` | Child |

## Scripts

```bash
npm install
npm run dev
npm run build
```

## Environment

Local development:

```bash
cp .env.example .env.local
```

Production should point to the deployed Worker URL:

```bash
VITE_API_BASE_URL=https://starbud-backend.<your-subdomain>.workers.dev
```

For Cloudflare Pages, set this as a Pages environment variable before building.

## Cloudflare Pages Deploy

```bash
npm install
VITE_API_BASE_URL=https://starbud-backend.<your-subdomain>.workers.dev npm run build
npx wrangler pages deploy dist --project-name starbud-frontend
```
