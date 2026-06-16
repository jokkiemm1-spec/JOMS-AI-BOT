const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

let globalSock = null;

app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h1>JOMS AI BOT Server Status: ONLINE ⚡</h1>
            <p>To generate your pairing code, tap the button below:</p>
            <a href="/pair" style="display: inline-block; background: #25D366; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">👉 REQUEST PAIRING CODE 👈</a>
        </div>
    `);
});

app.get('/pair', async (req, res) => {
    if (!globalSock) {
        return res.send("<h2>Server is booting up. Refresh this page in 5 seconds...</h2>");
    }
    
    try {
        let phoneNumber = "2349036106257"; 
        console.log(`[WEB DIRECT] Requesting code for: ${phoneNumber}`);
        
        let code = await globalSock.requestPairingCode(phoneNumber);

        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; border: 2px dashed #25D366; display: inline-block; padding: 30px; margin-left: auto; margin-right: auto; width: 80%;">
                <h1 style="color: #25D366;">🤖 PAIRING CODE GENERATED</h1>
                <div style="font-size: 48px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; background: #f3f3f3; padding: 10px; border-radius: 5px; color: #333;">
                    ${code}
                </div>
                <p style="font-size: 16px; color: #666;">
                    1. Open WhatsApp on your phone.<br>
                    2. Go to Linked Devices -> Link a Device.<br>
                    3. Tap <b>"Link with phone number instead"</b>.<br>
                    4. Enter your phone number, then type the code above.
                </p>
                <a href="/" style="color: #666; text-decoration: none;">← Back to Home</a>
            </div>
        `);
    } catch (err) {
        res.send(`<h2>Pairing Execution Failed: ${err.message}</h2><p>Refresh this page to try again.</p>`);
    }
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        
        // FIXED LINE: Switched to a standardized Linux profile to stop the silent handshake rejection
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    globalSock = sock; 
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[JOMS AI BOT] Connection closed. Reconnecting...');
            if (shouldReconnect) {
                setTimeout(() => startBot(), 5000);
            }
        } else if (connection === 'open') {
            console.log('📶 [JOMS AI BOT] Online and connected successfully!');
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
