fetch('https://corsproxy.io/?https%3A%2F%2Fseventy-scoured-antivirus.ngrok-free.dev%2Fvideo-list')
  .then(r => r.text())
  .then(t => console.log("Result:", t.substring(0, 100)))
  .catch(console.error);
