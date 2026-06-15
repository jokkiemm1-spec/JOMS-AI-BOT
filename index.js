const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('<h1>JOMS AI BOT Server is Online! ⚡</h1>'));
app.listen(PORT, () => console.log('Server running...'));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // We will use pairing code instead
    });

    sock.ev.on('creds.update', saveCreds);

    // Request Pairing Code automatically on boot if not linked
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode("2349036106257");
                console.log('\n====================================');
                console.log(`🤖 JOMS AI BOT PAIRING CODE: ${code}`);
                console.log('====================================\n');
            } catch (err) {
                console.log("Error generating pairing code: ", err);
            }
        }, 5000); // Wait 5 seconds for initialization
    }

    // Handle Messages
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const from = msg.key.remoteJid;

        if (text.toLowerCase().trim() === '!ping') {
            await sock.sendMessage(from, { text: 'Pong! 🏓\n_JOMS AI BOT is running fast without Chrome!_' });
        } else if (text.toLowerCase().trim() === '!hello') {
            await sock.sendMessage(from, { text: 'Hello! I am *JOMS AI BOT* 🤖' });
        }
    });
}

startBot();
