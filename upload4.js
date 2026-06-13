const ftp = require("basic-ftp");
const path = require("path");

async function run() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: "ftp.marcenariadigital.com",
            user: "fabiominhacasaminhavida@minhacasaminhavidasp.com",
            password: "97690784n@",
            secure: false
        });
        await client.cd("delifruit.com.br");
        await client.uploadFrom(path.join(__dirname, "index.html"), "index.html");
        console.log("Success index.html");
    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}
run();
