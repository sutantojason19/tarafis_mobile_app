import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient';
import Button from './Button';
import { FontAwesome5 } from '@expo/vector-icons';

export default function Footer({ mode = 'footer', title }) {
    const onPress = () => {
        alert('Congrats you submitted your form')
    }

    const handleBack = () => {
        alert('Back button pressed')
    }

    const handleNext = () => {
        alert('Next button pressed')
    }
  return (
    <>
      {mode === 'pagination' ? (
        <View style={{flexDirection:'row', gap:'8', padding: 24}}>
          <Button onPress={handleBack} title={'Back'} type='pagination'/>
          <Button onPress={handleNext} title={'Next'} type='pagination'/>
        </View>
      ) : (
        <TouchableOpacity 
            onPress={onPress}
            style={{
                justifyContent: 'center', 
                alignItems: 'center', 
                marginVertical: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 8, // Android shadow
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
                flexDirection:'row'

                }}
            >
                <Text 
                style={{
                    color: 'white',
                    fontSize: 18,
                    fontWeight: '700',
                    textAlign: 'center',
                    textShadowColor: 'rgba(0,0,0,0.3)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 3,
                }}
                >
                Submit
                </Text>
                <FontAwesome5 style={{marginLeft: 20}} size={20} name='arrow-right' color='white'/>

            </LinearGradient>
            </TouchableOpacity>
      )}
    </>
  );
}


const styles = StyleSheet.create({
  button3: {
    paddingVertical: 20,
    paddingHorizontal: 100,
    borderRadius: 8,
    shadowOffset: { width: -3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 6,
    alignSelf: 'center',
    width: 100
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