/**
 * WebSocket Server
 * Handles communication between mobile app and bridge server
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { PictoChatMessage, ChatRoom, User, DS_CONSTANTS } from '../types/pictochat';

export interface WSClient {
  ws: WebSocket;
  user: User;
  currentRoom: 'A' | 'B' | 'C' | 'D' | null;
}

export class PictoChatWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, WSClient> = new Map();
  private rooms: Map<'A' | 'B' | 'C' | 'D', ChatRoom> = new Map();
  private nextUserId: number = 1;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server });
    this.initializeRooms();
    this.setupWebSocket();
  }

  /**
   * Initialize chat rooms
   */
  private initializeRooms(): void {
    for (const roomId of DS_CONSTANTS.ROOMS) {
      this.rooms.set(roomId, {
        id: roomId,
        users: [],
        messages: [],
      });
    }
  }

  /**
   * Set up WebSocket connection handling
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New client connected');

      // Create temporary user (will be updated when client sends user info)
      const user: User = {
        id: this.nextUserId++,
        name: `User${this.nextUserId}`,
        color: Math.floor(Math.random() * 0xFFFFFF),
        isDS: false,
      };

      const client: WSClient = {
        ws,
        user,
        currentRoom: null,
      };

      this.clients.set(ws, client);

      // Send welcome message
      this.send(ws, {
        type: 'connected',
        userId: user.id,
        rooms: Array.from(this.rooms.keys()),
      });

      // Handle messages from client
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      // Handle disconnect
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(ws);

      if (!client) {
        return;
      }

      switch (message.type) {
        case 'setUserInfo':
          this.handleSetUserInfo(client, message);
          break;

        case 'joinRoom':
          this.handleJoinRoom(client, message.roomId);
          break;

        case 'leaveRoom':
          this.handleLeaveRoom(client);
          break;

        case 'sendMessage':
          this.handleSendMessage(client, message);
          break;

        case 'getRoomInfo':
          this.handleGetRoomInfo(client, message.roomId);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  /**
   * Handle user info update
   */
  private handleSetUserInfo(client: WSClient, message: any): void {
    client.user.name = message.name || client.user.name;
    client.user.color = message.color || client.user.color;

    this.send(client.ws, {
      type: 'userInfoUpdated',
      user: client.user,
    });
  }

  /**
   * Handle room join
   */
  private handleJoinRoom(client: WSClient, roomId: 'A' | 'B' | 'C' | 'D'): void {
    // Leave current room first
    if (client.currentRoom) {
      this.handleLeaveRoom(client);
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.send(client.ws, {
        type: 'error',
        message: 'Room not found',
      });
      return;
    }

    // Check room capacity
    if (room.users.length >= DS_CONSTANTS.MAX_USERS) {
      this.send(client.ws, {
        type: 'error',
        message: 'Room is full',
      });
      return;
    }

    // Add user to room
    room.users.push(client.user);
    client.currentRoom = roomId;

    // Notify client
    this.send(client.ws, {
      type: 'roomJoined',
      roomId,
      users: room.users,
      messages: room.messages.slice(-50), // Send last 50 messages
    });

    // Notify other users in room
    this.broadcastToRoom(roomId, {
      type: 'userJoined',
      user: client.user,
    }, client.ws);

    console.log(`User ${client.user.name} joined room ${roomId}`);
  }

  /**
   * Handle room leave
   */
  private handleLeaveRoom(client: WSClient): void {
    if (!client.currentRoom) {
      return;
    }

    const room = this.rooms.get(client.currentRoom);
    if (room) {
      // Remove user from room
      room.users = room.users.filter(u => u.id !== client.user.id);

      // Notify other users
      this.broadcastToRoom(client.currentRoom, {
        type: 'userLeft',
        userId: client.user.id,
      });
    }

    client.currentRoom = null;
  }

  /**
   * Handle message send
   */
  private handleSendMessage(client: WSClient, message: any): void {
    if (!client.currentRoom) {
      this.send(client.ws, {
        type: 'error',
        message: 'Not in a room',
      });
      return;
    }

    const room = this.rooms.get(client.currentRoom);
    if (!room) {
      return;
    }

    // Create PictoChat message
    const pictoChatMessage: PictoChatMessage = {
      sender: client.user.name,
      senderId: client.user.id,
      timestamp: Date.now(),
      messageType: message.messageType || 'text',
      data: message.data,
    };

    // Store message
    room.messages.push(pictoChatMessage);

    // Keep only last 100 messages
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }

    // Broadcast to room
    this.broadcastToRoom(client.currentRoom, {
      type: 'newMessage',
      message: pictoChatMessage,
    });

    // TODO: Send to DS devices via packet injection
    this.emit('messageToDS', pictoChatMessage, client.currentRoom);
  }

  /**
   * Handle get room info
   */
  private handleGetRoomInfo(client: WSClient, roomId: 'A' | 'B' | 'C' | 'D'): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.send(client.ws, {
        type: 'error',
        message: 'Room not found',
      });
      return;
    }

    this.send(client.ws, {
      type: 'roomInfo',
      roomId,
      userCount: room.users.length,
      users: room.users,
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      console.log(`Client disconnected: ${client.user.name}`);
      this.handleLeaveRoom(client);
      this.clients.delete(ws);
    }
  }

  /**
   * Send message to specific client
   */
  private send(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast message to all clients in a room
   */
  private broadcastToRoom(roomId: 'A' | 'B' | 'C' | 'D', data: any, exclude?: WebSocket): void {
    for (const [ws, client] of this.clients) {
      if (client.currentRoom === roomId && ws !== exclude) {
        this.send(ws, data);
      }
    }
  }

  /**
   * Broadcast message from DS device to room
   */
  broadcastDSMessage(roomId: 'A' | 'B' | 'C' | 'D', message: PictoChatMessage): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    // Store message
    room.messages.push(message);

    // Broadcast to mobile clients
    this.broadcastToRoom(roomId, {
      type: 'newMessage',
      message,
    });
  }

  /**
   * Event emitter stub (extend EventEmitter in real implementation)
   */
  private emit(event: string, ...args: any[]): void {
    // This would emit events to packet injector
    console.log(`Event: ${event}`, args);
  }
}
