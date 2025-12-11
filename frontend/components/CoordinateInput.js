/**
 * CoordinateInput Component
 * -------------------------
 * A reusable input element specialized for retrieving and validating
 * the user's GPS coordinates using Expo Location. It is typically used
 * when submitting forms that require users to be physically near a target
 * (e.g., verifying presence at a hospital or customer site).
 *
 * Props:
 *  @param {function(string)} onPress - Called when valid coordinates are obtained.
 *                                      Receives a formatted string: "lat, lng".
 *
 *  @param {string|null} value        - The currently saved coordinate string
 *                                      (e.g. "1.234567, 103.987654").
 *
 *  @param {object|null} target       - A target location to validate against:
 *                                      { lat: number, lng: number }.
 *                                      The component ensures the user is within
 *                                      a 1 km threshold before accepting the coordinate.
 *
 * Features:
 *  - Fetches GPS location via Expo Location.
 *  - Validates coordinate formatting with a regex.
 *  - Computes distance using the Haversine formula.
 *  - Enforces a distance threshold (default: 1 km).
 *  - Displays warnings if user is too far from target.
 *  - Shows formatted GPS output in a styled input box.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from "@expo/vector-icons";

export default function CoordinateInput({ onPress, value, target }) {
  // Whether the coordinate format matches valid lat/lng syntax
  const [isValid, setIsValid] = useState(true);

  /**
   * Validate coordinate formatting using a strict regex:
   * Example accepted: -6.200000, 106.816666
   */
  const validateCoordinates = (text) => {
    const regex =
      /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    setIsValid(regex.test(text.trim()));
  };

  // Convert degrees → radians (utility for Haversine)
  const toRad = (deg) => (deg * Math.PI) / 180;

  /**
   * Haversine formula: compute great-circle distance (km)
   * between two latitude/longitude coordinate pairs.
   */
  const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * getLocation()
   * -------------
   * Requests the user's GPS location and checks whether they are
   * within 1 km of the provided `target` coordinate.
   *
   * If yes → calls onPress(formattedCoordinate)
   * If no  → alerts user with distance info
   */
  const getLocation = async () => {
    try {
      // Ensure valid target coordinate was provided
      if (!target || typeof target.lat !== 'number' || typeof target.lng !== 'number') {
        Alert.alert('Target coordinate missing', 'No target coordinate provided to check distance.');
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access location was denied');
        return;
      }

      // Retrieve GPS location
      const location = await Location.getCurrentPositionAsync({
        enableHighAccuracy: true,
      });

      const userLat = Number(location.coords.latitude);
      const userLng = Number(location.coords.longitude);

      // Format coordinate string
      const formatted = `${userLat.toFixed(6)}, ${userLng.toFixed(6)}`;

      // Validate coordinate for UI purposes
      validateCoordinates(formatted);

      // Calculate distance to the target
      const distanceKm = haversineDistanceKm(
        userLat,
        userLng,
        target.lat,
        target.lng
      );

      const thresholdKm = 1; // required radius

      if (distanceKm <= thresholdKm) {
        // User is close enough → return coordinate
        onPress && onPress(formatted);
      } else {
        // User is too far → show how far in meters
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
      {/* Label */}
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

        {/* "Ambil Lokasi" Button (fetch GPS) */}
        <TouchableOpacity style={styles.button} onPress={getLocation}>
          <Ionicons name="navigate-circle-outline" size={22} color="white" />
          <Text style={styles.buttonText}>Ambil Lokasi</Text>
        </TouchableOpacity>
      </View>

      {/* Error message when invalid coordinate formatting is detected */}
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
    marginTop: 10,
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
