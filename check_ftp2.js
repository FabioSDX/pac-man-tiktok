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
        console.log("Connected to FTP successfully with previous password.");
        const list = await client.list();
        console.log("Files in root:");
        list.forEach(f => console.log(f.name + (f.isDirectory ? " (DIR)" : " (FILE)")));
    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}
run();
