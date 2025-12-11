/**
 * InputBox Component
 * ------------------
 * A reusable text input field used across forms.
 *
 * Props:
 * - title (string): Label shown above the input. Automatically displays a red "*" for required fields.
 * - value (string): Current value of the text input (controlled component).
 * - onChangeText (function): Callback fired when the user types. Receives the new text value.
 * - placeholder (string): Placeholder text shown when input is empty.
 *
 * Features:
 * - Consistent styling for all app input fields.
 * - Required indicator UI included automatically.
 * - Controlled input behavior to prevent uncontrolled state issues.
 */
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function InputBox({ title, value, onChangeText, placeholder }) {
  return (
    <View style={styles.container}>

      {/* Label Section */}
      <Text style={styles.label}>
        {title} <Text style={styles.required}>*</Text>
      </Text>

      {/* Input Field */}
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

/* ------------------------------------------
 * Styles
 * ------------------------------------------ */
const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginTop: 10,
  },

  label: {
    color: 'black',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 6,
    paddingLeft: 5,
    paddingBottom: 10,
  },

  required: {
    color: 'red',
  },

  input: {
    borderWidth: 1.5,
    borderColor: '#3B82F6', // Consistent blue border used across the app
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    width: '95%',
  },
});
