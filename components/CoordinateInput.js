import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function CoordinateInput() {
  const [coords, setCoords] = useState('');
  const [isValid, setIsValid] = useState(true);

  const validateCoordinates = (text) => {
    setCoords(text);
    const regex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    setIsValid(regex.test(text.trim()));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Koordinat <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: isValid ? '#3B82F6' : '#EF4444' }, // blue or red
        ]}
        placeholder="latitude, longitude"
        value={coords}
        onChangeText={validateCoordinates}
        autoCapitalize="none"
      />
      {!isValid && (
        <Text style={styles.errorText}>
          Format tidak valid. Gunakan contoh: -6.200000, 106.816666
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 10
  },
   required: {
    color: 'red',
  },
  input: {
    borderWidth: 2,
    width: '95%',
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#EF4444',
    marginTop: 6,
    fontSize: 13,
  },
});
