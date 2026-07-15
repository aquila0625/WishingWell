# 技术实施方案 (Implementation Plan) - ChurchOS 教会通需求共创网页

本项目将开发一个全栈式**《ChurchOS 教会通》需求共创网页与 H5 页面**，完全聚焦于该单一正统教会管理 App 的早期痛点收集、查重引导、合并与申诉、AI 归纳和邮件反馈闭环。

---

## 1. 技术栈与架构 (Tech Stack & Architecture)

- **前端 (Frontend)**：HTML5 + Vanilla CSS3 (经典 Figma 灰白网格与现代流光光晕混搭) + JavaScript (ES6)。单页面应用 (SPA) 架构，包含首页/共创广场、个人中心、消息通知抽屉与管理员后台。
- **后端 (Backend)**：Node.js + Express.js 提供 RESTful APIs 并托管前端静态文件。
- **数据库 (Database)**：使用**文件型 JSON 数据库**进行持久化（保存在 `db/` 目录下），100% 确保开箱即用。
- **图片与音频上传**：使用 `multer` 处理需求截图与音频文件上传。

---

## 2. 目录结构规划 (File Structure)

- [package.json](file:///Users/yishu/AIGit/许愿池项目/package.json) - Node.js 项目依赖与运行脚本。
- [server.js](file:///Users/yishu/AIGit/许愿池项目/server.js) - Express 服务器入口，包含路由逻辑。
- [db.js](file:///Users/yishu/AIGit/许愿池项目/db.js) - 简易健壮 JSON 数据库引擎（处理同工账号、需求建言、评论、通知和点赞数据）。
- **`db/`** - 数据库文件夹（自动创建）：
  - `users.json`：同工账号数据，包含姓名、密码、邮箱、所在教会及详细地址、定位地理位置及职务。
  - `wishes.json`：建言卡片数据（支持父子节点合并关联、合并原因及申诉理由）。
  - `comments.json`：评论数据（支持二级盖楼回复）。
  - `notifications.json`：通知中心数据（支持六大场景）。
- **`public/`** - 前端静态资源目录：
  - [public/index.html](file:///Users/yishu/AIGit/许愿池项目/public/index.html) - 主页面 HTML（包含首页广场、同工致谢榜、小铃铛通知面板与管理后台）。
  - `public/styles/` - 模块化 CSS 视觉系统，包括设计变量、基础样式、组件、页面与响应式规则。
  - `public/js/` - 模块化前端逻辑，包括登录注册、需求协作、分享通知、后台原型和 API 交互。
- **`public/uploads/`** - 用户上传截图与音频存放处。

---

## 3. 数据库设计 (Database Schema in JSON)

### 3.1 用户数据 (`users.json`)
```json
{
  "id": 1,
  "username": "user123",
  "password": "hashed_password",
  "email": "user@church.org",
  "nickname": "Grace Pastor",
  "church_name": "Grace Community Church",
  "country": "United States",
  "city": "Los Angeles",
  "role_category": "Clergy / Pastors",
  "role_detail": "Senior Pastor/Priest",
  "created_at": 1782381200000
}
```

### 3.2 期望数据 (`wishes.json`)
```json
{
  "id": 1,
  "user_id": 1,
  "title": "年底免税奉献凭证一键生成",
  "content": "每年年底需要为会友手动开具奉献证明用于报税，极其耗时，希望能系统一键批量生成PDF发送至邮箱。",
  "category": "finance",
  "images": ["/uploads/sample.png"],
  "audio_path": null,
  "is_anonymous": 0,
  "status": "accepted",
  "votes": 12,
  "voted_users": [1, 2, 3],
  "admin_reply": "非常好的建议，我们已采纳并设计了原型组件！",
  "parent_wish_id": null,
  "merge_reason": null,
  "dispute_reason": null,
  "dispute_status": "none",
  "created_at": 1782381200000
}
```

---

## 4. 核心 API 路由规划

### 4.1 账号与定位
- `POST /api/auth/register` - 注册。
- `POST /api/auth/login` - 登录。
- `GET /api/auth/me` - 个人信息。

### 4.2 查重与共创
- `POST /api/wishes/check-similar` - 提交前**实时查重匹配**。
- `POST /api/wishes` - 登录后提交期望建言（限制每日 3 条与最小字数，支持上传 1-3 张图片，或上传本地录音文件 M4A/MP3/WAV 进行 AI 转录）。
- `POST /api/wishes/:id/vote` - 点赞同感 / 取消点赞（含同工头像列表去重联动）。
- `POST /api/wishes/:id/comment` - 评论 / 二级盖楼回复。
- `POST /api/wishes/:id/dispute` - 发起拆分申诉。
- `POST /api/wishes/:id/translate` - **AI 卡片/评论一键翻译接口**：将原文翻译为用户当前界面语言。

### 4.3 管理员后台操作
- `POST /api/admin/wishes/merge` - 执行合并（写合并原因）。
- `GET /api/admin/disputes` - 申诉列表。
- `POST /api/admin/wishes/:id/resolve-dispute` - 审批申诉。
- `POST /api/admin/projects/ai-analyze` - 触发 AI 分析报告并生成排班/财务交互原型组件。
- `GET /api/admin/projects/ai-pre-export` - **AI 需求预分析接口**：生成同工画像统计、聚类板块、ROI及MVP建议，返回 JSON 预览。
- `POST /api/admin/projects/export-document` - **数据一键分析导出接口**：导出 Markdown 蓝图报告或 Excel 清单。
- `POST /api/admin/projects/send-emails` - 一键发送成果邮件，SSE 实时推送进度。

---

## 5. 验证与测试方案 (Verification Plan)

### 手动功能校验列表 (Manual Checklist)
1. **AI 预分析与文档一键导出测试**：大厅提交多个测试期望并点赞。进入管理员后台，点击“AI预分析并导出”，检查前端是否弹出报告预览。点击“导出 Excel”，验证导出的表格是否严格分列包含用户画像和需求明细。
2. **防抖查重功能**：在发布期望编辑框输入相似词，检查下方是否弹出匹配项引导去助力。
3. **录音上传与转录**：点击语音上传，选择本地音频文件，校验是否成功转写填充，并触发清晰度判定拦截测试。
4. **合并与拆分申诉**：后台强制合并并填写原因，用户申诉拆分，后台审批同意，卡片重新独立出现在广场。
