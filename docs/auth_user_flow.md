# ChurchOS 教会通 - 注册登录 UI 界面跳转图 (UI Transition storyboard)

本图展示了前台 H5 首页、注册/登录弹窗、输入态以及登录成功后的**UI 页面跳转关系与视觉状态流转**。

```mermaid
stateDiagram-v2
    [*] --> H5_Landing_Visitor : 游客进入 H5 首页

    state H5_Landing_Visitor {
        [*] --> Visitor_Home : 专属首页 (免登录只读版)
        Note left of Visitor_Home: 顶部没有头像，底部显示游客粘性浮条
    }

    Visitor_Home --> Auth_Modal_Login : 点击 "1. 注册/登录" 或 触发拦截操作

    state Auth_Modal_Login {
        [*] --> Login_Form_Empty : 登录弹窗 (Tab A 默认激活)
        Note right of Login_Form_Empty: 字段：邮箱 + 密码<br/>底部显示链接："没有账号? 立即加入共创"

        Login_Form_Empty --> Login_Form_Invalid : 输入错误账号/密码提交
        Login_Form_Invalid --> Login_Form_Empty : 提示 "邮箱或密码错误"
    }

    Login_Form_Empty --> Auth_Modal_Register : 点击 "没有账号? 立即加入共创(注册)"

    state Auth_Modal_Register {
        [*] --> Register_Form_Prefilled : 注册弹窗 (Tab B 被激活)
        Note left of Register_Form_Prefilled: 包含：邮箱/密码/姓名<br/>所在地区 (IP已自动预填)<br/>所属教会 (输入联想中)<br/>职务下拉列表

        Register_Form_Prefilled --> Register_Form_Success : 填写合规并提交
    }

    state Register_Form_Success {
        [*] --> Success_Toast : 提示 "🎉 注册成功! 请登录"
    }

    Register_Form_Success --> Auth_Modal_Login_Prefilled : 自动重定向 (1秒后)

    state Auth_Modal_Login_Prefilled {
        [*] --> Login_Form_Filled : 登录弹窗 (Tab A 被重新激活)
        Note right of Login_Form_Filled: 邮箱输入框已自动填充刚才注册的邮箱<br/>用户只需聚焦密码框输入密码
    }

    Login_Form_Filled --> H5_Landing_Logged_In : 输入密码点击 "登录同工账号" 成功

    state H5_Landing_Logged_In {
        [*] --> Logged_In_Home : 专属首页 (同工登录状态)
        Note left of Logged_In_Home: 弹窗渐隐消失<br/>顶部 Header 显示首字母/真实头像<br/>底部游客浮条隐去
    }

    Logged_In_Home --> Visitor_Home : 点击头像旁的 "退出" 按钮
```

### UI 状态流转规范说明：
1. **游客首页状态**：顶部无头像，底部有半透明常驻悬浮栏（快速加入/登录）。
2. **弹窗层级**：以毛玻璃遮罩悬浮在首页之上，首页高斯模糊（Blur 10px）。
3. **注册成功过渡**：注册点击提交 -> 按钮 loading -> 弹出绿色 Toast 提示 -> 弹窗内的 Tab 面板自动向左滑移切换回登录面板，预填邮箱。
4. **同工登录首页状态**：弹窗淡出（Fade-out）消失，首页模糊滤镜移除，顶部 Header 展开个人头像及同工昵称，底部游客常驻浮条彻底消失。
