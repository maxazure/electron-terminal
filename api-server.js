const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// 创建一个类来管理API服务器
class TerminalApiServer {
  constructor() {
    this.app = express();
    this.port = 3000;
    this.server = null;
    this.terminal = null;
    this.outputBuffer = [];
    this.maxBufferSize = 1000; // 最多保存1000行输出
    this.defaultOutputLines = 20; // 默认返回的行数
    
    // 配置Express
    this.app.use(cors());
    this.app.use(bodyParser.json({limit: '50mb'})); // 支持超长文本
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    
    // 设置API路由
    this.setupRoutes();
  }
  
  // 设置API路由
  setupRoutes() {
    // 健康检查
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', version: '1.0.0' });
    });
    
    // 获取终端输出
    this.app.get('/api/output', (req, res) => {
      // 解析请求参数，如果为空或者为0则使用默认行数
      let lines = parseInt(req.query.lines);
      if (isNaN(lines) || lines <= 0) {
        lines = this.defaultOutputLines;
      }
      
      // 获取最后N行数据
      const outputLines = this.outputBuffer.slice(-lines);
      
      // 返回数组形式的输出，每个元素是一行
      res.json({ 
        lines: outputLines
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
    // 将输出按行分割并添加到缓冲区
    const lines = data.toString().split(/\r?\n/);
    
    for (const line of lines) {
      if (line.length > 0) {  // 允许空白行，但过滤掉空字符串
        this.outputBuffer.push(line);
        
        // 保持缓冲区大小限制
        if (this.outputBuffer.length > this.maxBufferSize) {
          this.outputBuffer.shift();
        }
      }
    }
  }
  
  // 启动API服务器
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`Terminal API server running on port ${this.port}`);
          resolve();
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
        this.server.close((err) => {
          if (err) {
            console.error('Error closing API server:', err);
            reject(err);
          } else {
            console.log('API server stopped');
            this.server = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = TerminalApiServer;