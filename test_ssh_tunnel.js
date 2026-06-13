const { spawn } = require('child_process');

console.log("Testing ssh tunnel to localhost.run...");
const ssh = spawn('ssh', ['-R', '80:localhost:3000', 'localhost.run', '-o', 'StrictHostKeyChecking=no']);

ssh.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ssh.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

setTimeout(() => {
    ssh.kill();
    console.log("Test finished.");
}, 10000);
