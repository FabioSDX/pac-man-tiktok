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
        console.log("Connected successfully to FTP!");
        
        console.log("Uploading proxy.php to ROOT...");
        await client.uploadFrom(path.join(__dirname, "proxy.php"), "proxy.php");

        console.log("Uploading index.html to ROOT...");
        await client.uploadFrom(path.join(__dirname, "index.html"), "index.html");
        
        console.log("Uploading admin.html to ROOT...");
        await client.uploadFrom(path.join(__dirname, "admin.html"), "admin.html");
        
        console.log("Changing to js dir...");
        await client.cd("js");
        
        console.log("Uploading app.js to js/...");
        await client.uploadFrom(path.join(__dirname, "js", "app.js"), "app.js");
        
        console.log("ALL FILES UPLOADED!");
    } catch(err) {
        console.error("FTP Error:", err.message);
    }
    client.close();
}
run();
