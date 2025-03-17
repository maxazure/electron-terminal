const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// 创建一个类来管理API服务器
class TerminalApiServer {
  constructor() {
    this.app = express();
    this.port = 8999;
    this.server = null;
    this.terminal = null;
    this.outputBuffer = [];
    this.maxBufferSize = 1000; // 最多保存1000行输出
    this.defaultOutputLines = 20; // 默认返回的行数
    this.terminalState = {
      lines: [],
      cursorX: 0,
      cursorY: 0,
      maxLines: 1000
    };
    
    // 配置Express
    this.app.use(cors());
    this.app.use(bodyParser.json({limit: '50mb'})); // 支持超长文本
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    
    // 设置API路由
    this.setupRoutes();
  }
  
  // 清除ANSI转义序列
  stripAnsiCodes(text) {
    if (!text) return '';
    
    // 移除ANSI转义序列的正则表达式
    // 这会移除颜色代码、光标移动、清屏等控制字符
    
    // 首先处理OSC序列的残留部分 (如 2;echo 等)
    // 这种模式的字符串通常是数字后跟分号，然后是命令或路径
    let cleaned = text;
    
    // 移除行开头的类似OSC标题的内容 (例如 "2;echo...")
    cleaned = cleaned.replace(/^\d+;[^\r\n]*/g, '');
    
    // 移除行中间的类似OSC标题的内容
    cleaned = cleaned.replace(/(?<=\s)\d+;[^\r\n\s]*/g, '');
    
    // 现在处理常规的ANSI序列
    return cleaned
      // 移除所有CSI序列 (控制序列引导符，以ESC [开头)
      .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
      // 移除所有OSC序列 (操作系统命令，以ESC ]开头，以BEL或ST结尾)
      .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g, '')
      // 移除响铃字符 (BEL)
      .replace(/\x07/g, '')
      // 移除回车符
      .replace(/\r/g, '')
      // 移除其他常见的控制字符，但保留换行符
      .replace(/[\x00-\x1F\x7F]/g, match => match === '\n' ? '\n' : '')
      // 移除其他可能的ANSI格式 (冗余，以确保覆盖面)
      .replace(/\u001b[^m]*?m/g, '')
      .replace(/\u001b\][^\u0007]*?\u0007/g, '')
      // 最后清理掉可能的字符串首尾空白字符
      .trim();
  }
  
  // 处理屏幕输出文本
  processOutputText(text, stripAnsi) {
    if (text === undefined || text === null) return null;
    
    // 如果需要清除ANSI序列
    if (stripAnsi) {
      return this.stripAnsiCodes(text);
    }
    return text;
  }
  
  // 设置API路由
  setupRoutes() {
    // 健康检查
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', version: '1.0.0' });
    });
    
    // 重置终端状态 (用于调试)
    this.app.post('/api/reset', (req, res) => {
      this.terminalState = {
        lines: [''],
        cursorX: 0,
        cursorY: 0,
        maxLines: 1000
      };
      this.outputBuffer = [];
      res.json({ success: true, message: '终端状态已重置' });
    });
    
    // 获取终端输出
    this.app.get('/api/output', (req, res) => {
      // 解析请求参数，如果为空或者为0则使用默认行数
      let lines = parseInt(req.query.lines);
      if (isNaN(lines) || lines <= 0) {
        lines = this.defaultOutputLines;
      }
      
      // 是否清除ANSI转义序列
      const stripAnsi = req.query.plain === 'true';
      
      // 从模拟的终端状态获取可见行
      const visibleLines = this.terminalState.lines.slice(-lines);
      
      // 处理每一行，可选择清除ANSI序列
      const processedOutputLines = visibleLines.map(line => 
        this.processOutputText(line, stripAnsi)
      )
      .filter(line => line !== null) // 保留空白行，但过滤掉null值
      .map(line => {
        // 处理终端行
        line = line.replace(/\n/g, ''); // 移除换行符
        
        if (stripAnsi) {
          // 需要更彻底地处理OSC序列的残余
          
          // 处理标题设置指令的残余 (2;..., 1;... 模式)
          line = line.replace(/^\d+;[^\n\r]*/g, ''); // 行开头
          line = line.replace(/(?<=\s)\d+;[^\n\r\s]*/g, ''); // 行中
          
          // 处理可能的完整URL协议前缀(file://)
          line = line.replace(/^(?:file|https?):(?:\/\/|%3A%2F%2F)[^\s]*/g, '');
          
          // 处理单独的响铃字符和空白行
          line = line.replace(/\u0007/g, '');
          
          // 清理前后空格
          line = line.trim();
        }
        
        return line;
      })
      
      // 返回数组形式的输出，每个元素是一行
      res.json({ 
        lines: processedOutputLines
      });
    });
    
    // 发送终端输入
    this.app.post('/api/input', (req, res) => {
      if (!this.terminal) {
        return res.status(503).json({ error: 'Terminal not available' });
      }
      
      try {
        const { text, control } = req.body;
        console.log('Received input request:', { text, control });
        
        // 处理普通文本输入
        if (text) {
          this.terminal.write(text);
        }
        
        // 处理控制字符, 例如 { "control": "c" } 将发送 Ctrl+C
        if (control) {
          const controlChar = control.toLowerCase().charCodeAt(0);
          const ctrlChar = String.fromCharCode(controlChar - 97 + 1); // 'a'是97，Ctrl+A是1
          console.log(`Sending control character: ${control} (${ctrlChar.charCodeAt(0)})`);
          this.terminal.write(ctrlChar);
        }
        
        res.json({ success: true });
      } catch (error) {
        console.error('Input error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  // 设置终端实例，由main.js调用
  setTerminal(terminal) {
    this.terminal = terminal;
    console.log('Terminal instance set for API server');
  }
  
  // 添加终端输出到缓冲区
  addOutput(data) {
    if (!data) return;
    
    const dataStr = data.toString();
    
    // 将原始输出保存到缓冲区
    this.outputBuffer.push(dataStr);
    
    // 保持缓冲区大小限制
    if (this.outputBuffer.length > this.maxBufferSize) {
      this.outputBuffer.shift();
    }
    
    // 处理OSC标题方案：
    // iTerm2发送的标题序列格式为: \u001b]0;title\u0007 或 \u001b]2;title\u0007
    // 当收到标题相关的OSC序列时，我们将其记录下来但不将其添加到实际行中
    const oscMatch = dataStr.match(/\u001b\]([012]);([^\u0007]*)\u0007/g);
    
    // 仅当数据全部是OSC标题序列时才特残处理
    if (oscMatch && oscMatch.join('') === dataStr) {
      // 如果数据只包含OSC标题序列，则不通过普通终端状态更新处理
      console.log('Skipping title OSC sequence in terminal state');
      return;
    }
    
    // 更新终端状态模拟 - 简单模拟一个终端的行为
    this.updateTerminalState(dataStr);
  }
  
  // 模拟一个简化的终端状态管理
  updateTerminalState(data) {
    // 确保终端状态行数组已初始化
    if (!this.terminalState.lines.length) {
      this.terminalState.lines.push('');
    }
    
    // 处理常见的控制序列和文本
    let currentPosition = 0;
    while (currentPosition < data.length) {
      // 检查是否为ESC序列开始
      if (data[currentPosition] === '\u001b') {
        // ESC序列处理
        currentPosition++;
        if (currentPosition >= data.length) break;
        
        if (data[currentPosition] === ']') {
          // OSC (Operating System Command) 序列处理
          currentPosition++; // 跳过]
          
          // 查找OSC序列的终止符 (BEL字符 \u0007 或 ESC\\)
          while (currentPosition < data.length && 
                 data[currentPosition] !== '\u0007' && 
                 !(data[currentPosition] === '\u001b' && 
                   currentPosition + 1 < data.length && 
                   data[currentPosition + 1] === '\\')) {
            currentPosition++;
          }
          
          // 跳过终止符
          if (currentPosition < data.length) {
            if (data[currentPosition] === '\u0007') {
              currentPosition++;
            } else if (data[currentPosition] === '\u001b') {
              currentPosition += 2; // 跳过 ESC\\
            }
          }
        } else if (data[currentPosition] === '[') {
          // CSI序列处理
          currentPosition++; // 跳过[
          
          // 收集参数
          let params = '';
          while (currentPosition < data.length && 
                 (data[currentPosition] >= '0' && data[currentPosition] <= '9' || 
                  data[currentPosition] === ';' || data[currentPosition] === '?')) {
            params += data[currentPosition];
            currentPosition++;
          }
          
          // 跳过中间字符(如果有)
          while (currentPosition < data.length && 
                 (data[currentPosition] >= ' ' && data[currentPosition] <= '/')) {
            currentPosition++;
          }
          
          // 检查终止字符
          if (currentPosition < data.length) {
            const cmdChar = data[currentPosition];
            
            // 处理光标移动序列
            if (cmdChar === 'A') { // 光标上移 n 行
              const n = parseInt(params) || 1;
              this.terminalState.cursorY = Math.max(0, this.terminalState.cursorY - n);
            } else if (cmdChar === 'B') { // 光标下移 n 行
              const n = parseInt(params) || 1;
              this.terminalState.cursorY = Math.min(this.terminalState.lines.length - 1, 
                                                  this.terminalState.cursorY + n);
            } else if (cmdChar === 'C') { // 光标右移 n 列
              const n = parseInt(params) || 1;
              this.terminalState.cursorX += n;
            } else if (cmdChar === 'D') { // 光标左移 n 列
              const n = parseInt(params) || 1;
              this.terminalState.cursorX = Math.max(0, this.terminalState.cursorX - n);
            } else if (cmdChar === 'H' || cmdChar === 'f') { // 光标定位
              const [row, col] = (params || '').split(';').map(p => parseInt(p) || 1);
              this.terminalState.cursorY = Math.max(0, row - 1); // 终端坐标从1开始
              this.terminalState.cursorX = Math.max(0, col - 1);
              
              // 确保有足够的行
              while (this.terminalState.lines.length <= this.terminalState.cursorY) {
                this.terminalState.lines.push('');
              }
            } else if (cmdChar === 'J') { // 清除屏幕
              // 2J 清除整个屏幕
              if (params === '2') {
                this.terminalState.lines = [''];
                this.terminalState.cursorX = 0;
                this.terminalState.cursorY = 0;
              }
              // 其他情况暂不处理
            } else if (cmdChar === 'K') { // 清除行
              // 0K 清除光标到行尾，1K 清除行首到光标，2K 清除整行
              if (this.terminalState.cursorY < this.terminalState.lines.length) {
                let line = this.terminalState.lines[this.terminalState.cursorY];
                if (params === '0' || params === '') {
                  // 清除光标到行尾
                  this.terminalState.lines[this.terminalState.cursorY] = line.substring(0, this.terminalState.cursorX);
                } else if (params === '1') {
                  // 清除行首到光标
                  this.terminalState.lines[this.terminalState.cursorY] = ' '.repeat(this.terminalState.cursorX) + 
                                                         line.substring(this.terminalState.cursorX);
                } else if (params === '2') {
                  // 清除整行
                  this.terminalState.lines[this.terminalState.cursorY] = '';
                }
              }
            }
            
            currentPosition++; // 跳过终止字符
          }
        } else {
          // 其他ESC序列，简单跳过
          currentPosition++;
        }
      } else if (data[currentPosition] === '\u0007') {
        // 响铃字符 (BEL) - 在OSC序列外单独出现时，简单跳过
        currentPosition++;
      } else if (data[currentPosition] === '\b') {
        // 退格键 - 光标左移一位
        this.terminalState.cursorX = Math.max(0, this.terminalState.cursorX - 1);
        currentPosition++;
      } else if (data[currentPosition] === '\r') {
        // 回车 - 移动到行首
        this.terminalState.cursorX = 0;
        currentPosition++;
      } else if (data[currentPosition] === '\n') {
        // 换行 - 移动到下一行
        this.terminalState.cursorY++;
        if (this.terminalState.cursorY >= this.terminalState.lines.length) {
          this.terminalState.lines.push('');
          // 保持终端状态行的最大限制
          if (this.terminalState.lines.length > this.terminalState.maxLines) {
            this.terminalState.lines.shift();
            this.terminalState.cursorY--;
          }
        }
        currentPosition++;
      } else {
        // 普通字符 - 添加到当前行
        while (this.terminalState.lines.length <= this.terminalState.cursorY) {
          this.terminalState.lines.push('');
        }
        
        let currentLine = this.terminalState.lines[this.terminalState.cursorY];
        
        // 确保行有足够的字符
        while (currentLine.length < this.terminalState.cursorX) {
          currentLine += ' ';
        }
        
        // 插入或替换字符
        if (this.terminalState.cursorX >= currentLine.length) {
          // 在行尾添加
          currentLine += data[currentPosition];
        } else {
          // 替换字符
          currentLine = currentLine.substring(0, this.terminalState.cursorX) + 
                         data[currentPosition] + 
                         currentLine.substring(this.terminalState.cursorX + 1);
        }
        
        this.terminalState.lines[this.terminalState.cursorY] = currentLine;
        this.terminalState.cursorX++;
        currentPosition++;
      }
    }
  }
  
  // 启动API服务器
  start() {
    return new Promise((resolve, reject) => {
      try {
        // 检查服务器是否已经在运行
        if (this.server) {
          console.log('API server already running');
          resolve();
          return;
        }
        
        this.server = this.app.listen(this.port, () => {
          console.log(`Terminal API server running on port ${this.port}`);
          resolve();
        });
        
        // 错误处理
        this.server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.error(`Port ${this.port} is already in use. Please close other applications using this port.`);
          } else {
            console.error('API server error:', err);
          }
          reject(err);
        });
      } catch (error) {
        console.error('Failed to start API server:', error);
        reject(error);
      }
    });
  }
  
  // 停止API服务器
  stop() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        try {
          this.server.close(() => {
            console.log('API server stopped');
            this.server = null;
            resolve();
          });
        } catch (err) {
          console.error('Error closing API server:', err);
          this.server = null; // 重置服务器变量，即使出错
          reject(err);
        }
      } else {
        // 如果服务器不存在，直接解析
        resolve();
      }
    });
  }
}

module.exports = TerminalApiServer;