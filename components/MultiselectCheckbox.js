import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // make sure you have expo/vector-icons or react-native-vector-icons

const MultiSelectCheckbox = ({ title, options, selected, onChange }) => {
  const handleToggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={styles.optionRow}
          onPress={() => handleToggle(option)}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxContainer}>
            {selected.includes(option) ? (
              <Ionicons name="checkbox" size={24} color="#3B82F6" />
            ) : (
              <Ionicons name="square-outline" size={24} color="#3B82F6" />
            )}
          </View>
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    width:'95%',
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#3B82F6",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  checkboxContainer: {
    marginRight: 10,
  },
  optionText: {
    fontSize: 16,
    color: "#3B82F6",
  },
});

export default MultiSelectCheckbox;
