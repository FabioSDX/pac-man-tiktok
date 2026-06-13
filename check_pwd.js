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
        const pwd = await client.pwd();
        console.log("Current FTP Dir:", pwd);
    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}
run();
