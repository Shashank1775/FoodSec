import React, { useRef, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraType, CameraView, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';
import { Button, Text, ActivityIndicator, Dialog, Portal } from 'react-native-paper';
import { AntDesign } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../services/api/DatabaseService';
import { ocrService } from '../../services/ocr/OCRService';
import { Item } from '../../services/api/models';
import { useNavigation } from '@react-navigation/native';
import PhotoPreviewSection from '../../components/PhotoPreviewSection';

const ScanScreen = () => {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const cameraRef = useRef<CameraView | null>(null);
  const navigation = useNavigation();

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} style={styles.button}>
          Grant Permission
        </Button>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    
    try {
      const options = {
        quality: 1,
        base64: true,
        exif: false,
      };
      const takenPhoto = await cameraRef.current.takePictureAsync(options);
      if (takenPhoto) {
        setPhoto(takenPhoto);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const handleRetakePhoto = () => {
    setPhoto(null);
    setShowResults(false);
    setOcrText('');
  };

  const handleTextProcessed = (text: string) => {
    setOcrText(text);
    setShowResults(true);
  };

  if (photo) {
    return (
      <PhotoPreviewSection 
        photo={photo} 
        handleRetakePhoto={handleRetakePhoto}
        onTextProcessed={handleTextProcessed}
      />
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <AntDesign name='retweet' size={44} color='white' />
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleTakePhoto}>
            <AntDesign name='camera' size={44} color='white' />
          </TouchableOpacity>
        </View>
      </CameraView>

      <Portal>
        <Dialog visible={showResults} onDismiss={() => setShowResults(false)}>
          <Dialog.Title>OCR Results</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.ocrText}>{ocrText}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowResults(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 10,
  },
  text: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  ocrText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ScanScreen; 