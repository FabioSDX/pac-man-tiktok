fetch('https://delifruit.com.br/?cache=888').then(r => r.text()).then(t => {
  if (t.includes('TEST_ROOT')) console.log('>>> TEST_ROOT FOUND');
  if (t.includes('TEST_FOLDER')) console.log('>>> TEST_FOLDER FOUND');
}).catch(console.error);
