const { spawn } = require('child_process');

console.log("Starting localtunnel...");
const lt = spawn('npx.cmd', ['localtunnel', '--port', '3000', '--subdomain', 'fabiotest99']);

lt.stdout.on('data', (data) => {
  console.log(`lt stdout: ${data}`);
  if (data.toString().includes('your url is')) {
     console.log("Testing OPTIONS request...");
     fetch('https://fabiotest99.loca.lt/video-list', {
         method: 'OPTIONS',
         headers: {
             'Access-Control-Request-Method': 'GET',
             'Access-Control-Request-Headers': 'bypass-tunnel-reminder',
             'Origin': 'https://delifruit.com.br'
         }
     }).then(r => {
         console.log("OPTIONS STATUS:", r.status);
         console.log("Allow-Headers:", r.headers.get('Access-Control-Allow-Headers'));
         lt.kill();
     }).catch(e => {
         console.error("OPTIONS ERROR:", e);
         lt.kill();
     });
  }
});

lt.stderr.on('data', (data) => {
  console.log(`lt stderr: ${data}`);
});
