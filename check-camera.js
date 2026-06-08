const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`[Browser PageError] ${err}`);
  });

  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('/api/moodle')) {
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            title: 'Test Assessment',
            duration_minutes: 60,
            questions: [{ id: 1, text: 'Q1', type: 'mcq', options: ['A', 'B'] }]
          }
        })
      });
    } else {
      request.continue();
    }
  });

  console.log('Navigating to candidate page...');
  await page.goto('http://localhost:3000/candidate/test/1', { waitUntil: 'networkidle2' });
  
  console.log('Clicking check box...');
  try {
    await page.click('input[type="checkbox"]');
    await page.click('button:has-text("Start Assessment")');
  } catch(e) {
    console.log('Failed to click start:', e.message);
  }

  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
})();
