/**
 * DropdownPicker Component
 * -------------------------
 * A custom dropdown selector styled for mobile use. Displays a label,
 * a pressable "dropdown" field, and a modal with scrollable options.
 *
 * Props:
 *  @param {string} title                         - Label displayed above the picker.
 *  @param {Array<{label: string, value: any}>} options - List of selectable items.
 *  @param {function} onSelect                    - Callback fired when user selects an option (returns the value).
 *  @param {any} value                            - Current selected value (controlled component).
 *
 * Behavior:
 *  - When the dropdown is pressed, a modal slides up showing all options.
 *  - User taps an option → modal closes → selected value is emitted via onSelect().
 *  - `value` determines which item is currently selected.
 *
 * Notes:
 *  - This is a **controlled component**: parent holds actual value state.
 *  - Modal is dimmed and centered for better UX.
 *  - FlatList is used inside a maxHeight wrapper for scrollability.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function DropdownPicker({ title, options = [], onSelect, value }) {
  // Modal open/close state
  const [modalVisible, setModalVisible] = useState(false);

  /**
   * Find the selected option object based on the given value.
   * If value doesn't match any option, selected = null.
   */
  const selected = options.find(o => o.value === value) || null;

  /**
   * Handle selecting an option from the modal.
   * - Close modal
   * - Inform parent through onSelect callback
   */
  const handleSelect = (item) => {
    setModalVisible(false);
    onSelect?.(item.value); // optional chaining prevents errors
  };

  return (
    <View style={styles.container}>
      {/* ---- Dropdown Label ---- */}
      <Text style={styles.label}>
        {title} <Text style={styles.required}>*</Text>
      </Text>

      {/* ---- Dropdown Field (Press to open modal) ---- */}
      <TouchableOpacity
        style={styles.dropdownBox}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={[
            styles.dropdownText,
            // Show placeholder gray text when no selection
            { color: selected ? '#111827' : '#9CA3AF' },
          ]}
        >
          {selected ? selected.label : 'Pilih salah satu'}
        </Text>

        {/* Chevron icon on the right side */}
        <FontAwesome5 name="chevron-down" size={16} color="#3B82F6" />
      </TouchableOpacity>

      {/* ---- Options Modal ---- */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            
            {/* Modal Title */}
            <Text style={styles.modalTitle}>{title}</Text>

            {/* Limit height so long lists scroll properly */}
            <View style={{ maxHeight: 400 }}>
              <FlatList
                data={options}
                keyExtractor={(item) => item.value.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.optionText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />
                )}
                showsVerticalScrollIndicator={true}
              />
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Tutup</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}

// ----- Styles -----
const styles = StyleSheet.create({
  container: { marginBottom: 20 },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
    marginTop: 10,
  },

  required: { color: '#EF4444' },

  dropdownBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    width: '95%',
  },

  dropdownText: {
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },

  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  optionText: { fontSize: 16, color: '#111827' },

  closeButton: {
    marginTop: 15,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },

  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
