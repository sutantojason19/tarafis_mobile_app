/**
 * SearchBar
 * ----------
 * Reusable searchable dropdown that opens a modal and allows selecting a hospital.
 *
 * Props:
 * - title (string)        : Label text shown above the control.
 * - onPress (function)    : Callback invoked when an item is selected.
 *                          Signature: onPress(selectedName: string, street: string)
 * - value (object|null)   : Current selected value (optional). Expected shape: { label: string, ... }
 * - hospitalData (Array)  : Array of hospital objects to search. Each item should contain at least:
 *                          { hospital_id, name, street, ... }
 *
 * Behavior:
 * - Tapping the control opens a modal with a search input and list of results.
 * - Typing filters the list (case-insensitive).
 * - Selecting an item closes the modal, clears the query, and calls onPress(item.name, item.street).
 *
 * Notes:
 * - The component uses a simple client-side filter. For very large datasets consider server-side search.
 * - The FlatList now uses the filtered list to render results (fixes a previous bug where full data was shown).
 */

import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchBar = ({ title = 'Search', onPress, value = null, hospitalData = [] }) => {
  // Modal visibility state
  const [modalVisible, setModalVisible] = useState(false);

  // Local search query typed by the user
  const [query, setQuery] = useState('');

  /**
   * Compute the filtered list from hospitalData and query.
   * useMemo avoids recomputing on unrelated re-renders.
   */
  const filteredData = useMemo(() => {
    const list = hospitalData ?? [];
    const q = (query ?? '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => (item.name ?? '').toLowerCase().includes(q));
  }, [hospitalData, query]);

  /**
   * handleSelect
   * - Called when the user selects an item from the list.
   * - Closes the modal, resets the query, and invokes the parent callback with name and street.
   */
  const handleSelect = (item) => {
    setModalVisible(false);
    setQuery('');
    if (typeof onPress === 'function') {
      onPress(item.name, item.street);
    }
  };

  return (
    <View style={styles.container}>
      {/* Label with required marker */}
      <Text style={styles.label}>
        {title} <Text style={{ color: 'red' }}>*</Text>
      </Text>

      {/* Tappable control which opens the modal */}
      <TouchableOpacity style={styles.dropdownWrapper} onPress={() => setModalVisible(true)}>
        <Ionicons name="search" size={20} color="#3B82F6" style={styles.icon} />

        <View style={styles.dropdown}>
          {/* If a value prop is provided, show its label, otherwise placeholder */}
          <Text style={value ? styles.selectedTextStyle : styles.placeholderStyle}>
            {value ? value.label : 'Search hospital...'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Modal containing search input and results */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal header with back icon */}
          <View style={styles.modalHeader}>
            <Ionicons
              name="arrow-back"
              size={24}
              color="#3B82F6"
              onPress={() => setModalVisible(false)}
            />
            <Text style={styles.modalTitle}>Select Hospital</Text>
          </View>

          {/* Search input row */}
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={20} color="#3B82F6" style={styles.modalSearchIcon} />
            <TextInput
              style={styles.inputSearchStyle}
              placeholder="Type to search..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>

          {/* Results list: render filteredData (client-side filtering) */}
          <FlatList
            data={filteredData}
            keyExtractor={(item) => String(item.hospital_id ?? item.id ?? item.name)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <TouchableOpacity style={styles.itemContainerStyle} onPress={() => handleSelect(item)}>
                <Text style={styles.itemText}>{(item.name || '').replace(/_/g, ' ')}</Text>

                {/* Divider between items (avoid rendering after last visible filtered item) */}
                {index < filteredData.length - 1 && <View style={styles.divider} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ padding: 16 }}>
                <Text style={{ color: '#666' }}>No hospitals found.</Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

/* -------------------------
 * Styles
 * ------------------------- */
const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 10,
    paddingRight: 10,
  },
  label: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  dropdownWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    borderRadius: 15,
    paddingLeft: 38,
    height: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'center',
  },
  placeholderStyle: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  selectedTextStyle: {
    color: '#111827',
    fontSize: 15,
  },
  icon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  modalSearchIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  inputSearchStyle: {
    flex: 1,
    height: 46,
    fontSize: 15,
    borderRadius: 15,
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    paddingLeft: 38,
    color: '#111827',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemText: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#3B82F6',
  },
  divider: {
    height: 1,
    backgroundColor: '#3B82F6',
    marginHorizontal: 10,
  },
  itemContainerStyle: {
    borderRadius: 10,
  },
});

export default SearchBar;
