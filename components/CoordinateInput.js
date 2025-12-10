import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from "@expo/vector-icons";

export default function CoordinateInput({ onPress, value, target }) {
  const [isValid, setIsValid] = useState(true);

  const validateCoordinates = (text) => {
    const regex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    setIsValid(regex.test(text.trim()));
  };

  // Haversine formula: returns distance in kilometers
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getLocation = async () => {
    try {
      // Ensure we have a target coordinate
      if (!target || typeof target.lat !== 'number' || typeof target.lng !== 'number') {
        Alert.alert('Target coordinate missing', 'No target coordinate provided to check distance.');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ enableHighAccuracy: true });
      const userLat = Number(location.coords.latitude);
      const userLng = Number(location.coords.longitude);

      // formatted string for display
      const formatted = `${userLat.toFixed(6)}, ${userLng.toFixed(6)}`;

      // validate format (for UI)
      validateCoordinates(formatted);

      // compute distance
      const distanceKm = haversineDistanceKm(userLat, userLng, target.lat, target.lng);

      // threshold in km
      const thresholdKm = 1;

      if (distanceKm <= thresholdKm) {
        // within radius -> call onPress with formatted coordinates
        onPress && onPress(formatted);
      } else {
        // not within radius -> alert user with distance
        const distanceMeters = Math.round(distanceKm * 1000);
        Alert.alert(
          'Move closer',
          `You are ${distanceMeters} meters away from the hospital. Please move closer (within ${thresholdKm * 1000} m).`
        );
      }
    } catch (err) {
      console.error('getLocation error', err);
      Alert.alert('Location error', 'Could not get location. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Koordinat <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.row}>
        {/* Coordinate Display Box */}
        <View
          style={[
            styles.coordBox,
            { borderColor: isValid ? '#3B82F6' : '#EF4444' },
          ]}
        >
          <Text style={styles.coordText}>
            {value ? value : 'Belum ada lokasi'}
          </Text>
        </View>

        {/* Button */}
        <TouchableOpacity style={styles.button} onPress={getLocation}>
          <Ionicons name="navigate-circle-outline" size={22} color="white" />
          <Text style={styles.buttonText}>Ambil Lokasi</Text>
        </TouchableOpacity>
      </View>

      {!isValid && (
        <Text style={styles.errorText}>
          Format tidak valid. Gunakan contoh: -6.200000, 106.816666
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingRight: 10,
    marginTop: 10
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  required: {
    color: '#EF4444',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coordBox: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
  },
  coordText: {
    fontSize: 15,
    color: '#374151',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    elevation: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    marginTop: 6,
    fontSize: 13,
  },
});
