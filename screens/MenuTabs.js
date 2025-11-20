import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Header from '../components/Header';


const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.42;

export default function MenuTabs({ navigation }) {

  const onDelete = () => {
    alert('Delete Function')
  }
  return (
    <View style={styles.container}>
      {/* Header */}
      <Header title={'Tasks'} navigation={navigation} />

      {/* Page content */}
      <View style={styles.content}>
        <View style={styles.row}>
          {/* Left Column */}
          <View style={styles.column}>
            <TouchableOpacity onPress={() => navigation.navigate('Form1')}>
              <View style={[styles.card, styles.largeCard, { backgroundColor: '#FCA5A5' }]}>
                <MaterialCommunityIcons name="hospital-building" size={48} color="#fff" style={{ marginBottom: 12 }} />
                <Text style={styles.cardTitle}>Sales Visit Customer</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Form3')}>
              {/* <View style={[styles.card, styles.smallCard, { backgroundColor: '#FCA5A5' }]}> */}
              <LinearGradient colors={['#60A5FA', '#3B82F6']} style={[styles.card, styles.smallCardCard]}>

                <FontAwesome5 name="chalkboard-teacher" size={38} color="#fff" style={{ marginBottom: 12 }} />
                <Text style={styles.cardTitle}>Technician Activity</Text>
              </LinearGradient>
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

        <Text style={styles.header2}>Created Tasks</Text>
         
      </View>
    </View>
  );
}




const styles = StyleSheet.create({
  taskCardTitle:{
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  content: {
    marginTop: 180, // moves cards down to overlap header nicely
    paddingHorizontal: 20,
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
  largeCard: { height: 200 },
  createdCard:{height: 100, width: '95%'},
  smallCard: { height: 130 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  header2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 25,
  },
});

