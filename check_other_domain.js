fetch('http://minhacasaminhavidasp.com/').then(r => r.text()).then(t => {
    console.log("minhacasaminhavidasp.com ROOT HTML snippet:");
    console.log(t.substring(0, 300));
    console.log("Includes TEST_ROOT:", t.includes("TEST_ROOT"));
}).catch(console.error);

fetch('http://minhacasaminhavidasp.com/delifruit.com.br/').then(r => r.text()).then(t => {
    console.log("minhacasaminhavidasp.com/delifruit.com.br/ HTML snippet:");
    console.log("Includes TEST_FOLDER:", t.includes("TEST_FOLDER"));
}).catch(console.error);
