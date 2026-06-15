const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('<h1>JOMS AI BOT Server is Online! ⚡</h1>'));
app.listen(PORT, () => console.log('Server running on port ' + PORT));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        // CHANGED: Using the mobile device protocol bypasses browser fingerprint firewalls
        browser: ["Ubuntu", "Chrome", "20.0.0.4"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[JOMS AI BOT] Connection closed. Retrying link layer...', shouldReconnect);
            if (shouldReconnect) {
                // Short wait before rebuilding socket frame
                setTimeout(() => startBot(), 5000);
            }
        } 
        
        else if (connection === 'open') {
            console.log('📶 [JOMS AI BOT] Secure connection established with WhatsApp servers!');
        }
    });

    // Request pairing layer independently to let core connections sync first
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let phoneNumber = "2349036106257"; 
                console.log(`[JOMS AI BOT] Dispatched clean connection code request for: ${phoneNumber}`);
                
                let code = await sock.requestPairingCode(phoneNumber);
                
                console.log('\n====================================');
                console.log(`🤖 JOMS AI BOT PAIRING CODE: ${code}`);
                console.log('====================================\n');
            } catch (err) {
                console.log("[JOMS AI BOT] Request paused by server. Retrying next cycle...");
            }
        }, 20000); // 20-second breathing room for cloud environments
    }

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const from = msg.key.remoteJid;

        if (text.toLowerCase().trim() === '!ping') {
            await sock.sendMessage(from, { text: 'Pong! 🏓\n_JOMS AI BOT is running fast!_' });
        } else if (text.toLowerCase().trim() === '!hello') {
            await sock.sendMessage(from, { text: 'Hello! I am *JOMS AI BOT* 🤖' });
        }
    });
}

startBot();
