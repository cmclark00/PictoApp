/**
 * Packet Capture Module
 * Captures 802.11b packets from DS devices using monitor mode
 *
 * REQUIREMENTS:
 * - Linux system with libpcap-dev installed
 * - WiFi adapter capable of monitor mode (e.g., Prism54-based adapter)
 * - Root/sudo privileges for packet capture
 */

import { EventEmitter } from 'events';
import { DSPacket, DS_CONSTANTS } from '../types/pictochat';

export class PacketCapture extends EventEmitter {
  private isCapturing: boolean = false;
  private interface: string;
  private channel: number;

  constructor(networkInterface: string = 'wlan0', channel: number = DS_CONSTANTS.WIFI_CHANNEL) {
    super();
    this.interface = networkInterface;
    this.channel = channel;
  }

  /**
   * Start capturing packets
   */
  async start(): Promise<void> {
    if (this.isCapturing) {
      throw new Error('Packet capture already running');
    }

    console.log(`Starting packet capture on ${this.interface}, channel ${this.channel}`);

    this.isCapturing = true;

    // Try to use real packet capture, fall back to mock mode
    try {
      const Cap = require('cap');
      await this.startRealCapture();
      console.log('✓ Real packet capture enabled - monitoring DS traffic');
    } catch (error: any) {
      console.warn('⚠ Could not enable real packet capture:', error.message);
      console.warn('');
      console.warn('To enable real DS communication:');
      console.warn('1. Install libpcap-dev: sudo apt-get install libpcap-dev');
      console.warn('2. Install cap package: npm install cap');
      console.warn('3. Run with sudo for monitor mode access');
      console.warn('4. WiFi adapter with monitor mode support (e.g., Prism54 chipset)');
      console.warn('');
      console.warn('Falling back to MOCK MODE for testing');
      console.warn('');
      this.startMockCapture();
    }
  }

  /**
   * Stop capturing packets
   */
  stop(): void {
    if (!this.isCapturing) {
      return;
    }

    console.log('Stopping packet capture');
    this.isCapturing = false;
    this.emit('stopped');
  }

  /**
   * Set WiFi adapter to monitor mode
   */
  private async setMonitorMode(): Promise<void> {
    // This would execute system commands to set monitor mode:
    // sudo ip link set ${interface} down
    // sudo iw dev ${interface} set type monitor
    // sudo ip link set ${interface} up
    // sudo iw dev ${interface} set channel ${channel}
    console.log('TODO: Set monitor mode');
  }

  /**
   * Mock packet capture for testing without hardware
   * Replace this with real packet capture implementation
   */
  private startMockCapture(): void {
    let packetCount = 0;

    const interval = setInterval(() => {
      if (!this.isCapturing) {
        clearInterval(interval);
        return;
      }

      // Emit mock DS packet every 2 seconds
      const mockPacket: DSPacket = {
        timestamp: Date.now(),
        sourceMAC: '00:09:bf:12:34:56',
        destMAC: DS_CONSTANTS.BROADCAST_MAC,
        channel: this.channel,
        data: Buffer.from('Mock PictoChat message'),
        packetType: 'data',
      };

      this.emit('packet', mockPacket);
      packetCount++;

      if (packetCount % 10 === 0) {
        console.log(`Captured ${packetCount} packets (MOCK MODE)`);
      }
    }, 2000);
  }

  /**
   * Real packet capture implementation (requires 'cap' package)
   */
  private async startRealCapture(): Promise<void> {
    const Cap = require('cap').Cap;
    const decoders = require('cap').decoders;

    const c = new Cap();
    const device = Cap.findDevice(this.interface);

    if (!device) {
      throw new Error(`Network interface ${this.interface} not found`);
    }

    // Filter for Nintendo DS packets (MAC prefix 00:09:bf or broadcast)
    const filter = `ether dst ${DS_CONSTANTS.BROADCAST_MAC} or ether[0:3] = 0x0009bf`;
    const bufSize = 10 * 1024 * 1024;
    const buffer = Buffer.alloc(65535);

    console.log(`Opening ${device} with filter: ${filter}`);
    const linkType = c.open(device, filter, bufSize, buffer);
    console.log(`Link type: ${linkType}`);

    let packetCount = 0;

    c.on('packet', (nbytes: number, trunc: boolean) => {
      if (trunc) {
        console.log('Packet truncated');
        return;
      }

      try {
        // Parse 802.11 packet
        const ret = decoders.Ethernet(buffer);

        const packet: DSPacket = {
          timestamp: Date.now(),
          sourceMAC: ret.info.srcmac,
          destMAC: ret.info.dstmac,
          channel: this.channel,
          data: buffer.slice(ret.offset, nbytes),
          packetType: 'data',
        };

        packetCount++;
        if (packetCount % 100 === 0) {
          console.log(`✓ Captured ${packetCount} packets from DS devices`);
        }

        this.emit('packet', packet);
      } catch (error) {
        console.error('Error parsing packet:', error);
      }
    });

    c.on('error', (error: Error) => {
      console.error('Capture error:', error);
    });
  }
}

/**
 * Packet Injection Module
 * Injects packets to send messages to DS devices
 */
export class PacketInjector {
  private interface: string;

  constructor(networkInterface: string = 'wlan0') {
    this.interface = networkInterface;
  }

  /**
   * Inject a packet to send a message to DS devices
   */
  async inject(packet: Buffer): Promise<void> {
    console.log('TODO: Implement packet injection');
    console.log(`Would inject ${packet.length} bytes to ${this.interface}`);

    // Real implementation would use raw socket or pcap inject:
    // - Craft 802.11 frame with proper headers
    // - Set destination MAC to DS broadcast address
    // - Inject using libpcap or raw sockets
  }
}
