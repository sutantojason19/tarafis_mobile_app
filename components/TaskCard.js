// components/TaskCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'; // or 'react-native-vector-icons/FontAwesome5' if not using expo

export default function TaskCard({
  title = 'Technician Service',
  iconName = 'tools',
  onDelete = null,
  onView = null,    // optional callback, otherwise navigates to 'ViewForm'
  onEdit = null,    // optional callback, otherwise navigates to 'Form4'
  formTypeColor = '#22C55E',
  date = '12-8-2025'
}) {
  const navigation = useNavigation();

  const handleView = () => {
    if (typeof onView === 'function') return onView();
    navigation.navigate('ViewForm');
  };

  const handleEdit = () => {
    if (typeof onEdit === 'function') return onEdit();
    navigation.navigate('Form4');
  };

  return (
    <View style={[styles.card, { backgroundColor: formTypeColor }]}>
      {/* Top row: Icon + Title */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrapper, { backgroundColor: '#F3F4F6' }]}>
          <FontAwesome5 name={iconName} size={22} color= {formTypeColor} />
        </View>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
      </View>


      {/* Action buttons */}
      <View style={styles.actionRow}>
        {/* <TouchableOpacity style={styles.actionBtn} onPress={handleView}>
          <FontAwesome5 name="eye" size={16} color="#3B82F6" style={styles.iconSpacing} />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity> */}

        <TouchableOpacity style={styles.actionBtn} onPress={handleEdit}>
          <FontAwesome5 name="edit" size={16} color="#10B981" style={styles.iconSpacing} />
          <Text style={styles.actionText}>View / Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <FontAwesome5 name="trash" size={16} color="#EF4444" style={styles.iconSpacing} />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '95%',
    backgroundColor: '#fff', // card background (white)
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 5,
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

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
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
    marginRight: 8, // replaces gap
  },

  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});
