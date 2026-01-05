# PictoChat Mobile App

A universal mobile application that allows you to join Nintendo DS PictoChat rooms and communicate with DS players as if you were on a DS yourself.

## Overview

This project enables modern mobile devices (iOS and Android) to communicate with Nintendo DS devices running PictoChat. Due to limitations with mobile device WiFi access, this implementation uses a hybrid architecture:

- **Mobile App**: React Native (Expo) app for iOS and Android
- **Bridge Server**: Node.js server that interfaces with DS devices and relays messages to mobile clients

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   Mobile App    │◄───────►│  Bridge Server  │◄───────►│  Nintendo DS    │
│  (iOS/Android)  │  WebSocket│   (Node.js)     │  802.11b │   (PictoChat)   │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Why a Bridge Server?

Mobile devices (especially iOS) don't allow the low-level WiFi monitor mode access required to communicate directly with DS devices using the native protocol. The bridge server solves this by:

1. Running on a PC/Raspberry Pi with a compatible WiFi adapter
2. Using monitor mode to capture and inject 802.11b packets
3. Decoding PictoChat protocol messages
4. Relaying messages between mobile apps and DS devices via WebSocket

## Features

- Join PictoChat rooms (A, B, C, D)
- Send text messages to DS users
- Draw and send pictures (black & white, DS-style)
- See messages from DS users
- Support up to 16 users per room (DS limit)
- Real-time communication via WebSocket
- Cross-platform mobile support (iOS & Android)

## Project Structure

```
PictoApp/
├── mobile-app/          # React Native mobile application
│   ├── components/      # UI components
│   ├── services/        # WebSocket service
│   ├── types/           # TypeScript type definitions
│   └── App.tsx          # Main app component
│
├── bridge-server/       # Node.js bridge server
│   ├── src/
│   │   ├── types/       # PictoChat type definitions
│   │   ├── protocol/    # Protocol encoder/decoder
│   │   ├── network/     # Packet capture and injection
│   │   └── server/      # WebSocket server
│   └── package.json
│
└── README.md           # This file
```

## Getting Started

### Prerequisites

**For Mobile App:**
- Node.js 18+ and npm
- Expo CLI
- iOS Simulator (macOS) or Android Emulator, or physical device

**For Bridge Server:**
- Node.js 18+ and npm
- Linux system (Ubuntu/Debian recommended)
- WiFi adapter with monitor mode support (e.g., Prism54-based adapter)
- libpcap-dev installed: `sudo apt-get install libpcap-dev`
- Root/sudo access for packet capture

### Quick Start

#### 1. Set Up Bridge Server

```bash
cd bridge-server
npm install
npm run dev
```

The server will start on `http://localhost:3000` with WebSocket support.

**Note**: The bridge server runs in MOCK MODE by default for testing without DS hardware. For real DS communication, see the Bridge Server Setup section below.

#### 2. Set Up Mobile App

```bash
cd mobile-app
npm install
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

#### 3. Configure Connection

In the mobile app code, update the WebSocket URL to point to your bridge server:

```typescript
// mobile-app/services/WebSocketService.ts
const wsService = new WebSocketService('ws://YOUR_SERVER_IP:3000');
```

Replace `YOUR_SERVER_IP` with:
- `localhost` if running on simulator/emulator
- Your computer's local IP (e.g., `192.168.1.100`) if running on physical device

## Bridge Server Setup for Real DS Communication

### 1. Install libpcap

```bash
sudo apt-get update
sudo apt-get install libpcap-dev
```

### 2. Install packet capture library

```bash
cd bridge-server
npm install cap
```

### 3. Set up WiFi adapter in monitor mode

The bridge server needs a WiFi adapter that supports monitor mode on channel 13 (2.4 GHz):

```bash
# Set adapter to monitor mode
sudo ip link set wlan0 down
sudo iw dev wlan0 set type monitor
sudo ip link set wlan0 up
sudo iw dev wlan0 set channel 13
```

### 4. Run with sudo

```bash
sudo npm run dev
```

### Compatible WiFi Adapters

- Official Nintendo USB WiFi adapter (Prism54 chipset)
- Other Prism54-based adapters
- Many Atheros-based adapters (check Linux wireless compatibility)

## Technical Details

### PictoChat Protocol

- **Protocol**: Nintendo's proprietary "NiFi" protocol over 802.11b
- **Channel**: 13 (2.472 GHz)
- **Data Rate**: 1-2 Mbps
- **Range**: 10-30 meters
- **Encryption**: None
- **Broadcast MAC**: `03:09:bf:00:00:00`
- **Nintendo MAC Prefix**: `00:09:bf`

### Drawing Format

- Resolution: 192x96 pixels (DS screen dimensions)
- Color depth: 1-bit (black and white)
- Format: Bitmap data

### Message Types

1. **Text**: UTF-8 encoded text messages
2. **Drawing**: Black and white bitmap drawings
3. **System**: Join/leave notifications

## Development

### Mobile App Development

```bash
cd mobile-app

# Start development server
npm start

# Run on specific platform
npm run ios       # iOS simulator (macOS only)
npm run android   # Android emulator
npm run web       # Web browser
```

### Bridge Server Development

```bash
cd bridge-server

# Development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

### Testing Without DS Hardware

The bridge server includes a MOCK MODE that simulates DS packets for testing:

1. Start bridge server: `npm run dev`
2. Start mobile app
3. Join a room
4. You'll see mock DS messages every few seconds

## API Documentation

### WebSocket Events (Client → Server)

- `setUserInfo`: Set username and color
- `joinRoom`: Join a chat room (A, B, C, D)
- `leaveRoom`: Leave current room
- `sendMessage`: Send text or drawing message
- `getRoomInfo`: Get room status

### WebSocket Events (Server → Client)

- `connected`: Connection established
- `roomJoined`: Successfully joined room
- `newMessage`: New message received
- `userJoined`: User joined room
- `userLeft`: User left room
- `disconnected`: Connection lost

## Troubleshooting

### Mobile app can't connect to server

1. Verify bridge server is running
2. Check WebSocket URL in `WebSocketService.ts`
3. Ensure firewall allows port 3000
4. If using physical device, use local IP (not localhost)

### Bridge server packet capture fails

1. Install libpcap-dev: `sudo apt-get install libpcap-dev`
2. Install cap package: `npm install cap`
3. Run with sudo: `sudo npm run dev`
4. Verify WiFi adapter supports monitor mode

### Can't see DS messages

1. Ensure DS is on PictoChat and in the same room
2. Verify WiFi adapter is in monitor mode on channel 13
3. Check DS is within range (10-30 meters)
4. Verify no WiFi interference

## Research Sources

This project was built based on research from:

- [Nintendo DS WiFi Documentation by ricbit](https://www.ricbit.com/mundobizarro/nds.html)
- [PictoChat Protocol Adapter (PCPA)](https://github.com/Thesola10/PictoChat)
- [BlocksDS dswifi Library](https://github.com/blocksds/dswifi)
- [DS NiFi Examples](https://github.com/jpenny1993/dsnifi)
- [DS Homebrew Wiki](https://github.com/DS-Homebrew/wiki)
- Academic research on DS network traffic analysis

## Limitations

- iOS devices cannot communicate directly with DS (requires bridge server)
- Android requires root for direct communication (bridge server recommended)
- Range limited to WiFi adapter capabilities
- No WPA/WPA2 encryption (DS limitation)
- Maximum 16 users per room (DS limitation)

## Future Enhancements

- [ ] Actual packet capture implementation (currently mock mode)
- [ ] DS packet injection for sending messages to DS
- [ ] Better drawing tools (colors, brush sizes)
- [ ] Message history persistence
- [ ] Multiple bridge server support
- [ ] Voice messages
- [ ] User profiles and avatars
- [ ] Room creation and management
- [ ] Message encryption for mobile-to-mobile communication

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Disclaimer

This is a reverse-engineered implementation for educational purposes. Nintendo DS and PictoChat are trademarks of Nintendo. This project is not affiliated with or endorsed by Nintendo.

## Acknowledgments

- Nintendo for creating PictoChat
- DS homebrew community for reverse engineering work
- All researchers who documented the DS wireless protocol
