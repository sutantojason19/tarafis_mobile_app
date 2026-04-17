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
import API_BASE from '../config/api';

// import { API_URL } from '@env';

/* ------------------------------------------------------------------
 * Layout constants
 * ------------------------------------------------------------------ */
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.42;

const FORM_TYPE_COLORS = {
  technician_service: '#22C55E',
  technician_activity: '#3B82F6',

  sales_healthcare: '#FCA5A5',
  sales_non_healthcare: '#7C3AED',
};

/**
 * Determines card color based on visit_type + sales_category
 */
const getFormColor = (item) => {
  // console.log('in form_color')
  if (item.visit_type === 'technician_service') {
    return FORM_TYPE_COLORS.technician_service;
  }

  if (item.visit_type === 'technician_activity') {
    return FORM_TYPE_COLORS.technician_activity;
  }

  if (item.visit_type === 'sales') {
    // console.log(item)
    
    return item.sales_category === 'healthcare'
      ? FORM_TYPE_COLORS.sales_healthcare
      : FORM_TYPE_COLORS.sales_non_healthcare;
  }

  return '#6B7280';
};

/**
 * Determines icon based on visit_type + sales_category
 */
const getIconName = (item) => {
  if (item.visit_type === 'technician_service') {
    return 'tools';
  }

  if (item.visit_type === 'technician_activity') {
    return 'chalkboard-teacher';
  }

  if (item.visit_type === 'sales') {
    return item.sales_category === 'healthcare'
      ? 'hospital'
      : 'briefcase';
  }

  return 'file-alt';
};

/**
 * Determines card title based on visit_type + sales_category
 */
const getCardTitle = (item) => {
  if (item.visit_type === 'technician_service') {
    return 'Technician Service';
  }

  if (item.visit_type === 'technician_activity') {
    return 'Technician Activity';
  }

  if (item.visit_type === 'sales') {
    return item.sales_category === 'healthcare'
      ? 'Sales Visit Customer'
      : 'Sales Visit Non Faskes';
  }

  return 'Form';
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

/** -------------------------------------------------------------
 * Remove duplicates by form_type+id
 * ------------------------------------------------------------- */
const dedupeById = (arr) => {
  const map = new Map();
  arr.forEach(item => {
    const key = `${item.visit_type}-${item.id}`;
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
        const storedPosition = await AsyncStorage.getItem('role');
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
        filters.formTypes.includes(item.visit_type)
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
          item.visited_at ||
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
    const hardCode = API_BASE;
    const url = `${hardCode}/api/visits/`;


    const token = await AsyncStorage.getItem('token');

    const resp = await axios.get(url, {
      params: {
        user_id: userId,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      visits: ensureArray(resp.data),
    };
  };


  const editClick = async (editData, canEdit = false) => {
    try {
      const baseUrl = API_BASE;
      const token = await AsyncStorage.getItem('token');
      
      const endpointMap = {
        sales: 'sales',
        technician_activity: 'activity',
        technician_service: 'service',
      };

      const endpoint = endpointMap[editData.visit_type];

      if (!endpoint) {
        throw new Error(`Unknown visit_type: ${editData.visit_type}`);
      }

      const url = `${baseUrl}/api/visits/${endpoint}/${editData.id}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const mergedData = {
        ...editData,
        ...response.data,
      };

      navigation.navigate('CardInfo', { data: mergedData, canEdit });

    } catch (error) {
      console.error('editClick error:', error?.response?.data || error.message);
    }
  };

  const handleDeleteVisit = async (visit) => {
    try {
      console.log('in delete');
      const token = await AsyncStorage.getItem("token");
      const baseUrl = API_BASE;

      console.log('visitID:', visit.id);

      const response = await fetch(`${baseUrl}/api/visits/${visit.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      let data = null;
      const text = await response.text();

      if (text) {
        data = JSON.parse(text);
      }

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete visit");
      }

      setFilteredFormList((prev) =>
        prev.filter((item) => Number(item.id) !== Number(visit.id))
      );

      Alert.alert("Success", data?.message || "Visit deleted successfully");
    } catch (err) {
      console.error("handleDeleteVisit failed:", err);
      Alert.alert("Error", err.message || "Failed to delete visit");
    }
  };

  const load = async () => {
    try {
      setLoading(true);

      const userIdStr = await AsyncStorage.getItem('user_id');
      if (!userIdStr) throw new Error('Missing user_id. Please login again.');

      const { visits } = await getAllForms(userIdStr);


      const merged = (visits || []).filter(Boolean);
      const deduped = dedupeById(merged);

      setFormList(deduped);
      setFilteredFormList(deduped);

    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to load forms');
      setFormList([]);
      setFilteredFormList([]); // keep these consistent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const draftItems = filteredFormList.filter(i => Number(i.is_draft) === 1);
  const submittedItems = filteredFormList.filter(i => Number(i.is_draft) === 0);
  
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
            {position?.toLowerCase() === 'sales' || position?.toLowerCase() === 'admin'  && (
              <TouchableOpacity onPress={() => navigation.navigate('Form1')}>
                <View style={[styles.card, styles.largeCard, { backgroundColor: '#FCA5A5' }]}>
                  <MaterialCommunityIcons name="hospital-building" size={48} color="#fff" />
                  <Text style={styles.cardTitle}>Sales Visit Customer</Text>
                </View>
              </TouchableOpacity>
            )}

            {position?.toLowerCase() === 'technician' || position?.toLowerCase() === 'admin'  && (
              <TouchableOpacity onPress={() => navigation.navigate('Form3')}>
                <LinearGradient colors={['#60A5FA', '#3B82F6']} style={[styles.card, styles.smallCard]}>
                  <FontAwesome5 name="chalkboard-teacher" size={38} color="#fff" />
                  <Text style={styles.cardTitle}>Technician Activity</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.column}>
            {position?.toLowerCase() === 'sales' || position?.toLowerCase() === 'admin'  && (
              <TouchableOpacity onPress={() => navigation.navigate('Form2')}>
                <LinearGradient colors={['#A78BFA', '#7C3AED']} style={[styles.card, styles.smallCard]}>
                  <FontAwesome5 name="briefcase" size={38} color="#fff" />
                  <Text style={styles.cardTitle}>Sales Visit Non Faskes</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {position?.toLowerCase() === 'technician' || position?.toLowerCase() === 'admin'  && (
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
            <View key={`${item.visit_type}-${item.id}`} style={{ marginVertical: 8 }}>
              <TaskCard
                title={getCardTitle(item)}
                iconName={getIconName(item)}
                date={
                  formatAnyDate(item.visited_at) 
                }
                formTypeColor={getFormColor(item)}
                onEdit={() => editClick(item, true)}
                onDelete={() => handleDeleteVisit(item)}
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
          {submittedItems.map(item => {
            return (
              <View key={`${item.visit_type}-${item.id}`} style={{ marginVertical: 8 }}>
                <TaskCard
                  title={getCardTitle(item)}
                  iconName={getIconName(item)}
                  date={formatAnyDate(item.visited_at)}
                  formTypeColor={getFormColor(item)}
                  onEdit={() => editClick(item, false)}
                  onDelete={() => handleDeleteVisit(item)}
                />
              </View>
            );
          })}
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
 largeCard: {
  width: '100%',
  minHeight: 180,
  aspectRatio: 0.8,
  },
  smallCard: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 12 },
  header2: { fontSize: 20, fontWeight: 'bold', marginTop: 25 },
});
