import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function Header({ title, navigation }) {
  const onBack = () => {
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation && navigation.navigate) {
      navigation.navigate('Menu');
    }
  };

  return (
    <LinearGradient
      colors={['#60A5FA', '#3B82F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerContainer}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
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
    height: 180,
    borderBottomLeftRadius: 90,
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 20,
    justifyContent: 'center',

    // Important: make header sit above other views so touches aren't blocked
    zIndex: 1000,       // iOS stacking
    elevation: 20,      // Android stacking

    // overflow: 'hidden' is okay for rounded corners but won't block touches;
    // keep if you need rounded clipping
    overflow: 'hidden',
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center', // vertically center icon + title
  },

  backButton: {
    padding: 8,          // bigger tappable area and visible spacing
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
  },
});
