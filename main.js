const { app, BrowserWindow, ipcMain } = require('electron');
const os = require('os');
const pty = require('node-pty');
const path = require('path');

// 保存主窗口的引用以防止被垃圾回收
let mainWindow;
// 保存pty进程的引用
let ptyProcess;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 加载index.html
  mainWindow.loadFile('index.html');

  // 在开发环境中打开开发者工具
  // mainWindow.webContents.openDevTools();

  // 创建一个伪终端进程
  ptyProcess = pty.spawn(process.platform === 'win32' ? 'powershell.exe' : 'zsh', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: os.homedir(),
    env: process.env
  });

  // 监听终端输出并发送到渲染进程
  ptyProcess.onData(data => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-output', data);
    }
  });

  // 当窗口关闭时清除引用
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcess = null;
    }
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(createWindow);

// 关闭所有窗口时退出应用，在macOS上除外
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在macOS上，当点击dock图标并且没有其他窗口打开时，通常会在应用中重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 从渲染进程接收输入并写入pty
ipcMain.on('terminal-input', (event, data) => {
  if (ptyProcess) {
    ptyProcess.write(data);
  }
});

// 接收终端调整大小事件并调整pty大小
ipcMain.on('resize-terminal', (event, size) => {
  // 添加对size对象的检查，确保其存在并且包含必要的属性
  if (ptyProcess && size && typeof size.cols === 'number' && typeof size.rows === 'number') {
    ptyProcess.resize(size.cols, size.rows);
  }
});