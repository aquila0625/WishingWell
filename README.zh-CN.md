# ChurchOS 教会通需求共创平台

> **English version:** [README.md](./README.md)

ChurchOS 是一套适配移动 H5 与桌面浏览器的需求共创网站，用于收集、讨论并确定真实教会事工需求的优先级。系统包含活动首页、同工登录注册、需求广场、评论翻译、分享物料、通知中心和管理员工作台。

## 环境要求

- Node.js 18 或更高版本
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
| 管理员 | `admin@churchos.net` | `adminpassword` |
| 牧师 | `pastor.tim@grace.org` | `password123` |
| 财务同工 | `sarah.treasurer@stjohns.ca` | `password123` |

这些账号和文件型数据库仅用于本地演示。

## 本地数据

数据保存在 `db/*.json`。本地测试后如需恢复初始数据，可以通过 Git 恢复已跟踪的数据库文件，或替换为需要的 Seed 数据后重启服务。

上传的图片与音频保存在 `public/uploads/`，不会提交到 Git。

## 演示接口边界

AI 翻译、语音转写、需求分析、地理定位和邮件发送使用确定性的本地模拟结果。当前未连接 OAuth、短信、真实邮件供应商、生产级密码哈希或生产数据库。

## 项目结构

- `app.js`：可测试的 Express 应用工厂
- `server.js`：进程启动入口
- `routes/`：身份、需求、分享和后台 API
- `public/js/`：按职责拆分的浏览器模块
- `public/styles/`：统一的 ChurchOS 视觉系统
- `test/`：API 与前端行为测试
- `docs/`：中英文设计与实施文档
