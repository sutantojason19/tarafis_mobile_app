/**
 * Landing.js
 * ----------
 * A simple welcome / splash-style screen shown when the app opens.
 *
 * Features:
 * • Displays the Tarafis branding/logo in the center of the screen.
 * • Uses a vertical gradient background for a polished look.
 * • Provides a single "Sign In" button that takes the user to the Login screen.
 *
 * Navigation:
 * • Uses `navigation.replace('Login')` to prevent returning back to the
 *   landing screen after signing in (cleans up navigation history).
 *
 * This component is intentionally minimal and acts as the entry point before authentication.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LandingLogo from '../assets/Logo_tagline_Tarafis.png';
import { useNavigation } from '@react-navigation/native';

export default function Landing() {
  const navigation = useNavigation(); // Access navigation inside a functional component

  return (
    <LinearGradient
      colors={['#3B82F6', '#93C5FD', '#FFFFFF']}  // blue → lighter blue → white fade
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >

      {/* Centered logo + title */}
      <View style={styles.centerContent}>
        <View style={styles.imgContainer}>
          {/* App branding logo */}
          <Image style={styles.img} source={LandingLogo} />
        </View>

        {/* Welcome text */}
        <Text style={styles.title}>Welcome Back!</Text>
      </View>

      {/* Primary action button (bottom) */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.replace('Login')} // Replace so user cannot go back to landing
      >
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between', // space between center content and bottom button
    alignItems: 'center',
    paddingVertical: 40,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30, // adds spacing around the logo + text group
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    marginTop: 30, // space between logo and title
  },

  /* Bottom sign-in button */
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 25,
    marginBottom: 80, // lifted up from bottom
  },

  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  /* Logo image styling with shadow for elevation */
  img: {
    height: 350,
    width: 350,
    borderRadius: 40,
    backgroundColor: '#fff',           // required for Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,                      // Android shadow
    marginBottom: 20,
  },
});
