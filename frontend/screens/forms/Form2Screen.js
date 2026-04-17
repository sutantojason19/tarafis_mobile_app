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
import { View, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
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
// import { API_URL } from '@env';
import API_BASE from '../../config/api';

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
  const [isDraft, setIsDraft] = useState(false);
  const [saving, setSaving] = useState(false);          // save the  
  

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
    setLokasi({ label: hosp_name.replace(/_/g, ' '), addr });
  };
  
  /* -------------------------
   * Region selection: fetch hospitals (with caching + cancellation)
   * ------------------------- */
  const onSelectRegion = async (selectReg) => {
    // Normalize region key for cache
    const key = String(selectReg).toLowerCase();

    // If same region is selected again, do nothing
    if (region && region.toLowerCase() === key) return;

    setRegion(selectReg);
    setError(null);
    setHospitals([]);  // reset stale data immediately

    // Use cached list if available
    if (cacheRef.current.has(key)) {
      setHospitals(cacheRef.current.get(key));
      return;
    }

    // Abort previous request safely
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    try {
      const demoURL = API_BASE;
      const url = `${demoURL}/api/visits/hospital/${encodeURIComponent(selectReg)}`;
      const token = await AsyncStorage.getItem('token');


      const resp = await axios.get(url, {
        headers: buildAuthHeaders(token),
        signal: controller.signal,
        timeout: 10000,
      });

      const hospitalsRaw = Array.isArray(resp.data?.retrieved_hospitals)
        ? resp.data.retrieved_hospitals
        : [];

      const normalized = hospitalsRaw.map(h => ({
        hospital_id: Number(h.hospital_id),
        region: h.region || '',
        name: h.name || '',
        street: h.street || '',
        latitude: h.latitude ? Number(h.latitude) : null,
        longitude: h.longitude ? Number(h.longitude) : null,
      }));

      cacheRef.current.set(key, normalized);
      setHospitals(normalized);
    } catch (err) {
      if (axios.isCancel?.(err) || err.name === 'CanceledError') {
        console.log('Fetch aborted, ignoring...');
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
    if (!image?.uri) return null;

    try {
      const baseUrl = API_BASE;
      const mimeType = getMimeType(image);
      const fileName = image.fileName || image.uri.split("/").pop() || "photo.jpg";

      // console.log("mimeType being sent:", mimeType);
      // console.log("fileName being sent:", fileName);

      const presignRes = await axios.post(`${baseUrl}/api/uploads/presign`, {
        fileName,
        contentType: mimeType,
      });

      const { uploadUrl, key } = presignRes.data;

      const fileResponse = await fetch(image.uri);
      const blob = await fileResponse.blob();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
        body: blob,
      });

      return key;
    } catch (err) {
      console.error("Image upload failed:", err?.response?.data || err.message || err);
      throw new Error("Image upload failed");
    }
  };

  /* -------------------------
  * submitForm()
  * - Normalize values
  * - Validate (draft vs final)
  * - Upload image if provided
  * - Create Visit -> Create Sales detail
  * ------------------------- */
  const submitForm = async ({ isDraft }) => {
    const baseUrl = API_BASE;

    const normalizeValue = (value, fallbackKeys = []) => {
      if (value == null) return "";
      if (typeof value === "object") {
        for (const key of fallbackKeys) {
          if (value[key] != null) {
            return String(value[key]).trim();
          }
        }
        return "";
      }
      return String(value).trim();
    };

    const showError = (message) => {
      alert(message);
      return null;
    };

    const getVisitIdFromResponse = (responseData) =>
      responseData?.visit_id ??
      responseData?.id ??
      responseData?.data?.id ??
      null;

    const validateFinalSubmit = ({
      name,
      region,
      lokasi,
      alamat,
      coords,
      tujuan,
      note,
    }) => {
      const missing = [];

      if (!isNonEmptyString(name)) missing.push("Nama Sales");
      if (!isNonEmptyString(region)) missing.push("Region");
      if (!isNonEmptyString(lokasi)) missing.push("Lokasi");
      if (!isNonEmptyString(alamat)) missing.push("Alamat");
      if (!isNonEmptyString(coords)) missing.push("Koordinat");
      if (!isNonEmptyString(tujuan)) missing.push("Tujuan Kunjungan");
      if (!isNonEmptyString(note)) missing.push("Note Kunjungan");

      return missing;
    };

    try {
      // 1) Auth
      const [userIdRaw, token] = await Promise.all([
        AsyncStorage.getItem("user_id"),
        AsyncStorage.getItem("token"),
      ]);

      const userId = Number(userIdRaw);

      if (!userIdRaw || Number.isNaN(userId)) {
        return showError("Missing or invalid user_id. Please log in again.");
      }

      if (!token) {
        return showError("Missing token. Please log in again.");
      }

      if (!namaSales || !namaSales.trim()) {
        return showError('Tolong isi nama sales');
      }

      if (!lokasi || !lokasi.trim()) {
        return showError('Tolong isi nama lokasi');
      }

      // 2) Normalize inputs
      const normalized = {
        salesName: normalizeValue(namaSales, ["value", "label"]),
        region: normalizeValue(region, ["value", "label"]),
        lokasi: normalizeValue(lokasi, ["label", "value"]),
        alamat: normalizeValue(alamat),
        coords: normalizeValue(coords),
        tujuan: normalizeValue(tujuan, ["value", "label"]),
        note: normalizeValue(note),
      };

      // 3) Validation
      if (!isDraft) {
        const missingFields = validateFinalSubmit(normalized);

        if (missingFields.length > 0) {
          return showError(
            `Please complete required fields:\n${missingFields
              .map((field) => `• ${field}`)
              .join("\n")}`
          );
        }
      }

      // 4) Parse coordinates
      // Drafts are allowed to skip coords
      let parsedCoords = { lat: null, lng: null };

      if (!isDraft && normalized.coords) {
        parsedCoords = parseCoords(normalized.coords);

        if (!parsedCoords) {
          return showError(
            'Koordinat format invalid. Use "lat, lng" e.g. "-6.214620, 106.845130"'
          );
        }
      }

      const axiosCfg = {
        headers: buildAuthHeaders(token),
        timeout: 20000,
      };

      const draftFlag = isDraft ? 1 : 0;

      // 5) Upload image if any
      let dokumentasiKey = null;
      if (dokumentasi?.uri) {
        dokumentasiKey = await uploadImageToS3(dokumentasi);
      }
      // 6) Create visit header
      const visitPayload = {
        user_id: userId,
        customer_id: 1,
        visited_at: new Date().toISOString(),
        latitude: parsedCoords.lat != null ? String(parsedCoords.lat) : null,
        longitude: parsedCoords.lng != null ? String(parsedCoords.lng) : null,
        visit_type: "sales",
        note: normalized.note,
        is_draft: draftFlag,
        sales_categoty: "non_healthcare",
      };

      const visitRes = await axios.post(
        getVisitsUrl(baseUrl),
        visitPayload,
        axiosCfg
      );

      const visitId = getVisitIdFromResponse(visitRes?.data);

      if (!visitId) {
        console.error("Unexpected visit create response:", visitRes?.data);
        return showError(
          "Visit created but no visitId returned. Check backend response."
        );
      }

      // 7) Create sales detail
      const salesPayload = {
        visit_form_type: "non_healthcare",
        region: normalized.region || null,
        location_name: normalized.lokasi || null,
        location_address: normalized.alamat || null,
        visit_purpose: normalized.tujuan || null,
        visit_status: null,
        sales_name: normalized.salesName || null,
        visit_documentation: dokumentasiKey,
        is_draft: draftFlag,
      };

      await axios.post(getSalesUrl(baseUrl, visitId), salesPayload, axiosCfg);

      alert(isDraft ? "Draft saved!" : "Submitted successfully!");
      navigation.goBack();
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unknown error";

      console.error("submitForm error:", {
        status,
        msg,
        data: err?.response?.data,
      });

      if (status === 401) {
        return alert("Session expired (401). Please log in again.");
      }

      if (status === 422) {
        return alert(`Validation failed (422): ${msg}`);
      }

      alert(`Failed to submit: ${msg}`);
    }
  };

  const onSubmit = () => submitForm({ isDraft: false });
  const onSave = () => submitForm({ isDraft: true });

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
          keyboardOpeningTime={0}
          extraScrollHeight={0}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* Form inputs composed from small reusable components */}
          <Text style={styles.draftHint}>
            Isi field bertanda “(draft)” untuk menyimpan draft
          </Text>
          <DropdownPicker value={namaSales} title="Nama Sales (draft)" options={nama_sales} onSelect={setNamaSales} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <DropdownPicker
              value={region}
              title="Region"
              options={regions}
              onSelect={onSelectRegion}
            />
            {loading && <ActivityIndicator style={{ marginLeft: 8 }} />}
          </View>

          <SearchBar value={lokasi} title="Nama Lokasi (draft)" onDropdownOpenChange={setDropdownOpen} onPress={searchbarSelect} hospitalData={hospitals} />
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
          <View style={{ paddingBottom: 20, flexDirection:'row', alignItems:'center' }}>
            <Footer mode="footer" title="Submit" onPress={onSubmit} />
            <TouchableOpacity
              onPress={onSave}
              style={styles.saveBtn}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveText}>Save Draft</Text>
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
  draftHintContainer: {
    backgroundColor: '#FEF3C7', // soft yellow
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
},
draftHint: {
  color: '#92400E',
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '500',
},
});
