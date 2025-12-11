/**
 * CameraInput
 * -----------
 * Small reusable image-picker button used in forms.
 *
 * Props:
 * - title (string): Label shown above the picker. Use 'none' to hide the label.
 * - onImageSelected (function): Callback invoked with a normalized asset object:
 *      { uri: string, fileName?: string, type?: string }
 *   The callback is only called when a user successfully picks/takes a photo.
 * - image (string|object): Optional preview image. Can be a string URI or an asset-like object.
 *
 * Behavior:
 * - Requests camera + media library permissions if needed.
 * - Gives the user a choice (Camera / Gallery) to select an image.
 * - Normalizes the picked image into a predictable shape suitable for FormData.
 *
 * Notes:
 * - This component uses expo-image-picker. On bare React Native you can use react-native-image-picker
 *   or adapt the permission logic accordingly.
 * - The normalization is best-effort: we try to derive a filename/type from the URI.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

/* ----------------------
 * Helper utilities
 * ---------------------- */

/**
 * Normalize an image "asset" into a predictable shape.
 * Accepts:
 *  - an object like { uri, fileName, type }
 *  - or a plain URI string
 *
 * Returns: { uri, fileName?, type? } or null
 */
function ensureAssetShape(asset) {
  if (!asset) return null;

  // The asset can be either an object with fields or a plain URI string
  const uri = typeof asset === 'string' ? asset : asset.uri ?? asset;

  // Attempt to determine a filename
  let name = asset?.fileName ?? asset?.name;
  if (!name && typeof uri === 'string') {
    // derive filename from uri path (strip query string)
    const parts = uri.split('/');
    name = parts[parts.length - 1].split('?')[0];
  }

  // Attempt to determine mime type based on extension (best effort)
  let type = asset?.type;
  if (!type && name) {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
    else if (ext === 'png') type = 'image/png';
    else if (ext === 'heic') type = 'image/heic';
  }

  return { uri, fileName: name, type };
}

/**
 * Request camera and media library permissions.
 * Returns an object { camera: 'granted'|'denied', media: 'granted'|'denied' }.
 */
async function requestPermissions() {
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return { camera: cam.status, media: media.status };
}

/* ----------------------
 * Component
 * ---------------------- */

const CameraInput = ({ title = 'Photo', onImageSelected, image }) => {
  // Normalize incoming preview prop to a URI for display
  const previewUri = (image && (typeof image === 'string' ? image : image.uri)) || null;

  // Launch the camera and handle the selection result
  const pickFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      // result.canceled is true when the user dismissed the UI
      if (result?.canceled) return;

      const picked = result.assets?.[0] ?? result; // support different shapes
      const normalized = ensureAssetShape(picked);
      if (normalized) onImageSelected?.(normalized);
    } catch (err) {
      console.warn('Camera error:', err);
      Alert.alert('Error', 'Gagal membuka kamera.');
    }
  };

  // Launch the image library (gallery) and handle the selection result
  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: false,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result?.canceled) return;

      const picked = result.assets?.[0] ?? result;
      const normalized = ensureAssetShape(picked);
      if (normalized) onImageSelected?.(normalized);
    } catch (err) {
      console.warn('Library picker error:', err);
      Alert.alert('Error', 'Gagal membuka galeri.');
    }
  };

  // Entry point when user taps the button: request permissions and show source choices
  const pickImage = async () => {
    try {
      const { camera, media } = await requestPermissions();

      // If either permission is denied, notify the user
      if (camera !== 'granted' || media !== 'granted') {
        Alert.alert('Permission required', 'Camera and media permissions are needed.');
        return;
      }

      // Offer both options: Camera or Gallery (Indonesian labels preserved)
      Alert.alert(
        'Pilih Sumber Gambar',
        null,
        [
          { text: 'Kamera', onPress: pickFromCamera },
          { text: 'Galeri', onPress: pickFromLibrary },
          { text: 'Batal', style: 'cancel' },
        ],
        { cancelable: true }
      );
    } catch (err) {
      console.warn('Permission / picker error:', err);
      Alert.alert('Error', 'Tidak dapat mengakses kamera/galeri.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Optional title; hide when title === 'none' */}
      {title !== 'none' && (
        <Text style={styles.title}>
          {title}
          <Text style={styles.required}> *</Text>
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={pickImage} activeOpacity={0.8}>
        {previewUri ? (
          // Show preview if an image/URI is provided
          <Image source={{ uri: previewUri }} style={styles.preview} />
        ) : (
          // Default empty state with camera icon and label
          <>
            <Ionicons name="camera-outline" size={28} color="#fff" />
            <Text style={styles.buttonText}>Take a Photo</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

/* ----------------------
 * Styles
 * ---------------------- */
const styles = StyleSheet.create({
  container: { marginVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  required: { color: 'red' },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', marginTop: 4, fontWeight: '500' },
  preview: { width: 120, height: 120, borderRadius: 12 },
});

export default CameraInput;
