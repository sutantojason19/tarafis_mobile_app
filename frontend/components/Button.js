/**
 * Reusable Button Component
 * -------------------------
 * Supports two main use cases:
 *
 * 1. Footer button  (type="footer")
 *    - Typically used for submission or navigation at the bottom of a form.
 *
 * 2. Pagination buttons (type="pagination")
 *    - Special styling for "Next" and "Back" buttons.
 *    - "Next" → primary blue button
 *    - "Back" → outlined secondary button
 *
 * Props:
 * - title (string): Text displayed inside the button.
 * - type  ("footer" | "pagination"): Determines styling behavior.
 * - onPress (function): Callback executed when user taps the button.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';

export default function Button({ title, type = 'footer', onPress }) {
  // Determine dynamic styles based on button context
  const isPrimary = type === 'pagination' && title === 'Next';
  const isSecondary = type === 'pagination' && title === 'Back';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,

        // Footer button style (blue background)
        type === 'footer' && styles.footerButton,

        // Pagination styles
        isPrimary && styles.nextButton,
        isSecondary && styles.backButton,
      ]}
    >
      <Text
        style={[
          styles.text,                // default text style
          isPrimary && styles.whiteText,
          isSecondary && styles.blueText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Base button container
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer button (solid blue)
  footerButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
  },

  // Pagination "Next" button (primary)
  nextButton: {
    backgroundColor: '#3B82F6',
    flex: 1,
  },

  // Pagination "Back" button (secondary outline)
  backButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#fff',
    flex: 1,
  },

  // Default text styling
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  // White text for primary actions
  whiteText: {
    color: '#fff',
  },

  // Blue text for outlined secondary actions
  blueText: {
    color: '#3B82F6',
  },
});
