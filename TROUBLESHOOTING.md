# 故障排除指南

这个文档提供了关于可能遇到的常见问题及其解决方法的指导。

## 原生模块编译问题

### 问题: `node-pty` 模块编译错误

如果在启动应用时遇到以下错误：

```
Error: The module '/path/to/node-pty/build/Release/pty.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION XXX. This version of Node.js requires
NODE_MODULE_VERSION YYY.
```

这意味着原生模块 `node-pty` 需要为当前的 Electron 版本重新编译。

### 解决方案:

1. **使用预编译的多架构版本**:
   
   我