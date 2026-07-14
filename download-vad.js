const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, 'public', 'vad');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const files = [
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort.js',
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort-wasm.wasm',
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort-wasm-simd.wasm',
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort-wasm-simd-threaded.mjs',
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort-wasm-simd-threaded.wasm',
  'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/bundle.min.js',
  'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/vad.worklet.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/silero_vad_v5.onnx'
];

async function download() {
  for (const url of files) {
    const filename = path.basename(url);
    const dest = path.join(dir, filename);
    await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          https.get(res.headers.location, (res2) => {
            const file = fs.createWriteStream(dest);
            res2.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
          });
        } else {
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }
      }).on('error', reject);
    });
    console.log('Downloaded', filename);
  }
}
download();
