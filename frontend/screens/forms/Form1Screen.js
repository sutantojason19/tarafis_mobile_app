/**
 * Form1Screen (Sales Visit Customer)
 * ----------------------------------
 * Screen used to create a "Sales Visit (Customer / Faskes)" form.
 *
 * Responsibilities:
 *  - Render a large form with fields: sales name, region, hospital/location,
 *    coordinates (GPS), address, user name, user position, visit purposes,
 *    visit status, documentation image, and notes.
 *  - Allow selecting hospitals by region (remote lookup).
 *  - Cache hospital lookups per-region to avoid repeated network calls.
 *  - Provide an image picker and upload images with the form as multipart/form-data.
 *  - Use API_URL from .env (with a fallback for local debugging).
 *  - Gracefully handle request cancellation, loading state and errors.
 *
 * Key behaviors:
 *  - onSelectRegion(selectReg): fetch hospitals for a region, cache results, supports AbortController.
 *  - onSubmit(): build FormData including optional image and send to backend `/api/forms/customer`.
 *  - Keyboard and dropdown states control when the footer submit button is visible.
 *
 * Notes for maintainers:
 *  - Replace hardcoded user_id fallback (currently read from AsyncStorage) with real auth state.
 *  - Ensure `API_URL` is defined in your environment for production builds.
 *  - axios is used for HTTP calls to benefit from cancellation and uniform error handling.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, Text, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import FormHeader from '../../components/FormHeader';
import InputBox from '../../components/InputBox';
import CoordinateInput from '../../components/CoordinateInput';
import DropdownPicker from '../../components/DropdownPicker';
import MultiSelectCheckbox from '../../components/MultiselectCheckbox';
import CameraInput from '../../components/CameraInput';
import Footer from '../../components/Footer';
import SearchBar from '../../components/SearchBar';
import { nama_sales, regions, jabatan, status_kunjungan } from "../../data/appData";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

/**
 * HEADER_HEIGHT exported so other components/layout can align with the form header.
 */
export const HEADER_HEIGHT = 180;

/**
 * Form1Screen component
 * Props:
 *  - navigation: react-navigation object (used for navigation actions)
 */
export default function Form1Screen({ navigation }) {
  /* -------------------------
   * Local UI state
   * ------------------------- */
  const [selected, setSelected] = useState([]);         // multi-select choices for visit purposes
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [namaSales, setNamaSales] = useState('');       // selected sales (controlled by DropdownPicker)
  const [region, setRegion] = useState('');             // selected region (string)
  const [lokasi, setLokasi] = useState('');             // selected hospital name (string)
  const [alamat, setAlamat] = useState('');             // address text
  const [namaUser, setNamaUser] = useState('');         // name of user/contact
  const [jabat, setJabatan] = useState('');             // user's position / jabatan
  const [status, setStatus] = useState('');             // visit status
  const [note, setNote] = useState('');                 // notes about visit
  const [dokumentasi, setDok] = useState('');           // image asset (CameraInput)
  const [coords, setCoords] = useState('');             // coordinate string (lat, lng)
  const [dropdownOpen, setDropdownOpen] = useState(false); // whether any dropdown/modal is open
  const [other, setOther] = useState('');               // 'other' text for multiselect
  const [loading, setLoading] = useState(false);        // loading state for hospital lookup
  const [error, setError] = useState(null);             // error message for hospital lookup
  const [hospitals, setHospitals] = useState([]);       // retrieved hospital list (normalized)

  /* -------------------------
   * Caching and cancellation helpers
   * ------------------------- */
  // cacheRef: store previously fetched hospitals per-region to avoid extra network calls
  const cacheRef = useRef(new Map());

  // controllerRef: keep the current AbortController so we can cancel previous fetches when selecting a new region
  const controllerRef = useRef(null);

  /* -------------------------
   * Derived / memoized data
   * ------------------------- */
  // Convert fetched hospitals into the shape used by SearchBar / Dropdown components,
  // and only include hospitals matching the currently selected region.
  const filteredHospitalData = useMemo(() => {
    if (!Array.isArray(hospitals) || !region) return [];

    const regionLower = region.toLowerCase();
    return hospitals
      .filter(h => (h.region || '').toLowerCase() === regionLower)   // exact region match
      .map(h => ({
        label: (h.name || '').replace(/_/g, ' '),   // display-friendly name
        value: String(h.hospital_id ?? ''),         // id as string
        raw: h                                       // full raw object (optional)
      }));
  }, [hospitals, region]);

  // callback used when user selects a hospital from SearchBar modal
  const searchbarSelect = (hosp_name, addr) => {
    setAlamat(addr);
    setLokasi(hosp_name);
  };

  /* -------------------------
   * Static options for multiselect
   * ------------------------- */
  const options = [
    'Presentasi',
    'Kunjungan Rutin',
    'Follow Up Produk',
    'Check Stock',
    'Entertain',
    'Trial',
    'Penanganan Complaint',
    'Join Visit',
    'Nego Harga'
  ];

  /* -------------------------
   * Keyboard listeners (for hiding footer while keyboard open)
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
   * onSelectRegion(selectReg)
   * - Fetch hospitals for a given region
   * - Use cache when available
   * - Cancel previous inflight request when selecting a new region
   * ------------------------- */
  const onSelectRegion = async (selectReg) => {
    setRegion(selectReg);
    setError(null);

    // Use cached result if available
    if (cacheRef.current.has(selectReg)) {
      setHospitals(cacheRef.current.get(selectReg));
      return;
    }

    // Cancel previous request (if any) to avoid race conditions
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    try {
      // Normalize API_URL and construct endpoint
      const url = `${API_URL}/api/forms/hospital/${encodeURIComponent(selectReg)}`;

      // axios GET with AbortController signal and a 10s timeout (optional)
      const resp = await axios.get(url, {
        signal: controller.signal,
        timeout: 10000,
      });

      // Normalize response into a consistent array of hospital objects
      const hospitalsRaw = Array.isArray(resp.data?.retrieved_hospitals)
        ? resp.data.retrieved_hospitals
        : [];

      const normalized = hospitalsRaw.map(h => ({
        hospital_id: Number(h.hospital_id),
        region: h.region || '',
        name: h.name || '',
        street: h.street || '',
        latitude: h.latitude != null && h.latitude !== '' ? Number(h.latitude) : null,
        longitude: h.longitude != null && h.longitude !== '' ? Number(h.longitude) : null,
      }));

      // Cache normalized result for this region
      cacheRef.current.set(selectReg, normalized);

      setHospitals(normalized);
    } catch (err) {
      // Ignore cancellation errors (user selected another region)
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
   * onSubmit()
   * - Build FormData, including optional image (dokumentasi)
   * - POST to `/api/forms/customer`
   * - Uses API_URL (trim trailing slashes); includes fallback for local debugging
   * - Alerts user on success/failure; re-throws error for callers if needed
   * ------------------------- */
  const onSubmit = async () => {
    // Normalize API_URL (remove trailing slash) and fallback to a local host if missing
    const base = (typeof API_URL === 'string' ? API_URL.trim().replace(/\/+$/g, '') : '') || 'http://192.168.1.29:3000';
    const url = `${base}/api/forms/customer`;

    try {
      // Retrieve user_id from AsyncStorage (replace with auth state in production)
      const userId = await AsyncStorage.getItem('user_id');

      // Normalize fields (support both {label, value} objects and simple strings)
      const nameToSend = namaSales?.value ?? namaSales ?? '';
      const regionToSend = region?.value ?? region ?? '';
      const lokasiToSend = lokasi?.label ?? '';

      // Build multipart/form-data payload
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('nama_sales', nameToSend);
      formData.append('region', regionToSend);
      formData.append('nama_lokasi', lokasiToSend);
      formData.append('alamat_lokasi', alamat);
      formData.append('koordinat_lokasi', coords);

      // Combine selected visit purposes + any "other" text into a comma-separated string
      const allSelected = [...selected];
      if (other?.trim()) {
        allSelected.push({
          label: other.trim(),
          value: other.trim().toLowerCase(),
        });
      }

      const values = allSelected.map(item =>
        typeof item === 'string' ? item : item?.value ?? ''
      );
      const tujuanKunjunganString = values.join(',');

      formData.append('tujuan_kunjungan', tujuanKunjunganString);
      formData.append('note_kunjungan', note);
      formData.append('nama_user', namaUser);
      formData.append('jabatan_user', jabat);
      formData.append('status_kunjungan', status);

      // If documentation image exists (picked via CameraInput), append it to FormData
      if (dokumentasi?.uri) {
        formData.append('dokumentasi_kunjungan', {
          uri: dokumentasi.uri,
          name: dokumentasi.fileName || 'photo.jpg',
          type: dokumentasi.type || 'image/jpeg',
        });
      }

      // Send multipart POST
      const response = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Notify user on success
      alert('Form submitted successfully!');
      return response.data;
    } catch (error) {
      // Log and notify user of failure, then rethrow so callers can react
      console.error('Upload failed:', error.response?.data ?? error.message ?? error);
      alert('Failed to submit form. Please try again.');
      throw error;
    }
  };

  /* -------------------------
   * Render
   * - Uses KeyboardAwareScrollView so inputs remain visible when keyboard opens
   * - Hides footer submit button while keyboard or dropdown/modal is open
   * ------------------------- */
  return (
    <View style={[styles.container, { overflow: 'visible' }]}>
      {/* Top form header */}
      <FormHeader title="Sales Visit Customer" navigation={navigation} />

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
          {/* Form fields (composed from small, reusable components) */}
          <DropdownPicker value={namaSales} title="Nama Sales" options={nama_sales} onSelect={setNamaSales} />

          {/* Region dropdown triggers fetching hospitals */}
          <DropdownPicker value={region} title="Region" options={regions} onSelect={onSelectRegion} />

          {/* Loading indicator and error text for hospital lookups */}
          {loading && (
            <View style={styles.spinner}>
              <ActivityIndicator size="small" />
              <Text style={styles.spinnerText}>Loading hospitals…</Text>
            </View>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Searchable hospital selector */}
          <SearchBar value={lokasi} title="Nama Lokasi" onDropdownOpenChange={setDropdownOpen} onPress={searchbarSelect} hospitalData={hospitals} />

          {/* Location capture (GPS) */}
          <CoordinateInput value={coords} onPress={setCoords} />

          {/* Address and user/contact information */}
          <InputBox value={alamat} title="Alamat Lokasi" onChangeText={setAlamat} />
          <InputBox value={namaUser} title="Nama User" onChangeText={setNamaUser} />
          <DropdownPicker value={jabat} title="Jabatan User" options={jabatan} onSelect={setJabatan} />

          {/* Purpose multi-select */}
          <MultiSelectCheckbox value={selected} title="Tujuan Kunjungan" options={options} selected={selected} onChange={setSelected} otherValue={other} onOtherChange={setOther} />

          {/* Visit status */}
          <DropdownPicker value={status} title="Status Kunjungan" options={status_kunjungan} onSelect={setStatus} />

          {/* Documentation image */}
          <CameraInput image={dokumentasi} title="Dokumentasi kunjungan 0/1" onImageSelected={setDok} />

          {/* Notes */}
          <InputBox value={note} title="Note Kunjungan (Hasil/Update Kunjungan)" onChangeText={setNote} />

          <Text>Mohon dicek kembali sebelum menyelesaikan task !!</Text>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      {/* Footer submit: only visible when keyboard and dropdown are closed */}
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
  spinner: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  spinnerText: {
    fontSize: 14,
    color: '#333',
  },
  errorText: {
    color: '#EF4444',
    marginTop: 8,
  },
});
