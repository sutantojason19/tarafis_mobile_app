/**
 * Login.js
 * --------
 * This screen handles user authentication for the Tarafis mobile application.
 *
 * Features:
 * • Collects email and password input.
 * • Sends a POST request to the backend `/api/users/login` endpoint.
 * • Stores the JWT token and user_id in AsyncStorage upon successful login.
 * • Redirects the user to the main application (`MainApp → Menu`) using `navigation.replace`
 *   so users cannot navigate back to the login screen after signing in.
 *
 * Backend Interaction:
 * • API base URL is taken from the environment variable `API_URL`.
 * • Includes a fallback IP address to support local LAN debugging.
 * • Validates backend response content-type to avoid JSON parsing errors.
 *
 * UX Features:
 * • Gradient-styled login header matching app branding.
 * • Bottom card-like UI containing input fields and button.
 * • `KeyboardAvoidingView` ensures fields stay visible when typing.
 *
 * Security Notes:
 * • Passwords are not stored locally.
 * • Only the JWT token and user ID are persisted.
 *
 * Navigation:
 * • After logging in, user is redirected via `navigation.replace()` for cleaner navigation stack.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login({ navigation }) {
  // Form state for login credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /**
   * Attempts to authenticate with the backend API.
   * On success:
   *  - Stores token + user_id in AsyncStorage
   *  - Navigates user into the main application via `navigation.replace`
   */
 const onLogin = async () => {
    try {
      // Normalize API URL (remove trailing slashes)
      const base = (API_URL || '').replace(/\/+$/g, '');
      const baseWithFallback = base || 'http://192.168.1.3:3000';
      const url = `${baseWithFallback}/api/users/login`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        alert('Server error: invalid response');
        return;
      }

      const data = await response.json();

      if (response.ok) {
        alert('Welcome ' + data.user?.name);

        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user_id', String(data.user?.user_id));
        await AsyncStorage.setItem('position', String(data.user?.position));

        navigation.replace('MainApp', { screen: 'Menu' });
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      alert(
        'A network or server error occurred.' +
        (err?.message ? `\n\nDetails: ${err.message}` : '')
      );
    }
  };



  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>

        {/* Top gradient header section */}
        <LinearGradient
          colors={['#60A5FA', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topSection}
        >
          <Text style={styles.headerText}>Welcome</Text>
          <Text style={styles.subHeaderText}>Sign in!</Text>
        </LinearGradient>

        {/* Bottom white card section containing inputs */}
        <View style={styles.bottomSection}>
          <View style={styles.form}>

            {/* Email input */}
            <Text style={styles.label}>Gmail</Text>
            <TextInput
              style={styles.input}
              placeholder="youremail@gmail.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            {/* Password input */}
            <Text style={[styles.label, { marginTop: 20 }]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {/* Info / help link */}
            <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 10 }}>
              <Text style={styles.forgotText}>Forgot password? Contact IT support</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity style={{ marginTop: 30 }} onPress={onLogin}>
              <LinearGradient
                colors={['#60A5FA', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>SIGN IN</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* IT support message */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don’t have an account? </Text>
              <TouchableOpacity>
                <Text style={styles.signupLink}>Contact IT support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

/* -------------------- Styles -------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header gradient
  topSection: {
    flex: 0.35,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },

  headerText: {
    color: 'white',
    fontSize: 36,
    fontWeight: '700',
  },

  subHeaderText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 5,
  },

  // White rounded panel section
  bottomSection: {
    flex: 0.65,
    backgroundColor: 'white',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -30, // overlay effect on gradient
    paddingHorizontal: 30,
    paddingTop: 40,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },

  label: {
    color: '#1E40AF',
    fontWeight: '600',
    marginBottom: 8,
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingVertical: 8,
    color: '#1E293B',
  },

  forgotText: {
    color: '#3B82F6',
    fontWeight: '500',
  },

  button: {
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },

  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },

  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },

  signupText: {
    color: '#6B7280',
  },

  signupLink: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});
