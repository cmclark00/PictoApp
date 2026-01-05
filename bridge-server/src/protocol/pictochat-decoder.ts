/**
 * PictoChat Protocol Decoder
 * Decodes raw DS packets into PictoChat messages
 */

import { DSPacket, PictoChatMessage, DrawingData, DS_CONSTANTS } from '../types/pictochat';

export class PictoChatDecoder {
  /**
   * Decode a raw DS packet into a PictoChat message
   * Based on reverse engineering of PictoChat protocol
   */
  static decode(packet: DSPacket): PictoChatMessage | null {
    try {
      // Check if this is a PictoChat packet
      if (!this.isPictoChatPacket(packet)) {
        return null;
      }

      // Extract message type from packet header
      const messageType = this.getMessageType(packet.data);

      // Extract sender information
      const senderId = this.getSenderId(packet.data);
      const sender = this.getSenderName(packet.data);

      // Extract message data
      const data = messageType === 'drawing'
        ? this.decodeDrawing(packet.data)
        : this.decodeText(packet.data);

      return {
        sender,
        senderId,
        timestamp: packet.timestamp,
        messageType,
        data,
      };
    } catch (error) {
      console.error('Failed to decode packet:', error);
      return null;
    }
  }

  /**
   * Check if packet is a PictoChat packet
   */
  private static isPictoChatPacket(packet: DSPacket): boolean {
    // Check for Nintendo MAC address prefix or broadcast address
    return (
      packet.sourceMAC.startsWith(DS_CONSTANTS.NINTENDO_MAC_PREFIX) ||
      packet.destMAC === DS_CONSTANTS.BROADCAST_MAC
    );
  }

  /**
   * Determine message type from packet data
   */
  private static getMessageType(data: Buffer): 'text' | 'drawing' | 'system' {
    // This is a simplified implementation
    // Real implementation would need to analyze packet structure
    if (data.length > 100) {
      return 'drawing'; // Larger packets likely contain bitmap data
    }
    return 'text';
  }

  /**
   * Extract sender ID from packet
   */
  private static getSenderId(data: Buffer): number {
    // Extract sender ID from packet header
    // This is placeholder - real implementation needs packet analysis
    return data.length > 0 ? data[0] & 0x0F : 0;
  }

  /**
   * Extract sender name from packet
   */
  private static getSenderName(data: Buffer): string {
    // Extract username from packet
    // This is placeholder - real implementation needs packet analysis
    return `User${this.getSenderId(data)}`;
  }

  /**
   * Decode drawing data from packet
   */
  private static decodeDrawing(data: Buffer): DrawingData {
    // PictoChat uses 1-bit black & white bitmap
    // DS screen: 256x192 pixels, drawing area ~192x96

    const width = DS_CONSTANTS.DRAWING_WIDTH;
    const height = DS_CONSTANTS.DRAWING_HEIGHT;
    const expectedSize = Math.ceil((width * height) / 8); // 1 bit per pixel

    // Extract bitmap data from packet payload
    // This is simplified - real implementation needs proper offset calculation
    const pixelData = data.slice(data.length - expectedSize);

    return {
      width,
      height,
      pixels: new Uint8Array(pixelData),
    };
  }

  /**
   * Decode text data from packet
   */
  private static decodeText(data: Buffer): string {
    // Extract text message from packet
    // PictoChat uses ASCII/UTF-8 encoding
    // This is simplified - real implementation needs proper offset calculation
    try {
      return data.toString('utf8').replace(/\0/g, '').trim();
    } catch {
      return '';
    }
  }

  /**
   * Encode a PictoChat message into a packet buffer
   */
  static encode(message: PictoChatMessage): Buffer {
    // Create packet buffer
    const header = Buffer.alloc(16);

    // Write message type
    header[0] = message.messageType === 'drawing' ? 0x01 : 0x00;

    // Write sender ID
    header[1] = message.senderId & 0xFF;

    // Write timestamp
    header.writeUInt32LE(message.timestamp, 4);

    let payload: Buffer;

    if (message.messageType === 'drawing' && typeof message.data !== 'string') {
      // Encode drawing data
      payload = Buffer.from(message.data.pixels);
    } else {
      // Encode text data
      payload = Buffer.from(message.data as string, 'utf8');
    }

    return Buffer.concat([header, payload]);
  }
}
