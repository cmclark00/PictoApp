/**
 * Chat Message Component
 * Displays a single PictoChat message
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PictoChatMessage } from '../types/pictochat';

interface ChatMessageProps {
  message: PictoChatMessage;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const renderContent = () => {
    if (message.messageType === 'drawing' && typeof message.data !== 'string') {
      // Render drawing
      try {
        const paths = typeof message.data === 'string'
          ? JSON.parse(message.data)
          : message.data;

        return (
          <View style={styles.drawingContainer}>
            <Svg width={192} height={96} viewBox="0 0 384 192">
              {Array.isArray(paths) && paths.map((path: string, index: number) => (
                <Path
                  key={index}
                  d={path}
                  stroke="#000"
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </Svg>
          </View>
        );
      } catch (error) {
        return <Text style={styles.errorText}>Invalid drawing data</Text>;
      }
    } else {
      // Render text
      return (
        <Text style={styles.messageText}>
          {typeof message.data === 'string' ? message.data : ''}
        </Text>
      );
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sender}>{message.sender}</Text>
        <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
      </View>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  content: {
    minHeight: 20,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  drawingContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  errorText: {
    fontSize: 14,
    color: '#d44',
    fontStyle: 'italic',
  },
});
