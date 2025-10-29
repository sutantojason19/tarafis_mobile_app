import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Form1Screen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Form 1</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
});
