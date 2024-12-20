// controllers/puppeteerController.js

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PuppeteerController {
    constructor(options) {
        this.userDataDir = options.userDataDir;
        this.browser = null;
        this.page = null;
    }

    async init() {
        try {
            this.browser = await puppeteer.launch({
                headless: false, // Run in headful mode for manual login
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--start-maximized'
                ],
                userDataDir: this.userDataDir
            });

            const pages = await this.browser.pages();
            this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
            await this.page.setViewport({ width: 1920, height: 1080 });

            console.log('Puppeteer initialized. Please ensure you are logged into your X account.');
            console.log('If not logged in, please manually log in through the opened browser.');

            // Wait for manual login if not already logged in
            await this.waitForLogin();

        } catch (error) {
            console.error('Error initializing Puppeteer:', error);
            throw error;
        }
    }

    async waitForLogin(timeout = 60000) { // Wait up to 60 seconds for login
        try {
            console.log('Waiting for manual login...');
            await this.page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' });

            // Check if login is successful by looking for the home feed
            await this.page.waitForSelector('div[data-testid="primaryColumn"]', { timeout });

            console.log('Login detected. Ready to process URLs.');
        } catch (error) {
            console.error('Login was not detected within the timeout period.');
            throw new Error('Login required.');
        }
    }

    async takeScreenshot(url) {
        try {
            console.log(`Processing URL: ${url}`);

            // Open the URL in a new tab
            const newPage = await this.browser.newPage();
            await newPage.goto(url, { waitUntil: 'networkidle2' });

            // Wait for a few seconds to ensure the page loads completely
            await newPage.waitForTimeout(5000);

            // Take a full-page screenshot
            const screenshotBuffer = await newPage.screenshot({ fullPage: true });

            // Save the screenshot to the screenshots directory
            const screenshotsDir = path.join(__dirname, '..', 'screenshots');
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir);
            }

            const filename = `screenshot_${Date.now()}.png`;
            const filepath = path.join(screenshotsDir, filename);
            fs.writeFileSync(filepath, screenshotBuffer);
            console.log(`Screenshot saved as ${filename}`);

            // Close the tab
            await newPage.close();

            // Return the path to the saved screenshot
            return `/screenshots/${filename}`;
        } catch (error) {
            console.error('Error taking screenshot:', error);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('Browser closed.');
        }
    }
}

module.exports = PuppeteerController;
