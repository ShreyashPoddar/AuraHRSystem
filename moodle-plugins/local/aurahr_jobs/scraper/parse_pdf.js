const fs = require('fs');
const pdf = require('pdf-parse');

const filePath = process.argv[2];

if (!filePath || !fs.existsSync(filePath)) {
    console.error('Invalid or missing file path.');
    process.exit(1);
}

let dataBuffer = fs.readFileSync(filePath);

pdf(dataBuffer).then(function(data) {
    // text is the extracted text
    let cleanText = data.text.replace(/\s+/g, ' ').trim();
    console.log(cleanText);
}).catch(function(error) {
    console.error('PDF Parsing Error:', error.message);
});
