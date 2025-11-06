import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { Ionicons } from "@expo/vector-icons";

const SearchBar = ({ title }) => {
  const ITEM_HEIGHT = 48;
  const [value, setValue] = useState(null);

  const data = [
    { label: "Rumah Sakit Siloam", value: "1" },
    { label: "RS Premier Jakarta", value: "2" },
    { label: "RS Hermina Depok", value: "3" },
    { label: "RS Mayapada", value: "4" },
    { label: "RS Mitra Keluarga", value: "5" },
    { label: "RS Pondok Indah", value: "6" },
    { label: "RS Medistra", value: "7" },
    { label: "RS Fatmawati", value: "8" },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {title} <Text style={{ color: "red" }}>*</Text>
      </Text>

      <View style={styles.dropdownWrapper}>
        <Ionicons name="search" size={20} color="#60a5fa" style={styles.icon} />
        <Dropdown
          style={styles.dropdown}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          inputSearchStyle={styles.inputSearchStyle}
          containerStyle={styles.dropdownContainer}
          itemContainerStyle={styles.itemContainerStyle}
          iconStyle={styles.iconStyle}
          data={data}
          search
          maxHeight={250}
          labelField="label"
          valueField="value"
          placeholder="Search hospital..."
          searchPlaceholder="Type to search..."
          value={value}
          dropdownPosition="auto"

          onChange={(item) => setValue(item.value)}
          renderItem={(item, index) => (
            <View>
              <Text style={styles.itemText}>{item.label}</Text>
              {/* Add divider between items, except the last one */}
              {index < data.length - 1 && <View style={styles.divider} />}
            </View>
          )}
          flatListProps={{
            keyboardShouldPersistTaps: 'handled',
            initialNumToRender: 10,
            // ensure FlatList opens at top:
            initialScrollIndex: 0,
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 10,
    paddingRight: 10
  },
  label: {
    color: "#000",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  dropdownWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  dropdown: {
    backgroundColor: "#fff",
    borderColor: "#60a5fa",
    borderWidth: 1.5,
    borderRadius: 15,
    paddingLeft: 38,
    height: 46,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  placeholderStyle: {
    color: "#9CA3AF",
    fontSize: 15,
  },
  selectedTextStyle: {
    color: "#111827",
    fontSize: 15,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
    borderRadius: 10,
    borderColor: "#60a5fa",
    borderWidth: 1,
    paddingHorizontal: 10,
    color: "#111827",
  },
  iconStyle: {
    tintColor: "#60a5fa",
    width: 20,
    height: 20,
  },
  icon: {
    position: "absolute",
    left: 14,
    zIndex: 1,
  },
  itemText: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#60a5fa",
  },
  divider: {
    height: 1,
    backgroundColor: "#60a5fa",
    marginHorizontal: 10,
  },
    dropdownContainer: {
    borderRadius: 15,
    borderColor: "#60a5fa",
    borderWidth: 1.5,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  itemContainerStyle: {
  borderRadius: 10,
  },
});

export default SearchBar;
