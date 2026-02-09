const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Configuration
const BOT_NAME = process.env.BOT_NAME || 'Mert Uncle Bot';
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to all routes
app.use(limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Global variables
let sock = null;
let qrCodeData = null;
let isConnected = false;
let connectionState = 'disconnected';
let isSending = false;
let isReconnecting = false;

// Logger
const logger = pino({ level: 'warn' });

// Initialize WhatsApp connection
async function connectToWhatsApp() {
    if (isReconnecting) {
        console.log('Already reconnecting...');
        return;
    }
    
    // Demo mode for testing
    if (DEMO_MODE) {
        console.log('Running in DEMO MODE');
        setTimeout(async () => {
            try {
                // Generate a sample QR code
                const demoQR = 'Demo QR Code - In production, scan this with WhatsApp';
                qrCodeData = await QRCode.toDataURL(demoQR);
                connectionState = 'qr';
                isConnected = false;
                io.emit('qr', qrCodeData);
                io.emit('connection-state', { state: connectionState, connected: isConnected });
                console.log('DEMO: QR Code generated and sent to client');
            } catch (err) {
                console.error('Error generating demo QR code:', err);
            }
        }, 2000);
        return;
    }
    
    isReconnecting = true;
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        sock = makeWASocket({
            auth: state,
            logger
        });

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                // Generate QR code as data URL
                try {
                    qrCodeData = await QRCode.toDataURL(qr);
                    connectionState = 'qr';
                    isConnected = false;
                    isReconnecting = false;
                    io.emit('qr', qrCodeData);
                    io.emit('connection-state', { state: connectionState, connected: isConnected });
                    console.log('QR Code generated and sent to client');
                } catch (err) {
                    console.error('Error generating QR code:', err);
                    io.emit('error', { message: 'Failed to generate QR code' });
                    isReconnecting = false;
                }
            }

            if (connection === 'close') {
                isReconnecting = false;
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log('Connection closed. Status Code:', statusCode, 'Reconnect:', shouldReconnect);
                console.log('Error:', lastDisconnect?.error);
                
                isConnected = false;
                connectionState = 'disconnected';
                io.emit('connection-state', { state: connectionState, connected: isConnected });
                
                if (shouldReconnect) {
                    setTimeout(() => connectToWhatsApp(), 5000);
                } else {
                    qrCodeData = null;
                    io.emit('logged-out', { message: 'You have been logged out' });
                }
            }

            if (connection === 'open') {
                console.log('WhatsApp connected successfully');
                isConnected = true;
                connectionState = 'connected';
                qrCodeData = null;
                isReconnecting = false;
                io.emit('connected', { message: 'WhatsApp connected successfully' });
                io.emit('connection-state', { state: connectionState, connected: isConnected });
            }
        });

        // Handle credentials update
        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('Error connecting to WhatsApp:', error);
        connectionState = 'error';
        isReconnecting = false;
        io.emit('error', { message: 'Failed to connect to WhatsApp' });
    }
}

// Validate phone number format
function validatePhoneNumber(number) {
    // Remove all non-numeric characters except '+'
    const cleaned = number.replace(/[^\d+]/g, '');
    
    // Extract the number without '+'
    const numericPart = cleaned.replace(/\+/g, '');
    
    // Check if we have at least 10 digits
    if (numericPart.length < 10) {
        return null;
    }
    
    // Return in WhatsApp format (without '+')
    return numericPart + '@s.whatsapp.net';
}

// Send messages function
async function sendMessages(targetNumber, messageCount, delayMs) {
    // Demo mode simulation
    if (DEMO_MODE) {
        console.log('DEMO MODE: Simulating message sending...');
        isSending = true;
        let successCount = 0;
        let errorCount = 0;

        try {
            for (let i = 1; i <= messageCount; i++) {
                try {
                    // Simulate sending delay
                    await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 500)));
                    
                    // Randomly simulate occasional errors for demonstration
                    if (Math.random() > 0.9) {
                        throw new Error('Demo: Simulated error');
                    }
                    
                    successCount++;
                    console.log(`DEMO: Message ${i}/${messageCount} sent successfully`);
                } catch (error) {
                    errorCount++;
                    console.error(`DEMO: Error sending message ${i}:`, error.message);
                    io.emit('message-error', {
                        messageNumber: i,
                        error: error.message
                    });
                }

                io.emit('message-progress', {
                    current: i,
                    total: messageCount,
                    success: successCount,
                    errors: errorCount
                });
            }

            return { success: successCount, errors: errorCount };
        } finally {
            isSending = false;
        }
    }
    
    if (!sock || !isConnected) {
        throw new Error('WhatsApp is not connected');
    }

    if (isSending) {
        throw new Error('Already sending messages');
    }

    const formattedNumber = validatePhoneNumber(targetNumber);
    if (!formattedNumber) {
        throw new Error('Invalid phone number format. Use format: +1234567890');
    }

    isSending = true;
    let successCount = 0;
    let errorCount = 0;

    try {
        for (let i = 1; i <= messageCount; i++) {
            try {
                const message = `Message ${i} of ${messageCount} from ${BOT_NAME}`;
                await sock.sendMessage(formattedNumber, { text: message });
                successCount++;
                
                io.emit('message-progress', {
                    current: i,
                    total: messageCount,
                    success: successCount,
                    errors: errorCount
                });

                console.log(`Message ${i}/${messageCount} sent successfully`);

                // Wait for delay before sending next message (except for the last one)
                if (i < messageCount) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            } catch (error) {
                errorCount++;
                console.error(`Error sending message ${i}:`, error);
                io.emit('message-error', {
                    messageNumber: i,
                    error: error.message
                });
            }
        }

        return { success: successCount, errors: errorCount };
    } finally {
        isSending = false;
    }
}

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('Client connected');

    // Send current state to newly connected client
    socket.emit('connection-state', { state: connectionState, connected: isConnected, demoMode: DEMO_MODE });
    if (qrCodeData) {
        socket.emit('qr', qrCodeData);
    }
    
    // Demo mode: Simulate connection
    socket.on('demo-connect', () => {
        if (DEMO_MODE) {
            console.log('DEMO: Simulating WhatsApp connection');
            isConnected = true;
            connectionState = 'connected';
            qrCodeData = null;
            io.emit('connected', { message: 'DEMO: WhatsApp connected successfully' });
            io.emit('connection-state', { state: connectionState, connected: isConnected, demoMode: DEMO_MODE });
        }
    });

    // Handle send messages request
    socket.on('send-messages', async (data) => {
        try {
            const { targetNumber, messageCount, delay } = data;

            // Validation
            if (!targetNumber || !messageCount || delay === undefined) {
                socket.emit('send-error', { message: 'Missing required fields' });
                return;
            }

            if (messageCount < 1 || messageCount > 10000) {
                socket.emit('send-error', { message: 'Message count must be between 1 and 10,000' });
                return;
            }

            if (delay < 1000 || delay > 60000) {
                socket.emit('send-error', { message: 'Delay must be between 1000ms (1s) and 60000ms (60s)' });
                return;
            }

            const result = await sendMessages(targetNumber, messageCount, delay);
            socket.emit('send-complete', result);
        } catch (error) {
            console.error('Error in send-messages:', error);
            socket.emit('send-error', { message: error.message });
        }
    });

    // Handle logout request
    socket.on('logout', async () => {
        try {
            if (sock) {
                await sock.logout();
                isConnected = false;
                connectionState = 'disconnected';
                qrCodeData = null;
                socket.emit('logged-out', { message: 'Logged out successfully' });
            }
        } catch (error) {
            console.error('Error logging out:', error);
            socket.emit('error', { message: 'Failed to logout' });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// API Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        connected: isConnected,
        state: connectionState
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    connectToWhatsApp();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    if (sock) {
        await sock.end();
    }
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
