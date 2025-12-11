/**
 * Form2Screen (Sales Visit Non Faskes)
 * -----------------------------------
 * Screen for creating a "Sales Visit Non Faskes" form.
 *
 * Responsibilities:
 *  - Collect basic visit data: sales name, region, location/hospital, address,
 *    coordinates (GPS), visit purpose, documentation image, and notes.
 *  - Lookup hospitals by region (cached per-region to reduce network calls).
 *  - Build and POST a multipart/form-data payload to the backend.
 *  - Keep the footer submit button hidden while keyboard or dropdown modal is open.
 *
 * Important implementation notes:
 *  - API base URL is read from `API_URL` (.env). This file normalizes the URL to
 *    avoid double-slash issues.
 *  - Axios is used for HTTP requests; AbortController is used to cancel inflight region lookups.
 *  - Replace AsyncStorage user_id usage with a proper auth state in production.
 *
 * Bugfix included:
 *  - The previous code referenced an undefined `host` variable when composing the POST URL.
 *    This implementation uses a normalized `API_URL` with an optional local fallback if needed.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import FormHeader from '../../components/FormHeader';
import InputBox from '../../components/InputBox';
import CoordinateInput from '../../components/CoordinateInput';
import DropdownPicker from '../../components/DropdownPicker';
import CameraInput from '../../components/CameraInput';
import Footer from '../../components/Footer';
import SearchBar from '../../components/SearchBar';
import { nama_sales, regions } from "../../data/appData";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

/**
 * Height of the form header. Exported so other components/layouts can align with it.
 */
export const HEADER_HEIGHT = 180;

export default function Form2Screen({ navigation }) {
  /* -------------------------
   * Local UI state
   * ------------------------- */
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [namaSales, setNamaSales] = useState('');   // sales picker value
  const [region, setRegion] = useState('');         // selected region string
  const [lokasi, setLokasi] = useState('');         // selected hospital name/value
  const [alamat, setAlamat] = useState('');         // address text
  const [tujuan, setTujuanKunjungan] = useState(''); // purpose text
  const [dokumentasi, setDok] = useState('');       // image asset object
  const [coords, setCoords] = useState('');         // coordinate string
  const [note, setNote] = useState('');             // notes
  const [hospitals, setHospitals] = useState([]);   // fetched hospitals
  const [loading, setLoading] = useState(false);    // loading state for hospital lookup
  const [error, setError] = useState(null);         // error message for hospital lookup

  /* -------------------------
   * Caching + cancellation refs
   * ------------------------- */
  // cacheRef prevents refetching the same region repeatedly
  const cacheRef = useRef(new Map());

  // controllerRef stores current AbortController so previous requests can be aborted
  const controllerRef = useRef(null);

  /* -------------------------
   * Derived data
   * ------------------------- */
  // Map `hospitals` into options used by SearchBar / Dropdown components, filtered by selected region
  const filteredHospitalData = useMemo(() => {
    if (!Array.isArray(hospitals) || !region) return [];

    const regionLower = region.toLowerCase();
    return hospitals
      .filter(h => (h.region || '').toLowerCase() === regionLower)
      .map(h => ({
        label: (h.name || '').replace(/_/g, ' '),
        value: String(h.hospital_id ?? ''),
        raw: h,
      }));
  }, [hospitals, region]);

  // Called by SearchBar when a hospital is selected: set nama lokasi + address
  const searchbarSelect = (hosp_name, addr) => {
    setAlamat(addr);
    setLokasi(hosp_name);
  };

  /* -------------------------
   * Region selection: fetch hospitals (with caching + cancellation)
   * ------------------------- */
  const onSelectRegion = async (selectReg) => {
    setRegion(selectReg);
    setError(null);

    // Use cached response if present
    if (cacheRef.current.has(selectReg)) {
      setHospitals(cacheRef.current.get(selectReg));
      return;
    }

    // Abort any previous request to avoid races
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    try {
      const url = `${API_URL}/api/forms/hospital/${encodeURIComponent(selectReg)}`;

      const resp = await axios.get(url, {
        signal: controller.signal,
        timeout: 10000, // 10s optional timeout
      });

      const hospitalsRaw = Array.isArray(resp.data?.retrieved_hospitals)
        ? resp.data.retrieved_hospitals
        : [];

      // Normalize rows into consistent shape
      const normalized = hospitalsRaw.map(h => ({
        hospital_id: Number(h.hospital_id),
        region: h.region || '',
        name: h.name || '',
        street: h.street || '',
        latitude: h.latitude != null && h.latitude !== '' ? Number(h.latitude) : null,
        longitude: h.longitude != null && h.longitude !== '' ? Number(h.longitude) : null,
      }));

      // Cache and set state
      cacheRef.current.set(selectReg, normalized);
      setHospitals(normalized);

      // Informational alert (you can remove in production)
      // alert('Successfully added hospital list');
    } catch (err) {
      // Ignore cancellation errors (user changed region quickly)
      if (axios.isCancel?.(err) || err.name === 'CanceledError') {
        return;
      }
      console.error('fetch error', err);
      setError(err?.response?.data?.message || 'Failed to load hospitals');
      setHospitals([]);
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  };

  /* -------------------------
   * Form submit handler
   * - Builds FormData and posts to `/api/forms/customer`
   * - Normalizes API_URL to avoid double-slash issues
   * ------------------------- */
  const onSubmit = async () => {
    try {
      // Normalize API_URL (remove trailing slashes)
      const base = (typeof API_URL === 'string' ? API_URL.trim().replace(/\/+$/g, '') : '');
      // Optional fallback for local debugging (adjust or remove as desired)
      const host = base || 'http://192.168.1.20:3000';
      const url = `${host}/api/forms/customer`;

      // Read user id from storage (replace with auth state in production)
      const userId = await AsyncStorage.getItem('user_id');

      const nameToSend = namaSales?.value ?? namaSales ?? '';
      const regionToSend = region?.value ?? region ?? '';
      const lokasiToSend = lokasi?.label ?? '';

      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('nama_sales', nameToSend);
      formData.append('region', regionToSend);
      formData.append('nama_lokasi', lokasiToSend);
      formData.append('alamat_lokasi', alamat);
      formData.append('koordinat_lokasi', coords);
      formData.append('tujuan_kunjungan', tujuan);
      formData.append('note_kunjungan', note);

      if (dokumentasi?.uri) {
        formData.append('dokumentasi_kunjungan', {
          uri: dokumentasi.uri,
          name: dokumentasi.fileName || 'photo.jpg',
          type: dokumentasi.type || 'image/jpeg',
        });
      }

      // Let axios set the Content-Type (including boundary) automatically
      const response = await axios.post(url, formData);

      alert('Form submitted successfully!');
      return response.data;
    } catch (error) {
      const errPayload = error.response?.data ?? error.message ?? error;
      console.error('Upload failed:', errPayload);
      alert('Failed to submit form. Please try again.');
      throw error;
    }
  };

  /* -------------------------
   * Keyboard visibility listeners
   * - Hide footer submit while typing
   * ------------------------- */
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /* -------------------------
   * Render
   * ------------------------- */
  return (
    <View style={[styles.container, { overflow: 'visible' }]}>
      <FormHeader title="Sales Visit Non Faskes" navigation={navigation} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <KeyboardAwareScrollView
          style={[styles.formContent, { marginTop: HEADER_HEIGHT + 20 }]}
          contentContainerStyle={{ paddingBottom: 120, paddingLeft: 20 }}
          enableAutomaticScroll={false}
          enableOnAndroid={true}
          keyboardOpeningTime={Number.MAX_SAFE_INTEGER}
          extraScrollHeight={100}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* Form inputs composed from small reusable components */}
          <DropdownPicker value={namaSales} title="Nama Sales" options={nama_sales} onSelect={setNamaSales} />
          <DropdownPicker value={region} title="Region" options={regions} onSelect={onSelectRegion} />
          <SearchBar value={lokasi} title="Nama Lokasi" onDropdownOpenChange={setDropdownOpen} onPress={searchbarSelect} hospitalData={hospitals} />
          <InputBox value={alamat} title="Alamat Lokasi" onChangeText={setAlamat} />
          <CoordinateInput value={coords} onPress={setCoords} />
          <InputBox value={tujuan} title="Tujuan Kunjungan" onChangeText={setTujuanKunjungan} />
          <CameraInput image={dokumentasi} title="Dokumentasi kunjungan 0/1" onImageSelected={setDok} />
          <InputBox value={note} title="Note Kunjungan" onChangeText={setNote} />
          <Text style={{fontWeight:'bold', marginTop: 20, fontSize: 18}}>Mohon dicek kembali sebelum menyelesaikan task !!</Text>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      {/* Footer submit button: only visible when keyboard and dropdown are closed */}
      {!keyboardVisible && !dropdownOpen && (
        <View style={{ paddingBottom: 20 }}>
          <Footer mode="footer" title="Submit" onPress={onSubmit} />
        </View>
      )}
    </View>
  );
}

/* -------------------------
 * Styles
 * ------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  formContent: { flex: 1 },
});
