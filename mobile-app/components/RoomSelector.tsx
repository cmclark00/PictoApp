/**
 * Room Selector Component
 * Allows user to select a PictoChat room (A, B, C, D)
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface RoomSelectorProps {
  selectedRoom: 'A' | 'B' | 'C' | 'D' | null;
  onSelectRoom: (room: 'A' | 'B' | 'C' | 'D') => void;
  roomUsers?: { [key: string]: number };
}

const ROOMS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

const ROOM_COLORS = {
  A: '#ff6b6b',
  B: '#4ecdc4',
  C: '#45b7d1',
  D: '#f9ca24',
};

export const RoomSelector: React.FC<RoomSelectorProps> = ({
  selectedRoom,
  onSelectRoom,
  roomUsers = {},
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a Room</Text>
      <View style={styles.roomGrid}>
        {ROOMS.map((room) => (
          <TouchableOpacity
            key={room}
            style={[
              styles.roomButton,
              { backgroundColor: ROOM_COLORS[room] },
              selectedRoom === room && styles.selectedRoom,
            ]}
            onPress={() => onSelectRoom(room)}
          >
            <Text style={styles.roomLetter}>{room}</Text>
            <Text style={styles.userCount}>
              {roomUsers[room] || 0}/16 users
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  roomButton: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedRoom: {
    borderWidth: 4,
    borderColor: '#333',
  },
  roomLetter: {
    fontSize: 64,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  userCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
