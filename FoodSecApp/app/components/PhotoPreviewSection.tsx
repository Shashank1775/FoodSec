/**
 * Shows the captured receipt and kicks off OCR. The component only produces raw
 * text; turning it into items and saving them is ScanScreen's job so that this
 * stays reusable for any image source (camera, library, ...).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { ocrService } from '../services/ocr/OCRService';

interface PhotoPreviewSectionProps {
  /** Local file URI of the photo to OCR. */
  uri: string;
  onRetake: () => void;
  onTextRecognised: (text: string) => void;
  onError: (message: string) => void;
}

export default function PhotoPreviewSection({ uri, onRetake, onTextRecognised, onError }: PhotoPreviewSectionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  // OCR can take several seconds; if the user retakes (unmounting us) meanwhile,
  // we must not call setState or report a stale result.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      const text = await ocrService.recognizeText(uri);
      if (mounted.current) onTextRecognised(text);
    } catch (error) {
      console.error('OCR failed:', error);
      if (mounted.current) onError(error instanceof Error ? error.message : 'Could not read the receipt.');
    } finally {
      if (mounted.current) setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.preview} resizeMode="contain" />
      <View style={styles.buttonContainer}>
        <Button mode="outlined" textColor="white" onPress={onRetake} style={styles.button} disabled={isProcessing}>
          Retake
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={isProcessing}
          disabled={isProcessing}
        >
          {isProcessing ? 'Reading receipt…' : 'Process Receipt'}
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
