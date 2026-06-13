const fs = require('fs');
fetch('https://delifruit.com.br/?cache=' + Date.now()).then(r => r.text()).then(t => {
  fs.writeFileSync('dump.html', t);
  console.log("Dumped");
}).catch(console.error);
