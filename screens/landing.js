import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LandingLogo from '../components/LandingLogo';
import { useNavigation } from '@react-navigation/native'; // ✅ add this



export default function Landing() {
  const navigation = useNavigation(); // ✅ define navigation here
  return (
    <LinearGradient
      colors={['#3B82F6', '#93C5FD', '#FFFFFF']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Centered logo and text together */}
      <View style={styles.centerContent}>
        <LandingLogo width={350} height={350} />
        <Text style={styles.title}>Welcome Back!</Text>
      </View>

      {/* Button at Bottom */}
      <TouchableOpacity style={styles.button} onPress={() => navigation.replace('Login')} >
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30, // 30px space around logo/text group
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    marginTop: 30, // 30px gap between logo and text
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 25,
    marginBottom: 50,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
