import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image  } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LandingLogo from '../assets/Logo_tagline_Tarafis.png';
import { useNavigation } from '@react-navigation/native'; // ✅ add this

// import { API_URL } from '@env';
      {/* Centered logo and text together */}
      {/* {
console.log('Loaded API_URL:', API_URL)
} */}



export default function Landing() {
  const navigation = useNavigation(); // ✅ define navigation here
  return (
    <LinearGradient
      colors={['#3B82F6', '#93C5FD', '#FFFFFF']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >

      <View style={styles.centerContent}>
        <View style={styles.imgContainer}>
          <Image style={styles.img} source={LandingLogo} />
        </View>
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
    marginBottom: 80,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  img: {
  height: 350,
  width: 350,
  borderRadius: 40,
  backgroundColor: '#fff', // important for Android shadow visibility
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.35,
  shadowRadius: 16.0,
  elevation: 12, // Android equivalent
  marginBottom: 20,
}


  
});
