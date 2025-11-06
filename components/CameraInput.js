import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

const CameraInput = ({ title, onImageSelected }) => {
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.status !== "granted" || mediaPermission.status !== "granted") {
      Alert.alert("Permission required", "Camera and media permissions are needed.");
      return;
    }

    Alert.alert(
      "Pilih Sumber Gambar",
      "Ambil foto baru atau pilih dari galeri?",
      [
        {
          text: "Kamera",
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled) {
              setImage(result.assets[0].uri);
              onImageSelected?.(result.assets[0]);
            }
          },
        },
        {
          text: "Galeri",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled) {
              setImage(result.assets[0].uri);
              onImageSelected?.(result.assets[0]);
            }
          },
        },
        { text: "Batal", style: "cancel" },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title} <Text style={styles.required}>*</Text>
      </Text>

      <TouchableOpacity style={styles.button} onPress={pickImage} activeOpacity={0.8}>
        {image ? (
          <Image source={{ uri: image }} style={styles.preview} />
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
  container: {
    marginVertical: 10,
    paddingHorizontal: 12
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  required: {
    color: "red",
  },
  button: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    marginTop: 4,
    fontWeight: "500",
  },
  preview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
});

export default CameraInput;
