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
// import { API_URL } from '@env';
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
  const [prodId, setProdID] = useState();
  

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

  const getVisitsUrl = (baseUrl) => `${baseUrl}/api/visits`;
  const getServiceUrl = (baseUrl, visitId) => `${baseUrl}/api/visits/${visitId}/service`;

  const buildAuthHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
  });

  const getOrCreateProduct = async (body) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const baseUrl = API_BASE;

      const response = await axios.post(
        `${baseUrl}/api/products/get-or-create`,
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

  /**
   * Submit a tech-service form to the backend.
   * - Creates visit first, then submits service detail for that visit.
   * - Uses FormData for service detail + optional images.
   */
  const handleSubmit = async ({ isDraft }) => {
    const isEmpty = (v) => v === null || v === undefined || v === "" || v === 0;

    try {
      const baseUrl = API_BASE;

      const [userIdRaw, token] = await Promise.all([
        AsyncStorage.getItem("user_id"),
        AsyncStorage.getItem("token"),
      ]);

      if (!token) throw new Error("Missing auth token");

      const userId = Number(userIdRaw);
      if (!userIdRaw || Number.isNaN(userId)) {
        alert("Missing/invalid user_id. Please log in again.");
        return;
      }

      if (!kuantitas|| !kuantitas.trim()) {
        return fail('Tolong isi kuantitas produk');
      }

      const headers = buildAuthHeaders(token);

      const kuantitasToSend = kuantitas?.value ?? kuantitas ?? "";
      const lokasiToSend = lokasi?.label ?? lokasi ?? "";

      // Draft validation
      if (isDraft && isEmpty(kuantitasToSend)) {
        alert("Mohon isi kuantitas unit.");
        return;
      }

      // Final-submit validation only
      if (!isDraft) {
        const requiredFields = [
          { value: prodName, label: "Nama Produk" },
          { value: productType, label: "Tipe Produk" },
          { value: serialNum, label: "Serial Number" },
          { value: merkProd, label: "Merk Produk" },
          { value: fotoAlat?.uri, label: "Foto Alat" },
          { value: fotoKoreksi?.uri, label: "Foto Koreksi" },
          { value: fotoCapa?.uri, label: "Foto CAPA" },
        ];

        const missing = requiredFields.filter((f) => isEmpty(f.value));
        if (missing.length) {
          alert(
            `Please complete required fields:\n${missing
              .map((f) => `• ${f.label}`)
              .join("\n")}`
          );
          return;
        }
      }

      let device_before_service_photoKey = null;
      if (fotoAlat?.uri) {
        device_before_service_photoKey = await uploadImageToS3(fotoAlat);
      }

      let corrective_proofKey = null;
      if (fotoKoreksi?.uri) {
        corrective_proofKey = await uploadImageToS3(fotoKoreksi);
      }

      let capa_action_imageKey = null;
      if (fotoCapa?.uri) {
        capa_action_imageKey = await uploadImageToS3(fotoCapa);
      }

      const visitPayload = {
        user_id: userId,
        customer_id: 1,
        visited_at: new Date().toISOString(),
        visit_type: "technician_service",
        latitude: null,
        longitude: null,
        is_draft: Number(isDraft),
      };

      const visitRes = await axios.post(getVisitsUrl(baseUrl), visitPayload, { headers });

      const visitId =
        visitRes?.data?.id ??
        visitRes?.data?.data?.id ??
        visitRes?.data?.visit?.id;

      if (!visitId) throw new Error("Visit created but visitId not returned");

      let resolvedProdId = prodId;

      if (!prodExist) {
        const prodBody = {
          serial_number: serialNum,
          product_name: prodName,
          product_type: productType,
          brand_name: merkProd,
          is_draft: isDraft,
        };

        const result = await getOrCreateProduct(prodBody);
        resolvedProdId = result?.product?.id;
        setProdID(resolvedProdId);
      }

      const serviceDetailPayload = {
        product_id: resolvedProdId,
        customer_name: namaCust,
        unit_quantity: kuantitasToSend,
        customer_contact: kontakCust,
        healthcare_facility_name: lokasiToSend,
        pickup_date: tgl,
        root_cause: masalah,
        resolution_estimate: estimasi,
        issue_description: deskMas,
        corrective_action: koreksi,
        capa_action: Capa,
        device_before_service_photo: device_before_service_photoKey,
        corrective_proof: corrective_proofKey,
        capa_action_image: capa_action_imageKey,
        is_draft: Number(isDraft),
      };

      const serviceRes = await axios.post(
        getServiceUrl(baseUrl, visitId),
        serviceDetailPayload,
        {
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        }
      );

      console.info("Form upload successful:", serviceRes.status);
      alert(isDraft ? "Draft saved!" : "Form submitted successfully!");
      navigation.goBack();
      return serviceRes.data;
    } catch (err) {
      const payload = err.response?.data ?? err.message ?? err;
      console.error("handleSubmit failed:", payload);
      alert("Failed to submit form. Please try again.");
      throw err;
    }
  };

  const onSubmit = () => handleSubmit({ isDraft: false });
  const onSave = () => handleSubmit({ isDraft: true });

  const onSerialBlur = async (e) => {
    const baseUrl = API_BASE
    const serial = e?.nativeEvent?.text;
    if (!serial) return;

    try {
      const res = await fetch(
        `${baseUrl}/api/products/by-serial/${serial}`
      );

      if (res.ok) {
        const data = await res.json();
        
        if (data.exists && data.product.product_name != null) {
          setProdName(data.product.product_name);
          setProductType(data.product.product_type);
          setMerk(data.product.brand_name);
          setProdID(data.product.id);
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
        keyboardShouldPersistTaps="handled"
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
               <Text style={styles.draftHint}>
                  Isi field bertanda “(draft)” untuk menyimpan draft
                </Text>
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
                title="Kuantitas Produk (draft)"
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
            onSubmit={onSubmit}
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
