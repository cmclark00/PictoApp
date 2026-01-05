/**
 * PictoChat Mobile App
 * Universal mobile application for communicating with Nintendo DS PictoChat
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DrawingCanvas } from './components/DrawingCanvas';
import { ChatMessage } from './components/ChatMessage';
import { RoomSelector } from './components/RoomSelector';
import { wsService } from './services/WebSocketService';
import { PictoChatMessage, User } from './types/pictochat';

type AppScreen = 'connecting' | 'roomSelect' | 'chat';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('connecting');
  const [currentRoom, setCurrentRoom] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [messages, setMessages] = useState<PictoChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userName, setUserName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [textMessage, setTextMessage] = useState('');

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    const initConnection = async () => {
      try {
        await wsService.connect();
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect:', error);
        Alert.alert(
          'Connection Failed',
          'Could not connect to bridge server. Make sure the server is running.',
          [
            { text: 'Retry', onPress: initConnection },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    };

    initConnection();

    return () => {
      wsService.disconnect();
    };
  }, []);

  /**
   * Set up WebSocket event listeners
   */
  useEffect(() => {
    const handleConnected = (data: any) => {
      console.log('Connected with user ID:', data.userId);
      setScreen('roomSelect');
    };

    const handleRoomJoined = (data: any) => {
      console.log('Joined room:', data.roomId);
      setCurrentRoom(data.roomId);
      setUsers(data.users || []);
      setMessages(data.messages || []);
      setScreen('chat');
    };

    const handleNewMessage = (data: any) => {
      setMessages(prev => [...prev, data.message]);
    };

    const handleUserJoined = (data: any) => {
      setUsers(prev => [...prev, data.user]);
    };

    const handleUserLeft = (data: any) => {
      setUsers(prev => prev.filter(u => u.id !== data.userId));
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setScreen('connecting');
    };

    wsService.on('connected', handleConnected);
    wsService.on('roomJoined', handleRoomJoined);
    wsService.on('newMessage', handleNewMessage);
    wsService.on('userJoined', handleUserJoined);
    wsService.on('userLeft', handleUserLeft);
    wsService.on('disconnected', handleDisconnected);

    return () => {
      wsService.off('connected', handleConnected);
      wsService.off('roomJoined', handleRoomJoined);
      wsService.off('newMessage', handleNewMessage);
      wsService.off('userJoined', handleUserJoined);
      wsService.off('userLeft', handleUserLeft);
      wsService.off('disconnected', handleDisconnected);
    };
  }, []);

  /**
   * Handle room selection
   */
  const handleRoomSelect = useCallback((roomId: 'A' | 'B' | 'C' | 'D') => {
    if (!userName.trim()) {
      Alert.alert('Enter Name', 'Please enter your name first');
      return;
    }

    wsService.setUserInfo(userName.trim(), Math.floor(Math.random() * 0xFFFFFF));
    wsService.joinRoom(roomId);
  }, [userName]);

  /**
   * Handle leaving room
   */
  const handleLeaveRoom = useCallback(() => {
    wsService.leaveRoom();
    setCurrentRoom(null);
    setMessages([]);
    setUsers([]);
    setScreen('roomSelect');
  }, []);

  /**
   * Send text message
   */
  const handleSendText = useCallback(() => {
    if (textMessage.trim()) {
      wsService.sendMessage('text', textMessage.trim());
      setTextMessage('');
    }
  }, [textMessage]);

  /**
   * Send drawing
   */
  const handleSendDrawing = useCallback((data: string) => {
    wsService.sendMessage('drawing', data);
    setShowDrawing(false);
  }, []);

  /**
   * Render connecting screen
   */
  const renderConnectingScreen = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>PictoChat</Text>
      <Text style={styles.subtitle}>Connecting to bridge server...</Text>
    </View>
  );

  /**
   * Render room selection screen
   */
  const renderRoomSelectScreen = () => (
    <View style={styles.container}>
      <Text style={styles.title}>PictoChat</Text>

      <View style={styles.nameInput}>
        <Text style={styles.label}>Your Name:</Text>
        <TextInput
          style={styles.input}
          value={userName}
          onChangeText={setUserName}
          placeholder="Enter your name"
          maxLength={20}
        />
      </View>

      <RoomSelector
        selectedRoom={currentRoom}
        onSelectRoom={handleRoomSelect}
      />
    </View>
  );

  /**
   * Render chat screen
   */
  const renderChatScreen = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLeaveRoom}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Room {currentRoom}</Text>
          <Text style={styles.userCount}>{users.length}/16</Text>
        </View>

        {/* Messages */}
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>
              No messages yet. Start drawing or type a message!
            </Text>
          ) : (
            messages.map((msg, index) => (
              <ChatMessage key={`${msg.timestamp}-${index}`} message={msg} />
            ))
          )}
        </ScrollView>

        {/* Drawing Canvas or Input */}
        {showDrawing ? (
          <View style={styles.drawingSection}>
            <DrawingCanvas onDrawingComplete={handleSendDrawing} />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDrawing(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputSection}>
            <TextInput
              style={styles.textInput}
              value={textMessage}
              onChangeText={setTextMessage}
              placeholder="Type a message..."
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={styles.drawButton}
              onPress={() => setShowDrawing(true)}
            >
              <Text style={styles.buttonText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendText}
              disabled={!textMessage.trim()}
            >
              <Text style={styles.buttonText}>Send</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  /**
   * Main render
   */
  return (
    <View style={styles.root}>
      <StatusBar style="auto" />
      {screen === 'connecting' && renderConnectingScreen()}
      {screen === 'roomSelect' && renderRoomSelectScreen()}
      {screen === 'chat' && renderChatScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  nameInput: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    fontSize: 16,
    color: '#4a90e2',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  userCount: {
    fontSize: 14,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesContent: {
    padding: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  inputSection: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  drawButton: {
    backgroundColor: '#f9ca24',
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  drawingSection: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingVertical: 12,
  },
  cancelButton: {
    backgroundColor: '#d44',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
});
