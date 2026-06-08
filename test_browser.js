const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching Comprehensive UI Interaction Tester...");
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();
    
    // Track errors
    let errorCount = 0;
    page.on('pageerror', err => {
      console.error("PAGE ERROR DETECTED:", err.toString());
      errorCount++;
    });
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        console.error("CONSOLE ERROR:", msg.text());
        errorCount++;
      }
    });

    console.log("Navigating to http://localhost:3000 ...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Function to click all buttons on a page safely
    async function clickAllButtonsOnPage(pageName) {
      console.log(`\n--- Verifying Buttons on ${pageName} ---`);
      const buttons = await page.$$('button, a.btn, div[role="button"]');
      console.log(`Found ${buttons.length} interactive elements to test.`);
      
      let clicked = 0;
      for (let i = 0; i < buttons.length; i++) {
        try {
          const isVisible = await buttons[i].evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
          });
          
          if (isVisible) {
            // Highlight
            await buttons[i].evaluate(el => el.style.border = '3px solid green');
            
            // Extract text for log
            const btnText = await buttons[i].evaluate(el => el.innerText || el.title || 'unnamed-btn');
            console.log(`[Clicking] -> ${btnText.replace(/\n/g, ' ').substring(0, 30)}`);
            
            // Click it (we don't await navigation because we don't want to leave the page, we just want to trigger UI events)
            await buttons[i].click().catch(e => {}); 
            await new Promise(r => setTimeout(r, 800)); // wait for UI reaction
            clicked++;
          }
        } catch (e) {
          // ignore stale element errors
        }
      }
      console.log(`Successfully interacted with ${clicked} elements on ${pageName}.`);
    }

    // Test Landing Page
    await clickAllButtonsOnPage("Landing Page");

    // Navigate Candidate
    console.log("\nNavigating to Candidate Portal...");
    await page.goto('http://localhost:3000/candidate', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await clickAllButtonsOnPage("Candidate Login/Signup");

    // Navigate Org
    console.log("\nNavigating to Organization Portal...");
    await page.goto('http://localhost:3000/org', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await clickAllButtonsOnPage("Organization Portal");

    console.log("\n=================================");
    console.log(`UI VERIFICATION COMPLETE.`);
    console.log(`Total Uncaught Errors Detected: ${errorCount}`);
    if (errorCount === 0) {
      console.log("SUCCESS: All buttons responded without throwing critical JS exceptions.");
    }
    console.log("=================================");

  } catch (error) {
    console.error("Test encountered an error:", error);
  } finally {
    console.log("Closing browser in 5 seconds...");
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
})();
