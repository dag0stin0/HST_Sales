const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3333;
const ROOT = path.join(__dirname, '..');

const server = http.createServer((req, res) => {
  if (req.url === '/api/luma') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(path.join(__dirname, 'luma.json')));
  } else if (req.url === '/api/zaprite') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(path.join(__dirname, 'zaprite.json')));
  } else {
    const file = path.join(ROOT, 'public', 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(file));
  }
});

server.listen(PORT, () => {
  console.log(`Mock server → http://localhost:${PORT}`);
  console.log(`Edit mock/luma.json and mock/zaprite.json, then refresh.`);
});
