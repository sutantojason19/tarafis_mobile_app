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
import { View, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, Text, ActivityIndicator, Button, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import FormHeader from '../../components/FormHeader';
import InputBox from '../../components/InputBox';
import CoordinateInput from '../../components/CoordinateInput';
import DropdownPicker from '../../components/DropdownPicker';
import MultiSelectCheckbox from '../../components/MultiselectCheckbox';
import CameraInput from '../../components/CameraInput';
import Footer from '../../components/Footer';
import SearchBar from '../../components/SearchBar';
import { nama_sales, regions, jabatan, status_kunjungan, jumlah_user } from "../../data/appData";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE from '../../config/api';

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
  const [status, setStatus] = useState('');             // visit status
  const [note, setNote] = useState('');                 // notes about visit
  const [dokumentasi, setDok] = useState('');           // image asset (CameraInput)
  const [coords, setCoords] = useState('');             // coordinate string (lat, lng)
  const [dropdownOpen, setDropdownOpen] = useState(false); // whether any dropdown/modal is open
  const [other, setOther] = useState('');               // 'other' text for multiselect
  const [loading, setLoading] = useState(false);        // loading state for hospital lookup
  const [error, setError] = useState(null);             // error message for hospital lookup
  const [hospitals, setHospitals] = useState([]);       // retrieved hospital list (normalized)
  const [jumlahUser, setJumlahUser] = useState('1');
  const [users, setUsers] = useState([
  { nama: '', jabatan: '' }
  ]);
  const [saving, setSaving] = useState(false);        
  const [isDraft, setDraft] = useState(false);         

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
    setLokasi({ label: hosp_name.replace(/_/g, ' '), addr });
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

  const onJumlahUserSelect = (value) => {
    const count = Number(value);

    setJumlahUser(count.toString());

    setUsers(prev => {
      const copy = [...prev];

      if (copy.length < count) {
        // add empty users
        while (copy.length < count) {
          copy.push({ nama: '', jabatan: '' });
        }
      } else {
        // trim extra users
        copy.length = count;
      }

      return copy;
    });
  };


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
      const url = `${API_BASE}/api/visits/hospital/${encodeURIComponent(selectReg)}`;
      const token = await AsyncStorage.getItem('token');
      console.log(url)

      // axios GET with AbortController signal and a 10s timeout (optional)
      const resp = await axios.get(url, {
        headers: buildAuthHeaders(token),
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

  // URL builders (single source of truth)
  const getVisitsUrl = (baseUrl) => `${baseUrl}/api/visits`;
  const getSalesUrl = (baseUrl, visitId) => `${baseUrl}/api/visits/${visitId}/sales`;

  // Helper to check empty string 
  const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

  //Parse lat and longitude
  const parseCoords = (coordsStr) => {
    if (!isNonEmptyString(coordsStr)) return null;

    // allow "lat,lng" or "lat, lng"
    const parts = coordsStr.split(",").map((s) => s.trim());
    if (parts.length !== 2) return null;

    const lat = Number(parts[0]);
    const lng = Number(parts[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
  };
  
  // helper for function headers
  const buildAuthHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
  });

  const uploadImageToS3 = async (image) => {
    if (!image || !image.uri) return null;

    try {
      // Step 1: ask backend for presigned URL
      const presignRes = await axios.post(`${API_BASE}/api/uploads/presign`, {
        fileName: image.fileName || "photo.jpg",
        contentType: image.type || "image/jpeg",
      });

      const { uploadUrl, key } = presignRes.data;

      // Step 2: upload file directly to S3
      await axios.put(uploadUrl, {
        uri: image.uri,
        type: image.type || "image/jpeg",
        name: image.fileName || "photo.jpg",
      }, {
        headers: {
          "Content-Type": image.type || "image/jpeg",
        },
      });

      // Step 3: return S3 key
      return key;

    } catch (err) {
      console.error("Image upload failed:", err);
      throw new Error("Image upload failed");
    }
  };

  /* -------------------------
    * submitForm()
    * - Validates draft vs final
    * - Creates visit header -> gets visitId
    * - Creates sales detail
    * ------------------------- */
  const submitForm = async ({ isDraft }) => {

    const norm = (v) => (v?.value ?? v?.label ?? v ?? "").toString().trim();
    const fail = (msg) => {
      alert(msg);
      return null;
    };

    try {
      // --- Auth
      const [userIdRaw, token] = await Promise.all([
        AsyncStorage.getItem("user_id"),
        AsyncStorage.getItem("token"),
      ]);

      const userId = Number(userIdRaw);
      if (!userIdRaw || Number.isNaN(userId)) return fail("Missing/invalid user_id.");
      if (!token) return fail("Missing token.");

      // --- Normalize
      const nameToSend = norm(namaSales);
      const regionToSend = norm(region);
      const lokasiToSend = norm(lokasi);
      const alamatToSend = norm(alamat);
      const coordsToSend = norm(coords);
      const tujuanToSend = norm(selected);
      const noteToSend = norm(note);
      const statusToSend = norm(status);

      if (!isDraft) {
        const missing = [];

        if (!isNonEmptyString(nameToSend)) missing.push("Nama Sales");
        if (!isNonEmptyString(regionToSend)) missing.push("Region");
        if (!isNonEmptyString(lokasiToSend)) missing.push("Lokasi");
        if (!isNonEmptyString(alamatToSend)) missing.push("Alamat");
        if (!isNonEmptyString(coordsToSend)) missing.push("Koordinat");
        if (!isNonEmptyString(tujuanToSend)) missing.push("Tujuan Kunjungan");
        if (!isNonEmptyString(noteToSend)) missing.push("Note Kunjungan");
        if (!users || users.length === 0) missing.push("Nama & Jabatan User");
        if (!isNonEmptyString(statusToSend)) missing.push("Status Kunjungan");

        if (missing.length) {
          alert(`Please complete required fields:\n${missing.map((m) => `• ${m}`).join("\n")}`);
          return;
        }
      }

      let parsed = { lat: null, lng: null };

      if (!isDraft) {
        parsed = parseCoords(coordsToSend);
        if (!parsed) {
          return fail('Koordinat invalid. Format: "-6.214620, 106.845130"');
        }
      }

      const axiosCfg = {
        headers: buildAuthHeaders(token),
        timeout: 20000,
      };

      const draftToSend = isDraft ? 1 : 0;

      let dokumentasiKey = null;

      if (dokumentasi && dokumentasi.uri) {
        dokumentasiKey = await uploadImageToS3(dokumentasi);
      }

      const visitPayload = {
        user_id: userId,
        customer_id: 1,
        visited_at: new Date().toISOString(),
        latitude: parsed.lat != null ? String(parsed.lat) : null,
        longitude: parsed.lng != null ? String(parsed.lng) : null,
        visit_type: "sales",
        note: noteToSend,
        is_draft: draftToSend,
        sales_category: "healthcare",
      };

      const visitRes = await axios.post(getVisitsUrl(API_BASE), visitPayload, axiosCfg);

      const visitId =
        visitRes?.data?.visit_id ??
        visitRes?.data?.id ??
        visitRes?.data?.data?.id;

      if (!visitId) {
        console.error("Bad visit response:", visitRes?.data);
        return fail("Visit created but no ID returned.");
      }

      const salesPayload = {
        visit_form_type: "healthcare",
        region: regionToSend,
        location_name: lokasiToSend,
        location_address: alamatToSend,
        visit_purpose: tujuanToSend,
        visit_status: statusToSend,
        sales_name: nameToSend,
        customer_contacts: users,
        visit_documentation: dokumentasiKey,
        is_draft: draftToSend,
      };

      await axios.post(getSalesUrl(API_BASE, visitId), salesPayload, axiosCfg);

      alert(isDraft ? "Draft saved!" : "Submitted successfully!");

    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unknown error";

      console.error("submitForm error:", { status, msg });

      if (status === 401) return alert("Session expired.");
      if (status === 422) return alert(`Validation failed: ${msg}`);

      alert(`Submit failed: ${msg}`);
      }
    };

  const onSubmit = () => submitForm({ isDraft: false });
  const onSave = () => submitForm({ isDraft: true });


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

          <DropdownPicker
            value={jumlahUser}
            title="Jumlah User"
            options={jumlah_user}
            onSelect={onJumlahUserSelect}
          />

          {users.map((user, index) => (
            <View key={index}>
              <InputBox
                value={user.nama}
                title={`Nama User ${index + 1}`}
                onChangeText={(text) => {
                  setUsers(prev => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], nama: text };
                    return copy;
                  });
                }}
              />

              <DropdownPicker
                value={user.jabatan}
                title={`Jabatan User ${index + 1}`}
                options={jabatan}
                onSelect={(value) => {
                  setUsers(prev => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], jabatan: value };
                    return copy;
                  });
                }}
              />
            </View>
          ))}


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
        <View style={{ paddingBottom: 20, flexDirection:'row', alignItems:'center' }}>
          <Footer mode="footer" title="Submit" onPress={onSubmit} />
          <TouchableOpacity
            onPress={onSave}
            style={styles.saveBtn}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveText}>Save</Text>
            }
          </TouchableOpacity>
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
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 30,
    alignItems: 'center',
    backgroundColor: '#63bf3c',
    justifyContent: 'center',
    height: 55,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 18 },
});
