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

// import Header from "../../components/Header";
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

export default function Form3screen({navigation}) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lokasi, setLokasi] = useState('');
  const [page, setPage] = useState(1); // 1..3

  // example form state for input fields
  const [visitPurpose, setVisitPurpose] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [tgl_aktivitas, setTgl] = useState("");
  const [hospital, setHospital] = useState("");
  const [tekLain, setTekLain] = useState("");
  const [prodName, setProdName] = useState("");
  const [tipeProd, setTipeProd] = useState("");
  const [kuantitas, setKuantitas] = useState("");
  const [merkProd, setMerk] = useState("");
  const [beritaAcara, setBerita] = useState("");
  const [fotoKegiatan, setFotoKegiatan] = useState(""); 
  const [fotoBa, setFotoBA] = useState("");

  //format the date to mariadb's syntax
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
  

  const goNext = () => setPage((p) => Math.min(3, p + 1));
  const goBack = () => setPage((p) => Math.max(1, p - 1));
  
  const handleSubmit = async () => {
    try {
      // normalize data before sending it over to DB
      const nameToSend = technicianName?.value ?? technicianName ?? "";
      const nameToSend2 = tekLain?.value ?? tekLain ?? "";
      const kuantitasToSend = kuantitas?.label ?? kuantitas ?? "";
      const hospitalName = hospital?.value ?? hospital ?? "";
      const userId = await AsyncStorage.getItem("user_id");
      
      // files handled by multer.fields()
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('tanggal_aktivitas', tgl_aktivitas);
      formData.append('nama_teknisi', nameToSend);
      formData.append('nama_lokasi', hospitalName);
      formData.append('alamat_lokasi', lokasi);
      formData.append('teknisi_lain', nameToSend2);
      formData.append('nama_produk', prodName);
      formData.append('tipe_produk', tipeProd);
      formData.append('serial_number', serialNumber);
      formData.append('kuantitas_unit', kuantitasToSend);
      formData.append('merk_produk', merkProd);
      formData.append('nomor_berita_acara', beritaAcara);
      formData.append('tujuan_kunjungan', visitPurpose);
      formData.append('notes', notes)

      if (fotoKegiatan?.uri) {
      formData.append('selfie_foto_kegiatan', {
        uri: fotoKegiatan.uri,
        name: fotoKegiatan.fileName || 'photo.jpg',
        type: 'image/jpeg',
      });}

      if (fotoBa?.uri) {
      formData.append('foto_ba_daftar_hadir', {
        uri: fotoBa.uri,
        name: fotoBa.fileName || 'photo.jpg',
        type: 'image/jpeg',
      });
    }
    // Send to backend
        const response = await axios.post(
          'http://192.168.1.29:3000/api/forms/tech-activity',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
      );
        console.log('Upload success:', response.data);
        alert('Form submitted successfully!');
      } catch (error) {
        console.log(" AXIOS ERROR START -----------------------");

        // 1. Basic message
        console.log("Message:", error.message);

        // 2. Error code (e.g. ECONNABORTED, ENOTFOUND)
        if (error.code) console.log("Code:", error.code);

        // 3. If request was sent but NO response received
        if (error.request) {
          console.log("REQUEST WAS SENT BUT NO RESPONSE RECEIVED");
          console.log("Raw request object:", error.request);
        }

        // 4. If server responded with non-2xx status
        if (error.response) {
          console.log("SERVER RESPONDED WITH ERROR");
          console.log("Status:", error.response.status);
          console.log("Headers:", error.response.headers);
          console.log("Data:", error.response.data);
        }

        // 5. Axios config (URL, method, etc.)
        console.log(" Axios config:", error.config);
        console.log("AXIOS ERROR END -------------------------");
        alert("Network error — see console logs for details.");
      }
  };

  // Determine whether to show bottom bar
  const showBottomBar = !keyboardVisible && !dropdownOpen;

  // Titles for footer buttons depending on page
  const rightTitle = page !== 3 ? "Next" : "Submit";
  const leftDisabled = page === 1;

  // Handler for right button depending on page
  const handleRightPress = () => {
    console.log(page)
    if (page < 3) goNext();
    else handleSubmit();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FormHeader title={"Technician Activity"} navigation={navigation} />

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
              <InputBox title={'Tujuan Kunjungan'} value={visitPurpose} onChangeText={setVisitPurpose}/>              
              <Text style={[styles.label, {marginTop: 0}]}>Tanggal Aktivitas</Text>
              <DatePicker value={tgl_aktivitas} onConfirm={setDate}/>
              <DropdownPicker value={technicianName} title={'Nama Teknisi Yang Mengisi'} options={nama_teknisi} onSelect={setTechnicianName}/>
              <SearchBar value={hospital} title="Nama Lokasi" onDropdownOpenChange={setDropdownOpen} onPress={setHospital} />
              <InputBox value={lokasi} title={'Alamat Lokasi'} onChangeText={setLokasi}/>
              <DropdownPicker value={tekLain} title={'Teknisi Lain Yang Bertugas'} options={nama_teknisi} onSelect={setTekLain}/>
            </View>
          )}

          {page === 2 && (
            <View style={styles.pageInner}>
              <Text style={styles.sectionTitle}>Detail Produk</Text>
              <InputBox value={serialNumber} title={'Serial Number'} onChangeText={setSerialNumber}/>              
              <InputBox value={prodName} title={'Nama Produk'} onChangeText={setProdName}/>
              <InputBox value={tipeProd} title={'Tipe Produk'} onChangeText={setTipeProd}/>  
              <DropdownPicker value={kuantitas} title={'Kuantitas Unit'} options={kuantitas_option} onSelect={setKuantitas} />            
              <InputBox value={merkProd} title={'Merk Produk'} onChangeText={setMerk} />  
              <InputBox value={beritaAcara} title={'Nomor Berita Acara'} onChangeText={setBerita}  />  
            </View>
          )}

          {page === 3 && (
            <View style={styles.pageInner}>
              <Text style={styles.sectionTitle}>Service Detail</Text>
              <CameraInput image={fotoKegiatan} title={'Selfie Foto Kegiatan (Wajib) 0/1'} onImageSelected={setFotoKegiatan}/>
              <CameraInput image={fotoBa} title={'Foto BA/ Daftar Hadir (Wajib) 0/3'} onImageSelected={setFotoBA}/>
              <InputBox value={notes} title={'Notes'} onChangeText={setNotes} />
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
            onRightPress={() => {
              console.log('INLINE RIGHT PRESS — page currently:', page);
              Keyboard.dismiss();
              if (page < 3) { goNext(); }
              else { console.log('INLINE would call handleSubmit'); handleRightPress(); }
            }}
            leftDisabled={leftDisabled}
            onSubmit={() => {
              console.log('parent onSubmit called');
              handleSubmit();
            }}
            // fallback styles or props might be accepted by your Footer — adapt if needed
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

