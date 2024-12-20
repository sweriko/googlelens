const puppeteer = require('puppeteer');
const EventEmitter = require('events');

class PuppeteerController extends EventEmitter {
    constructor(userDataDir) {
        super();
        this.userDataDir = userDataDir;
        this.browser = null;
        this.page = null;
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: false, // Run in headful mode
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

        // Check if logged in, if not, perform login
        const isLoggedIn = await this.checkLogin();
        if (!isLoggedIn) {
            await this.performLogin();
        }

        // Listen for 'screenshot' events
        this.on('screenshot', async (url, callback) => {
            try {
                const screenshot = await this.takeScreenshot(url);
                callback({ success: true, screenshot });
            } catch (error) {
                console.error('Error taking screenshot:', error);
                callback({ success: false, error: error.message });
            }
        });
    }

    async checkLogin() {
        try {
            await this.page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' });
            // Adjust selector based on Twitter's login state
            const loginButton = await this.page.$('a[href="/login"]');
            return !loginButton;
        } catch (error) {
            console.error('Error checking login:', error);
            return false;
        }
    }

    async performLogin() {
        // Replace with your actual login credentials
        const USERNAME = 'your_username';
        const PASSWORD = 'your_password';

        try {
            await this.page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });
            await this.page.type('input[name="session[username_or_email]"]', USERNAME, { delay: 50 });
            await this.page.type('input[name="session[password]"]', PASSWORD, { delay: 50 });
            await Promise.all([
                this.page.click('div[data-testid="LoginForm_Login_Button"]'),
                this.page.waitForNavigation({ waitUntil: 'networkidle2' })
            ]);
            console.log('Logged in successfully');
        } catch (error) {
            console.error('Error during login:', error);
        }
    }

    async takeScreenshot(url) {
        // Open the URL in a new tab
        const newPage = await this.browser.newPage();
        await newPage.goto(url, { waitUntil: 'networkidle2' });
        // Wait a few seconds
        await newPage.waitForTimeout(5000);
        // Take a full-page screenshot
        const screenshotBuffer = await newPage.screenshot({ fullPage: true });
        // Optionally, close the tab or keep it open
        // await newPage.close();
        return screenshotBuffer.toString('base64'); // Encode to base64 to send over JSON
    }

    async close() {
        await this.browser.close();
    }
}

module.exports = PuppeteerController;
