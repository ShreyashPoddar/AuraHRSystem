const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const filePath = process.argv[2];

if (!filePath || !fs.existsSync(filePath)) {
    console.error('Invalid or missing file path.');
    process.exit(1);
}

let dataBuffer = fs.readFileSync(filePath);
let uint8 = new Uint8Array(dataBuffer);

const fontPath = path.join(__dirname, 'node_modules/pdfjs-dist/standard_fonts/').replace(/\\/g, '/');
const cMapPath = path.join(__dirname, 'node_modules/pdfjs-dist/cmaps/').replace(/\\/g, '/');

const parser = new PDFParse({
    data: uint8,
    standardFontDataUrl: fontPath,
    cMapUrl: cMapPath,
    cMapPacked: true
});
parser.getText().then(function(data) {
    // text is the extracted text
    let cleanText = data.text.replace(/\s+/g, ' ').trim();
    console.log(cleanText);
}).catch(function(error) {
    console.error('PDF Parsing Error:', error.message);
});
