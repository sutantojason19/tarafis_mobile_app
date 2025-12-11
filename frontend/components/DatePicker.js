/**
 * DatePicker Component
 * --------------------
 * A reusable date selection component built on top of
 * `react-native-modal-datetime-picker`.
 *
 * Props:
 *  @param {function(Date)} onConfirm - Callback fired when the user selects a date.
 *                                      Receives the JavaScript Date object.
 *
 *  @param {Date|null} value - The currently selected date.
 *                             If provided, it will be displayed in formatted text.
 *
 * Features:
 *  - Opens a modal date picker when pressed.
 *  - Formats dates using `date-fns` (format: "PPP" → e.g., Jan 10, 2025)
 *  - Hides the picker after confirmation or cancellation.
 *  - Provides a consistent UI button for picking dates inside forms.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format } from "date-fns";

export default function DatePicker({ onConfirm, value }) {
  // Controls the visibility of the date picker modal
  const [isPickerVisible, setPickerVisible] = useState(false);

  // Show modal
  const showPicker = () => setPickerVisible(true);

  // Hide modal
  const hidePicker = () => setPickerVisible(false);

  /**
   * handleConfirm
   * -------------
   * Triggered when the user selects a date in the modal.
   * - Hides the picker
   * - Sends the selected date to parent component via `onConfirm`
   */
  const handleConfirm = (selectedDate) => {
    hidePicker();
    onConfirm(selectedDate);
  };

  return (
    <View style={styles.container}>
      {/* Button that opens the date picker modal */}
      <TouchableOpacity
        onPress={showPicker}
        style={styles.button}
        activeOpacity={0.9}
      >
        <Text style={styles.buttonText}>
          {/* Display formatted date if available, otherwise placeholder */}
          {value ? format(value, "PPP") : "Select Date"}
        </Text>
      </TouchableOpacity>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode="date" // Only date, no time
        onConfirm={handleConfirm}
        onCancel={hidePicker}
        buttonTextColorIOS="#3B82F6" // iOS button accent color
        accentColor="#3B82F6"        // Android accent color
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    padding: 10,
    backgroundColor: "transparent",
  },

  // Touchable button that opens the modal
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",

    // Shadow styling
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },

  // Date text displayed inside button
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
