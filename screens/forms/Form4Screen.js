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
import Header from "../../components/FormHeader";
import DatePicker from "../../components/DatePicker";
import FooterPagination from "../../components/FooterPagination";
import InputBox from '../../components/InputBox';
import DropdownPicker from '../../components/DropdownPicker';
import SearchBar from "../../components/SearchBar";
import CameraInput from "../../components/CameraInput";
import { kuantitas_option } from "../../data/appData";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';


const PRIMARY = "#3B82F6";

export default function Form4screen() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [page, setPage] = useState(1); // 1..3
  // example form state for demo
  const [productType, setProductType] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [serialNum, setSerialNum] = useState("");
  const [prodName, setProdname] = useState("");
  const [merkProd, setMerk] = useState("");
  const [kuantitas, setKuantitas] = useState("");
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

  const setDate = (d) => {
    const formattedDate = new Date(d).toISOString().slice(0, 10);
    setTgl(formattedDate);
  };


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

//   useEffect(() => {
//   console.log('form state snapshot:', {
//     prodName, productType, merkProd, kuantitas, deskMas, estimasi, namaCust, lokasi, tgl, masalah, koreksi, Capa
//   });
// }, [prodName, productType, merkProd, kuantitas, deskMas, estimasi, namaCust, lokasi, tgl, masalah, koreksi, Capa]);


  const goNext = () => setPage((p) => Math.min(3, p + 1));
  const goBack = () => setPage((p) => Math.max(1, p - 1));
  
  const handleSubmit = async () => {
    // alert('in form submit')
    try {
      const formData = new FormData();
      const kuantitasToSend = kuantitas?.value ?? kuantitas ?? "";
      const lokasiToSend = lokasi?.label ?? '';
      const userId = await AsyncStorage.getItem("user_id");


      formData.append('user_id', userId);
      formData.append('nama_customer', namaCust);
      formData.append('nama_faskes', lokasiToSend);
      formData.append('tanggal_pengambilan', tgl)
      formData.append('nama_produk', prodName);
      formData.append('tipe_produk', productType);
      formData.append('serial_number', serialNum);

      formData.append('kuantitas_unit', kuantitasToSend);
      formData.append('merk_produk', merkProd);
      formData.append('deskripsi_masalah', deskMas);
      formData.append('estimasi_penyelesaian', estimasi);
      formData.append('penyebab_masalah', masalah);
      formData.append('koreksi', koreksi);
      formData.append('tindakan_koreksi_capa', Capa)
      formData.append('kontak_customer', kontakCust)

      if (fotoCapa?.uri) {
      formData.append('tindakan_koreksi_img', {
        uri: fotoCapa.uri,
        name: fotoCapa.fileName || 'photo.jpg',
        type: 'image/jpeg',
      })};

      if (fotoAlat?.uri) {
      formData.append('foto_alat_sebelum_service', {
        uri: fotoAlat.uri,
        name: fotoAlat.fileName || 'photo.jpg',
        type: 'image/jpeg',
      })}

      if (fotoKoreksi?.uri) {
      formData.append('bukti_koreksi', {
        uri: fotoKoreksi.uri,
        name: fotoKoreksi.fileName || 'photo.jpg',
        type: 'image/jpeg',
      })}

      // Send to backend
        const response = await axios.post(
          'http://192.168.1.36:3000/api/forms/tech-service',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
      );
        console.log('Upload success:', response.data);
        alert('Form submitted successfully!');
    } catch (error) {
      console.error(' Upload failed:', error.response?.data || error.message);
      alert('Failed to submit form. Please try again.');
    } 
  };

  // Determine whether to show bottom bar
  const showBottomBar = !keyboardVisible && !dropdownOpen;

  // Titles for footer buttons depending on page
  const rightTitle = page !== 3 ? "Next" : "Submit";
  const leftDisabled = page === 1;

  // Handler for right button depending on page
  const handleRightPress = () => {
    if (page < 3) goNext();
    else handleSubmit();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Header title={"Technician Service In House"} />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        enableOnAndroid
        extraScrollHeight={Platform.OS === "ios" ? 20 : 100}
        keyboardOpeningTime={0}
      >
        {/* Card / form container - visually match image: white rounded card with shadow */}
        <View style={styles.card}>
          {/* small step bar and progress text */}
          <View style={styles.progressRow}>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepText}>Step {page} of 3</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${(page / 3) * 100}%` }]} />
            </View>
          </View>

          {/* Page content */}
          {page === 1 && (
            <View style={styles.pageInner}>
              <Text style={styles.sectionTitle}>Detail Produk</Text>
              <InputBox  title={'Serial Number'} value={serialNum} onChangeText={setSerialNum} />              
              <InputBox title={'Nama Produk'} value={prodName} onChangeText={setProdname} />
              <InputBox title={'Tipe Produk'} value={productType} onChangeText={setProductType} />
              <InputBox title={'Merk Produk'} value={merkProd} onChangeText={setMerk} />    
              <DropdownPicker title={'Kuantitas Produk'} options={kuantitas_option} onSelect={(item) => setKuantitas(item)} value={kuantitas}/>            
              <InputBox title={'Deskripsi Masalah'} onChangeText={setDesMas} value={deskMas} />  
              <InputBox title={'Estimasi Penyelesaian'} onChangeText={setEstimasi} value={estimasi} />  
              <CameraInput image={fotoAlat} title={'Foto Alat Sebelum Service Termasuk Serial Number (Wajib) 0/2'} onImageSelected={setFotoAlat} />
            </View>
          )}

          {page === 2 && (
            <View style={styles.pageInner}>
              <InputBox value={namaCust} title={'Nama Customer'} onChangeText={setNamaCust} />   
              <InputBox value={kontakCust} title={'Kontak Customer (No. Telp / Email)'} onChangeText={setKontak}/>                         
              <SearchBar value={lokasi} title="Nama Faskes" onDropdownOpenChange={setDropdownOpen} onPress={setLokasi}/>
              <Text style={[styles.label, {marginTop: 10}]}>Tanggal Pengambilan/Penerimaan Alat</Text>
              <DatePicker value={tgl} title={'Tanggal Pengambilan/Penerimaan Alat'} onConfirm={setDate}/>
            </View>
          )}

          {page === 3 && (
            <View style={styles.pageInner}>
              <Text style={styles.sectionTitle}>Service Detail</Text>
              <InputBox value={masalah} title={'Penyebab Masalah'} onChangeText={setMasalah}/>   
              <InputBox  value={koreksi} title={'Koreksi'} onChangeText={setKoreksi}/>   
              <CameraInput image={fotoKoreksi} title={'Bukti Koreksi 0/20'} onImageSelected={setfotoKoreksi}/>
              <InputBox image={fotoCapa} title={'Tindakan Koreksi (CAPA)'} onChangeText={setCapa}/>
              <CameraInput image={fotoCapa} title={'Tindakan Koreksi (CAPA) 0/1'} onImageSelected={setFotoCapa}/>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Use the Footer component as the bottom bar.
          Props used:
            - leftTitle: label for left button (Back)
            - rightTitle: label for right button (Next / Submit)
            - onLeftPress: handler for left button
            - onRightPress: handler for right button
            - leftDisabled: boolean to disable left (on page 1)
          If your Footer uses different prop names, rename these accordingly.
      */}
      {showBottomBar && (
        <View style={styles.footerContainer}>
          <FooterPagination
            page = {page}
            mode="pagination"
            leftTitle="Back"
            rightTitle={rightTitle}
            onLeftPress={goBack}
            onRightPress={handleRightPress}
            leftDisabled={leftDisabled}
            // fallback styles or props might be accepted by your Footer — adapt if needed
             onSubmit={() => {
              console.log('parent onSubmit called');
              handleSubmit();
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
    marginTop: 120
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    // mimic the vertical size in your screenshot
    minHeight: 520,
  },
  progressRow: {
    flexDirection: "column",
    marginBottom: 14,
  },
  stepTextContainer: {
    marginBottom: 6,
  },
  stepText: {
    fontSize: 12,
    color: "#6b7280",
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "#eef2ff",
    width: "100%",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: PRIMARY,
  },

  pageInner: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
    marginTop: 10
  },
  fakeSelect: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  fakeSelectText: {
    color: "#111827",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },

  photoButton: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#f3f6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e6eefc",
  },
  photoButtonText: {
    color: PRIMARY,
    fontWeight: "600",
  },

  footerContainer: {
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
    backgroundColor: "transparent",
  },
});

