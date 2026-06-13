const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");

const IGNORE = [
    'node_modules', '.git', '.vscode', '.kilo',
    'realesrgan-ncnn-vulkan-v0.2.0-windows', 'temp_upscale', 'scratch',
    'upload.js', 'upload2.js', 'check_ftp.js', 'check_ftp2.js', 'verify_ftp.js',
    'package-lock.json', '.env', 'server_output.log',
    'index.html.backup_before_refactor', 'index.html.bak', 'index.html.bak2',
    'server.js.recover_bak', 'Nova pasta', 'upscaler', '.env.example'
];

async function run() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        await client.access({
            host: "ftp.marcenariadigital.com",
            user: "fabiominhacasaminhavida@minhacasaminhavidasp.com",
            password: "97690784n@",
            secure: false
        });
        console.log("Connected to FTP.");
        
        const initialPwd = await client.pwd();
        console.log("Initial PWD:", initialPwd);

        // Ensure target folder exists
        await client.ensureDir("delifruit.com.br");
        await client.cd(initialPwd);

        const filesToUpload = [];
        function traverse(dir, remoteBase) {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                if (IGNORE.includes(item) && dir === __dirname) continue;
                if (item === '.git' || item === 'node_modules') continue;

                const fullLocal = path.join(dir, item);
                const stat = fs.statSync(fullLocal);
                const fullRemote = remoteBase ? remoteBase + "/" + item : "delifruit.com.br/" + item;
                
                if (stat.isDirectory()) {
                    traverse(fullLocal, fullRemote);
                } else {
                    filesToUpload.push({ local: fullLocal, remote: fullRemote });
                }
            }
        }
        traverse(__dirname, "");
        console.log("Total files to upload:", filesToUpload.length);

        const createdDirs = new Set();
        createdDirs.add("delifruit.com.br");

        let i = 0;
        for (const file of filesToUpload) {
            i++;
            const remoteDir = path.dirname(file.remote).replace(/\\/g, '/');
            if (remoteDir !== '.' && !createdDirs.has(remoteDir)) {
                await client.cd(initialPwd);
                await client.ensureDir(remoteDir);
                await client.cd(initialPwd);
                createdDirs.add(remoteDir);
            }
            await client.cd(initialPwd);
            if (i % 20 === 0) console.log(`Uploading ${i}/${filesToUpload.length}: ${file.remote}`);
            await client.uploadFrom(file.local, file.remote);
        }
        console.log("Upload finished successfully!");
    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}
run();
