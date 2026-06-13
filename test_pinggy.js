const { spawn } = require('child_process');

console.log("Testing pinggy tunnel...");
const ssh = spawn('ssh', ['-p', '443', '-R0:localhost:3000', 'a.pinggy.io', '-o', 'StrictHostKeyChecking=no']);

ssh.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ssh.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

setTimeout(() => {
    ssh.kill();
    console.log("Test finished.");
}, 15000);
