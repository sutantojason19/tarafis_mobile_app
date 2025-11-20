import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SearchBar = ({ title, onPress, value }) => {
  const [modalVisible, setModalVisible] = useState(false);
  // const [value, setValue] = useState(null);
  const [query, setQuery] = useState("");

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

  const filteredData = data.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item) => {
    // setValue(item);
    setModalVisible(false);
    setQuery("");
    onPress(item)
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {title} <Text style={{ color: "red" }}>*</Text>
      </Text>

      {/* Search bar that opens modal */}
      <TouchableOpacity
        style={styles.dropdownWrapper}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="search" size={20} color="#3B82F6" style={styles.icon} />
        <View style={styles.dropdown}>
          <Text
            style={
              value
                ? styles.selectedTextStyle
                : styles.placeholderStyle
            }
          >
            {value ? value.label : "Search hospital..."}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Modal for searching */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Ionicons
              name="arrow-back"
              size={24}
              color="#3B82F6"
              onPress={() => setModalVisible(false)}
            />
            <Text style={styles.modalTitle}>Select Hospital</Text>
          </View>

          {/* Search input */}
          <View style={styles.searchBarWrapper}>
            <Ionicons
              name="search"
              size={20}
              color="#3B82F6"
              style={styles.modalSearchIcon}
            />
            <TextInput
              style={styles.inputSearchStyle}
              placeholder="Type to search..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>

          {/* Results list */}
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.itemContainerStyle}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.itemText}>{item.label}</Text>
                {index < filteredData.length - 1 && (
                  <View style={styles.divider} />
                )}
              </TouchableOpacity>
            )}
          />
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 10,
    paddingRight: 10,
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
    borderColor: "#3B82F6",
    borderWidth: 1.5,
    borderRadius: 15,
    paddingLeft: 38,
    height: 46,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: "center",
  },
  placeholderStyle: {
    color: "#9CA3AF",
    fontSize: 15,
  },
  selectedTextStyle: {
    color: "#111827",
    fontSize: 15,
  },
  icon: {
    position: "absolute",
    left: 14,
    zIndex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 12,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
  },
  modalSearchIcon: {
    position: "absolute",
    left: 14,
    zIndex: 1,
  },
  inputSearchStyle: {
    flex: 1,
    height: 46,
    fontSize: 15,
    borderRadius: 15,
    borderColor: "#3B82F6",
    borderWidth: 1.5,
    paddingLeft: 38,
    color: "#111827",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemText: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#3B82F6",
  },
  divider: {
    height: 1,
    backgroundColor: "#3B82F6",
    marginHorizontal: 10,
  },
  itemContainerStyle: {
    borderRadius: 10,
  },
});

export default SearchBar;
