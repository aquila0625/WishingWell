# 许愿池共创平台 - UI 设计还原与原型说明书 (经典设计稿样式)

为了保证设计稿的专业度与业务直观性，我们去除了花哨的星空背景，转而采用**经典的 Figma 浅灰色网格画布设计稿样式**，并将所有展示内容统一替换为**中文（Chinese）**，以便于更清晰地展示系统布局 and 原型走查。

系统采用**两级页面结构**：用户扫码直达第一级“H5专属首页（引导与介绍）”，点击按钮可分流进入第二级“需求广场页”或调起注册/登录/发布等弹窗。

---

## 1. 移动端 H5 专属首页 - 第一级落地页 (Mobile H5 Landing Homepage)
同工扫码或点击群分享链接进入的**第一级专属首页**。该页面纯粹用于项目介绍、价值引导，并提供四大核心快捷入口，没有任何数据杂音干扰，布局直观。

### H5 首页经典线框图 (Wireframe)
![ChurchOS Mobile H5 Landing Homepage Wireframe with Promo Copy](file:///Users/yishu/AIGit/许愿池项目/public/images/h5_landing_copy_mockup_1784133346082.jpg)

### H5 首页高保真 UI 还原图 (High-Fidelity UI Design - Countdown & i18n Selector)
![ChurchOS Mobile H5 Landing Homepage with Countdown Timer and i18n Selector](file:///Users/yishu/AIGit/许愿池项目/public/images/h5_homepage_countdown_ui_1784134111070.jpg)

---

## 2. 移动端 H5 需求广场页 - 第二级互动页 (Mobile H5 Co-creation Wall)
同工从首页点击“浏览大家提出的痛点”后跳转进入的**二级互动广场**。集中展示所有的痛点建言、同感助力与评论。

### H5 广场经典设计图
![ChurchOS Mobile H5 Share Landing Page Wireframe](file:///Users/yishu/AIGit/许愿池项目/public/images/h5_share_page_mockup_1784131871569.jpg)

---

## 3. 注册登录浮窗 - 手机端 H5 弹窗还原 (Mobile Registration & Login Modal)
当未登录的用户点击“提需求”、“点赞”或“评论”时，系统从页面下方滑出或淡入的**注册登录两用玻璃弹窗**。

### 登录表单高保真 UI 还原图 (Login Form UI Design - Tab A Active) 💡
以下是 Tab A **“同工登录”** 被点选激活后的 H5 弹窗高保真设计还原图。相较于注册表单，该界面极为精简，专注于邮箱、密码输入及核心登录操作：

![ChurchOS Mobile H5 Login Form UI Mockup](file:///Users/yishu/AIGit/许愿池项目/public/images/h5_login_ui_mockup_1784135281436.jpg)

### UI 界面设计与交互规范：
- **同工登录选项卡 (Login Tab Active)**：
  - 顶部的 `同工登录` 选项被点选激活，下方带有亮青色的微光指示横线，向右滑动的 `加入共创 (注册)` 选项卡则处于半透明未选中状态。
- **登录输入项 (Login Inputs)**：
  - 仅包含两个极简的输入字段：**登录电子邮箱**（左侧配有邮件图标，默认预填 example 占位符）及**登录密码**（左侧配有锁具图标，右侧配有显示/隐藏密码的眼睛图标 👁️）。
- **行动呼叫按钮 (CTA Button)**：
  - 底置亮白色的 **“登录同工账号”** 实心按钮，文字前带有金色锁具图标，暗示安全性。
- **辅助链接 (Helper Links)**：
  - 按钮下方提供深青色文字链接 `忘记密码?` 和 `使用手机号登录`，以便后期功能扩展和异常找回。

### 注册表单高保真 UI 还原图 (Registration Form UI Design - Tab B Active)
以下是 Tab B **“加入共创 (注册)”** 被点选激活后的 H5 弹窗设计还原图。展现了输入邮箱、密码、昵称提示、教会自动联想、IP地区预填以及13种服侍职务选择器的完整视觉排版：

![ChurchOS Mobile H5 Registration Form UI Mockup](file:///Users/yishu/AIGit/许愿池项目/public/images/h5_register_ui_mockup_1784135078029.jpg)

---

## 4. PC端 项目详情与需求广场 (PC Project Detail & Registration Form)
在电脑网页端打开项目时的完整呈现界面，采用左右分栏大版面展示。

### UI 经典设计图
![Wishing Well Project Detail Page & Registration Form Classic Wireframe](file:///Users/yishu/AIGit/许愿池项目/public/images/project_detail_classic_mockup_1784076952707.jpg)

---

## 5. 管理员 AI 分析后台 (Admin Dashboard & AI Analytics)
展示管理员登录后台后的 AI 需求预分析模块 and 排班原型交互区。

### UI 经典设计图
![Admin Dashboard and AI Analytics Classic Wireframe](file:///Users/yishu/AIGit/许愿池项目/public/images/admin_dashboard_classic_mockup_1784076963494.jpg)

---

## 6. 后台“一键 H5 分发推广”与 H5 前台分享弹窗 (Sharing Modal & Overlay)
管理员在后台分发推广，或普通用户在 H5 前台点击“4. 我要分享”按钮时触发的分享媒介。

### B端管理员分享弹窗 (Admin Share Modal)
![Admin Sharing and Poster Download Classic Wireframe](file:///Users/yishu/AIGit/许愿池项目/public/images/project_distribution_mockup_1784077504399.jpg)

### H5 前端分享卡片与链接复制浮层 (Mobile H5 Share Option C Overlay)
![ChurchOS Mobile H5 Sharing Poster and Link Copy Overlay Mockup](file:///Users/yishu/AIGit/许愿池项目/public/images/h5_share_overlay_ui_1784134558851.jpg)

---

## 7. 导出的高保真“共创分享海报”效果 (Exported Share Poster)
管理员点击“下载海报”后，系统在本地生成并导出的 **2:3 纵向手机端/打印端分享海报图**。

### 海报导出效果图
![Wishing Well Co-creation Invitation Share Poster](file:///Users/yishu/AIGit/许愿池项目/public/images/co_creation_share_poster_1784077717552.jpg)
