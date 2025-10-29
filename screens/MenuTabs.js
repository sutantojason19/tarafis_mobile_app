import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';


const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.42;

export default function MenuTabs({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tasks</Text>

      <View style={styles.row}>
        {/* Left Column */}
        <View style={styles.column}>
          <TouchableOpacity onPress={() => navigation.navigate('Form1')}>
            <LinearGradient colors={['#60A5FA', '#3B82F6']} style={[styles.card, styles.largeCard]}>
              <MaterialCommunityIcons name="hospital-building" size={48} color="#fff" style={{ marginBottom: 12 }} />
              <Text style={styles.cardTitle}>Sales Visit Faskes</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Form3')}>
            <View style={[styles.card, styles.smallCard, { backgroundColor: '#FCA5A5' }]}>
              <FontAwesome5 name="chalkboard-teacher" size={38} color="#fff" style={{ marginBottom: 12 }} />
              <Text style={styles.cardTitle}>Technician Activity</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Right Column */}
        <View style={styles.column}>
          <TouchableOpacity onPress={() => navigation.navigate('Form2')}>
            <LinearGradient colors={['#A78BFA', '#7C3AED']} style={[styles.card, styles.smallCard]}>
              <FontAwesome5 name="briefcase" size={38} color="#fff" style={{ marginBottom: 12 }} />
              <Text style={styles.cardTitle}>Sales Visit Non Faskes</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Form4')}>
            <View style={[styles.card, styles.largeCard, { backgroundColor: '#86EFAC' }]}>
              <FontAwesome5 name="tools" size={38} color="#fff" style={{ marginBottom: 12 }} />
              <Text style={styles.cardTitle}>Technician Service In House</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View>
        <Text style={styles.header2}>Created Tasks</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: COLUMN_WIDTH,
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: 20,
  },
  largeCard: {
    height: 200,
  },
  smallCard: {
    height: 130,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#F3F4F6',
    marginTop: 8,
  },
  header2:{
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 25,
    alignSelf: 'flex-start',
  },
});
