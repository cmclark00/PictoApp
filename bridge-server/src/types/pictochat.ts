/**
 * PictoChat Protocol Types
 * Based on Nintendo DS PictoChat reverse engineering
 */

export interface PictoChatMessage {
  sender: string;
  senderId: number;
  timestamp: number;
  messageType: 'text' | 'drawing' | 'system';
  data: string | DrawingData;
}

export interface DrawingData {
  width: number;
  height: number;
  pixels: Uint8Array; // Bitmap data (1 bit per pixel, black & white)
}

export interface ChatRoom {
  id: 'A' | 'B' | 'C' | 'D';
  users: User[];
  messages: PictoChatMessage[];
}

export interface User {
  id: number;
  name: string;
  color: number;
  isDS: boolean; // true if actual DS, false if mobile client
  macAddress?: string; // For DS devices
}

export interface DSPacket {
  timestamp: number;
  sourceMAC: string;
  destMAC: string;
  channel: number;
  data: Buffer;
  packetType: 'beacon' | 'data' | 'ack' | 'unknown';
}

// DS Wireless Constants
export const DS_CONSTANTS = {
  BROADCAST_MAC: '03:09:bf:00:00:00',
  NINTENDO_MAC_PREFIX: '00:09:bf',
  WIFI_CHANNEL: 13,
  MAX_USERS: 16,
  ROOMS: ['A', 'B', 'C', 'D'] as const,
  DRAWING_WIDTH: 192,  // DS screen width for drawing area
  DRAWING_HEIGHT: 96,  // Approximate drawing area height
};
