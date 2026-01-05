/**
 * Drawing Canvas Component
 * Mimics Nintendo DS PictoChat drawing interface
 */

import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { DRAWING_WIDTH, DRAWING_HEIGHT } from '../types/pictochat';

interface DrawingCanvasProps {
  onDrawingComplete?: (data: string) => void;
  width?: number;
  height?: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  onDrawingComplete,
  width = DRAWING_WIDTH * 2,
  height = DRAWING_HEIGHT * 2,
}) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M ${locationX} ${locationY}`);
        setIsDrawing(true);
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(prev => `${prev} L ${locationX} ${locationY}`);
      },

      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths(prev => [...prev, currentPath]);
          setCurrentPath('');
        }
        setIsDrawing(false);
      },
    })
  ).current;

  /**
   * Clear the canvas
   */
  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  /**
   * Undo last stroke
   */
  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  /**
   * Send the drawing
   */
  const handleSend = () => {
    const allPaths = [...paths, currentPath].filter(p => p);
    if (allPaths.length > 0 && onDrawingComplete) {
      // Convert paths to a simple format
      onDrawingComplete(JSON.stringify(allPaths));
      handleClear();
    }
  };

  return (
    <View style={styles.container}>
      {/* Drawing Canvas */}
      <View
        style={[
          styles.canvas,
          { width, height },
        ]}
        {...panResponder.panHandlers}
      >
        <Svg width={width} height={height}>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="#f0f0f0"
          />

          {/* Grid pattern (like DS screen) */}
          {Array.from({ length: 10 }).map((_, i) => (
            <Rect
              key={`grid-h-${i}`}
              x={0}
              y={i * (height / 10)}
              width={width}
              height={1}
              fill="#e0e0e0"
            />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <Rect
              key={`grid-v-${i}`}
              x={i * (width / 10)}
              y={0}
              width={1}
              height={height}
              fill="#e0e0e0"
            />
          ))}

          {/* Saved paths */}
          {paths.map((path, index) => (
            <Path
              key={`path-${index}`}
              d={path}
              stroke="#000000"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Current path being drawn */}
          {currentPath && (
            <Path
              d={currentPath}
              stroke="#000000"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
      </View>

      {/* Drawing Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.undoButton]}
          onPress={handleUndo}
          disabled={paths.length === 0}
        >
          <Text style={styles.buttonText}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClear}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.sendButton]}
          onPress={handleSend}
          disabled={paths.length === 0 && !currentPath}
        >
          <Text style={[styles.buttonText, styles.sendButtonText]}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 10,
  },
  canvas: {
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  controls: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#666',
    minWidth: 80,
  },
  undoButton: {
    backgroundColor: '#888',
  },
  clearButton: {
    backgroundColor: '#d44',
  },
  sendButton: {
    backgroundColor: '#4a90e2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sendButtonText: {
    fontWeight: '700',
  },
});
