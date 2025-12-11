/**
 * Header Component
 * -----------------
 * A reusable gradient header used across multiple screens.
 *
 * Features:
 * - Displays a back arrow icon that navigates to the previous screen.
 * - Shows a large title centered vertically within a curved gradient header.
 * - Uses expo-linear-gradient for smooth UI styling.
 *
 * Props:
 * - title (string)        : Text displayed in the header.
 * - navigation (object)   : React Navigation object, used for navigating back.
 *
 * UI Notes:
 * - The header is positioned absolutely at the top and uses rounded bottom corners
 *   to match the app's visual design.
 * - The height is fixed at 32% of the screen for a bold, modern header style.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function Header({ title, navigation }) {
  return (
    <LinearGradient
      colors={['#60A5FA', '#3B82F6']}  // Blue gradient background
      start={{ x: 0, y: 0 }}           // Gradient direction: top-left → bottom-right
      end={{ x: 1, y: 1 }}
      style={styles.headerContainer}
    >
      <View style={styles.headerContent}>

        {/* Back button */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5 name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Header Title */}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
    </LinearGradient>
  );
}

/* ------------------------------------------
 * Styles
 * ------------------------------------------ */
const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '32%',                  // Large, curved header at the top
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
    paddingHorizontal: 25,
    paddingBottom: 20,
    justifyContent: 'center',
    zIndex: 0,                       // Places behind other UI elements if required
    overflow: 'hidden',              // Ensures curved corners clip properly
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginLeft: 15,                  // Space between icon and title
  },
});
