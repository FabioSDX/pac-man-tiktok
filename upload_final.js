const ftp = require("basic-ftp");
const path = require("path");

async function run() {
    const client = new ftp.Client();
    try {
        console.log("Connecting...");
        await client.access({
            host: "ftp.marcenariadigital.com",
            user: "fallingpickaxe.com@fallingpickaxe.com",
            password: "97690784n@",
            secure: false
        });
        console.log("Connected successfully to correct FTP!");
        
        console.log("Uploading index.html to ROOT...");
        await client.uploadFrom(path.join(__dirname, "index.html"), "index.html");
        
        console.log("Uploading admin.html to ROOT...");
        await client.uploadFrom(path.join(__dirname, "admin.html"), "admin.html");
        
        console.log("Uploading config.html to ROOT...");
        await client.uploadFrom(path.join(__dirname, "config.html"), "config.html");
        
        console.log("Uploading home.html to ROOT...");
        await client.uploadFrom(path.join(__dirname, "home.html"), "home.html");
        
        console.log("Changing to css dir...");
        await client.ensureDir("css");
        console.log("Uploading home.css to css/...");
        await client.uploadFrom(path.join(__dirname, "css", "home.css"), "home.css");
        await client.cd("/");
        
        console.log("Changing to js dir...");
        await client.cd("js");
        
        console.log("Uploading app.js to js/...");
        await client.uploadFrom(path.join(__dirname, "js", "app.js"), "app.js");
        
        console.log("Uploading home.js to js/...");
        await client.uploadFrom(path.join(__dirname, "js", "home.js"), "home.js");
        
        console.log("ALL FILES UPLOADED TO THE CORRECT DIRECTORY.");
    } catch(err) {
        console.error("FTP Error:", err.message);
    }
    client.close();
}
run();
