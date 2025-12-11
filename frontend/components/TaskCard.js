/**
 * TaskCard
 * --------
 * Small presentational card used throughout the app to show a single form/task entry.
 *
 * Responsibilities:
 * - Display a compact card with an icon, title and date.
 * - Expose action buttons (View / Edit, Delete) with safe callback handling.
 *
 * Props:
 * - title (string)            - visible title shown on the card (default: 'Technician Service')
 * - iconName (string)         - FontAwesome5 icon name to show inside the avatar (default: 'tools')
 * - onDelete (function|null)  - optional callback invoked when user taps Delete
 * - onView (function|null)    - optional callback invoked to view the item (not used by default UI)
 * - onEdit (function|null)    - optional callback invoked when user taps View / Edit
 * - formTypeColor (string)    - background color for the card header/icon area (default: green)
 * - date (string)             - human-readable date string to show under the title
 *
 * Notes:
 * - This component uses @expo/vector-icons (FontAwesome5). If you are not using Expo,
 *   install `react-native-vector-icons` and configure it according to its docs.
 * - The card text color assumes `formTypeColor` is dark enough to contrast; adjust if needed.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons'; // replace with 'react-native-vector-icons/FontAwesome5' if not using Expo

export default function TaskCard({
  title = 'Technician Service',
  iconName = 'tools',
  onDelete = null,
  onView = null, // optional callback (not used by default UI)
  onEdit = null, // optional callback (if null, no-op)
  formTypeColor = '#22C55E',
  date = '12-8-2025',
}) {
  const navigation = useNavigation();

  /**
   * handleEdit
   * - Calls provided onEdit callback if present.
   * - Otherwise, attempts a safe navigation fallback to 'Form4' (if available).
   */
  const handleEdit = useCallback(() => {
    if (typeof onEdit === 'function') {
      return onEdit();
    }
    // Fallback navigation: try to navigate to a sensible screen if available.
    // This keeps the component safe to use in contexts where the parent doesn't provide onEdit.
    if (navigation?.navigate) {
      try {
        navigation.navigate('Form4');
      } catch (e) {
        // swallow navigation error — parent should handle navigation when needed
        // console.debug('navigation to Form4 failed', e);
      }
    }
  }, [onEdit, navigation]);

  /**
   * handleDelete
   * - Calls the onDelete callback if provided; otherwise it's a no-op.
   * - Keeping deletion logic out of the presentational component is intentional:
   *   parent should present confirmation dialogs and perform API deletion.
   */
  const handleDelete = useCallback(() => {
    if (typeof onDelete === 'function') {
      return onDelete();
    }
    // no-op if parent doesn't provide deletion handler
    return null;
  }, [onDelete]);

  return (
    <View style={[styles.card, { backgroundColor: formTypeColor }]}>
      {/* Top row: icon avatar + title/date */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrapper, { backgroundColor: '#F3F4F6' }]}>
          <FontAwesome5 name={iconName} size={22} color={formTypeColor} />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
      </View>

      {/* Action buttons: View/Edit and Delete */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleEdit}
          accessibilityRole="button"
          accessibilityLabel={`View or edit ${title}`}
        >
          <FontAwesome5 name="edit" size={16} color="#10B981" style={styles.iconSpacing} />
          <Text style={styles.actionText}>View / Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}
        >
          <FontAwesome5 name="trash" size={16} color="#EF4444" style={styles.iconSpacing} />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* -------------------------
 * Styles
 * ------------------------- */

const styles = StyleSheet.create({
  card: {
    width: '95%',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 5, // Android shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 16,
    alignSelf: 'center',
    marginTop: 15,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  titleContainer: {
    flex: 1, // allow title to shrink nicely when long
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff', // expects formTypeColor to be a darker color for contrast
    flexShrink: 1,
  },

  cardDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    flexShrink: 1,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 6,
  },

  iconSpacing: {
    marginRight: 8, // visual gap between icon and text
  },

  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});
