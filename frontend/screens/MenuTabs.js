/**
 * MenuTabs.js
 * -----------
 * Main dashboard screen showing quick navigation cards and a list of created tasks.
 *
 * Responsibilities:
 *  - Render the four primary form entry shortcuts (Sales Visit Customer, Sales Visit Non-Faskes,
 *    Technician Activity, Technician Service).
 *  - Load all forms for the current user (sales visits, technician activities, technician services)
 *    from the backend and show them in a FlatList of TaskCard components.
 *  - Provide pull-to-refresh, optimistic delete behavior, and basic error handling.
 *
 * Important notes:
 *  - API base URL is read from environment via `API_URL`. Make sure it's set correctly in your .env.
 *  - For Android emulators you may need a different host (10.0.2.2) — keep that in mind when debugging.
 *  - The file normalizes different date string shapes into YYYY-MM-DD for display.
 */

import { useState, useEffect } from 'react';
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

import { API_URL } from '@env';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.42;

/* ------------------------------------------------------------------
 * Local configuration / constants
 * ------------------------------------------------------------------ */
// NOTE: This HOST constant is a convenience for local development / comments.
// Real network calls in this file use API_URL from the environment.
const HOST = 'http://192.168.1.20:3000';

// Visual mapping from form_type => color used by TaskCard
const FORM_TYPE_COLORS = {
  technician_service: '#22C55E',
  technician_activity: '#3B82F6',
  'non-faskes': '#7C3AED',
  faskes: '#FCA5A5',
};

/**
 * getIconName(formType)
 * ---------------------
 * Return a FontAwesome icon name that matches the given form type.
 */
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

/**
 * formatAnyDate(d)
 * -----------------
 * Normalize several common date representations into YYYY-MM-DD.
 * Handles:
 *  - Date objects
 *  - ISO timestamps
 *  - "created_at" style strings with time
 *  - Already formatted YYYY-MM-DD
 *
 * Returns: string 'YYYY-MM-DD' or null if unparseable.
 */
const formatAnyDate = (d) => {
  if (!d && d !== 0) return null;

  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10); // ISO
  if (/^\d{4}-\d{2}-\d{2}\s/.test(s)) return s.slice(0, 10); // 'YYYY-MM-DD HH:MM:SS'

  const p = Date.parse(s);
  if (!Number.isNaN(p)) return new Date(p).toISOString().slice(0, 10);

  return null;
};

/**
 * getCardTitle(formType)
 * ----------------------
 * Human-friendly title text for each form type shown on TaskCard.
 */
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
      return 'Form';
  }
};

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */
export default function MenuTabs({ navigation }) {
  // Local state
  const [formList, setFormList] = useState([]); // merged array of all forms
  const [loading, setLoading] = useState(false); // loader for initial load
  const [refreshing, setRefreshing] = useState(false); // loader for pull-to-refresh

  // Utility: ensure we always return an array from responses
  const ensureArray = (v) => {
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  };

  /**
   * getAllForms(userId)
   * -------------------
   * Fetches all forms for the given user from the backend.
   * The backend returns grouped data; this function normalizes it into arrays.
   *
   * Uses API_URL from environment. Make sure your .env is correct in production.
   */
  const getAllForms = async (userId) => {
    if (!userId) throw new Error('user_id is required');

    // Compose URL using API_URL and call backend
    const url = `${API_URL}/api/forms/all`;
    const resp = await axios.get(url, { params: { user_id: userId } });

    return {
      sales_visits: ensureArray(resp.data.sales_visits),
      technician_activities: ensureArray(resp.data.technician_activities),
      technician_services: ensureArray(resp.data.technician_services),
    };
  };

  /**
   * load()
   * ------
   * Top-level loader that fetches forms and merges them into a single list.
   * Uses a simple placeholder user id `1` here — replace with authenticated id.
   */
  const load = async () => {
    try {
      setLoading(true);
      // TODO: replace with real user id from AsyncStorage or auth state
      const result = await getAllForms(1);

      // Merge all arrays into one flat list for display
      const merged = [
        ...result.sales_visits,
        ...result.technician_activities,
        ...result.technician_services,
      ].filter(Boolean);

      setFormList(merged);
    } catch (err) {
      console.error('load error', err);
      Alert.alert('Error', err.message || 'Failed to load forms');
      setFormList([]); // graceful fallback
    } finally {
      setLoading(false);
    }
  };

  // Load once on component mount
  useEffect(() => {
    load();
  }, []);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * handleDelete(item)
   * ------------------
   * Optimistically remove the item from UI, then request server deletion.
   * If server deletion fails, attempt to reload data (to revert optimistic change).
   */
  const handleDelete = async (item) => {
    if (!item) return;

    const id = item.id ?? item.form_id;
    const form_type = item.form_type;
    const user_id = 1; // TODO: read actual user id from auth/AsyncStorage

    if (!id || !form_type) {
      Alert.alert('Error', 'Missing form id or form type');
      return;
    }

    // Optimistic UI update: remove item locally immediately
    setFormList((prev) =>
      prev.filter((f) => {
        const fId = f.id ?? f.form_id;
        return !(String(fId) === String(id) && f.form_type === form_type);
      })
    );

    try {
      const url = `${API_URL}/api/forms/${encodeURIComponent(form_type)}/${encodeURIComponent(id)}`;
      const resp = await axios.delete(url, { params: { user_id } });

      // Server indicates nothing changed
      if (resp?.data?.affectedRows === 0) {
        Alert.alert('Not deleted', 'Form not found or no permission to delete.');
        // Re-sync with server to restore state
        await load();
        return;
      }

      Alert.alert('Success', 'Form deleted.');
    } catch (err) {
      console.error('Delete error', err?.response || err);
      const msg = err?.response?.data?.message || err.message || 'Delete failed';
      Alert.alert('Error', msg);
      // Re-sync to revert optimistic removal
      await load();
    }
  };

  /**
   * renderEmpty()
   * -------------
   * Renders placeholder for an empty list.
   * Shows an ActivityIndicator while loading.
   */
  const renderEmpty = () => {
    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;
    return <Text style={{ marginTop: 12, color: '#6B7280' }}>No tasks created yet.</Text>;
  };

  /* -------------------------
   * Render
   * ------------------------- */
  return (
    <View style={styles.container}>
      {/* Header with title and back behavior handled inside Header component */}
      <Header title={'Tasks'} navigation={navigation} />

      <View style={styles.content}>
        {/* Top quick-action cards laid out in two columns */}
        <View style={styles.row}>
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

        {/* List header */}
        <Text style={styles.header2}>Created Tasks</Text>

        {/* Tasks list */}
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
              onEdit={() => navigation.navigate('CardInfo', {
                data: item,
                formTypeColor: FORM_TYPE_COLORS[item.form_type],
              })}
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

/* ------------------------------------------------------------------
 * Styles
 * ------------------------------------------------------------------ */
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
    marginTop: 180, // moves cards down so they overlap the header visually
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
  smallCardCard: { height: 130 }, // for gradient-style small card
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
