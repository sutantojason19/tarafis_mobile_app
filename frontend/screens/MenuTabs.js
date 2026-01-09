import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  RefreshControl,
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
 */
const FORM_TYPE_COLORS = {
  technician_service: '#22C55E',
  technician_activity: '#3B82F6',
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
  if (d instanceof Date) return d.toISOString().slice(0, 10);

  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}\s/.test(s)) return s.slice(0, 10);

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
      return 'Form';
  }
};

/** -------------------------------------------------------------
 * Remove duplicates by form_type+id
 * ------------------------------------------------------------- */
const dedupeById = (arr) => {
  const map = new Map();
  arr.forEach(item => {
    const key = `${item.form_type}-${item.id}`;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
};

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */

export default function MenuTabs({ navigation }) {
  const [formList, setFormList] = useState([]);
  const [filteredFormList, setFilteredFormList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState({
    formTypes: [],
    dateFrom: null,
    dateTo: null,
  });

  const [position, setPosition] = useState(null);

  useEffect(() => {
    const loadPosition = async () => {
      try {
        const storedPosition = await AsyncStorage.getItem('position');
        if (storedPosition) setPosition(storedPosition);
      } catch (e) {
        console.error('Failed to load position', e);
      }
    };
    loadPosition();
  }, []);

  const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

  const applyClientFilters = () => {
    let result = [...formList];

    if (filters.formTypes.length > 0) {
      result = result.filter(item =>
        filters.formTypes.includes(item.form_type)
      );
    }

    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom
        ? new Date(filters.dateFrom).setHours(0, 0, 0, 0)
        : null;

      const to = filters.dateTo
        ? new Date(filters.dateTo).setHours(23, 59, 59, 999)
        : null;

      result = result.filter(item => {
        const rawDate =
          item.tanggal_aktivitas ||
          item.tanggal_pengambilan ||
          item.created_at;

        const normalized = formatAnyDate(rawDate);
        if (!normalized) return false;

        const itemTime = new Date(normalized).getTime();
        if (from && itemTime < from) return false;
        if (to && itemTime > to) return false;

        return true;
      });
    }

    setFilteredFormList(result);
  };

  useEffect(() => {
    applyClientFilters();
  }, [filters, formList]);

  const getAllForms = async (userId) => {
    const hardCode = 'http://192.168.1.14:3000';
    const url = `${hardCode}/api/forms/all`;
    const resp = await axios.get(url, { params: { user_id: userId } });

    return {
      sales_visits: ensureArray(resp.data.sales_visits),
      technician_activities: ensureArray(resp.data.technician_activities),
      technician_services: ensureArray(resp.data.technician_services),
    };
  };

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

      const deduped = dedupeById(merged);

      setFormList(deduped);
      setFilteredFormList(deduped);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load forms');
      setFormList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderEmpty = () => {
    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;
    return <Text style={{ marginTop: 12, color: '#6B7280' }}>No tasks created yet.</Text>;
  };

  if (!position) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </View>
    );
  }

  /** Compute Items */
  const draftItems = filteredFormList.filter(i => i.status === 'draft');
  const submittedItems = filteredFormList.filter(i => i.status === 'submitted');

  /* ------------------------------------------------------------------
   * Render
   * ------------------------------------------------------------------ */
  return (
    <View style={styles.container}>
      <Header title={'Tasks'} navigation={navigation} />

      <View style={styles.content}>
        {/* TOP BUTTONS */}
        <View style={styles.row}>
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

        {/* LIST SCROLL VIEW */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* DRAFTS */}
          <Text style={styles.header2}>Drafts</Text>
          {draftItems.length === 0 && renderEmpty()}
          {draftItems.map(item => (
            <View key={`${item.form_type}-${item.id}`} style={{ marginVertical: 8 }}>
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
            </View>
          ))}

          {/* CREATED TASKS */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 35 }}>
            <Text style={styles.header2}>Created Tasks</Text>
            <TouchableOpacity
              style={{ marginTop: 25 }}
              onPress={() =>
                navigation.navigate('FilterScreen', {
                  initialFilters: filters,
                  onApply: (newFilters) => setFilters(newFilters),
                })
              }
            >
              <FontAwesome5 name="sort-amount-down" size={32} color="black" />
            </TouchableOpacity>
          </View>

          {submittedItems.length === 0 && renderEmpty()}
          {submittedItems.map(item => (
            <View key={`${item.form_type}-${item.id}`} style={{ marginVertical: 8 }}>
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
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Styles                                                             *
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
  header2: { fontSize: 20, fontWeight: 'bold', marginTop: 25 },
});
