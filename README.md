# Electron Terminal

一个使用Electron和node-pty构建的简洁终端模拟器。提供了类似iTerm2的基本终端功能，支持全彩色输出、命令历史和基本自定义。

## 功能特点

- 基于xterm.js的现代终端界面
- 支持全彩色输出和各种终端转义序列
- 响应式设计，自动适应窗口大小变化
- 自定义主题和字体设置
- 简洁的工具栏界面

## 技术栈

- Electron: 跨平台桌面应用框架
- node-pty: Node.js的伪终端实现
- xterm.js: 强大的终端前端组件
- JavaScript/HTML/CSS: 用户界面实现

## 开发指南

### 环境要求

- Node.js 16+
- npm 7+
- 支持C++编译器的开发环境（用于node-pty）
  - Windows: Visual Studio Build Tools
  - macOS: XCode Command Line Tools
  - Linux: gcc/g++ and make

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd electron-terminal

# 安装依赖
npm install

# 重新编译原生模块（node-pty）
npm run rebuild
```

### 开发运行

```bash
npm start
```

### 构建应用

```bash
npm run build
```

构建成功后，可执行文件将位于`dist`目录中。

## 项目结构

```
electron-terminal/
├── main.js          # Electron主进程
├── index.html       # 渲染进程HTML
├── package.json     # 项目配置
└── node_modules/    # 依赖库
```

## 未来计划

- [ ] 支持多标签和分屏功能
- [ ] 自定义主题编辑器
- [ ] 配置持久化
- [ ] Shell配置集成
- [ ] 命令自动补全
- [ ] 搜索功能

## 许可证

MIT
