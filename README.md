# Electron Terminal

一个使用Electron和node-pty构建的简洁终端模拟器。提供了类似iTerm2的基本终端功能，支持全彩色输出、命令历史和基本自定义。

## 功能特点

- 基于xterm.js的现代终端界面
- 支持全彩色输出和各种终端转义序列
- 响应式设计，自动适应窗口大小变化
- 自定义主题和字体设置
- 简洁的工具栏界面
- RESTful API接口，支持远程控制终端

## 技术栈

- Electron: 跨平台桌面应用框架
- node-pty: Node.js的伪终端实现
- xterm.js: 强大的终端前端组件
- Express: 提供RESTful API服务
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
├── api-server.js    # RESTful API服务器
├── index.html       # 渲染进程HTML
├── demo-client.html # API演示客户端
├── api-test.js      # API测试脚本
├── package.json     # 项目配置
└── node_modules/    # 依赖库
```

## API文档

应用启动后会在本地端口3000上提供RESTful API接口，可用于远程控制终端。

### 端点

#### 获取终端输出

```
GET /api/output
```

查询参数:
- `lines`: (可选) 要获取的最大行数，默认为缓冲区大小(1000)

响应:
```json
{
  "output": "完整的终端输出文本",
  "lines": ["按行分割的输出数组"]
}
```

#### 发送终端输入

```
POST /api/input
```

请求体:
```json
{
  "text": "要发送的文本",
  "control": "控制字符 (可选，例如 'c' 表示 Ctrl+C)"
}
```

响应:
```json
{
  "success": true
}
```

### 使用示例

#### 使用curl发送命令并获取输出

```bash
# 发送命令
curl -X POST -H "Content-Type: application/json" -d '{"text":"ls -la\n"}' http://localhost:3000/api/input

# 获取输出
curl http://localhost:3000/api/output
```

#### 发送Ctrl+C终止命令

```bash
curl -X POST -H "Content-Type: application/json" -d '{"control":"c"}' http://localhost:3000/api/input
```

#### 发送超长文本

```bash
curl -X POST -H "Content-Type: application/json" -d '{"text":"cat << EOF\n大段文本内容...\nEOF\n"}' http://localhost:3000/api/input
```

### Web演示客户端

项目包含一个基于Web的演示客户端页面 `demo-client.html`，可以用来测试终端API功能。使用方法：

1. 确保Electron Terminal应用正在运行
2. 在浏览器中打开 `demo-client.html` 文件
3. 通过Web界面发送命令和控制字符，并查看终端输出

演示客户端提供以下功能：
- 实时查看终端输出（支持自动刷新）
- 发送命令，包括超长文本
- 发送常用控制字符 (Ctrl+C, Ctrl+D等)
- 查看命令执行状态

## 未来计划

- [ ] 支持多标签和分屏功能
- [ ] 自定义主题编辑器
- [ ] 配置持久化
- [ ] Shell配置集成
- [ ] 命令自动补全
- [ ] 搜索功能
- [ ] API身份验证和安全措施
- [ ] WebSocket支持实时终端输出

## 许可证

MIT
