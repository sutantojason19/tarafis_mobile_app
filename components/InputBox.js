import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function InputBox({ title, value, onChangeText, placeholder }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {title} <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginTop: 10
  },
  label: {
    color: 'black', 
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 6,
    paddingLeft: 5,
    paddingBottom: 10
  },
  required: {
    color: 'red',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#3B82F6', // blue border
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    width: '95%'
  },
});
