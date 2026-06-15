const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('<h1>JOMS AI BOT Server is Online! ⚡</h1>'));
app.listen(PORT, () => console.log('JOMS AI BOT server listening on port ' + PORT));

// Automatically locate the local Chrome installed by Puppeteer on Render
let chromePath = undefined;
try {
    const baseCachePath = path.join('/opt/render/.cache/puppeteer/chrome');
    if (fs.existsSync(baseCachePath)) {
        const folders = fs.readdirSync(baseCachePath);
        if (folders.length > 0) {
            const linuxFolder = path.join(baseCachePath, folders[0], 'chrome-linux64');
            if (fs.existsSync(linuxFolder)) {
                chromePath = path.join(linuxFolder, 'chrome');
                console.log('Found local Chrome binary at:', chromePath);
            }
        }
    }
} catch (e) {
    console.log('Error locating Chrome cache, attempting auto-resolve...');
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: chromePath, // Uses detected local build path if found
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-extensions',
            '--no-first-run',
            '--no-zygote'
        ] 
    }
});

// Pairing code engine
client.on('qr', async () => {
    try {
        const phoneNumber = '2349036106257'; 
        console.log(`[JOMS AI BOT] Requesting pairing code for ${phoneNumber}...`);
        const code = await client.requestPairingCode(phoneNumber);
        
        console.log('\n====================================');
        console.log(`🤖 JOMS AI BOT PAIRING CODE: ${code}`);
        console.log('====================================\n');
    } catch (err) {
        console.error('[JOMS AI BOT] Pairing error:', err);
    }
});

client.on('ready', () => {
    console.log('🤖 JOMS AI BOT is authenticated and online!');
});

// --- CUSTOM INTERACTIONS ---
client.on('message', async (msg) => {
    const command = msg.body.toLowerCase().trim();
    
    // Command 1: Ping
    if (command === '!ping') {
        await msg.reply('Pong! 🏓\n_JOMS AI BOT is running fast!_');
    } 
    
    // Command 2: Hello / Info
    else if (command === '!hello' || command === '!about') {
        await msg.reply('Hello! I am *JOMS AI BOT* 🤖, your automated assistant. How can I help you today?');
    }
});

client.initialize();
