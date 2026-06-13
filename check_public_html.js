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
        await client.cd("public_html");
        console.log("Success! cd public_html worked.");
        const list = await client.list();
        console.log("public_html contents:", list.map(f => f.name));
    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}
run();
