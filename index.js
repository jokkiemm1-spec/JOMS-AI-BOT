const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('<h1>JOMS AI BOT Server is Online! ⚡</h1>'));
app.listen(PORT, () => console.log('Server running on port ' + PORT));

// Completely wipe old corrupt session data on a fresh deploy
if (fs.existsSync('auth_info_baileys')) {
    console.log('[JOMS AI BOT] Cleaning session directory for a fresh attempt...');
    fs.rmSync('auth_info_baileys', { recursive: true, force: true });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }), 
        browser: ["Chrome", "macOS", "120.0.0.0"] // This sets the custom name on your phone
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[JOMS AI BOT] Connection dropped. Retrying in 10s...');
            if (shouldReconnect) {
                setTimeout(() => startBot(), 10000);
            }
        } else if (connection === 'open') {
            console.log('📶 [JOMS AI BOT] Connected successfully via Chrome (macOS)!');
        }
    });

    // Handle pairing message processing
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const from = msg.key.remoteJid;
        if (text.toLowerCase().trim() === '!ping') {
            await sock.sendMessage(from, { text: 'Pong! 🏓' });
        }
    });

    // CRITICAL: Force a massive delay so Render's network settles completely first
    if (!sock.authState.creds.registered) {
        if (global.pairingRequested) return;
        global.pairingRequested = true;

        console.log("[JOMS AI BOT] Waiting 30 seconds for server network to stabilize...");
        
        setTimeout(async () => {
            try {
                let phoneNumber = "2349036106257"; 
                console.log(`[JOMS AI BOT] Network stable. Requesting code for: ${phoneNumber}...`);
                
                let code = await sock.requestPairingCode(phoneNumber);
                
                console.log('\n====================================');
                console.log(`🤖 YOUR CHROME (macOS) PAIRING CODE: ${code}`);
                console.log('====================================\n');
            } catch (err) {
                console.log("[JOMS AI BOT] Pairing failed. Resetting state layer for retry...", err.message);
                global.pairingRequested = false;
            }
        }, 30000); // 30-second countdown
    }
}

startBot();
