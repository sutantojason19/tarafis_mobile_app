/**
 * MultiSelectCheckbox
 * --------------------
 * Reusable component that displays a list of options as checkboxes + a single
 * "Other" text input field to allow users to type a custom option.
 *
 * Props:
 * - title (string)                  : Section label shown at the top.
 * - options (string[])              : List of selectable checkbox options.
 * - selected (string[])             : Array of currently selected option values.
 * - onChange (function)             : Callback invoked when any option is toggled.
 *                                      Receives updated array of selected items.
 * - otherValue (string)             : Current text inside the custom "Other" input.
 * - onOtherChange (function)        : Callback called when the user types in the "Other" field.
 *
 * Behavior:
 * - Clicking a checkbox toggles that option in/out of the `selected` array.
 * - The Ionicons checkbox visually updates depending on selection state.
 * - The "Other" input is separate from the checkbox list but typically combined
 *   by the parent into the final list of selected values.
 *
 * Usage Notes:
 * - `selected` MUST be controlled by the parent. This component does not manage
 *   internal state for selected options.
 * - The parent should merge `selected` + `otherValue` when sending data to server.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MultiSelectCheckbox = ({
  title,
  options = [],
  selected = [],
  onChange,
  otherValue,
  onOtherChange,
}) => {
  /**
   * handleToggle(option)
   * --------------------
   * Add or remove the selected option.
   */
  const handleToggle = (option) => {
    const isSelected = selected.includes(option);

    if (isSelected) {
      // Remove option
      onChange(selected.filter((item) => item !== option));
    } else {
      // Add option
      onChange([...selected, option]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Render checkbox list */}
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={styles.optionRow}
          onPress={() => handleToggle(option)}
          activeOpacity={0.7}
        >
          {/* Checkbox icon */}
          <Ionicons
            name={selected.includes(option) ? "checkbox" : "square-outline"}
            size={24}
            color="#3B82F6"
            style={styles.checkboxContainer}
          />

          {/* Label */}
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}

      {/* Custom "Other" field */}
      <View style={styles.otherContainer}>
        <Text style={styles.otherLabel}>Lainnya:</Text>

        <TextInput
          value={otherValue}
          onChangeText={onOtherChange}
          placeholder="Tulis opsi lainnya..."
          placeholderTextColor="#9CA3AF"
          style={styles.otherInput}
        />
      </View>
    </View>
  );
};

/* --------------------------
 * Component Styles
 * -------------------------- */
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
