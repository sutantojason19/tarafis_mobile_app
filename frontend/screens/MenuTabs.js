/**
 * MenuTabs.js
 * -----------
 * Main dashboard screen that serves as the landing page after login.
 *
 * Responsibilities:
 * - Load the logged-in user's role (position) from AsyncStorage
 * - Conditionally render quick-action cards based on role:
 *    • Sales → Sales forms only
 *    • Technician → Technician forms only
 * - Fetch all created forms for the user from the backend
 * - Display created forms in a scrollable list
 * - Support pull-to-refresh and empty/loading states
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

/* ------------------------------------------------------------------
 * Layout constants
 * ------------------------------------------------------------------ */

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.42;

/**
 * Color mapping for different form types.
 * Used when rendering TaskCard components.
 */
const FORM_TYPE_COLORS = {
  technician_service: '#22C55E',
  technician_activity: '#3B82F6',
  'non-faskes': '#7C3AED',
  faskes: '#FCA5A5',
};

/**
 * getIconName(formType)
 * --------------------
 * Maps backend form_type values to FontAwesome icon names.
 *
 * @param {string} formType
 * @returns {string} icon name
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
 * ----------------
 * Normalizes multiple possible date formats into YYYY-MM-DD.
 * Safely handles Date objects, ISO strings, and SQL timestamps.
 *
 * @param {Date|string|null} d
 * @returns {string|null}
 */
const formatAnyDate = (d) => {
  if (!d && d !== 0) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);

  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}\s/.test(s)) return s.slice(0, 10);

  const p = Date.parse(s);
  if (!Number.isNaN(p)) return new Date(p).toISOString().slice(0, 10);
  return null;
};

/**
 * getCardTitle(formType)
 * ---------------------
 * Converts backend form_type values into human-readable titles.
 *
 * @param {string} formType
 * @returns {string}
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
  /** List of all fetched forms (merged from multiple endpoints) */
  const [formList, setFormList] = useState([]);

  /** Loading indicator for initial fetch */
  const [loading, setLoading] = useState(false);

  /** Pull-to-refresh loading state */
  const [refreshing, setRefreshing] = useState(false);

  /**
   * User position / role.
   * Expected values:
   *  - 'sales'
   *  - 'technician'
   */
  const [position, setPosition] = useState(null);

  /* ------------------------------------------------------------------
   * Load user position (role) from AsyncStorage
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const loadPosition = async () => {
      try {
        const storedPosition = await AsyncStorage.getItem('position');
        if (storedPosition) {
          setPosition(storedPosition);
        }
      } catch (e) {
        console.error('Failed to load position', e);
      }
    };

    loadPosition();
  }, []);

  /**
   * ensureArray(value)
   * ------------------
   * Normalizes backend responses so we always work with arrays.
   *
   * @param {any} v
   * @returns {Array}
   */
  const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

  /**
   * getAllForms(userId)
   * ------------------
   * Fetches all form types for the given user from the backend
   * and normalizes them into arrays.
   *
   * @param {string|number} userId
   * @returns {Promise<Object>}
   */
  const getAllForms = async (userId) => {
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
   * Main data loader:
   * - Reads user_id from AsyncStorage
   * - Fetches all forms
   * - Merges them into a single list for display
   */
  const load = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('user_id');
      const result = await getAllForms(userId);

      const merged = [
        ...result.sales_visits,
        ...result.technician_activities,
        ...result.technician_services,
      ].filter(Boolean);

      setFormList(merged);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load forms');
      setFormList([]);
    } finally {
      setLoading(false);
    }
  };

  /** Load data once on component mount */
  useEffect(() => {
    load();
  }, []);

  /**
   * onRefresh()
   * -----------
   * Pull-to-refresh handler for FlatList
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /**
   * renderEmpty()
   * -------------
   * Renders empty or loading state for the task list.
   */
  const renderEmpty = () => {
    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;
    return <Text style={{ marginTop: 12, color: '#6B7280' }}>No tasks created yet.</Text>;
  };

  /* ------------------------------------------------------------------
   * Guard: wait until user position is loaded
   * ------------------------------------------------------------------ */
  if (!position) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </View>
    );
  }

  /* ------------------------------------------------------------------
   * Render
   * ------------------------------------------------------------------ */
  return (
    <View style={styles.container}>
      <Header title={'Tasks'} navigation={navigation} />

      <View style={styles.content}>
        <View style={styles.row}>
          {/* LEFT COLUMN */}
          <View style={styles.column}>
            {position?.toLowerCase() === 'sales' && (
              <TouchableOpacity onPress={() => navigation.navigate('Form1')}>
                <View style={[styles.card, styles.largeCard, { backgroundColor: '#FCA5A5' }]}>
                  <MaterialCommunityIcons name="hospital-building" size={48} color="#fff" />
                  <Text style={styles.cardTitle}>Sales Visit Customer</Text>
                </View>
              </TouchableOpacity>
            )}

            {position?.toLowerCase() === 'technician' && (
              <TouchableOpacity onPress={() => navigation.navigate('Form3')}>
                <LinearGradient colors={['#60A5FA', '#3B82F6']} style={[styles.card, styles.smallCard]}>
                  <FontAwesome5 name="chalkboard-teacher" size={38} color="#fff" />
                  <Text style={styles.cardTitle}>Technician Activity</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* RIGHT COLUMN */}
          <View style={styles.column}>
            {position?.toLowerCase() === 'sales' && (
              <TouchableOpacity onPress={() => navigation.navigate('Form2')}>
                <LinearGradient colors={['#A78BFA', '#7C3AED']} style={[styles.card, styles.smallCard]}>
                  <FontAwesome5 name="briefcase" size={38} color="#fff" />
                  <Text style={styles.cardTitle}>Sales Visit Non Faskes</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {position?.toLowerCase() === 'technician' && (
              <TouchableOpacity onPress={() => navigation.navigate('Form4')}>
                <View style={[styles.card, styles.largeCard, { backgroundColor: '#86EFAC' }]}>
                  <FontAwesome5 name="tools" size={38} color="#fff" />
                  <Text style={styles.cardTitle}>Technician Service In House</Text>
                </View>
              </TouchableOpacity>
            )}
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
                formatAnyDate(item.created_at)
              }
              formTypeColor={FORM_TYPE_COLORS[item.form_type]}
              onEdit={() => navigation.navigate('CardInfo', { data: item })}
            />
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------
 * Styles
 * ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { marginTop: 180, paddingHorizontal: 20, flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { width: COLUMN_WIDTH },
  card: {
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 15,
    marginBottom: 20,
    elevation: 6,
  },
  largeCard: { height: 200 },
  smallCard: { height: 130 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 12 },
  header2: { fontSize: 18, fontWeight: 'bold', marginTop: 25 },
});
