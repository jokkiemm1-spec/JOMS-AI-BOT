const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Web page display for Render
app.get('/', (req, res) => res.send('<h1>JOMS AI BOT Server is Online! ⚡</h1>'));
app.listen(PORT, () => console.log('JOMS AI BOT server listening on port ' + PORT));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
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
