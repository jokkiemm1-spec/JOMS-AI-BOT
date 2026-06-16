const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

let globalSock = null;
let isInitializing = false;

app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
            <h1 style="color: #333;">JOMS AI BOT Cloud Console ⚡</h1>
            <p style="color: #666; font-size: 16px;">The connection engine is fixed. Click below to generate your pairing code.</p>
            <a href="/pair" style="display: inline-block; background: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px; margin-top: 20px;">👉 GENERATE WHATSAPP PAIRING CODE 👈</a>
        </div>
    `);
});

app.get('/pair', async (req, res) => {
    if (!globalSock) {
        if (!isInitializing) {
            console.log('[SYSTEM] On-demand initialization triggered via web route.');
            await startBot();
        }
        return res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                <h2>Bypassing Handshake Protocols...</h2>
                <p>Establishing secure socket connection to WhatsApp servers. This takes 8 seconds.</p>
                <script>setTimeout(() => { window.location.reload(); }, 8000);</script>
            </div>
        `);
    }
    
    try {
        let phoneNumber = "2349036106257"; 
        console.log(`[WEB ENGINE] Requesting verified code for: ${phoneNumber}`);
        
        let code = await globalSock.requestPairingCode(phoneNumber);

        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; border: 2px dashed #25D366; display: inline-block; padding: 30px; border-radius: 10px; width: 80%; max-width: 500px;">
                <h1 style="color: #25D366; margin-bottom: 5px;">CODE GENERATED</h1>
                <p style="color: #777; margin-top: 0;">Status: Secure Web Session Active</p>
                <div style="font-size: 44px; font-weight: bold; letter-spacing: 6px; margin: 25px 0; background: #f4f4f4; padding: 15px; border-radius: 8px; color: #222; border: 1px solid #ddd;">
                    ${code}
                </div>
                <p style="font-size: 15px; color: #555; text-align: left; line-height: 1.6;">
                    1. Open WhatsApp on your phone.<br>
                    2. Go to <b>Linked Devices</b> -> <b>Link a Device</b>.<br>
                    3. Tap <b>"Link with phone number instead"</b>.<br>
                    4. Enter your phone number, then input the code shown above.
                </p>
                <br>
                <a href="/" style="color: #666; text-decoration: none; font-size: 14px;">← Reset Console</a>
            </div>
        `);
    } catch (err) {
        console.log("[ERROR] Request pairing execution failure:", err.message);
        globalSock = null; 
        isInitializing = false;
        res.send(`<h2>Handshake Collision.</h2><p>WhatsApp rejected the request entry. <a href="/pair">Click here to retry fresh</a></p>`);
    }
});

async function startBot() {
    isInitializing = true;
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        
        // CRITICAL FIX: Explicitly forcing the updated web version array to stop the 405 error
        version: [2, 3000, 1015190524], 
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    globalSock = sock; 
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`[JOMS AI BOT] Connection dropped (Status: ${statusCode}). Processing reconnect sequence...`);
            
            if (shouldReconnect) {
                if (!sock.authState.creds.registered) {
                    globalSock = null;
                    isInitializing = false;
                } else {
                    setTimeout(() => startBot(), 5000);
                }
            }
        } else if (connection === 'open') {
            console.log('📶 [JOMS AI BOT] Online status confirmed. Device linked successfully!');
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

app.listen(PORT, () => console.log('HTTP core web service live on network port ' + PORT));
