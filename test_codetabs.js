fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent('https://seventy-scoured-antivirus.ngrok-free.dev/video-list'), {
  headers: {
    'ngrok-skip-browser-warning': '69420'
  }
})
  .then(r => r.text())
  .then(t => console.log("Result:", t.substring(0, 100)))
  .catch(console.error);
