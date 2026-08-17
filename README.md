# 星星芽AI助手后台

家长 Web 后台，部署目标为 Cloudflare Pages。

## Scope

- 创建儿童任务
- 家长注册与用户登录
- 选择任务对象
- 创建和维护家庭、子女账号、成员与家庭关系
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
npm test
```

`npm test` 会执行 API 契约、登录状态和关键组件交互测试，并完成生产构建。

## Environment

Local development:

```bash
cp .env.example .env.local
```

Production automatically selects the API from the current page hostname:

- `*.zhaojianing.com` → `https://starbud-api.zhaojianing.com`
- `*.zhaoyouning.com` → `https://starbud-api.zhaoyouning.com`

本地开发默认也连接生产 API；如需改用本地 Worker，可在 `.env.local` 中设置
`VITE_API_BASE_URL=http://localhost:8787`。

## Cloudflare Pages Deploy

```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name starbud-frontend
```

## License

This project is available for personal learning, research, and other
non-commercial use only. Commercial use requires prior written permission. See
[LICENSE](LICENSE) for details.
