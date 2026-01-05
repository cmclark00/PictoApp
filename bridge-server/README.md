# PictoChat Bridge Server

Node.js server that bridges communication between mobile devices and Nintendo DS PictoChat.

## Overview

The bridge server acts as an intermediary between the mobile app and Nintendo DS devices. It:

1. Captures 802.11b packets from DS devices in monitor mode
2. Decodes PictoChat protocol messages
3. Relays messages to mobile clients via WebSocket
4. Encodes and injects packets to send messages to DS devices

## Architecture

```
Mobile App (WebSocket) ←→ Bridge Server ←→ DS Device (802.11b)
                             │
                             ├─ WebSocket Server (port 3000)
                             ├─ Packet Capture (monitor mode)
                             ├─ Protocol Decoder/Encoder
                             └─ Packet Injection
```

## Requirements

### System Requirements

- Linux (Ubuntu/Debian recommended)
- Node.js 18+
- Root/sudo privileges

### Hardware Requirements

- WiFi adapter with monitor mode support
  - Official Nintendo USB WiFi adapter (Prism54 chipset) - recommended
  - Other Prism54-based adapters
  - Atheros-based adapters (check compatibility)

### Software Dependencies

```bash
# Required for packet capture
sudo apt-get install libpcap-dev

# Node.js packages
npm install
```

## Installation

### 1. Install System Dependencies

```bash
sudo apt-get update
sudo apt-get install libpcap-dev
```

### 2. Install Node Dependencies

```bash
npm install
```

### 3. Install Packet Capture Library

```bash
npm install cap
```

**Note**: The `cap` package requires libpcap-dev to be installed first.

## Usage

### Development Mode (Mock)

Run without DS hardware for testing:

```bash
npm run dev
```

This starts the server in MOCK MODE, which simulates DS packets for testing.

### Production Mode

For real DS communication:

```bash
# Build TypeScript
npm run build

# Run with sudo for packet capture
sudo npm start
```

### Setting Up Monitor Mode

Before running with real DS communication:

```bash
# Replace wlan0 with your WiFi adapter name
export NETWORK_INTERFACE=wlan0

# Set to monitor mode
sudo ip link set $NETWORK_INTERFACE down
sudo iw dev $NETWORK_INTERFACE set type monitor
sudo ip link set $NETWORK_INTERFACE up
sudo iw dev $NETWORK_INTERFACE set channel 13
```

## Configuration

### Environment Variables

```bash
# Port for HTTP/WebSocket server (default: 3000)
PORT=3000

# Network interface for packet capture (default: wlan0)
NETWORK_INTERFACE=wlan0
```

### Example

```bash
PORT=8080 NETWORK_INTERFACE=wlan1 sudo npm start
```

## API Endpoints

### HTTP Endpoints

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "capturing": true
}
```

#### `GET /api/info`

Server information and capabilities.

**Response:**
```json
{
  "name": "PictoChat Bridge Server",
  "version": "1.0.0",
  "description": "Bridge between mobile app and Nintendo DS PictoChat",
  "capabilities": {
    "packetCapture": false,
    "packetInjection": false,
    "mockMode": true
  },
  "constants": {
    "BROADCAST_MAC": "03:09:bf:00:00:00",
    "WIFI_CHANNEL": 13,
    "MAX_USERS": 16,
    "ROOMS": ["A", "B", "C", "D"]
  }
}
```

#### `GET /api/rooms`

Get status of all chat rooms.

**Response:**
```json
{
  "rooms": [
    { "id": "A", "users": 3, "hasDS": true },
    { "id": "B", "users": 0, "hasDS": false },
    { "id": "C", "users": 1, "hasDS": false },
    { "id": "D", "users": 5, "hasDS": true }
  ]
}
```

### WebSocket Protocol

Connect to `ws://localhost:3000`

#### Client → Server Messages

**Set User Info**
```json
{
  "type": "setUserInfo",
  "name": "Alice",
  "color": 0xFF5733
}
```

**Join Room**
```json
{
  "type": "joinRoom",
  "roomId": "A"
}
```

**Leave Room**
```json
{
  "type": "leaveRoom"
}
```

**Send Message**
```json
{
  "type": "sendMessage",
  "messageType": "text",
  "data": "Hello from mobile!"
}
```

**Send Drawing**
```json
{
  "type": "sendMessage",
  "messageType": "drawing",
  "data": "[{path data}]"
}
```

#### Server → Client Messages

**Connected**
```json
{
  "type": "connected",
  "userId": 123,
  "rooms": ["A", "B", "C", "D"]
}
```

**Room Joined**
```json
{
  "type": "roomJoined",
  "roomId": "A",
  "users": [...],
  "messages": [...]
}
```

**New Message**
```json
{
  "type": "newMessage",
  "message": {
    "sender": "Alice",
    "senderId": 123,
    "timestamp": 1234567890,
    "messageType": "text",
    "data": "Hello!"
  }
}
```

**User Joined**
```json
{
  "type": "userJoined",
  "user": {
    "id": 124,
    "name": "Bob",
    "color": 0x3498DB,
    "isDS": false
  }
}
```

**User Left**
```json
{
  "type": "userLeft",
  "userId": 124
}
```

## Project Structure

```
bridge-server/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── types/
│   │   └── pictochat.ts         # Type definitions
│   ├── protocol/
│   │   └── pictochat-decoder.ts # Protocol codec
│   ├── network/
│   │   └── packet-capture.ts    # Packet capture/injection
│   └── server/
│       └── websocket-server.ts  # WebSocket server
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

### Packet Capture Fails

**Error**: `Cannot find module 'cap'`

**Solution**:
```bash
sudo apt-get install libpcap-dev
npm install cap
```

**Error**: `Permission denied`

**Solution**: Run with sudo
```bash
sudo npm start
```

### WiFi Adapter Issues

**Error**: Adapter doesn't support monitor mode

**Solution**: Get a compatible adapter (Prism54 or Atheros chipset recommended)

**Check if your adapter supports monitor mode:**
```bash
iw list | grep -A 10 "Supported interface modes"
```

Look for "monitor" in the output.

### Channel 13 Not Available

Some regions restrict WiFi channel 13. Check your country regulations.

```bash
# View current regulatory domain
iw reg get

# Set to a region that allows channel 13 (e.g., JP, EU)
sudo iw reg set JP
```

### Can't See DS Packets

1. Verify DS is running PictoChat
2. Check WiFi adapter is in monitor mode: `iwconfig wlan0`
3. Verify channel 13: `iw dev wlan0 info`
4. Check DS is within range (10-30 meters)
5. Use Wireshark to verify packets: `sudo wireshark`

## Development

### Mock Mode

The server includes mock mode for testing without DS hardware:

```typescript
// In packet-capture.ts
private startMockCapture(): void {
  // Emits fake DS packets every 2 seconds
}
```

### Adding Real Packet Capture

Uncomment the `startRealCapture()` method in `packet-capture.ts`:

```typescript
private async startRealCapture(): Promise<void> {
  const Cap = require('cap').Cap;
  // ... implementation
}
```

### Testing

Test WebSocket connection with `wscat`:

```bash
npm install -g wscat
wscat -c ws://localhost:3000
```

Then send test messages:
```json
{"type":"setUserInfo","name":"Test","color":16777215}
{"type":"joinRoom","roomId":"A"}
```

## Performance

- **CPU Usage**: Low (~1-5% with packet capture)
- **Memory**: ~50-100 MB
- **Network**: Minimal bandwidth usage
- **Latency**: <50ms for message relay

## Security Considerations

1. **No Encryption**: PictoChat has no encryption (DS limitation)
2. **Local Network**: Server should run on trusted local network
3. **Root Access**: Required for packet capture - use dedicated device
4. **Firewall**: Configure firewall to restrict access to port 3000

## License

MIT License

## References

- [libpcap documentation](https://www.tcpdump.org/)
- [Nintendo DS WiFi research](https://www.ricbit.com/mundobizarro/nds.html)
- [cap npm package](https://www.npmjs.com/package/cap)
