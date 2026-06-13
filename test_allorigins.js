fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://seventy-scoured-antivirus.ngrok-free.dev/video-list'))
  .then(r => r.text())
  .then(t => console.log("Result:", t.substring(0, 100)))
  .catch(console.error);
