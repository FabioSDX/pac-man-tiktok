const dns = require('dns');
dns.lookup('ftp.marcenariadigital.com', (err, address, family) => {
  console.log('ftp.marcenariadigital.com ->', address);
});
dns.lookup('delifruit.com.br', (err, address, family) => {
  console.log('delifruit.com.br ->', address);
});
