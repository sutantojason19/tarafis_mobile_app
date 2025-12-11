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

import React, { useState, useEffect } from "react";
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
import { API_URL } from '@env';

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
  const [kuantitas, setKuantitas] = useState("");
  const [merkProd, setMerk] = useState("");
  const [beritaAcara, setBerita] = useState("");
  const [fotoKegiatan, setFotoKegiatan] = useState("");
  const [fotoBa, setFotoBA] = useState("");

  /**
   * Format date for MariaDB (YYYY-MM-DD)
   */
  const setDate = (d) => {
    const formatted = new Date(d).toISOString().slice(0, 10);
    setTgl(formatted);
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

  /**
   * handleSubmit() — Submit final form to backend
   */
  const handleSubmit = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");

      const nameToSend  = technicianName?.value ?? technicianName ?? "";
      const otherTech   = tekLain?.value ?? tekLain ?? "";
      const qtyToSend   = kuantitas?.label ?? kuantitas ?? "";
      const hospitalName = hospital?.value ?? hospital ?? "";

      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('tanggal_aktivitas', tgl_aktivitas);
      formData.append('nama_teknisi', nameToSend);
      formData.append('nama_lokasi', hospitalName);
      formData.append('alamat_lokasi', lokasi);
      formData.append('teknisi_lain', otherTech);
      formData.append('nama_produk', prodName);
      formData.append('tipe_produk', tipeProd);
      formData.append('serial_number', serialNumber);
      formData.append('kuantitas_unit', qtyToSend);
      formData.append('merk_produk', merkProd);
      formData.append('nomor_berita_acara', beritaAcara);
      formData.append('tujuan_kunjungan', visitPurpose);
      formData.append('notes', notes);

      if (fotoKegiatan?.uri) {
        formData.append('selfie_foto_kegiatan', {
          uri: fotoKegiatan.uri,
          name: fotoKegiatan.fileName || 'photo.jpg',
          type: 'image/jpeg',
        });
      }

      if (fotoBa?.uri) {
        formData.append('foto_ba_daftar_hadir', {
          uri: fotoBa.uri,
          name: fotoBa.fileName || 'photo.jpg',
          type: 'image/jpeg',
        });
      }

      const base = (API_URL || "").replace(/\/+$/, "");
      const url = `${base}/api/forms/tech-activity`;

      await axios.post(url, formData);
      alert("Form submitted successfully!");
    } catch (error) {
      const msg = error.response?.data ?? error.message ?? "Upload failed.";
      console.error("Upload failed:", msg);
      alert("Failed to submit form. Please try again.");
    }
  };

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

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        enableOnAndroid
        extraScrollHeight={Platform.OS === "ios" ? 20 : 100}
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

              <SearchBar
                value={hospital}
                title="Nama Lokasi"
                onDropdownOpenChange={setDropdownOpen}
                onPress={setHospital}
              />

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

              <InputBox value={serialNumber} title="Serial Number" onChangeText={setSerialNumber} />
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
            onSubmit={handleSubmit}
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
