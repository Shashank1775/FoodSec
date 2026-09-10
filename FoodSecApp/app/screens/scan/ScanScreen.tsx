/**
 * Receipt scanning flow:
 *
 *   camera / photo library  ->  PhotoPreviewSection (OCR)  ->  review sheet  ->  Items tab
 *                                       |                          |
 *                              ocrService.recognizeText     itemService.saveDrafts
 *                                       |
 *                        itemService.extractItemsFromOCR (parse + expiry estimate)
 *
 * Nothing is persisted until the user taps "Save" on the review sheet, so OCR
 * noise can be removed line by line first.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, FlatList } from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Button, Text, ActivityIndicator, Dialog, Portal, List, IconButton } from 'react-native-paper';
import { AntDesign } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { DraftItem, itemService } from '../../services/api/ItemService';
import { expirationService } from '../../services/ExpirationService';
import { MainTabScreenProps } from '../../navigation/types';
import PhotoPreviewSection from '../../components/PhotoPreviewSection';

type Props = MainTabScreenProps<'Scan'>;

type Stage =
  | { kind: 'camera' }
  | { kind: 'preview'; uri: string }
  | { kind: 'parsing'; uri: string }
  | { kind: 'review'; uri: string; drafts: DraftItem[] };

const ScanScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [stage, setStage] = useState<Stage>({ kind: 'camera' });
  const [isSaving, setIsSaving] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  // Parsing/saving are async; a tab switch mid-way unmounts this screen.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reset = useCallback(() => setStage({ kind: 'camera' }), []);

  const toggleCameraFacing = () => setFacing((current) => (current === 'back' ? 'front' : 'back'));

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      // The OCR service uploads the file by URI, so we don't need base64 here.
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, exif: false });
      if (photo && mounted.current) setStage({ kind: 'preview', uri: photo.uri });
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Camera error', 'Failed to take picture. Please try again.');
    }
  };

  /** Handy on simulators, which have no camera. */
  const handlePickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0] && mounted.current) {
        setStage({ kind: 'preview', uri: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Photo library error', 'Could not open your photo library.');
    }
  };

  const handleTextRecognised = async (text: string) => {
    if (stage.kind !== 'preview') return;
    const { uri } = stage;
    setStage({ kind: 'parsing', uri });
    try {
      const drafts = await itemService.extractItemsFromOCR(text);
      if (!mounted.current) return;
      if (drafts.length === 0) {
        Alert.alert('No items found', 'We could not find any grocery lines on this receipt. Try a clearer photo.');
        setStage({ kind: 'preview', uri });
        return;
      }
      setStage({ kind: 'review', uri, drafts });
    } catch (error) {
      console.error('Error parsing receipt:', error);
      if (mounted.current) {
        Alert.alert('Error', 'Something went wrong while reading the receipt.');
        setStage({ kind: 'preview', uri });
      }
    }
  };

  const removeDraft = (index: number) => {
    if (stage.kind !== 'review') return;
    setStage({ ...stage, drafts: stage.drafts.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (stage.kind !== 'review' || !user) return;
    setIsSaving(true);
    try {
      await itemService.saveDrafts(user._id, stage.drafts);
      if (!mounted.current) return;
      reset();
      navigation.navigate('Items', { screen: 'ItemsList' });
    } catch (error) {
      console.error('Error saving items:', error);
      if (mounted.current) Alert.alert('Error', 'Could not save the items. Please try again.');
    } finally {
      if (mounted.current) setIsSaving(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <Button mode="contained" onPress={requestPermission}>
          Grant Permission
        </Button>
        <Button textColor="white" onPress={handlePickFromLibrary} style={styles.secondary}>
          Choose from library instead
        </Button>
      </View>
    );
  }

  if (stage.kind === 'preview' || stage.kind === 'parsing' || stage.kind === 'review') {
    return (
      <>
        <PhotoPreviewSection
          uri={stage.uri}
          onRetake={reset}
          onTextRecognised={handleTextRecognised}
          onError={(message) => Alert.alert('OCR failed', message)}
        />
        {stage.kind === 'parsing' && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.text}>Estimating expiry dates…</Text>
          </View>
        )}
        <Portal>
          <Dialog visible={stage.kind === 'review'} onDismiss={() => setStage({ kind: 'preview', uri: stage.uri })}>
            <Dialog.Title>Found {stage.kind === 'review' ? stage.drafts.length : 0} items</Dialog.Title>
            <Dialog.ScrollArea style={styles.reviewArea}>
              <FlatList
                data={stage.kind === 'review' ? stage.drafts : []}
                keyExtractor={(_, index) => String(index)}
                renderItem={({ item, index }) => (
                  <List.Item
                    title={item.name}
                    description={`${item.category} · ${expirationService.getExpirationMessage(item)}`}
                    right={() => <IconButton icon="close" accessibilityLabel="Remove" onPress={() => removeDraft(index)} />}
                  />
                )}
              />
            </Dialog.ScrollArea>
            <Dialog.Actions>
              <Button onPress={reset} disabled={isSaving}>
                Discard
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={isSaving}
                disabled={isSaving || stage.kind !== 'review' || stage.drafts.length === 0}
              >
                Save
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing} accessibilityLabel="Flip camera">
            <AntDesign name="retweet" size={36} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleTakePhoto} accessibilityLabel="Take photo">
            <AntDesign name="camera" size={44} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handlePickFromLibrary} accessibilityLabel="Choose photo">
            <AntDesign name="picture" size={36} color="white" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 32,
    marginBottom: 48,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 10,
    minHeight: 64,
  },
  text: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  secondary: {
    marginTop: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewArea: {
    maxHeight: 360,
    paddingHorizontal: 0,
  },
});

export default ScanScreen;
