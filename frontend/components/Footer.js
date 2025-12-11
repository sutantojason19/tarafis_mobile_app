/**
 * Footer Component
 * -----------------
 * A reusable footer that supports two display modes:
 *
 * 1) **Pagination Mode (`mode="pagination"`)**
 *    - Shows two side-by-side buttons: Back + Next.
 *    - Uses the shared <Button /> component.
 *
 * 2) **Footer Mode (`mode="footer"`, default)**
 *    - Shows a large rounded gradient "Submit" button.
 *    - Calls the `onPress` callback when tapped.
 *
 * Props:
 *  @param {string} mode       - Determines layout: "pagination" or "footer".
 *  @param {string} title      - (Unused currently for pagination, but available for expansion.)
 *  @param {function} onPress  - Called when the gradient Submit button is pressed (footer mode only).
 *
 * Notes:
 *  - In pagination mode, `handleBack` and `handleNext` currently show alerts.
 *    Future developers may replace them with real navigation callbacks.
 *  - The Submit button uses a LinearGradient and drop shadows for elevated styling.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Button from './Button';
import { FontAwesome5 } from '@expo/vector-icons';

export default function Footer({ mode = 'footer', title, onPress }) {
  
  /** 
   * Temporary handlers for Back/Next buttons.
   * These can be overridden or removed depending on future logic.
   */
  const handleBack = () => {
    alert('Back button pressed');
  };

  const handleNext = () => {
    alert('Next button pressed');
  };

  return (
    <>
      {/* PAGINATION MODE: Renders two equal-width buttons side-by-side */}
      {mode === 'pagination' ? (
        <View style={{ flexDirection: 'row', gap: '8', padding: 24 }}>
          <Button
            onPress={handleBack}
            title="Back"
            type="pagination"
          />
          <Button
            onPress={handleNext}
            title="Next"
            type="pagination"
          />
        </View>
      ) : (
        /* FOOTER MODE: Single centered "Submit" button with gradient styling */
        <TouchableOpacity
          onPress={onPress}
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 20,

            // Shadow for elevation (Android + iOS)
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 8,
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#60A5FA', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 180,
              height: 55,
              borderRadius: 15,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.4)',
              flexDirection: 'row',
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 18,
                fontWeight: '700',
                textAlign: 'center',

                // Subtle shadow on text
                textShadowColor: 'rgba(0,0,0,0.3)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 3,
              }}
            >
              Submit
            </Text>

            {/* Icon aligned to the right of text */}
            <FontAwesome5
              style={{ marginLeft: 20 }}
              size={20}
              name="arrow-right"
              color="white"
            />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Unused older styles kept for reference.
  button3: {
    paddingVertical: 20,
    paddingHorizontal: 100,
    borderRadius: 8,
    shadowOffset: { width: -3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 6,
    alignSelf: 'center',
    width: 100,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: -2, height: 2 },
    textShadowRadius: 1,
    textAlign: 'center',
  },
});
