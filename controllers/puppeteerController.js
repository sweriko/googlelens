// controllers/puppeteerController.js

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Use the stealth plugin to evade detection
puppeteer.use(StealthPlugin());

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

            // Set a common user-agent to mimic a real browser
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

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
            
            // Set the viewport to desired dimensions
            await newPage.setViewport({ width: 1920, height: 1080 });

            // Set user-agent to mimic real browser
            await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

            await newPage.goto(url, { waitUntil: 'networkidle2' });

            // Wait for 3 seconds to ensure the page loads completely
            const delay = 3000; // 3 seconds
            if (typeof newPage.waitForTimeout === 'function') {
                await newPage.waitForTimeout(delay);
            } else {
                // Fallback for older Puppeteer versions
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Take a screenshot of the viewport only
            const screenshotBuffer = await newPage.screenshot({ fullPage: false });

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
            console.error(`Error taking screenshot for URL ${url}:`, error);
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
