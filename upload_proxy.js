const ftp = require("basic-ftp");
const path = require("path");

async function run() {
    const client = new ftp.Client();
    try {
        console.log("Connecting...");
        await client.access({
            host: "ftp.marcenariadigital.com",
            user: "fabiojogos@delifruit.com.br",
            password: "97690784n@",
            secure: false
        });
        
        console.log("Uploading index.html...");
        await client.uploadFrom(path.join(__dirname, "index.html"), "index.html");
        
        console.log("Uploading js/app.js...");
        await client.cd("js");
        await client.uploadFrom(path.join(__dirname, "js", "app.js"), "app.js");
        
        console.log("Success uploading proxy fixes.");
    } catch(err) {
        console.error("FTP Error:", err.message);
    }
    client.close();
}
run();
