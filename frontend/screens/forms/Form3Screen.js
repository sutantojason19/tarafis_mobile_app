/**
 * Form3Screen — Technician Activity (Multi-Step Form)
 * --------------------------------------------------
 * This screen handles the creation of a "Technician Activity" form.
 *
 * MAIN FEATURES:
 *  • 3-step paginated form (page 1–3)
 *  • Uses a progress bar and dynamic content rendering
 *  • Collects technician activity data: purpose, date, product details, photos, etc.
 *  • Uses FormData to submit payload to backend
 *  • Handles multipart uploads for images (foto kegiatan + BA foto)
 *  • Hides bottom pagination bar when keyboard or dropdown picker is open
 *
 * IMPORTANT DETAILS:
 *  • DatePicker returns a JS Date; converted into YYYY-MM-DD format for MariaDB.
 *  • Dropdown values may be objects or plain strings — code safely normalizes them.
 *  • Uses KeyboardAwareScrollView for smooth scrolling with input fields.
 *  • FooterPagination controls navigation between steps & submission on final step.
 *
 * PROPS:
 *  @param {object} navigation - React Navigation stack navigator object.
 *
 * BACKEND ROUTE:
 *  POST `${API_URL}/api/forms/tech-activity`
 *
 * This file is intended to stay clean and declarative — complex logic (API, helpers)
 * should be separated when the project grows.
 */
import API_BASE from "../../config/api";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Keyboard,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import FormHeader from '../../components/FormHeader';
import DatePicker from "../../components/DatePicker";
import FooterPagination from "../../components/FooterPagination";
import InputBox from '../../components/InputBox';
import DropdownPicker from '../../components/DropdownPicker';
import SearchBar from "../../components/SearchBar";
import CameraInput from "../../components/CameraInput";

import { nama_teknisi, kuantitas_option } from "../../data/appData";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIMARY = "#3B82F6";

export default function Form3screen({ navigation }) {
  /** UI states */
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /** Pagination state (1–3) */
  const [page, setPage] = useState(1);

  /** Form fields */
  const [visitPurpose, setVisitPurpose] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [tgl_aktivitas, setTgl] = useState("");
  const [hospital, setHospital] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [tekLain, setTekLain] = useState("");
  const [prodName, setProdName] = useState("");
  const [tipeProd, setTipeProd] = useState("");
  const [kuantitas, setKuantitas] = useState(null);
  const [merkProd, setMerk] = useState("");
  const [beritaAcara, setBerita] = useState("");
  const [fotoKegiatan, setFotoKegiatan] = useState("");
  const [fotoBa, setFotoBA] = useState("");
  const [prodExist, setProdExist] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [prodId, setProdId] = useState(false);

  const scrollRef = useRef(null);
  
   useEffect(() => {
      scrollRef.current?.scrollToPosition?.(0, 0, false);
    }, [page]);

  /**
   * Format date for MariaDB (YYYY-MM-DD)
   */
  const setDate = (d) => {
    const formatted = new Date(d).toISOString().slice(0, 10);
    setTgl(formatted);
  };

  const onSerialBlur = async (e) => {
    console.log('in correct method')
    try {
      const res = await fetch(
        `${API_BASE}/api/products/by-serial/${serial}`
      );

      if (res.ok) {
        const data = await res.json();

        if (data.exists) {
          setProdName(data.product.product_name);
          setTipeProd(data.product.product_type);
          setMerk(data.product.brand_name);
          setProdExist(true);
          setProdId(data.product.id);

        } else {
          setProdExist(false);
        }
      } else {
        setProdExist(false);
      }
    } catch (err) {
      console.error('[onSerialBlur] error:', err);
    }
  };

  /**
   * Keyboard listeners — hide bottom bar when typing
   */
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  
  /** Pagination handlers */
  const goNext = () => setPage((p) => Math.min(3, p + 1));
  const goBack = () => setPage((p) => Math.max(1, p - 1));

  const getVisitsUrl = (baseUrl) => `${baseUrl}/api/visits`;
  const getActivityUrl = (baseUrl, visitId) => `${baseUrl}/api/visits/${visitId}/activity`;

  const buildAuthHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
  });

  const getOrCreateProduct = async (body) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await axios.post(
        `${API_BASE}/api/products/get-or-create`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Result:", response.data);
      return response.data;

    } catch (err) {
      console.log("Error:", err.response?.data || err.message);
      throw err;
    }
  };

  // Normalize picker/value shapes
  const pickValue = (x, fallback = "") => (x?.value ?? x?.label ?? x ?? fallback);

  // Consider trimming strings so "   " is treated as empty
  const isEmpty = (v) => v == null || (typeof v === "string" && v.trim() === "") || v === 0;

  // Turn [{key,value}] into { key: value }
  const fieldsToObject = (fields) =>
    fields.reduce((acc, f) => {
      acc[f.key] = f.value;
      return acc;
    }, {});

    // Build FormData from fields + optional files
    const buildActivityFormData = ({ fields, fotoKegiatan, fotoBa }) => {
    const fd = new FormData();

    // Append scalar fields
    for (const f of fields) {
      // FormData wants strings; allow numbers/dates but stringify safely
      const value =
        f.value instanceof Date
          ? f.value.toISOString()
          : f.value?.toString?.() ?? "";
      fd.append(f.key, value);
    }

    // Append files (React Native style)
    if (fotoKegiatan?.uri) {
      fd.append("selfie_photo", {
        uri: fotoKegiatan.uri,
        name: fotoKegiatan.fileName || "selfie.jpg",
        type: fotoKegiatan.type || "image/jpeg",
      });
    }

    if (fotoBa?.uri) {
      fd.append("attendance_document_photo", {
        uri: fotoBa.uri,
        name: fotoBa.fileName || "attendance.jpg",
        type: fotoBa.type || "image/jpeg",
      });
    }

    return fd;
  };

  const uploadImageToS3 = async (image) => {
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

  /**
   * handleSubmit — Submit technician activity form to backend
   * - Auth validation
   * - Normalize / prepare values
   * - Upload images
   * - Ensure product exists
   * - Validate draft vs final submit
   * - Create visit header
   * - Create activity detail
   */
  const handleSubmit = async ({isDraft}) => { 

    const fail = (message, extra = null) => {
      if (extra) console.error(message, extra);
      alert(message);
      return null;
    };

    const getVisitId = (data) =>
      data?.id ?? data?.visit_id ?? data?.data?.id ?? null;

    const uploadIfPresent = async (file) => {
      if (file?.uri) {
        return await uploadImageToS3(file);
      }
      return null;
    };

    const buildAxiosConfig = (token) => ({
      headers: {
        ...buildAuthHeaders(token),
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    });

    try {
      // 1) Auth
      const [userIdRaw, token] = await Promise.all([
        AsyncStorage.getItem('user_id'),
        AsyncStorage.getItem('token'),
      ]);

      if (!token) {
        return fail('Session expired. Please login again.');
      }

      const userId = Number(userIdRaw);
      if (!userIdRaw || Number.isNaN(userId)) {
        return fail('Missing/invalid user_id. Please login again.');
      }

      // 2) Normalize / prepare values
      const technicianNameValue = pickValue(technicianName);
      const additionalTechniciansValue = pickValue(tekLain);
      const quantityValue = pickValue(kuantitas);
      const hospitalNameValue = pickValue(hospital);

      // 3) Upload images first
      const [selfiePhotoKey, attendancePhotoKey] = await Promise.all([
        uploadIfPresent(fotoKegiatan),
        uploadIfPresent(fotoBa),
      ]);

      // 4) Prepare product id
      let resolvedProductId = prodId;

      if (!prodExist) {
        const productPayload = {
          serial_number: serialNumber,
          product_name: prodName,
          product_type: tipeProd,
          brand_name: merkProd,
        };

        const productResponse = await getOrCreateProduct(productPayload);
        resolvedProductId = productResponse?.product?.id ?? null;
      }

      // 5) Build field definitions
      const visitHeaderFields = [
        { key: 'user_id', value: userId, label: 'User' },
        { key: 'customer_id', value: 1, label: 'Customer ID' },
        { key: 'visited_at', value: new Date().toISOString(), label: 'Visit Date' },
        { key: 'visit_type', value: 'technician_activity', label: 'Visit Type' },
        { key: 'note', value: notes, label: 'Notes' },
        { key: 'latitude', value: null, label: 'Latitude' },
        { key: 'longitude', value: null, label: 'Longitude' },
        { key: 'is_draft', value: Number(isDraft), label: 'Draft' },
      ];

      const activityFields = [
        { key: 'unit_quantity', value: quantityValue, label: 'Kuantitas Unit' },
        { key: 'activity_date', value: tgl_aktivitas, label: 'Tanggal Aktivitas' },
        { key: 'technician_name', value: technicianNameValue, label: 'Nama Teknisi' },
        { key: 'location_name', value: hospitalNameValue, label: 'Nama Lokasi' },
        { key: 'location_address', value: lokasi, label: 'Alamat Lokasi' },
        { key: 'additional_technicians', value: additionalTechniciansValue, label: 'Teknisi Lain' },
        { key: 'activity_purpose', value: visitPurpose, label: 'Tujuan Kunjungan' },
        { key: 'activity_notes', value: notes, label: 'Catatan' },
        { key: 'official_report_number', value: beritaAcara, label: 'Nomor Berita Acara' },
        { key: 'product_id', value: resolvedProductId, label: 'Product Id' },
        { key: 'is_draft', value: Number(isDraft), label: 'Draft' },
        { key: 'selfie_photo', value: selfiePhotoKey, label: 'Foto Kegiatan' },
        { key: 'attendance_document_photo', value: attendancePhotoKey, label: 'Foto Berita Acara' },
      ];

      // 6) Validation
      // Draft: only require quantity
      if (isDraft && isEmpty(quantityValue)) {
        return fail('Mohon isi kuantitas unit.');
      }

      // Final submit: require all activity fields
      // 6) Validation
      // Draft: allow empty fields
      // Final submit: require all activity fields
      if (!isDraft) {
        const missingFields = activityFields.filter((field) => isEmpty(field.value));

        if (missingFields.length > 0) {
          return fail(
            `Tolong isi:\n${missingFields.map((field) => `• ${field.label}`).join('\n')}`
          );
        }
      }

      const axiosCfg = buildAxiosConfig(token);

      // 7) Create visit header
      const visitPayload = fieldsToObject(visitHeaderFields);

      const visitRes = await axios.post(
        getVisitsUrl(API_BASE),
        visitPayload,
        axiosCfg
      );

      const visitId = getVisitId(visitRes?.data);

      if (!visitId) {
        return fail('Failed to create visit (missing visitId).', visitRes?.data);
      }

      // 8) Create activity detail
      const activityPayload = fieldsToObject(activityFields);

      if (activityPayload.product_id != null) {
        activityPayload.product_id = Number(activityPayload.product_id);
      }

      const activityRes = await axios.post(
        getActivityUrl(API_BASE, visitId),
        activityPayload,
        axiosCfg
      );

      alert(isDraft ? 'Draft saved.' : 'Submitted successfully!');
      return activityRes?.data;
    } catch (error) {
      const status = error?.response?.status;
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        null;

      console.error('handleSubmit failed:', {
        status,
        backendMessage,
        data: error?.response?.data,
        message: error?.message,
      });

      if (status === 401) {
        return fail('Session expired. Please login again.');
      }

      if (status === 422) {
        return fail(`Validation failed: ${backendMessage || 'Please check your input.'}`);
      }

      return fail(backendMessage || error?.message || 'Failed to submit form. Please try again.');
    }
  };

  const onSubmit = () => handleSubmit({ isDraft: false });
  const onSave = () => handleSubmit({ isDraft: true });

  /** Footer visibility logic */
  const showBottomBar = !keyboardVisible && !dropdownOpen;
  const leftDisabled = page === 1;
  const rightTitle = page !== 3 ? "Next" : "Submit";

  const handleRightPress = () => {
    if (page < 3) goNext();
    else handleSubmit();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FormHeader title="Technician Activity" navigation={navigation} />

      <KeyboardAwareScrollView ref={scrollRef}
        contentContainerStyle={styles.scrollContainer}
        enableOnAndroid
        extraScrollHeight={Platform.OS === "ios" ? 20 : 100}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Progress Bar */}
          <View style={styles.progressRow}>
            <Text style={styles.stepText}>Step {page} of 3</Text>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${(page / 3) * 100}%` }]} />
            </View>
          </View>

          {/* Step 1 */}
          {page === 1 && (
            <View style={styles.pageInner}>
              <InputBox title="Tujuan Kunjungan" value={visitPurpose} onChangeText={setVisitPurpose} />
              <Text style={[styles.label, { marginTop: 0 }]}>Tanggal Aktivitas</Text>
              <DatePicker value={tgl_aktivitas} onConfirm={setDate} />

              <DropdownPicker
                value={technicianName}
                title="Nama Teknisi Yang Mengisi"
                options={nama_teknisi}
                onSelect={setTechnicianName}
              />

              <InputBox value={hospital} title="Nama Lokasi" onChangeText={setHospital} />


              <InputBox value={lokasi} title="Alamat Lokasi" onChangeText={setLokasi} />

              <DropdownPicker
                value={tekLain}
                title="Teknisi Lain Yang Bertugas"
                options={nama_teknisi}
                onSelect={setTekLain}
              />
            </View>
          )}

          {/* Step 2 */}
          {page === 2 && (
            <View style={styles.pageInner}>
              <Text style={styles.sectionTitle}>Detail Produk</Text>

              <InputBox
                title="Serial Number"
                value={serialNumber}
                onChangeText={setSerialNumber}
                onEndEditing={onSerialBlur}
              />

              {prodExist === false && (
                <Text style={{ color: '#6B7280', marginTop: 4 }}>
                  Produk baru — silakan lengkapi detail produk
                </Text>
              )}


              <InputBox value={prodName} title="Nama Produk" onChangeText={setProdName} />
              <InputBox value={tipeProd} title="Tipe Produk" onChangeText={setTipeProd} />

              <DropdownPicker
                value={kuantitas}
                title="Kuantitas Unit"
                options={kuantitas_option}
                onSelect={setKuantitas}
              />

              <InputBox value={merkProd} title="Merk Produk" onChangeText={setMerk} />
              <InputBox value={beritaAcara} title="Nomor Berita Acara" onChangeText={setBerita} />
            </View>
          )}

          {/* Step 3 */}
          {page === 3 && (
            <View style={styles.pageInner}>
              <Text style={styles.sectionTitle}>Service Detail</Text>

              <CameraInput
                image={fotoKegiatan}
                title="Selfie Foto Kegiatan (Wajib)"
                onImageSelected={setFotoKegiatan}
              />

              <CameraInput
                image={fotoBa}
                title="Foto BA / Daftar Hadir"
                onImageSelected={setFotoBA}
              />

              <InputBox value={notes} title="Notes" onChangeText={setNotes} />
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Bottom Navigation */}
      {showBottomBar && (
        <View style={styles.footerContainer}>
          <FooterPagination
            page={page}
            leftDisabled={leftDisabled}
            onLeftPress={goBack}
            onRightPress={handleRightPress}
            onSubmit={onSubmit}
            onSave={onSave}
            rightTitle={rightTitle}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

/* -------------------------- STYLES -------------------------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb" },
  scrollContainer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    marginTop: 120,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 520,
  },
  progressRow: { marginBottom: 14 },
  stepText: { fontSize: 12, color: "#6b7280", marginBottom: 6 },
  progressBarBackground: {
    height: 6,
    backgroundColor: "#eef2ff",
    width: "100%",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: PRIMARY },
  pageInner: { marginTop: 6 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 10,
    marginTop: 10,
  },
  footerContainer: {
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
  },
});
