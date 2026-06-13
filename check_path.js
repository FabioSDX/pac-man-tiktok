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
        await client.cd("/home2/fabios57/delifruit.com.br");
        const list = await client.list();
        console.log("Found path! Contents:", list.map(f => f.name));
    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}
run();
