const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('<h1>JOMS AI BOT Server is Online! ⚡</h1>'));
app.listen(PORT, () => console.log('Server running...'));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop') 
    });

    sock.ev.on('creds.update', saveCreds);

    // Track connection state dynamically instead of using a blind timer
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[JOMS AI BOT] Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) startBot(); // Auto-restart if dropped
        } 
        
        else if (connection === 'open') {
            console.log('📶 [JOMS AI BOT] Secure connection established with WhatsApp servers!');
            
            // Trigger pairing code ONLY when the socket connection is 100% active and stable
            if (!sock.authState.creds.registered) {
                try {
                    let phoneNumber = "2349036106257"; 
                    console.log(`[JOMS AI BOT] Requesting pairing code for stable line: ${phoneNumber}...`);
                    
                    // Small 3-second delay on an open connection ensures complete handshake stability
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    let code = await sock.requestPairingCode(phoneNumber);
                    
                    console.log('\n====================================');
                    console.log(`🤖 JOMS AI BOT PAIRING CODE: ${code}`);
                    console.log('====================================\n');
                } catch (err) {
                    console.log("[JOMS AI BOT] Pairing attempt failed: ", err.message || err);
                }
            }
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const from = msg.key.remoteJid;

        if (text.toLowerCase().trim() === '!ping') {
            await sock.sendMessage(from, { text: 'Pong! 🏓\n_JOMS AI BOT is running fast!_' });
        } else if (text.toLowerCase().trim() === '!hello') {
            await sock.sendMessage(from, { text: 'Hello! I am *JOMS AI BOT* 🤖, your automated assistant.' });
        }
    });
}

startBot();
