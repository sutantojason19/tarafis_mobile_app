import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'

export default function Button({title, type="footer", onPress}) {
    const isPrimary = type === 'pagination' && title === 'Next';
    const isSecondary = type === 'pagination' && title === 'Back';

  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, type === 'footer' && styles.footerButton, isPrimary&& styles.nextButton, isSecondary && styles.backButton]}>
      <Text style={[isPrimary && styles.whiteText, isSecondary && styles.blueText]}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
    button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
  },
  nextButton: {
    backgroundColor: '#3B82F6',
    flex: 1,
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#fff',
    flex: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  whiteText: {
    color: '#fff',
  },
  blueText: {
    color: '#3B82F6',
  }
})