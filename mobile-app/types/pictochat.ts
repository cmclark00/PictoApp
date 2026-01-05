/**
 * PictoChat Types for Mobile App
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
  pixels: Uint8Array;
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
  isDS: boolean;
}

export const DRAWING_WIDTH = 192;
export const DRAWING_HEIGHT = 96;
