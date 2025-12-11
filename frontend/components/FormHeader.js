/**
 * FormHeader Component
 * --------------------
 * A reusable gradient header used across form-related screens.
 * It provides:
 *  - A back button with safe fallback navigation
 *  - A form title
 *  - A styled gradient background with curved bottom edges
 *
 * Navigation Behavior:
 *  - If `navigation.canGoBack()` is true → go back to previous screen.
 *  - If not, fallback to navigating to the "Menu" page (acts as a home screen).
 *
 * Props:
 *  @param {string} title        - The text displayed as the header title.
 *  @param {object} navigation   - React Navigation object for managing screen transitions.
 *
 * Accessibility:
 *  - Back button includes `hitSlop` to increase the tap area.
 *  - Includes proper accessibility labels and roles.
 *
 * UI:
 *  - Positioned absolutely at the top of the screen.
 *  - Gradient background using expo-linear-gradient.
 *  - Curved lower-left corner for visual design consistency across screens.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function FormHeader({ title, navigation }) {

  /**
   * onBack()
   * Handles safe back navigation:
   * - If the navigation stack can go back → call goBack().
   * - Otherwise navigate to the "Menu" screen.
   */
  const onBack = () => {
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation && navigation.navigate) {
      navigation.navigate('Menu');
    }
  };

  return (
    <LinearGradient
      colors={['#60A5FA', '#3B82F6']}  // Smooth blue gradient
      start={{ x: 0, y: 0 }}           // From top-left
      end={{ x: 1, y: 1 }}             // To bottom-right
      style={styles.headerContainer}
    >
      <View style={styles.headerContent}>

        {/* Back Button with accessible tap area */}
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}  // Easier to tap
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Header Title */}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
    </LinearGradient>
  );
}

/* ------------------------------------------------------
 * Styles
 * ------------------------------------------------------ */
const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',       // Stays fixed at the top
    top: 0,
    left: 0,
    right: 0,
    height: 180,                // Taller header for form pages
    borderBottomLeftRadius: 90,
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 20,
    justifyContent: 'center',

    // Ensures header appears ABOVE other components
    zIndex: 1000,               // iOS layering
    elevation: 20,              // Android layering

    overflow: 'hidden',         // Needed to clip curved corners
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',       // Vertically align icon + title
  },

  backButton: {
    padding: 8,                 // Larger tap area
    marginRight: 12,            // Space between icon and text
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
  },
});
