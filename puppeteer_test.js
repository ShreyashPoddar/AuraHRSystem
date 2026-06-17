const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[Browser PageError] ${error.message}`);
  });
  
  // Log into the test page directly if possible, or we might get redirected
  await page.goto('http://localhost:3000/candidate/test/1', { waitUntil: 'networkidle2' });
  
  // Wait a bit to let models load
  await new Promise(r => setTimeout(r, 10000));
  
  await browser.close();
})();
