const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function run() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: "ftp.marcenariadigital.com",
            user: "fabiominhacasaminhavida@minhacasaminhavidasp.com",
            password: "97690784n@",
            secure: false
        });
        
        // 1. Download both index.html files
        console.log("Downloading ROOT index.html");
        await client.downloadTo("root_index.html", "index.html");
        
        console.log("Downloading delifruit.com.br/index.html");
        await client.cd("delifruit.com.br");
        await client.downloadTo("folder_index.html", "index.html");
        
        // 2. Modify both
        let rIdx = fs.readFileSync("root_index.html", "utf8");
        rIdx = rIdx.replace('</body>', '<!-- TEST_ROOT -->\n</body>');
        fs.writeFileSync("root_index.html", rIdx);
        
        let fIdx = fs.readFileSync("folder_index.html", "utf8");
        fIdx = fIdx.replace('</body>', '<!-- TEST_FOLDER -->\n</body>');
        fs.writeFileSync("folder_index.html", fIdx);
        
        // 3. Upload them back
        await client.uploadFrom("folder_index.html", "index.html");
        
        await client.cd("..");
        await client.uploadFrom("root_index.html", "index.html");
        
        console.log("Both files modified and uploaded. Fetching live URL...");
        
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const res = await fetch('https://delifruit.com.br/?cache=' + Date.now());
        const text = await res.text();
        
        if (text.includes('<!-- TEST_ROOT -->')) {
            console.log(">>>> THE LIVE SITE IS READING FROM THE ROOT FOLDER");
        }
        if (text.includes('<!-- TEST_FOLDER -->')) {
            console.log(">>>> THE LIVE SITE IS READING FROM THE delifruit.com.br SUBFOLDER");
        }
        
    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}
run();
