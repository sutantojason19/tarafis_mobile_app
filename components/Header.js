import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function Header({ title, navigation }) {

  return (
    <LinearGradient
      colors={['#60A5FA', '#3B82F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerContainer}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5 name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{title}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
    headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '32%',
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
    paddingHorizontal: 25,
    paddingTop: 0,
    paddingBottom: 20,
    justifyContent: 'center',
    zIndex: 0, // sits behind
    overflow: 'hidden'
    },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginLeft: 15,
  },
});
