import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

const CameraInput = ({ title, onImageSelected, image }) => {
  const ensureAssetShape = (asset) => {
    if (!asset) return null;
    const uri = asset.uri ?? asset;
    // try to derive a filename if missing
    let name = asset.fileName || asset.name;
    if (!name && typeof uri === "string") {
      const parts = uri.split("/");
      name = parts[parts.length - 1].split("?")[0];
    }
    // try to derive a mime type from extension (best-effort)
    let type = asset.type;
    if (!type && name) {
      const ext = name.split(".").pop()?.toLowerCase();
      if (ext === "jpg" || ext === "jpeg") type = "image/jpeg";
      else if (ext === "png") type = "image/png";
      else if (ext === "heic") type = "image/heic";
    }
    return { uri, fileName: name, type };
  };

  const pickImage = async () => {
    try {
      // request both permissions up front
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      const media = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cam.status !== "granted" || media.status !== "granted") {
        Alert.alert("Permission required", "Camera and media permissions are needed.");
        return;
      }

      Alert.alert(
        "Pilih Sumber Gambar",
        null,
        [
          {
            text: "Kamera",
            onPress: async () => {
              try {
                const result = await ImagePicker.launchCameraAsync({
                  allowsEditing: true,
                  aspect: [4, 3],
                  quality: 0.8,
                });
                if (!result.canceled) {
                  const picked = result.assets[0];
                  const normalized = ensureAssetShape(picked);
                  onImageSelected?.(normalized);
                }
              } catch (err) {
                console.warn("Camera error:", err);
                Alert.alert("Error", "Gagal membuka kamera.");
              }
            },
          },
          {
            text: "Batal",
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    } catch (err) {
      console.warn("Permission / picker error:", err);
      Alert.alert("Error", "Tidak dapat mengakses kamera/galeri.");
    }
  };

  const previewUri = image?.uri || image;

  return (
    <View style={styles.container}>
      {title !== 'none' && (
        <Text style={styles.title}>
          {title}
          <Text style={styles.required}> *</Text>
        </Text>
      )}


      <TouchableOpacity style={styles.button} onPress={pickImage} activeOpacity={0.8}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.preview} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={28} color="#fff" />
            <Text style={styles.buttonText}>Take a Photo</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 10 },
  required: { color: "red" },
  button: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { color: "#fff", marginTop: 4, fontWeight: "500" },
  preview: { width: 120, height: 120, borderRadius: 12 },
});

export default CameraInput;
