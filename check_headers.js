fetch('https://delifruit.com.br/').then(r => {
    console.log("Headers:");
    r.headers.forEach((v, k) => console.log(k, ":", v));
}).catch(console.error);
