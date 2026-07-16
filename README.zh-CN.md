# ChurchOS 教会通需求共创平台

> **English version:** [README.md](./README.md)

ChurchOS 是一套适配移动 H5 与桌面浏览器的需求共创网站，用于收集、讨论并确定真实教会事工需求的优先级。系统包含活动首页、同工登录注册、需求广场、评论翻译、分享物料、通知中心和管理员工作台。

## 环境要求

- Node.js 24 或更高版本
- npm 9 或更高版本

## 本地运行

```bash
npm install
npm start
```

打开 [http://localhost:3000/index.html](http://localhost:3000/index.html)。

如果 3000 端口已占用：

```bash
PORT=3001 npm start
```

## 验证

```bash
npm test
npm run check
```

`npm run check` 会检查服务器文件语法并运行完整 Node 测试套件。

## 演示账号

| 角色 | 邮箱 | 密码 |
| --- | --- | --- |
| 本地演示管理员 | `admin@churchos.net` | `adminpassword` |
| 牧师 | `pastor.tim@grace.org` | `password123` |
| 财务同工 | `sarah.treasurer@stjohns.ca` | `password123` |

这些账号和本地种子数据仅用于本地演示。正式 Supabase 环境中，默认管理员账号应停用；当前超管账号为你设置的 `254351776@qq.com`。

## 本地数据

运行数据保存在 SQLite 文件 `db/churchos.sqlite`。`db/*.json` 仍作为首次启动时的种子数据来源。

上传的图片与音频保存在 `public/uploads/`，不会提交到 Git。

## 部署配置

复制 `.env.example` 为 `.env`，按服务器环境调整：

```bash
PORT=3000
CHURCHOS_SESSION_SECRET=replace-with-a-long-random-secret
CHURCHOS_DB_DIR=/srv/churchos/data
CHURCHOS_DB_FILE=/srv/churchos/data/churchos.sqlite
CHURCHOS_UPLOAD_DIR=/srv/churchos/uploads
CHURCHOS_ADMIN_EMAIL=your-admin@example.org
CHURCHOS_ADMIN_PASSWORD=change-this-password
CHURCHOS_ADMIN_NAME=ChurchOS Admin
```

如果提供 `CHURCHOS_ADMIN_EMAIL`、`CHURCHOS_ADMIN_PASSWORD` 和 `CHURCHOS_ADMIN_NAME`，服务启动时会自动创建或更新管理员账号。

`CHURCHOS_SESSION_SECRET` 用于签名登录 session token。正式部署必须使用一串足够长、随机且不公开的字符串；更换它会让已登录用户重新登录。

SQLite 备份只需要定期备份 `CHURCHOS_DB_FILE` 指向的文件。恢复时停止服务，替换该文件，再重新启动。

Supabase 账号和密钥请只放在服务端 `.env` 中的 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`，不要提交到 Git，也不要放进前端代码。

## 切换到 Supabase

1. 在 Supabase 项目的 SQL Editor 执行 `docs/supabase-schema.sql`。
2. 在本地或服务器 `.env` 中设置：

```bash
CHURCHOS_DB_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` 只能放在服务端环境变量中，不能放入前端代码，也不要发到聊天或提交到 Git。

当前 Supabase adapter 已接入后端数据库接口；首次启动会尝试把 JSON 种子数据导入空表。

如果正式环境已有真实用户或需求数据，不要反复清空 Supabase 表；种子导入只会在表为空时执行。

## Render 部署

仓库包含 `render.yaml`，可以在 Render 中使用 Blueprint 部署。部署时不要把密钥写进 GitHub，只在 Render 环境变量页面填写：

```bash
SUPABASE_URL=你的 Supabase 项目地址
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service role key
CHURCHOS_SESSION_SECRET=一串长随机字符串
```

Render 部署成功后，先用 Render 临时域名确认 `/api/health` 和首页可以打开，再绑定：

```text
churchosapp.org
www.churchosapp.org
```

绑定域名后，再回到 Namecheap 的 Advanced DNS 添加 Render 提供的 DNS 记录。

## 上线前安全检查

- 确认 `.env` 没有提交到 Git。
- 确认 `CHURCHOS_SESSION_SECRET` 已设置为长随机字符串。
- 确认 `SUPABASE_SERVICE_ROLE_KEY` 只存在于服务端环境变量。
- 确认默认演示管理员 `admin@churchos.net` 已停用。
- 确认你的管理员邮箱，例如 `254351776@qq.com`，可以登录并访问后台。

## 演示接口边界

AI 翻译、语音转写、需求分析、地理定位和邮件发送使用确定性的本地模拟结果。当前未连接 OAuth、短信或真实邮件供应商。进度邮件目前是后台模拟发送与记录，后续接入邮件供应商后再真正发送。

## 项目结构

- `app.js`：可测试的 Express 应用工厂
- `server.js`：进程启动入口
- `routes/`：身份、需求、分享和后台 API
- `public/js/`：按职责拆分的浏览器模块
- `public/styles/`：统一的 ChurchOS 视觉系统
- `test/`：API 与前端行为测试
- `docs/`：中英文设计与实施文档
