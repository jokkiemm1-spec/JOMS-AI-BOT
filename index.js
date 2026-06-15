const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('<h1>JOMS AI BOT Server is Online! ⚡</h1>'));
app.listen(PORT, () => console.log('Server running on port ' + PORT));

// FORCE CLEAN ACCUMULATED DATA CORRUPTION ON BOOT
if (fs.existsSync('auth_info_baileys')) {
    console.log('[JOMS AI BOT] Purging stale session cache for a clean link layer...');
    fs.rmSync('auth_info_baileys', { recursive: true, force: true });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.0.4"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[JOMS AI BOT] Socket closed. Spinning up reconnect frame...', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(() => startBot(), 5000);
            }
        } 
        
        else if (connection === 'open') {
            console.log('📶 [JOMS AI BOT] Secure connection established with WhatsApp servers!');
        }
    });

    // Request fresh pairing layer independently
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let phoneNumber = "2349036106257"; 
                console.log(`[JOMS AI BOT] Requesting pairing code for stable line: ${phoneNumber}...`);
                
                let code = await sock.requestPairingCode(phoneNumber);
                
                console.log('\n====================================');
                console.log(`🤖 JOMS AI BOT PAIRING CODE: ${code}`);
                console.log('====================================\n');
            } catch (err) {
                console.log("[JOMS AI BOT] Pairing channel busy, waiting for next cycle...");
            }
        }, 15000); 
    }

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const from = msg.key.remoteJid;

        if (text.toLowerCase().trim() === '!ping') {
            await sock.sendMessage(from, { text: 'Pong! 🏓' });
        } else if (text.toLowerCase().trim() === '!hello') {
            await sock.sendMessage(from, { text: 'Hello! I am *JOMS AI BOT* 🤖' });
        }
    });
}

startBot();
