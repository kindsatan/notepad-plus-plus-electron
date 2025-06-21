# Notepad++ - 现代化Markdown编辑器

一个基于Electron构建的现代化、高性能Markdown编辑器，提供实时预览、语法高亮、文件管理等强大功能。

## ✨ 核心功能

### 📝 编辑功能
- **实时Markdown预览** - 边写边看，所见即所得
- **语法高亮** - 支持Markdown语法高亮显示
- **智能缩进** - 自动缩进和代码格式化
- **括号匹配** - 自动补全括号、引号等
- **撤销/重做** - 完整的编辑历史记录
- **查找替换** - 强大的文本搜索和替换功能

### 🗂️ 文件管理
- **文件浏览器** - 树形结构浏览文件和文件夹
- **多标签页** - 同时编辑多个文件
- **文件监听** - 自动检测文件外部修改
- **拖拽支持** - 支持文件拖拽打开
- **快速搜索** - 在文件树中快速查找文件

### 🎨 界面特性
- **现代化UI** - 简洁美观的用户界面
- **深色/浅色主题** - 支持主题切换
- **响应式布局** - 自适应不同屏幕尺寸
- **可调整面板** - 灵活的界面布局
- **状态栏** - 实时显示编辑状态信息

### ⚡ 性能优化
- **虚拟滚动** - 处理大文件时保持流畅
- **增量渲染** - 只更新变化的内容
- **内存优化** - 高效的内存使用
- **快速启动** - 优化的应用启动速度

## 🚀 快速开始

### 系统要求

- **操作系统**: Windows 10/11, macOS 10.14+, Linux (Ubuntu 18.04+)
- **Node.js**: 16.0.0 或更高版本
- **内存**: 最少 4GB RAM
- **存储**: 至少 500MB 可用空间

### 安装依赖

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd desktop_client_electron
   ```

2. **安装Node.js依赖**
   ```bash
   npm install
   ```
   
   或使用Yarn:
   ```bash
   yarn install
   ```

### 开发环境设置

1. **启动开发服务器**
   ```bash
   npm run dev
   ```
   
   这将启动Electron应用的开发模式，支持热重载。

2. **调试模式**
   ```bash
   npm run debug
   ```
   
   启动应用并打开开发者工具。

### 构建和打包

#### 开发构建
```bash
npm run build
```

#### 生产构建
```bash
npm run build:prod
```

#### 平台特定打包

**Windows**
```bash
npm run build:win
```

**macOS**
```bash
npm run build:mac
```

**Linux**
```bash
npm run build:linux
```

**所有平台**
```bash
npm run build:all
```

## 📁 项目结构

```
desktop_client_electron/
├── src/
│   ├── main/                 # 主进程代码
│   │   ├── main.js          # 主进程入口
│   │   └── preload.js       # 预加载脚本
│   └── renderer/            # 渲染进程代码
│       ├── index.html       # 主页面
│       ├── styles/          # 样式文件
│       │   ├── main.css     # 主样式
│       │   ├── editor.css   # 编辑器样式
│       │   └── preview.css  # 预览样式
│       └── js/              # JavaScript模块
│           ├── app.js       # 主应用逻辑
│           ├── editor.js    # 编辑器模块
│           ├── preview.js   # 预览模块
│           ├── file-manager.js # 文件管理器
│           └── ui-manager.js   # UI管理器
├── assets/                  # 静态资源
│   └── icons/              # 应用图标
├── dist/                   # 构建输出目录
├── package.json            # 项目配置
└── README.md              # 项目说明
```

## ⌨️ 快捷键

### 文件操作
| 功能 | Windows/Linux | macOS |
|------|---------------|-------|
| 新建文件 | `Ctrl+N` | `Cmd+N` |
| 打开文件 | `Ctrl+O` | `Cmd+O` |
| 打开文件夹 | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| 保存文件 | `Ctrl+S` | `Cmd+S` |
| 另存为 | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| 关闭标签页 | `Ctrl+W` | `Cmd+W` |

### 编辑操作
| 功能 | Windows/Linux | macOS |
|------|---------------|-------|
| 撤销 | `Ctrl+Z` | `Cmd+Z` |
| 重做 | `Ctrl+Y` | `Cmd+Y` |
| 查找 | `Ctrl+F` | `Cmd+F` |
| 替换 | `Ctrl+H` | `Cmd+H` |
| 全选 | `Ctrl+A` | `Cmd+A` |
| 复制行 | `Ctrl+D` | `Cmd+D` |
| 注释切换 | `Ctrl+/` | `Cmd+/` |

### 视图操作
| 功能 | Windows/Linux | macOS |
|------|---------------|-------|
| 编辑器模式 | `Ctrl+1` | `Cmd+1` |
| 分屏模式 | `Ctrl+2` | `Cmd+2` |
| 预览模式 | `Ctrl+3` | `Cmd+3` |
| 切换侧边栏 | `Ctrl+B` | `Cmd+B` |

### 标签页操作
| 功能 | Windows/Linux | macOS |
|------|---------------|-------|
| 切换到标签页1-9 | `Ctrl+1-9` | `Cmd+1-9` |
| 下一个标签页 | `Ctrl+Tab` | `Cmd+Tab` |
| 上一个标签页 | `Ctrl+Shift+Tab` | `Cmd+Shift+Tab` |

## 🔧 配置选项

应用支持多种配置选项，可以通过设置面板或配置文件进行调整：

### 编辑器设置
- **字体大小**: 调整编辑器字体大小
- **字体族**: 选择编辑器字体
- **制表符大小**: 设置缩进空格数
- **自动换行**: 启用/禁用自动换行
- **行号显示**: 显示/隐藏行号
- **当前行高亮**: 高亮当前编辑行

### 预览设置
- **主题**: 选择预览主题
- **字体大小**: 调整预览字体大小
- **最大宽度**: 设置预览内容最大宽度
- **数学公式**: 启用/禁用数学公式渲染
- **代码高亮**: 启用/禁用代码语法高亮

### 文件管理
- **显示隐藏文件**: 在文件树中显示隐藏文件
- **文件过滤**: 设置显示的文件类型
- **自动保存**: 启用自动保存功能
- **文件监听**: 监听文件外部修改

## 🛠️ 开发指南

### 技术栈

- **Electron**: 跨平台桌面应用框架
- **Node.js**: JavaScript运行时
- **HTML/CSS/JavaScript**: 前端技术
- **Marked**: Markdown解析器
- **Highlight.js**: 代码语法高亮
- **DOMPurify**: HTML清理库
- **Chokidar**: 文件监听库

### 架构设计

应用采用模块化架构，主要组件包括：

1. **主进程 (Main Process)**
   - 应用生命周期管理
   - 窗口创建和管理
   - 文件系统操作
   - 菜单和快捷键处理

2. **渲染进程 (Renderer Process)**
   - 用户界面渲染
   - 编辑器功能实现
   - 预览功能实现
   - 用户交互处理

3. **预加载脚本 (Preload Script)**
   - 安全的API暴露
   - 主进程与渲染进程通信

### 添加新功能

1. **编辑器功能**: 在 `src/renderer/js/editor.js` 中添加
2. **预览功能**: 在 `src/renderer/js/preview.js` 中添加
3. **文件操作**: 在 `src/renderer/js/file-manager.js` 中添加
4. **UI组件**: 在 `src/renderer/js/ui-manager.js` 中添加
5. **主进程功能**: 在 `src/main/main.js` 中添加

### 调试技巧

1. **开发者工具**: 使用 `Ctrl+Shift+I` 打开开发者工具
2. **主进程调试**: 使用 `--inspect` 参数启动
3. **日志输出**: 使用 `console.log` 进行调试
4. **性能分析**: 使用浏览器性能工具

## 📦 打包配置

### Electron Builder配置

项目使用 `electron-builder` 进行打包，配置位于 `package.json` 中：

```json
{
  "build": {
    "appId": "com.notepadplusplus.app",
    "productName": "Notepad++",
    "directories": {
      "output": "dist"
    },
    "files": [
      "src/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icons/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icons/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icons/icon.png"
    }
  }
}
```

### 代码签名

对于生产环境，建议配置代码签名：

**Windows**
```json
{
  "win": {
    "certificateFile": "path/to/certificate.p12",
    "certificatePassword": "password"
  }
}
```

**macOS**
```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name"
  }
}
```

## 🧪 测试

### 运行测试
```bash
npm test
```

### 端到端测试
```bash
npm run test:e2e
```

### 测试覆盖率
```bash
npm run test:coverage
```

## 🚀 部署

### 自动更新

应用支持自动更新功能，需要配置更新服务器：

```json
{
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "your-repo"
  }
}
```

### 发布流程

1. 更新版本号
2. 创建Git标签
3. 运行构建命令
4. 上传到发布平台

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 JavaScript Standard Style
- 添加适当的注释
- 编写测试用例

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果遇到问题或需要帮助：

1. 查看 [FAQ](docs/FAQ.md)
2. 搜索 [Issues](../../issues)
3. 创建新的 [Issue](../../issues/new)
4. 联系开发团队

## 🔄 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 🙏 致谢

感谢以下开源项目：

- [Electron](https://electronjs.org/)
- [Marked](https://marked.js.org/)
- [Highlight.js](https://highlightjs.org/)
- [Font Awesome](https://fontawesome.com/)
- [Inter Font](https://rsms.me/inter/)
- [JetBrains Mono](https://www.jetbrains.com/mono/)

---

**Notepad++** - 让Markdown编写更加高效和愉悦！ 🚀