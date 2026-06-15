const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('<h1>JOMS AI BOT Server is Online! ⚡</h1>'));
app.listen(PORT, () => console.log('Server running on port ' + PORT));

if (!fs.existsSync('auth_info_baileys/creds.json')) {
    if (fs.existsSync('auth_info_baileys')) {
        console.log('[JOMS AI BOT] Flushing corrupt auth directory structural frames...');
        fs.rmSync('auth_info_baileys', { recursive: true, force: true });
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        // REMOVED SILENT LOGGER: Let's see exactly what WhatsApp is telling us
        browser: ["Chrome", "macOS", "120.0.0.0"] 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[JOMS AI BOT] Socket closed. Spinning up reconnect frame...');
            if (shouldReconnect) {
                setTimeout(() => startBot(), 15000); // 15-second backoff to prevent spamming
            }
        } 
        
        else if (connection === 'open') {
            console.log('📶 [JOMS AI BOT] Secure connection established with WhatsApp servers!');
        }

        if (!sock.authState.creds.registered && !sock.authState.creds.me) {
            if (global.pairingRequested) return; 
            global.pairingRequested = true;

            // Increased to 25 seconds to completely clear Render's port probing phase
            console.log("[JOMS AI BOT] Connection cooling down... Code generation queued.");
            setTimeout(async () => {
                try {
                    let phoneNumber = "2349036106257"; 
                    console.log(`[JOMS AI BOT] Isolated line stable. Requesting code for: ${phoneNumber}...`);
                    
                    let code = await sock.requestPairingCode(phoneNumber);
                    
                    console.log('\n====================================');
                    console.log(`🤖 YOUR CHROME (macOS) PAIRING CODE: ${code}`);
                    console.log('====================================\n');
                } catch (err) {
                    console.log("[JOMS AI BOT] Pairing error caught:", err);
                    global.pairingRequested = false;
                }
            }, 25000); 
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const from = msg.key.remoteJid;

        if (text.toLowerCase().trim() === '!ping') {
            await sock.sendMessage(from, { text: 'Pong! 🏓' });
        }
    });
}

startBot();
