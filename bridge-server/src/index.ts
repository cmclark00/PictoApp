/**
 * PictoChat Bridge Server
 * Bridges communication between mobile app and Nintendo DS devices
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import { PictoChatWebSocketServer } from './server/websocket-server';
import { PacketCapture, PacketInjector } from './network/packet-capture';
import { PictoChatDecoder } from './protocol/pictochat-decoder';
import { DS_CONSTANTS } from './types/pictochat';

const PORT = process.env.PORT || 3000;
const NETWORK_INTERFACE = process.env.NETWORK_INTERFACE || 'wlan0';

class BridgeServer {
  private app: express.Application;
  private httpServer: http.Server;
  private wsServer: PictoChatWebSocketServer;
  private packetCapture: PacketCapture;
  private packetInjector: PacketInjector;

  constructor() {
    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.wsServer = new PictoChatWebSocketServer(this.httpServer);
    this.packetCapture = new PacketCapture(NETWORK_INTERFACE);
    this.packetInjector = new PacketInjector(NETWORK_INTERFACE);

    this.setupExpress();
    this.setupPacketCapture();
  }

  /**
   * Set up Express routes
   */
  private setupExpress(): void {
    // Enable CORS
    this.app.use(cors());
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        capturing: true, // TODO: Get actual status
      });
    });

    // API info endpoint
    this.app.get('/api/info', (req, res) => {
      res.json({
        name: 'PictoChat Bridge Server',
        version: '1.0.0',
        description: 'Bridge between mobile app and Nintendo DS PictoChat',
        capabilities: {
          packetCapture: false, // TODO: Detect if libpcap is available
          packetInjection: false,
          mockMode: true,
        },
        constants: DS_CONSTANTS,
      });
    });

    // Get room status
    this.app.get('/api/rooms', (req, res) => {
      // TODO: Return actual room status
      res.json({
        rooms: DS_CONSTANTS.ROOMS.map(id => ({
          id,
          users: 0,
          hasDS: false,
        })),
      });
    });
  }

  /**
   * Set up packet capture from DS devices
   */
  private setupPacketCapture(): void {
    this.packetCapture.on('packet', (packet) => {
      // Decode DS packet into PictoChat message
      const message = PictoChatDecoder.decode(packet);

      if (message) {
        console.log('Received PictoChat message:', message);

        // Broadcast to appropriate room
        // TODO: Determine room from packet data
        const roomId = 'A'; // Default to room A for now
        this.wsServer.broadcastDSMessage(roomId, message);
      }
    });

    this.packetCapture.on('stopped', () => {
      console.log('Packet capture stopped');
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Start HTTP/WebSocket server
      this.httpServer.listen(PORT, () => {
        console.log('='.repeat(60));
        console.log('PictoChat Bridge Server');
        console.log('='.repeat(60));
        console.log(`HTTP Server: http://localhost:${PORT}`);
        console.log(`WebSocket Server: ws://localhost:${PORT}`);
        console.log('');
        console.log('Endpoints:');
        console.log(`  GET  http://localhost:${PORT}/health`);
        console.log(`  GET  http://localhost:${PORT}/api/info`);
        console.log(`  GET  http://localhost:${PORT}/api/rooms`);
        console.log('');

        // Start packet capture
        console.log('Starting packet capture...');
        console.log(`Network Interface: ${NETWORK_INTERFACE}`);
        console.log(`WiFi Channel: ${DS_CONSTANTS.WIFI_CHANNEL}`);
        console.log('');

        this.packetCapture.start().catch(err => {
          console.error('Failed to start packet capture:', err);
          console.log('Running in MOCK MODE - no real DS communication');
        });

        console.log('='.repeat(60));
        console.log('Bridge server is ready!');
        console.log('');
        console.log('IMPORTANT NOTES:');
        console.log('1. For real DS communication, install: sudo apt-get install libpcap-dev');
        console.log('2. Then run: npm install cap');
        console.log('3. Run with sudo for monitor mode access');
        console.log('4. Requires WiFi adapter with monitor mode (e.g., Prism54 chipset)');
        console.log('');
        console.log('Currently running in MOCK MODE for testing');
        console.log('='.repeat(60));
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    this.packetCapture.stop();
    this.httpServer.close();
    console.log('Bridge server stopped');
  }
}

// Start server
const server = new BridgeServer();

server.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
