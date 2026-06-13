const ftp = require("basic-ftp");

async function run() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: "ftp.marcenariadigital.com",
            user: "delifruit@marcenariadigital.com",
            password: "97690784n@",
            secure: false
        });
        console.log("Connected to FTP.");
        const list = await client.list();
        console.log("Files in root:");
        list.forEach(f => console.log(f.name + (f.isDirectory ? " (DIR)" : " (FILE)")));
    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}
run();
