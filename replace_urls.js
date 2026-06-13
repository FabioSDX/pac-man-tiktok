const fs = require('fs');

const DOMAIN = 'seventy-scoured-antivirus.ngrok-free.dev';
const API_BASE = 'https://' + DOMAIN;

// app.js
const appJsPath = 'js/app.js';
if (fs.existsSync(appJsPath)) {
    let content = fs.readFileSync(appJsPath, 'utf8');
    content = content.replace(/var wsHost = location\.host \|\| 'localhost:3000';/g, "var wsHost = '" + DOMAIN + "';");
    content = content.replace(/var protocol = location\.protocol === 'https:' \? 'wss:' : 'ws:';/g, "var protocol = 'wss:';");
    
    content = content.replace(/fetch\('\/video-list'\)/g, "fetch('" + API_BASE + "/video-list')");
    content = content.replace(/fetch\('\/music-list'\)/g, "fetch('" + API_BASE + "/music-list')");
    content = content.replace(/fetch\('\/save-ranking'/g, "fetch('" + API_BASE + "/save-ranking'");
    content = content.replace(/fetch\('\/messages-list'\)/g, "fetch('" + API_BASE + "/messages-list')");
    content = content.replace(/fetch\('\/avatar-list'\)/g, "fetch('" + API_BASE + "/avatar-list')");
    content = content.replace(/fetch\('\/api\/upscale/g, "fetch('" + API_BASE + "/api/upscale");
    content = content.replace(/fetch\('\/api\/animate-face/g, "fetch('" + API_BASE + "/api/animate-face");

    fs.writeFileSync(appJsPath, content);
    console.log("Updated app.js");
}

// admin.html
const adminHtmlPath = 'admin.html';
if (fs.existsSync(adminHtmlPath)) {
    let adminContent = fs.readFileSync(adminHtmlPath, 'utf8');
    adminContent = adminContent.replace(/\/api\/streamers\?password=/g, API_BASE + '/api/streamers?password=');
    fs.writeFileSync(adminHtmlPath, adminContent);
    console.log("Updated admin.html");
}

// Any other references in index.html or config.html?
['index.html', 'config.html'].forEach(file => {
    if (fs.existsSync(file)) {
        let text = fs.readFileSync(file, 'utf8');
        text = text.replace(/fetch\('\/avatar-list'\)/g, "fetch('" + API_BASE + "/avatar-list')");
        text = text.replace(/fetch\('\/video-list'\)/g, "fetch('" + API_BASE + "/video-list')");
        fs.writeFileSync(file, text);
        console.log("Updated " + file);
    }
});

console.log("Done replacing URLs.");
