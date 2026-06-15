const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');

// Helper to handle terminal input safely
const question = (text) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(text, (ans) => { rl.close(); resolve(ans); }));
};

async function startBot() {
    // Local folder to store your session keys permanently
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, 
        logger: pino({ level: 'silent' }),
        
        // This configuration makes it appear exactly as Chrome on macOS in your Linked Devices
        browser: ["Chrome", "macOS", "120.0.0.0"] 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') {
            console.log('\n📶 JOMS AI BOT is successfully connected and online! 🎉');
        }
        if (connection === 'close') {
            console.log('Connection dropped, reconnecting...');
            startBot();
        }
    });

    // Request the pairing code if not logged in
    if (!sock.authState.creds.registered) {
        console.log("=== JOMS AI BOT LOCAL PAIRING ===");
        
        let phoneNumber = await question('Enter your WhatsApp phone number (with country code, e.g., 2349036106257): ');
        phoneNumber = phoneNumber.replace(/[^0-9]/g, ''); // Clean up spacing/symbols

        if (!phoneNumber) {
            console.log('Invalid phone number. Restart the script and try again.');
            process.exit(0);
        }

        console.log(`\n[JOMS AI BOT] Contacting WhatsApp for pairing code...`);
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                
                console.log('\n====================================');
                console.log(`🤖 YOUR PAIRING CODE: ${code}`);
                console.log('====================================\n');
                console.log('Steps to link:');
                console.log('1. Open WhatsApp on your phone.');
                console.log('2. Go to Settings -> Linked Devices -> Link a Device.');
                console.log('3. Select "Link with phone number instead" at the bottom.');
                console.log('4. Enter the 8-digit code shown above.');
            } catch (err) {
                console.error('[JOMS AI BOT] Failed to generate code. Error details:', err.message);
            }
        }, 3000);
    }
}

startBot();
