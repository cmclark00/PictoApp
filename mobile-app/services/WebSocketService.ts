/**
 * WebSocket Service for PictoChat Bridge Communication
 */

import { PictoChatMessage, User } from '../types/pictochat';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(serverUrl: string = 'ws://localhost:3000') {
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to bridge server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('Connected to bridge server');
          this.clearReconnectInterval();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Disconnected from bridge server');
          this.emit('disconnected', {});
          this.scheduleReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from bridge server
   */
  disconnect(): void {
    this.clearReconnectInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message to server
   */
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not connected');
    }
  }

  /**
   * Set user information
   */
  setUserInfo(name: string, color: number): void {
    this.send({
      type: 'setUserInfo',
      name,
      color,
    });
  }

  /**
   * Join a chat room
   */
  joinRoom(roomId: 'A' | 'B' | 'C' | 'D'): void {
    this.send({
      type: 'joinRoom',
      roomId,
    });
  }

  /**
   * Leave current room
   */
  leaveRoom(): void {
    this.send({
      type: 'leaveRoom',
    });
  }

  /**
   * Send a message
   */
  sendMessage(messageType: 'text' | 'drawing', data: string | any): void {
    this.send({
      type: 'sendMessage',
      messageType,
      data,
    });
  }

  /**
   * Get room information
   */
  getRoomInfo(roomId: 'A' | 'B' | 'C' | 'D'): void {
    this.send({
      type: 'getRoomInfo',
      roomId,
    });
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: any): void {
    const { type, ...payload } = data;
    this.emit(type, payload);
  }

  /**
   * Schedule reconnect attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectInterval) {
      return;
    }

    console.log('Scheduling reconnect in 5 seconds...');
    this.reconnectInterval = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect().catch(error => {
        console.error('Reconnect failed:', error);
        this.reconnectInterval = null;
        this.scheduleReconnect();
      });
    }, 5000);
  }

  /**
   * Clear reconnect interval
   */
  private clearReconnectInterval(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }
}

// Singleton instance
export const wsService = new WebSocketService();
