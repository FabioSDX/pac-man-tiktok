const ftp = require("basic-ftp");

async function run() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: "ftp.marcenariadigital.com",
            user: "fabiominhacasaminhavida@minhacasaminhavidasp.com",
            password: "97690784n@",
            secure: false
        });
        const list = await client.list();
        console.log("Root files:", list.map(f => f.name));
        
        await client.cd("delifruit.com.br");
        const list2 = await client.list();
        console.log("Inside delifruit.com.br:", list2.map(f => f.name));
        
    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}
run();
