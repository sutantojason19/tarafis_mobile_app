import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MultiSelectCheckbox = ({ title, options, selected, onChange, otherValue, onOtherChange }) => {
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
          <Ionicons
            name={selected.includes(option) ? "checkbox" : "square-outline"}
            size={24}
            color="#3B82F6"
            style={styles.checkboxContainer}
          />
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}

      {/* Single "Other" Input Field */}
      <View style={styles.otherContainer}>
        <Text style={styles.otherLabel}>Lainnya:</Text>
        <TextInput
          value={otherValue}
          onChangeText={onOtherChange}
          placeholder="Tulis opsi lainnya..."
          style={styles.otherInput}
          placeholderTextColor="#9CA3AF"
        />
      </View>
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
    width: "95%",
    marginBottom: 10,
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
  otherContainer: {
    marginTop: 8,
  },
  otherLabel: {
    fontSize: 16,
    color: "#3B82F6",
    marginBottom: 6,
  },
  otherInput: {
    borderWidth: 1,
    borderColor: "#3B82F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    color: "#111827",
  },
});

export default MultiSelectCheckbox;
