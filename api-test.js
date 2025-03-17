// 测试工具：验证终端API功能
const http = require('http');

// 发送API请求的辅助函数
function sendRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve(jsonResponse);
        } catch (error) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 测试健康检查
async function testHealth() {
  try {
    const response = await sendRequest('GET', '/api/health');
    console.log('Health check response:', response);
    return response.status === 'ok';
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}

// 测试发送命令
async function testSendCommand(command) {
  try {
    const response = await sendRequest('POST', '/api/input', { text: command });
    console.log('Send command response:', response);
    return response.success === true;
  } catch (error) {
    console.error('Send command failed:', error.message);
    return false;
  }
}

// 测试发送控制字符
async function testSendControl(control) {
  try {
    const response = await sendRequest('POST', '/api/input', { control });
    console.log('Send control response:', response);
    return response.success === true;
  } catch (error) {
    console.error('Send control failed:', error.message);
    return false;
  }
}

// 测试获取输出
async function testGetOutput(lines = null) {
  try {
    const path = lines ? `/api/output?lines=${lines}` : '/api/output';
    const response = await sendRequest('GET', path);
    console.log('Get output response:', response);
    return response;
  } catch (error) {
    console.error('Get output failed:', error.message);
    return null;
  }
}

// 运行所有测试
async function runTests() {
  console.log('开始测试终端API...');

  // 测试健康检查
  if (!(await testHealth())) {
    console.error('健康检查失败，API可能未启动');
    return;
  }

  // 测试发送命令
  console.log('\n发送 echo 命令...');
  if (!(await testSendCommand('echo "Testing Terminal API"\n'))) {
    console.error('发送命令失败');
    return;
  }

  // 等待终端处理命令
  await new Promise(resolve => setTimeout(resolve, 500));

  // 获取终端输出
  console.log('\n获取终端输出...');
  const output = await testGetOutput();
  if (!output) {
    console.error('获取输出失败');
    return;
  }

  // 测试发送超长命令
  console.log('\n发送超长文本...');
  const longText = 'echo "' + 'A'.repeat(1000) + '"\n';
  if (!(await testSendCommand(longText))) {
    console.error('发送超长文本失败');
    return;
  }

  // 等待终端处理命令
  await new Promise(resolve => setTimeout(resolve, 500));

  // 测试发送Ctrl+C
  console.log('\n发送 Ctrl+C...');
  if (!(await testSendControl('c'))) {
    console.error('发送控制字符失败');
    return;
  }

  console.log('\n所有测试完成!');
}

// 执行测试
runTests().catch(console.error);
