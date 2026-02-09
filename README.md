# Mert-Uncle-Whatsapp 🤖

A WhatsApp bot with a beautiful web interface using @whiskeysockets/baileys library. Send automated messages with ease!

## Features ✨

- 🔐 **Secure Authentication**: QR code-based WhatsApp Web authentication
- 🌐 **Web Interface**: Clean, modern UI with real-time updates
- 📱 **Phone Number Validation**: Automatic country code handling
- 📊 **Progress Tracking**: Live progress bar showing message sending status
- ⏱️ **Configurable Delay**: Set custom delays between messages
- 🔒 **Connection Status**: Visual lock/unlock indicator
- 🛡️ **Error Handling**: Comprehensive error handling and validation
- ⚡ **Real-time Updates**: Socket.IO for instant status updates

## Prerequisites 📋

- Node.js (v20 or higher)
- npm or yarn
- A WhatsApp account

## Installation 🚀

1. Clone the repository:
```bash
git clone https://github.com/Alien-Alfa/Mert-Uncle-Whatsapp.git
cd Mert-Uncle-Whatsapp
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage 📱

### Step 1: Connect WhatsApp
1. Open the web interface in your browser
2. A QR code will appear automatically
3. Open WhatsApp on your phone
4. Go to Settings → Linked Devices → Link a Device
5. Scan the QR code displayed on the web page

### Step 2: Send Messages
Once connected, you'll see the message sending form:

1. **Target Phone Number**: Enter the recipient's number with country code (e.g., +1234567890)
2. **Number of Messages**: Choose how many messages to send (1-10,000)
3. **Delay**: Set the delay between messages in milliseconds (1000-60000ms)
4. Click the **⭐ Start Sending** button

### Features Explained

- **Connection Status**: Shows lock icon (🔒) when disconnected, unlock (🔓) when connected
- **Progress Bar**: Real-time progress of message sending
- **Statistics**: Live count of successful sends and errors
- **Logout Button**: Safely disconnect from WhatsApp

## Configuration ⚙️

The server runs on port 3000 by default. You can customize settings using environment variables:

```bash
# Change server port
PORT=8080 npm start

# Customize bot name in messages
BOT_NAME="My Custom Bot" npm start

# Enable demo mode for testing
DEMO_MODE=true npm start
```

## Security Features 🛡️

- **Input Validation**: All inputs are validated on both frontend and backend
- **Rate Limiting**: Message count limited to 10,000 per batch
- **Delay Enforcement**: Minimum 1 second delay between messages
- **Phone Number Validation**: Ensures proper format with country code
- **Error Boundaries**: Graceful error handling throughout the application

## API Endpoints 🔌

- `GET /` - Web interface
- `GET /health` - Health check endpoint

### Socket.IO Events

**Client to Server:**
- `send-messages` - Send messages to a target number
- `logout` - Logout from WhatsApp

**Server to Client:**
- `qr` - QR code data for authentication
- `connected` - Connection successful
- `connection-state` - Current connection state
- `message-progress` - Message sending progress
- `send-complete` - Sending completed
- `send-error` - Error occurred
- `logged-out` - User logged out

## Troubleshooting 🔧

### QR Code Not Appearing
- Check your internet connection
- Restart the server
- Clear browser cache

### Connection Lost
- The bot will automatically attempt to reconnect
- Check your phone's internet connection
- Ensure WhatsApp is not logged out on your phone

### Messages Not Sending
- Verify the phone number format includes country code
- Check if you're still connected (green status indicator)
- Ensure the target number is a valid WhatsApp number

## Project Structure 📁

```
Mert-Uncle-Whatsapp/
├── server.js           # Main server file
├── public/
│   └── index.html      # Web interface
├── auth_info_baileys/  # WhatsApp authentication data (auto-generated)
├── package.json
├── .gitignore
└── README.md
```

## Dependencies 📦

- `@whiskeysockets/baileys` - WhatsApp Web API
- `express` - Web server
- `socket.io` - Real-time communication
- `qrcode` - QR code generation
- `pino` - Logging

## License 📄

ISC

## Contributing 🤝

Contributions, issues, and feature requests are welcome!

## Author ✍️

Mert Uncle Whatsapp Bot

## Disclaimer ⚠️

This bot is for educational purposes. Use responsibly and in accordance with WhatsApp's Terms of Service. The authors are not responsible for any misuse of this software.

---

Made with ❤️ for the community