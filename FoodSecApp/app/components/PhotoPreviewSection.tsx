import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { AntDesign } from '@expo/vector-icons';
import { ocrService } from '../services/ocr/OCRService';

interface PhotoPreviewSectionProps {
  photo: any;
  handleRetakePhoto: () => void;
  onTextProcessed: (text: string) => void;
}

export default function PhotoPreviewSection({ photo, handleRetakePhoto, onTextProcessed }: PhotoPreviewSectionProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsProcessing(true);
      console.log('Starting OCR processing...');
      const text = await ocrService.processImage(photo.uri);
      onTextProcessed(text);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: photo.uri }} style={styles.preview} />
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleRetakePhoto}
          style={styles.button}
          disabled={isProcessing}
        >
          Retake Photo
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            'Process Receipt'
          )}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  preview: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    padding: 20,
    gap: 10,
  },
  button: {
    marginTop: 10,
  },
}); 