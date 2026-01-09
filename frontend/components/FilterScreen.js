/**
 * FilterScreen
 * --------------------------------------------------
 * Full-screen filter UI for filtering form records.
 *
 * Features:
 * - Multi-select form type filters (pill/chip UI)
 * - Date range filtering (start date / end date)
 * - Clear all / clear per section
 * - Apply filters and return values to previous screen
 *
 * Expected route params:
 * - initialFilters: {
 *     formTypes: string[],
 *     dateFrom: Date | null,
 *     dateTo: Date | null
 *   }
 * - onApply: (filters) => void
 *
 * Notes:
 * - Uses @react-native-community/datetimepicker for native date selection
 * - Filter state is fully controlled and serializable
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';


/* ------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------ */

/**
 * Supported form types and their UI colors.
 * These keys should match backend `form_type` values.
 */
const FORM_TYPES = [
  { key: 'technician_service', label: 'Technician Service', color: '#22C55E' },
  { key: 'technician_activity', label: 'Technician Activity', color: '#3B82F6' },
  { key: 'non-faskes', label: 'Non-Faskes', color: '#7C3AED' },
  { key: 'faskes', label: 'Faskes', color: '#FCA5A5' },
];

/* ------------------------------------------------------------------
 * Presentational Components
 * ------------------------------------------------------------------ */

/**
 * FilterPill
 *
 * Reusable pill/chip used for multi-select filters.
 */
const FilterPill = ({ label, selected, color, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.pill,
      { backgroundColor: selected ? color : '#F1F5F9' },
    ]}
  >
    <Text
      style={{
        color: selected ? '#fff' : '#334155',
        fontWeight: '600',
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

/* ------------------------------------------------------------------
 * Main Screen Component
 * ------------------------------------------------------------------ */

export default function FilterScreen({ navigation, route }) {
  /**
   * Initial filter state (restored from parent screen if available).
   */
  const initialFilters = route?.params?.initialFilters || {
    formTypes: [],
    dateFrom: null,
    dateTo: null,
  };

  const [filters, setFilters] = useState(initialFilters);

  /**
   * Tracks which date picker is currently open.
   * Values: 'from' | 'to' | null
   */
   const [openPicker, setOpenPicker] = useState(null);
   const [tempDate, setTempDate] = useState(null);


   /**
    * Close date picker without applying changes
    */
    const cancelPicker = () => {
        setOpenPicker(null);
        setTempDate(null);
    };


  /* -------------------------
   * Actions
   * ------------------------- */

  /**
   * Reset all filters to default state.
   */
  const clearAll = () => {
    setFilters({
      formTypes: [],
      dateFrom: null,
      dateTo: null,
    });
  };

  /**
   * Apply filters and return them to the calling screen.
   */
  const applyFilters = () => {
    route.params?.onApply?.(filters);
    navigation.goBack();
  };

  /**
   * Handle date picker changes for both start and end date.
   */
  const onDateChange = (_event, selectedDate) => {
    if (!selectedDate) return;
    setTempDate(selectedDate);
  };
  
  const confirmPicker = () => {
    if (!tempDate) return;

    setFilters(prev => ({
      ...prev,
      [openPicker === 'from' ? 'dateFrom' : 'dateTo']: tempDate,
    }));

    setTempDate(null);
    setOpenPicker(null);
  };

  /**
   * Toggle a form type in the multi-select list.
   */
  const toggleFormType = (key) => {
    setFilters(prev => ({
      ...prev,
      formTypes: prev.formTypes.includes(key)
        ? prev.formTypes.filter(t => t !== key)
        : [...prev.formTypes, key],
    }));
  };

  /* -------------------------
   * Render
   * ------------------------- */

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Filters</Text>

            <TouchableOpacity style={{backgroundColor:'#EDEDED', padding: 10, borderRadius: 20}} onPress={clearAll}>
            <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            {/* FORM TYPES */}
            <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Form Types</Text>
                <TouchableOpacity
                onPress={() =>
                    setFilters(prev => ({ ...prev, formTypes: [] }))
                }
                >
                <Text style={styles.sectionClear}>Clear</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.pillContainer}>
                {FORM_TYPES.map(ft => (
                <FilterPill
                    key={ft.key}
                    label={ft.label}
                    color={ft.color}
                    selected={filters.formTypes.includes(ft.key)}
                    onPress={() => toggleFormType(ft.key)}
                />
                ))}
            </View>
            </View>

            {/* DATE RANGE */}
            <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Date Range</Text>
                <TouchableOpacity
                onPress={() =>
                    setFilters(prev => ({ ...prev, dateFrom: null, dateTo: null }))
                }
                >
                <Text style={styles.sectionClear}>Clear</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.dateInput}
               onPress={() => {
                  setTempDate(filters.dateFrom || new Date());
                  setOpenPicker('from');
                }}>
                <Text>
                {filters.dateFrom
                    ? filters.dateFrom.toDateString()
                    : 'Start date'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  setTempDate(filters.dateTo || new Date());
                  setOpenPicker('to');
                }}>
                <Text>
                {filters.dateTo
                    ? filters.dateTo.toDateString()
                    : 'End date'}
                </Text>
            </TouchableOpacity>
            </View>
        </ScrollView>

        {/* APPLY BUTTON */}
            {!openPicker && (
            <View style={styles.footer}>
                <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyText}>Show results</Text>
                </TouchableOpacity>
            </View>
            )}

        {/* DATE PICKER */}
        {openPicker && (
        <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
            {/* Picker Header */}
            <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={cancelPicker}>
                <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>

                <Text style={styles.pickerTitle}>
                {openPicker === 'from' ? 'Start Date' : 'End Date'}
                </Text>

                <TouchableOpacity onPress={confirmPicker}>
                <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
            </View>

            {/* Date Picker */}
            <DateTimePicker
                value={tempDate || new Date()}
                mode="date"
                display="spinner"
                onChange={onDateChange}
            />
            </View>
        </View>
        )}

        </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------
 * Styles
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center',
  },
  backText: { fontSize: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  clearText: { color: 'black', fontWeight: '600' },

  content: { padding: 16, paddingBottom: 120 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionClear: { color: '#3B82F6', fontWeight: '600', textDecorationLine:'underline'},

  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  applyButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  applyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  pickerOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.3)', // dim background
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
},

pickerContainer: {
  backgroundColor: '#fff',
  borderRadius: 16,
  paddingVertical: 12,
  paddingHorizontal: 8,
  width: '90%',
  maxWidth: 360,
},
safeArea: {
  flex: 1,
  backgroundColor: '#fff',
},

pickerHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingBottom: 8,
  borderBottomWidth: 1,
  borderColor: '#E5E7EB',
},

pickerCancel: {
  color: '#6B7280',
  fontSize: 16,
  fontWeight: '600',
},

pickerDone: {
  color: '#3B82F6',
  fontSize: 16,
  fontWeight: '700',
},

pickerTitle: {
  fontSize: 15,
  fontWeight: '600',
  color: '#111827',
},

});
