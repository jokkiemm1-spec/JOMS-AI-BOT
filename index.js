const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

let globalSock = null;
let isInitializing = false;

// Web Server UI Layout
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
            <h1 style="color: #333;">JOMS AI BOT Cloud Console ⚡</h1>
            <p style="color: #666; font-size: 16px;">The server is ready. Click below to initialize the link stream and fetch your code.</p>
            <a href="/pair" style="display: inline-block; background: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">👉 GENERATE WHATSAPP PAIRING CODE 👈</a>
        </div>
    `);
});

app.get('/pair', async (req, res) => {
    // If connection isn't built yet, build it strictly on-demand
    if (!globalSock) {
        if (!isInitializing) {
            console.log('[SYSTEM] On-demand initialization triggered via web route.');
            await startBot();
        }
        return res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                <h2>Initializing WhatsApp handshake channel...</h2>
                <p>Render is establishing a secure line. This takes about 8 seconds.</p>
                <script>setTimeout(() => { window.location.reload(); }, 8000);</script>
            </div>
        `);
    }
    
    try {
        let phoneNumber = "2349036106257"; 
        console.log(`[WEB ENGINE] Requesting active pairing sequence for: ${phoneNumber}`);
        
        let code = await globalSock.requestPairingCode(phoneNumber);

        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; border: 2px dashed #25D366; display: inline-block; padding: 30px; border-radius: 10px; width: 80%; max-width: 500px;">
                <h1 style="color: #25D366; margin-bottom: 5px;">CODE GENERATED</h1>
                <p style="color: #777; margin-top: 0;">Profile Platform: Ubuntu Linux / Chrome</p>
                <div style="font-size: 44px; font-weight: bold; letter-spacing: 6px; margin: 25px 0; background: #f4f4f4; padding: 15px; border-radius: 8px; color: #222; border: 1px solid #ddd;">
                    ${code}
                </div>
                <p style="font-size: 15px; color: #555; text-align: left; line-height: 1.6;">
                    1. Open WhatsApp on your phone.<br>
                    2. Go to <b>Linked Devices</b> -> <b>Link a Device</b>.<br>
                    3. Tap <b>"Link with phone number instead"</b> at the bottom.<br>
                    4. Enter your number, then input the 8-digit key shown above.
                </p>
                <br>
                <a href="/" style="color: #666; text-decoration: none; font-size: 14px;">← Reset Console</a>
            </div>
        `);
    } catch (err) {
        console.log("[ERROR] Request pairing route execution failure:", err.message);
        globalSock = null; // Reset state layer to allow a clean retry if it fails
        isInitializing = false;
        res.send(`<h2>Handshake Collision.</h2><p>WhatsApp closed the line too early. <a href="/pair">Click here to retry fresh</a></p>`);
    }
});

async function startBot() {
    isInitializing = true;
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    globalSock = sock; 
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`[JOMS AI BOT] Connection dropped (Status: ${statusCode}). Reconnecting logic parsed...`);
            
            if (shouldReconnect) {
                // If it crashes during pairing, reset pointers completely so the user can re-trigger from the browser
                if (!sock.authState.creds.registered) {
                    globalSock = null;
                    isInitializing = false;
                } else {
                    setTimeout(() => startBot(), 5000);
                }
            }
        } else if (connection === 'open') {
            console.log('📶 [JOMS AI BOT] Online status confirmed. Core modules operational.');
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

// Start only the web interface framework immediately on boot
app.listen(PORT, () => console.log('HTTP core web service live on network port ' + PORT));
