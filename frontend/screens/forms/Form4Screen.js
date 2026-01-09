/**
 * Form4screen — Technician Service (In-House)
 *
 * Multi-step screen to create a technician service form and upload it to backend.
 * - 3-step form flow (product details, customer/location, service detail)
 * - Uses KeyboardAwareScrollView and SafeAreaView for proper layout with keyboard
 * - Builds a multipart FormData payload (including optional images) and POSTs to:
 *     {API_URL}/api/forms/tech-service
 *
 * Notes:
 * - API_URL is read from .env and normalized (trailing slashes removed).
 * - Dropdown / picker values may be objects (with `.value` / `.label`) or simple strings;
 *   the code normalizes them before sending.
 * - onSubmit throws on error after showing a user-friendly alert (caller can catch if needed).
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Keyboard,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from 'react-native-safe-area-context';
import FormHeader from '../../components/FormHeader';
import DatePicker from "../../components/DatePicker";
import FooterPagination from "../../components/FooterPagination";
import InputBox from '../../components/InputBox';
import DropdownPicker from '../../components/DropdownPicker';
import SearchBar from "../../components/SearchBar";
import CameraInput from "../../components/CameraInput";
import { kuantitas_option } from "../../data/appData";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import API_BASE from "../../config/api";


const PRIMARY = "#3B82F6";

export default function Form4screen({ navigation }) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [page, setPage] = useState(1); // 1..3

  // Form state
  const [productType, setProductType] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [serialNum, setSerialNum] = useState("");
  const [prodName, setProdName] = useState("");
  const [merkProd, setMerk] = useState("");
  const [kuantitas, setKuantitas] = useState(null);
  const [namaCust, setNamaCust] = useState("");
  const [kontakCust, setKontak] = useState("");
  const [estimasi, setEstimasi] = useState("");
  const [fotoAlat, setFotoAlat] = useState("");
  const [tgl, setTgl] = useState("");
  const [masalah, setMasalah] = useState("");
  const [koreksi, setKoreksi] = useState("");
  const [fotoKoreksi, setfotoKoreksi] = useState("");
  const [Capa, setCapa] = useState("");
  const [fotoCapa, setFotoCapa] = useState("");
  const [deskMas, setDesMas] = useState("");
  const [prodExist, setProdExist] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  

  // Convert Date -> YYYY-MM-DD
  const setDate = (d) => {
    const formattedDate = new Date(d).toISOString().slice(0, 10);
    setTgl(formattedDate);
  };

  // Keyboard visibility: hide footer when keyboard is visible
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

  const goNext = () => setPage((p) => Math.min(3, p + 1));
  const goBack = () => setPage((p) => Math.max(1, p - 1));

  /**
   * Submit a tech-service form to the backend.
   * - Normalizes API_URL to avoid trailing-slash issues.
   * - Builds FormData including optional image attachments.
   * - Uses axios to POST multipart/form-data.
   * Throws on failure after showing an alert.
   */
  const handleSubmit = async ({isDraft}) => {
    // Normalize API base URL and validate
    const getBaseUrl = () => {
      if (typeof API_URL !== 'string' || !API_URL.trim()) {
        throw new Error('API_URL is not defined. Check your .env configuration.');
      }
      return API_URL.trim().replace(/\/+$/g, '');
    };

    // Append image to FormData if present
    const appendImageIfExists = (fd, fieldName, imageObj) => {
      if (!imageObj?.uri) return;
      fd.append(fieldName, {
        uri: imageObj.uri,
        name: imageObj.fileName || 'photo.jpg',
        type: imageObj.type || 'image/jpeg',
      });
    };

    try {
      const base = getBaseUrl();
      const demoURL = 'http://192.168.1.14:3000';
      const url = `${demoURL}/api/forms/tech-service`;

      const userId = await AsyncStorage.getItem('user_id');
      const kuantitasToSend = kuantitas?.value ?? kuantitas ?? '';
      const lokasiToSend = lokasi?.label ?? '';

       const requiredFields = [
          {key: 'user_id', value: userId, label: 'User ID'},
          { key: 'nama_customer', value: namaCust, label: 'Nama Customer' },
          { key: 'nama_faskes', value: lokasiToSend, label: 'Nama Lokasi' },
          { key: 'tanggal_pengambilan', value: tgl, label: 'Tanggal Pengambilan' },
          { key: 'nama_produk', value: prodName, label: 'Nama Produk' },
          { key: 'tipe_produk', value: productType, label: 'Tipe Produk' },
          { key: 'serial_number', value: serialNum, label: 'Serial Number' },
          { key: 'kuantitas_unit', value: kuantitasToSend, label: 'Kuantitas Unit' },
          { key: 'kontak_customer', value: kontakCust, label: 'Kontak Customer' },
          { key: 'merk_produk', value: merkProd, label: 'Merk Produk' },
          { key: 'deskripsi_masalah', value: deskMas, label: 'Deskripsi Masalah' },
          { key: 'estimasi_penyelesaian', value: estimasi, label: 'Estimasi Penyelesaian' },
          { key: 'penyebab_masalah', value: masalah, label: 'Penyebab Masalah' },
          { key: 'koreksi', value: koreksi, label: 'Koreksi' },
          { key: 'tindakan_koreksi_capa', value: Capa, label: 'Tindakan Koreksi CAPA' },
        ];
      
      if(isDraft && kuantitas === '' || kuantitas === null){
          alert(
            'Mohon isi kuantitas unit.'
          );   
      }


      if (!isDraft) {

        const missing = requiredFields.filter(
          f => f.value === null || f.value === undefined || f.value === '' || f.value === 0
        );

        if (missing.length > 0) {
          alert(
            `Please complete required fields:\n${missing
              .map(f => `• ${f.label}`)
              .join('\n')}`
          );
          return;
        }
      }

      const formData = new FormData();
      requiredFields.forEach(f => {
        formData.append(f.key, f.value ?? '');
      });

      // formData.append('user_id', userId);
      // formData.append('nama_customer', namaCust ?? '');
      // formData.append('nama_faskes', lokasiToSend);
      // formData.append('tanggal_pengambilan', tgl ?? '');
      // formData.append('nama_produk', prodName ?? '');
      // formData.append('tipe_produk', productType ?? '');
      // formData.append('serial_number', serialNum ?? '');
      // formData.append('kuantitas_unit', kuantitasToSend);
      // formData.append('merk_produk', merkProd ?? '');
      // formData.append('deskripsi_masalah', deskMas ?? '');
      // formData.append('estimasi_penyelesaian', estimasi ?? '');
      // formData.append('penyebab_masalah', masalah ?? '');
      // formData.append('koreksi', koreksi ?? '');
      // formData.append('tindakan_koreksi_capa', Capa ?? '');
      // formData.append('kontak_customer', kontakCust ?? '');

      appendImageIfExists(formData, 'tindakan_koreksi_img', fotoCapa);
      appendImageIfExists(formData, 'foto_alat_sebelum_service', fotoAlat);
      appendImageIfExists(formData, 'bukti_koreksi', fotoKoreksi);

      // Let axios set multipart boundary
      const response = await axios.post(url, formData);

      console.info('Form upload successful:', response.status);
      alert('Form submitted successfully!');
      return response.data;
    } catch (err) {
      const payload = err.response?.data ?? err.message ?? err;
      console.error('handleSubmit failed:', payload);
      alert('Failed to submit form. Please try again.');
      throw err;
    }
  };

  const onSubmit = () => handleSubmit({ isDraft: false });
  const onSave = () => handleSubmit({ isDraft: true });

  const onSerialBlur = async (e) => {
    const serial = e?.nativeEvent?.text;
    if (!serial) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/forms/products/by-serial/${serial}`
      );

      if (res.ok) {
        const data = await res.json();

        if (data.exists) {
          setProdName(data.product.nama_produk);
          setProductType(data.product.tipe_produk);
          setMerk(data.product.merk_produk);
          setProdExist(true);
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

  const showBottomBar = !keyboardVisible && !dropdownOpen;
  const rightTitle = page !== 3 ? "Next" : "Submit";
  const leftDisabled = page === 1;
  const handleRightPress = () => {
    if (page < 3) goNext();
    else handleSubmit();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FormHeader title={"Technician Service In House"} navigation={navigation} />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        enableOnAndroid
        extraScrollHeight={Platform.OS === "ios" ? 20 : 100}
        keyboardOpeningTime={0}
      >
        <View style={styles.card}>
          <View style={styles.progressRow}>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepText}>Step {page} of 3</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${(page / 3) * 100}%` }]} />
            </View>
          </View>

          {page === 1 && (
            <View style={styles.pageInner}>
              <Text style={styles.sectionTitle}>Detail Produk</Text>
              <InputBox title="Serial Number" value={serialNum} onChangeText={setSerialNum} onEndEditing={onSerialBlur} />
              {prodExist === false && (
                <Text style={{ color: '#6B7280', marginTop: 4 }}>
                  Produk baru — silakan lengkapi detail produk
                </Text>
              )}
              <InputBox title="Nama Produk" value={prodName} onChangeText={setProdName} />
              <InputBox title="Tipe Produk" value={productType} onChangeText={setProductType} />
              <InputBox title="Merk Produk" value={merkProd} onChangeText={setMerk} />
              <DropdownPicker
                title="Kuantitas Produk"
                options={kuantitas_option}
                onSelect={(item) => setKuantitas(item)}
                value={kuantitas}
              />
              <InputBox title="Deskripsi Masalah" onChangeText={setDesMas} value={deskMas} />
              <InputBox title="Estimasi Penyelesaian" onChangeText={setEstimasi} value={estimasi} />
              <CameraInput
                image={fotoAlat}
                title="Foto Alat Sebelum Service Termasuk Serial Number (Wajib)"
                onImageSelected={setFotoAlat}
              />
            </View>
          )}

          {page === 2 && (
            <View style={styles.pageInner}>
              <InputBox value={namaCust} title="Nama Customer" onChangeText={setNamaCust} />
              <InputBox value={kontakCust} title="Kontak Customer (No. Telp / Email)" onChangeText={setKontak} />
              <InputBox value={lokasi} title="Nama Faskes" onChangeText={setLokasi} />
              <Text style={[styles.label, { marginTop: 10 }]}>Tanggal Pengambilan/Penerimaan Alat</Text>
              <DatePicker value={tgl} title="Tanggal Pengambilan/Penerimaan Alat" onConfirm={setDate} />
            </View>
          )}

          {page === 3 && (
            <View style={styles.pageInner}>
              <Text style={styles.sectionTitle}>Service Detail</Text>
              <InputBox value={masalah} title="Penyebab Masalah" onChangeText={setMasalah} />
              <InputBox value={koreksi} title="Koreksi" onChangeText={setKoreksi} />
              <CameraInput image={fotoKoreksi} title="Bukti Koreksi" onImageSelected={setfotoKoreksi} />
              <InputBox value={Capa} title="Tindakan Koreksi (CAPA)" onChangeText={setCapa} />
              <CameraInput image={fotoCapa} title="Tindakan Koreksi (CAPA) Foto" onImageSelected={setFotoCapa} />
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      {showBottomBar && (
        <View style={styles.footerContainer}>
          <FooterPagination
            page={page}
            mode="pagination"
            leftTitle="Back"
            rightTitle={rightTitle}
            onLeftPress={goBack}
            onRightPress={handleRightPress}
            leftDisabled={leftDisabled}
            onSave = {onSave}
            onSubmit={() => {
              // fallback: call submit directly
              onSubmit
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

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
  progressRow: {
    flexDirection: "column",
    marginBottom: 14,
  },
  stepTextContainer: { marginBottom: 6 },
  stepText: { fontSize: 12, color: "#6b7280" },
  progressBarBackground: {
    height: 6,
    backgroundColor: "#eef2ff",
    width: "100%",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: PRIMARY },
  pageInner: { marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 10 },
  label: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 10, marginTop: 10 },
  footerContainer: {
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
    backgroundColor: "transparent",
  },
});
