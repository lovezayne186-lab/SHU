# 书包机 项目摘要

## 一、项目基本信息

| 项目属性 | 内容 |
|---------|------|
| **项目名称** | 书包机 |
| **项目类型** | PWA (Progressive Web App) - 模拟手机界面的 Web 应用 |
| **入口文件** | `index.html` |
| **开发依赖** | Playwright (测试框架) |

## 二、技术栈

| 类别 | 技术 |
|------|------|
| **前端框架** | Vue 3 (CDN 引入) |
| **CSS 框架** | Tailwind CSS (CDN 引入) |
| **图标库** | FontAwesome 6.5.1, BoxIcons 2.1.4 |
| **字体** | LXGW WenKai Lite (霞鹜文楷) |
| **本地存储** | localStorage + localforage (大容量存储) |
| **调试工具** | Eruda (移动端调试) |
| **测试工具** | Playwright |
| **PWA 支持** | manifest.json + Service Worker (sw.js) |

## 三、目录结构

```
项目根目录/
├── index.html              # 主入口文件 (手机模拟器主界面)
├── manifest.json           # PWA 配置文件
├── sw.js                   # Service Worker
├── package.json            # 项目依赖配置
│
├── CSS/                    # 样式文件目录
│   ├── global.css          # 全局样式
│   ├── pages.css           # 页面样式
│   ├── widgets.css         # 组件/小部件样式
│   ├── chat-page.css       # 聊天页面样式
│   ├── weixin.css          # 微信风格样式
│   ├── mine.css            # 个人中心样式
│   ├── wallet.css          # 钱包样式
│   ├── sports.css          # 运动样式
│   ├── music.css           # 音乐样式
│   └── couple-space.css    # 情侣空间样式
│
├── JS/                     # JavaScript 模块目录
│   ├── api.js              # AI API 调用与 Prompt 管理
│   ├── chat.js             # 聊天核心逻辑
│   ├── mine.js             # 个人中心
│   ├── wallet.js           # 钱包功能
│   ├── music.js            # 音乐功能
│   ├── moments.js          # 朋友圈功能
│   ├── settings.js         # 设置功能
│   ├── system.js           # 系统功能
│   ├── widgets.js          # 桌面小部件
│   ├── worldbook.js        # 世界书功能
│   │
│   ├── chat/               # 聊天模块拆分
│   │   ├── group/          # 群聊功能
│   │   │   ├── group-core.js
│   │   │   └── group-ui.js
│   │   ├── sec-02-core-render.js      # 聊天渲染
│   │   ├── sec-03-ai-prompt.js        # AI Prompt 生成
│   │   ├── sec-04-role-state.js       # 角色状态监控
│   │   ├── sec-05-ai-response.js      # AI 响应解析
│   │   ├── sec-06-map-location.js     # 地图位置
│   │   ├── sec-07-call-outgoing.js    # 发起通话
│   │   ├── sec-08-call-incoming.js    # 接听来电
│   │   ├── sec-09-menu-settings.js    # 菜单设置
│   │   ├── sec-10-navigation-tools.js # 导航工具
│   │   └── sec-10b-memory-archive-v2.js # 记忆归档
│   │
│   ├── couplespace/        # 情侣空间模块
│   │   ├── couple-space.js # 主控制器
│   │   ├── coupleQA.js     # 情侣问答
│   │   ├── qa_data.js      # 问答数据
│   │   ├── qlkj-setting.js # 设置
│   │   ├── adapters/       # 适配器层
│   │   ├── ai/             # AI 场景
│   │   ├── domains/        # 业务领域
│   │   └── ui/             # UI 组件
│   │
│   └── 我的/               # 个人中心模块
│       ├── core.js         # 核心逻辑
│       ├── profile.js      # 个人资料
│       ├── period.js       # 周期记录
│       ├── sports.js       # 运动数据
│       ├── articleData.js  # 文章数据
│       └── userCycleData.js # 用户周期数据
│
├── apps/                   # 应用页面
│   ├── couple-space.html   # 情侣空间
│   ├── couple-album.html   # 情侣相册
│   ├── couple-wishlist.html # 心愿清单
│   ├── couple-future-planning.html # 未来规划
│   └── music.html          # 音乐播放器
│
├── private-gallery/        # 私人陈列室
│   ├── private.html        # 主页面
│   ├── components/         # 组件
│   │   └── NeumorphicCard.js
│   └── pages/              # 角色页面
│       ├── SelectRole.html
│       ├── ChenFeng.html
│       ├── FangCun.html
│       └── NiNan.html
│
├── assets/                 # 静态资源
│   ├── icons/              # 图标
│   └── images/             # 图片
│
└── tools/                  # 开发工具脚本
    ├── static-server.js    # 静态服务器
    └── playwright-*.js     # Playwright 测试脚本
```

## 四、核心功能模块

### 1. 聊天系统 (chat.js + chat/)
- **私聊功能**：与 AI 角色进行对话
- **群聊功能**：多角色群组聊天
- **AI 集成**：通过 API 调用 AI 生成回复
- **角色管理**：角色档案、心情状态
- **通话功能**：模拟语音/视频通话
- **位置共享**：地图位置编辑器

### 2. 情侣空间 (couplespace/)
- **纪念日倒计时**：记录重要日期
- **心情日记**：每日心情记录
- **情侣问答**：互动问答游戏
- **心愿清单**：共同愿望管理
- **未来规划**：计划制定

### 3. 个人中心 (我的/)
- **个人资料**：头像、昵称、签名
- **周期记录**：生理周期追踪
- **运动数据**：运动统计
- **钱包功能**：虚拟钱包

### 4. 桌面系统 (index.html + widgets.js)
- **iOS 风格界面**：模拟手机桌面
- **分页滑动**：左右滑动切换页面
- **小组件**：桌面小部件
- **Dock 栏**：底部应用栏

### 5. 私人陈列室 (private-gallery/)
- **角色展示**：AI 角色卡片展示
- **新拟态设计**：Neumorphic UI 风格

## 五、数据存储架构

| 存储类型 | 用途 |
|---------|------|
| **localStorage** | 轻量配置、用户设置、会话状态 |
| **localforage** | 大容量数据（聊天记录、日记、图片） |
| **IndexedDB** | (通过 localforage) 结构化大数据 |

### 主要存储键名
```
wechat_chatData          # 聊天数据
wechat_charProfiles      # 角色档案
wechat_userPersonas      # 用户身份
wechat_backgrounds       # 聊天背景
wechat_callLogs          # 通话记录
couple_space_mood_entries_v1    # 心情日记
couple_space_anniversary_date_v1 # 纪念日
```

## 六、AI Prompt 系统

项目包含完整的 AI Prompt 管理系统：

| Prompt 场景 | 标识符 |
|------------|--------|
| 完整聊天 | `[[PROMPT_CLASS:FULL_CHAT]]` |
| 角色轻量 | `[[PROMPT_CLASS:ROLE_LITE]]` |
| JSON任务 | `[[PROMPT_CLASS:ROLE_JSON_TASK]]` |
| 微信私聊 | `[[SCENE:WECHAT_PRIVATE_V2]]` |
| 情侣日记 | `[[SCENE:COUPLE_SPACE_DIARY]]` |
| 朋友圈发帖 | `[[SCENE:MOMENTS_PROACTIVE_POST]]` |

## 七、关键文件说明

| 文件 | 作用 |
|------|------|
| `index.html` | 主入口，包含完整的手机模拟器 UI |
| `JS/chat.js` | 聊天系统核心，约 2000+ 行 |
| `JS/api.js` | AI API 调用封装 |
| `JS/couplespace/couple-space.js` | 情侣空间主控制器 |
| `CSS/global.css` | 全局样式定义 |

---

## 使用说明

这份摘要用于向 AI 助手介绍项目概况，使用时可以：

1. **直接发送全文** - 让 AI 快速了解项目全貌
2. **按需截取** - 只发送相关模块的部分
3. **补充具体问题** - 在摘要后附上你的具体问题

例如：
> "这是我的项目摘要，我想问关于 [聊天模块/AI Prompt/数据存储] 的问题..."
