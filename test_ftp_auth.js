const ftp = require("basic-ftp");

async function test(user, host) {
    const client = new ftp.Client();
    try {
        console.log(`Testing user: ${user} on host: ${host}`);
        await client.access({
            host: host,
            user: user,
            password: "97690784n@",
            secure: false
        });
        console.log(`SUCCESS with ${user}`);
        await client.cd("fallingpickaxe.com").catch(e => console.log("fallingpickaxe.com not found directly"));
        console.log("Current path:", await client.pwd());
    } catch(err) {
        console.error(`FAILED with ${user}: ${err.message}`);
    }
    client.close();
}

async function runAll() {
    await test("fabios57", "ftp.marcenariadigital.com");
    await test("fabios57", "fallingpickaxe.com");
    await test("delifruit@marcenariadigital.com", "fallingpickaxe.com");
}

runAll();
