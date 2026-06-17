const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, 'public', 'vad');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const files = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd.mjs',
  'ort-wasm-simd.wasm',
  'ort-wasm-simd.jsep.wasm',
  'ort-wasm.mjs',
  'ort-wasm.wasm',
];

files.forEach(file => {
  const url = `https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/${file}`;
  const dest = path.join(dir, file);
  
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => console.log(`Downloaded ${file}`));
    } else {
      console.log(`Failed ${file} - ${res.statusCode}`);
    }
  });
});
