const { spawn } = require('child_process');

console.log("Starting localtunnel...");
const lt = spawn('npx.cmd', ['localtunnel', '--port', '3000', '--subdomain', 'fabiojogos999']);

lt.stdout.on('data', (data) => {
  console.log(`lt stdout: ${data}`);
  if (data.toString().includes('your url is')) {
     console.log("Testing GET request WITHOUT custom headers...");
     fetch('https://fabiojogos999.loca.lt/video-list').then(r => r.text()).then(t => {
         console.log("GET STATUS:", t.substring(0, 100));
         lt.kill();
     }).catch(e => {
         console.error("GET ERROR:", e);
         lt.kill();
     });
  }
});
