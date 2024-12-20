// server.js

const express = require('express');
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');
const PuppeteerController = require('./controllers/puppeteerController');
const { isURL } = require('validator'); // Import isURL from validator

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const USER_DATA_DIR = process.env.USER_DATA_DIR || './puppeteer_data';

const puppeteerController = new PuppeteerController({
    userDataDir: USER_DATA_DIR
});

// Initialize Puppeteer
puppeteerController.init().catch(error => {
    console.error('Failed to initialize Puppeteer:', error);
    process.exit(1);
});

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve screenshots statically
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

/**
 * @route POST /api/screenshot
 * @desc Receives a URL, processes it with Puppeteer, and returns the screenshot path
 * @access Public (Consider adding authentication for production)
 */
app.post('/api/screenshot', async (req, res) => {
    const { url } = req.body;

    // Basic URL validation using validator
    if (!url || typeof url !== 'string' || !isURL(url, { protocols: ['http','https'], require_protocol: true })) {
        return res.status(400).json({ success: false, message: 'Invalid URL provided.' });
    }

    try {
        // Additional URL validation can be added here
        const screenshotPath = await puppeteerController.takeScreenshot(url);
        return res.status(200).json({ success: true, screenshotUrl: screenshotPath });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Fallback route to serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('\nShutting down gracefully...');
    puppeteerController.close().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error during shutdown:', error);
        process.exit(1);
    });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
