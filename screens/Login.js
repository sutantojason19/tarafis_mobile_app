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

import {API_URL} from '@env'
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onLogin = async () => {
  try {
    const response = await fetch('http://192.168.1.29:3000/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert('Welcome ' + data.user.name);

      // Save the token and user_id correctly
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user_id', String(data.user.user_id));

      navigation.replace('MainApp', { screen: 'Menu' });
    } else {
      alert(data.message);
    }

  } catch (err) {
    console.error(err);
    alert('Connection error');
  }
};


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Top Section with Gradient */}
        <LinearGradient
          colors={['#60A5FA', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topSection}
        >
          <Text style={styles.headerText}>Hello</Text>
          <Text style={styles.subHeaderText}>Sign in!</Text>
        </LinearGradient>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.form}>
            <Text style={styles.label}>Gmail</Text>
            <TextInput
              style={styles.input}
              placeholder="youremail@gmail.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Text style={[styles.label, { marginTop: 20 }]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 10 }}>
              <Text style={styles.forgotText}>Forgot password? Contact IT support</Text>
            </TouchableOpacity>

            {/* Gradient Sign In Button */}
            <TouchableOpacity
              style={{ marginTop: 30 }}
              onPress={onLogin}
            >
              <LinearGradient
                colors={['#60A5FA', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>SIGN IN</Text>
              </LinearGradient>
            </TouchableOpacity>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
  bottomSection: {
    flex: 0.65,
    backgroundColor: 'white',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -30,
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

