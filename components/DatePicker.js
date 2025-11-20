import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format } from "date-fns";

export default function DatePicker({onConfirm, value}) {
  // const [date, setDate] = useState(null);
  const [isPickerVisible, setPickerVisible] = useState(false);

  const showPicker = () => setPickerVisible(true);
  const hidePicker = () => setPickerVisible(false);

  const handleConfirm = (selectedDate) => {
    // setDate(selectedDate);
    hidePicker();
    onConfirm(selectedDate);
  };
  

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={showPicker} style={styles.button} activeOpacity={0.9}>
        <Text style={styles.buttonText}>{value ? format(value, "PPP") : "Select Date"}</Text>
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hidePicker}
        buttonTextColorIOS="#3B82F6"
        accentColor="#3B82F6"
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
  button: {
  backgroundColor: '#3B82F6',
  paddingVertical: 16,
  paddingHorizontal: 24,
  borderRadius: 18,
  justifyContent: "center",
  alignItems: "center",
  shadowOffset: { width: 0, height: 6 }, 
  shadowOpacity: 0.12, 
  shadowRadius: 12,
  elevation: 6,
 },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});