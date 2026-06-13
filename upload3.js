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
        console.log("Connected to FTP.");
        await client.cd("delifruit.com.br");
        
        console.log("Uploading js/app.js...");
        await client.uploadFrom(path.join(__dirname, "js", "app.js"), "js/app.js");
        console.log("Uploading admin.html...");
        await client.uploadFrom(path.join(__dirname, "admin.html"), "admin.html");
        console.log("Uploading index.html...");
        await client.uploadFrom(path.join(__dirname, "index.html"), "index.html");
        console.log("Uploading config.html...");
        await client.uploadFrom(path.join(__dirname, "config.html"), "config.html");
        
        console.log("Success.");
    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}
run();
