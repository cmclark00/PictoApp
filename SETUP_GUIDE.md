# Complete Setup Guide: Connect to Real Nintendo DS PictoChat

This guide will help you set up the bridge server to communicate with actual Nintendo DS devices running PictoChat.

## What You Need

### Hardware
1. **WiFi Adapter with Monitor Mode Support**
   - Official Nintendo USB WiFi adapter (Prism54 chipset) ⭐ Recommended
   - TP-Link TL-WN722N v1 (NOT v2 or v3!)
   - Alfa AWUS036NHA
   - Any Atheros AR9271-based adapter

2. **Linux Computer or Raspberry Pi**
   - Ubuntu/Debian Linux (easiest)
   - Raspberry Pi 4 (works great!)
   - Can also use a live USB if you don't have Linux

3. **Nintendo DS with PictoChat**
   - Any DS, DS Lite, DSi, or 3DS
   - PictoChat is built-in, no cartridge needed

## Step-by-Step Setup

### 1. Prepare Your Linux System

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade

# Install required packages
sudo apt-get install -y \
  libpcap-dev \
  wireless-tools \
  aircrack-ng \
  iw \
  net-tools \
  nodejs \
  npm
```

### 2. Identify Your WiFi Adapter

```bash
# List all network interfaces
iwconfig

# Or use this
ip link show
```

Look for your USB WiFi adapter. It will be something like `wlan0`, `wlan1`, or `wlx...`.

**Important:** Don't use your main WiFi adapter! You need a separate USB adapter.

### 3. Check Monitor Mode Support

```bash
# Check if your adapter supports monitor mode
sudo iw list | grep -A 10 "Supported interface modes"
```

You should see "monitor" in the list. If not, you need a different adapter.

### 4. Set Up the Bridge Server

```bash
cd bridge-server

# Install Node.js dependencies
npm install

# Install packet capture library (requires libpcap-dev)
npm install cap
```

### 5. Configure Monitor Mode

Create a script to easily set up monitor mode:

```bash
#!/bin/bash
# File: setup-monitor-mode.sh

INTERFACE="wlan1"  # Change to your adapter name
CHANNEL="13"       # DS PictoChat uses channel 13

echo "Setting up monitor mode on $INTERFACE..."

# Stop NetworkManager from interfering (if installed)
sudo systemctl stop NetworkManager 2>/dev/null

# Kill processes that might interfere
sudo airmon-ng check kill

# Set interface down
sudo ip link set $INTERFACE down

# Set to monitor mode
sudo iw dev $INTERFACE set type monitor

# Bring interface up
sudo ip link set $INTERFACE up

# Set to channel 13 (DS PictoChat channel)
sudo iw dev $INTERFACE set channel $CHANNEL

# Verify
echo ""
echo "Monitor mode status:"
iwconfig $INTERFACE

echo ""
echo "✓ Monitor mode enabled on $INTERFACE, channel $CHANNEL"
echo "Ready to capture DS traffic!"
```

Make it executable and run it:

```bash
chmod +x setup-monitor-mode.sh
sudo ./setup-monitor-mode.sh
```

### 6. Start the Bridge Server

```bash
# Run with sudo (required for packet capture)
sudo NETWORK_INTERFACE=wlan1 npm run dev
```

You should see:
```
✓ Real packet capture enabled - monitoring DS traffic
Bridge server is ready!
```

If you see "Falling back to MOCK MODE", check:
- libpcap-dev is installed
- `cap` package is installed
- Running with `sudo`
- WiFi adapter is in monitor mode

### 7. Start Your Nintendo DS

1. Turn on your DS
2. Go to PictoChat (built-in, on main menu)
3. Select a room (A, B, C, or D)
4. Start drawing or typing messages

### 8. Start the Mobile App

```bash
cd mobile-app

# Edit the WebSocket URL to point to your bridge server
# In services/WebSocketService.ts, change:
# constructor(serverUrl: string = 'ws://YOUR_SERVER_IP:3000')

npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Or scan QR code with Expo Go app on your phone

### 9. Connect to the Same Room

1. Open the mobile app
2. Enter your name
3. Select the **same room** as your DS (A, B, C, or D)
4. Start chatting!

## Troubleshooting

### Bridge Server Says "Mock Mode"

**Problem:** Can't capture real packets

**Solutions:**
```bash
# 1. Verify libpcap is installed
dpkg -l | grep libpcap-dev

# 2. Reinstall cap package
cd bridge-server
npm uninstall cap
sudo apt-get install libpcap-dev
npm install cap

# 3. Check if running with sudo
sudo npm run dev

# 4. Verify monitor mode
iwconfig wlan1  # Should show "Mode:Monitor"
```

### Not Seeing DS Packets

**Problem:** Bridge server runs but no DS messages appear

**Solutions:**

1. **Verify DS is on PictoChat:**
   - Open PictoChat on DS
   - Join a room
   - Try sending a message

2. **Check channel 13:**
   ```bash
   sudo iw dev wlan1 set channel 13
   iw dev wlan1 info  # Verify channel is 13
   ```

3. **Check range:**
   - DS wireless range: 10-30 meters
   - Move DS closer to WiFi adapter

4. **Use Wireshark to verify:**
   ```bash
   sudo wireshark
   # Select your monitor interface (wlan1)
   # Filter: wlan.addr contains 00:09:bf
   ```

   If you see packets with MAC addresses starting with `00:09:bf`, your setup works!

### "Permission Denied" Errors

```bash
# Always run bridge server with sudo
sudo npm run dev

# Or set capabilities (advanced)
sudo setcap cap_net_raw,cap_net_admin=eip $(which node)
```

### Channel 13 Not Available

Some countries restrict WiFi channel 13.

```bash
# Check current regulatory domain
iw reg get

# Set to Japan or Europe (allows channel 13)
sudo iw reg set JP

# Verify
iw list | grep -A 15 Frequencies
```

### Mobile App Can't Connect

1. **Find your server's IP:**
   ```bash
   ip addr show
   # Look for inet 192.168.x.x
   ```

2. **Update WebSocket URL:**
   Edit `mobile-app/services/WebSocketService.ts`:
   ```typescript
   constructor(serverUrl: string = 'ws://192.168.1.100:3000')
   ```

3. **Check firewall:**
   ```bash
   sudo ufw allow 3000/tcp
   ```

## Testing Your Setup

### Test 1: Verify Monitor Mode
```bash
iwconfig wlan1
# Should show Mode:Monitor, Channel:13
```

### Test 2: Capture Any WiFi Traffic
```bash
sudo tcpdump -i wlan1 -c 10
# Should see packets
```

### Test 3: Capture DS Traffic
```bash
# Open PictoChat on DS, join a room
sudo tcpdump -i wlan1 'ether[0:3] = 0x00:09:bf'
# Should see packets when DS sends messages
```

### Test 4: Bridge Server Captures
```bash
sudo npm run dev
# Watch console output when DS sends a message
# Should see "Captured N packets"
```

## Advanced: Multiple DS Devices

The system supports up to 16 devices per room (DS limit). To test:

1. Set up multiple DS devices
2. Have them all join the same PictoChat room
3. All devices + mobile users can communicate together!

## Raspberry Pi Setup

Perfect for a dedicated bridge server:

```bash
# On Raspberry Pi OS
sudo apt-get install libpcap-dev nodejs npm
cd bridge-server
npm install
npm install cap

# Set up as systemd service for auto-start
sudo nano /etc/systemd/system/pictochat-bridge.service
```

Service file:
```ini
[Unit]
Description=PictoChat Bridge Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/pi/PictoApp/bridge-server
Environment=NETWORK_INTERFACE=wlan1
ExecStartPre=/home/pi/setup-monitor-mode.sh
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable pictochat-bridge
sudo systemctl start pictochat-bridge
```

## Tips & Best Practices

1. **Use a dedicated USB WiFi adapter** - Don't use your main WiFi
2. **Keep DS close** - Start with 1-2 meters distance
3. **Check battery** - Low DS battery affects wireless
4. **Minimize interference** - Other 2.4GHz devices can interfere
5. **Monitor logs** - Watch bridge server console for errors
6. **Use Wireshark** - Great for debugging packet capture issues

## Still Having Issues?

### Enable Debug Logging

Edit `bridge-server/src/network/packet-capture.ts`:

```typescript
c.on('packet', (nbytes: number, trunc: boolean) => {
  console.log(`Received packet: ${nbytes} bytes`); // Add this
  // ... rest of code
});
```

### Check DS is Broadcasting

PictoChat broadcasts on channel 13 when:
- PictoChat is open (not just DS on)
- You're in a room (not room selection screen)
- Messages are being sent/received

### Community Help

- Nintendo DS homebrew forums
- r/nds on Reddit
- DS-Homebrew Discord

## Success!

When everything works, you'll see:
- Bridge server: "✓ Captured N packets from DS devices"
- Mobile app: Messages from DS appearing in chat
- DS: Messages from mobile app appearing on DS screen

Enjoy chatting between your phone and Nintendo DS! 🎮📱
