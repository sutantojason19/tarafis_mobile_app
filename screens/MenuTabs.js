// MenuTabs.js
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Header from '../components/Header';
import TaskCard from '../components/TaskCard';
import axios from 'axios';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.42;

// Change this to match your machine / environment. Use 10.0.2.2 for Android emulator.
const HOST = 'http://192.168.1.25:3000';

const FORM_TYPE_COLORS = {
  technician_service: '#22C55E', // tech_service
  technician_activity: '#3B82F6', // tech_activity
  'non-faskes': '#7C3AED',
  faskes: '#FCA5A5',
};

const getIconName = (formType) => {
  switch (formType) {
    case 'technician_service':
      return 'tools';
    case 'technician_activity':
      return 'chalkboard-teacher';
    case 'non-faskes':
      return 'briefcase';
    case 'faskes':
      return 'hospital';
    default:
      return 'file-alt';
  }
};

const formatAnyDate = (d) => {
  if (!d && d !== 0) return null;

  // If it's a Date already
  if (d instanceof Date) return d.toISOString().slice(0, 10);

  const s = String(d).trim();

  // already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ISO-like e.g. 2025-11-11T17:00:00.000Z
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);

  // created_at style '2025-11-17 15:24:01'
  if (/^\d{4}-\d{2}-\d{2}\s/.test(s)) return s.slice(0, 10);

  // fallback: try Date parse
  const p = Date.parse(s);
  if (!Number.isNaN(p)) return new Date(p).toISOString().slice(0, 10);

  return null;
};


const getCardTitle = (formType) => {
  switch (formType) {
    case 'technician_service':
      return 'Technician Service';
    case 'technician_activity':
      return 'Technician Activity';
    case 'non-faskes':
      return 'Sales Visit Non Faskes';
    case 'faskes':
      return 'Sales Visit Customer';
    default:
      return 'file-alt';
  }
};

export default function MenuTabs({ navigation }) {
  // add to top of component state
const [formList, setFormList] = useState([]);
const [loading, setLoading] = useState(false);
const [refreshing, setRefreshing] = useState(false);

// helper: make sure we always return an array
const ensureArray = (v) => {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
};

const getAllForms = async (userId) => {
  if (!userId) throw new Error('user_id is required');

  // NOTE: pick the correct host for your environment (10.0.2.2 for Android emulator)
  const host = 'http://192.168.1.25:3000';
  const resp = await axios.get(`${host}/api/forms/all`, { params: { user_id: userId } });

  // Debug: inspect raw response
  console.log('getAllForms resp.data:', resp.data);

  return {
    sales_visits: ensureArray(resp.data.sales_visits),
    technician_activities: ensureArray(resp.data.technician_activities),
    technician_services: ensureArray(resp.data.technician_services),
  };
};

const load = async () => {
  try {
    setLoading(true);
    // replace `1` with your real user id (or pull it from AsyncStorage)
    const result = await getAllForms(1);
    // merge arrays, filter falsy values
    const merged = [
      ...result.sales_visits,
      ...result.technician_activities,
      ...result.technician_services,
    ].filter(Boolean);

    console.log('merged length', merged.length);
    setFormList(merged);
  } catch (err) {
    console.error('load error', err);
    Alert.alert('Error', err.message || 'Failed to load forms');
    setFormList([]); // fallback to empty
  } finally {
    setLoading(false);
  }
};

// run once on mount (not depending on formList)
useEffect(() => {
  load();
}, []);

// pull-to-refresh
const onRefresh = async () => {
  try {
    setRefreshing(true);
    await load();
  } finally {
    setRefreshing(false);
  }
};


  // delete handler - optimistic update + server call
  const handleDelete = async (item) => {
    if (!item) return;

    const id = item.id ?? item.form_id;
    const form_type = item.form_type;
    const user_id = 1; // TODO: load real user id from auth/AsyncStorage

    if (!id || !form_type) {
      Alert.alert('Error', 'Missing form id or form type');
      return;
    }

    // optimistic local removal
    setFormList((prev) =>
      prev.filter((f) => {
        const fId = f.id ?? f.form_id;
        return !(String(fId) === String(id) && f.form_type === form_type);
      })
    );

    try {
      const url = `${HOST}/api/forms/${encodeURIComponent(form_type)}/${encodeURIComponent(id)}`;
      const resp = await axios.delete(url, { params: { user_id } });

      if (resp?.data?.affectedRows === 0) {
        Alert.alert('Not deleted', 'Form not found or no permission to delete.');
        // re-sync with server
        await loadForms({ userId: user_id, showLoader: false });
        return;
      }

      Alert.alert('Success', 'Form deleted.');
      // optionally re-sync: await loadForms({ userId, showLoader: false });
    } catch (err) {
      console.error('Delete error', err?.response || err);
      const msg = err?.response?.data?.message || err.message || 'Delete failed';
      Alert.alert('Error', msg);
      // revert optimistic removal by reloading
      await loadForms({ userId, showLoader: false });
    }
  };

  // render empty list placeholder
  const renderEmpty = () => {
  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;
  return <Text style={{ marginTop: 12, color: '#6B7280' }}>No tasks created yet.</Text>;
};

  return (
    <View style={styles.container}>
      <Header title={'Tasks'} navigation={navigation} />

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

        <FlatList
          data={formList}
          keyExtractor={(item) => `${item.form_type}-${item.id}`}
          ListEmptyComponent={renderEmpty}
          renderItem={({ item }) => (
            <TaskCard
              title={getCardTitle(item.form_type)}
              iconName={getIconName(item.form_type)}
              date={
                formatAnyDate(item.tanggal_aktivitas) ||
                formatAnyDate(item.tanggal_pengambilan) ||
                formatAnyDate(item.created_at) ||
                ''
              }

              formTypeColor={FORM_TYPE_COLORS[item.form_type] || '#9CA3AF'}
              onEdit={() => navigation.navigate('CardInfo', { data: item })}
              onDelete={() => handleDelete(item)}
            />
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  taskCardTitle: {
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
    flex: 1,
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
  createdCard: { height: 100, width: '95%' },
  smallCard: { height: 130 },
  smallCardCard: { height: 130 }, // used for gradient small card
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
