const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log("Launching headed browser to save your sessions...");
    console.log("Please log in to LinkedIn and LeetCode in the browser window that opens.");
    console.log("Close the browser window when you are done logging in.");

    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: path.resolve(__dirname, 'session_data'),
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();
    
    // Open LinkedIn
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
    
    // Open LeetCode in another tab/window when they are ready
    const leetcodePage = await browser.newPage();
    await leetcodePage.goto('https://leetcode.com/accounts/login/', { waitUntil: 'networkidle2' });

    // Wait until browser is disconnected/closed by user
    browser.on('disconnected', () => {
        console.log("Browser closed. Session saved successfully in session_data/ folder!");
        process.exit(0);
    });
})();
