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
import {nama_sales, regions, jabatan, status_kunjungan } from "../../data/appData";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HEADER_HEIGHT = 180;
//sales visit non faskes

export default function Form1Screen({ navigation }) {
  const [selected, setSelected] = useState([]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [namaSales, setNamaSales] = useState('');
  const [region, setRegion] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [alamat, setAlamat] = useState('');
  const [namaUser, setNamaUser] = useState('');
  const [jabat, setJabatan] = useState('')
  const [status, setStatus ] = useState('');
  const [note, setNote] = useState('');
  const [dokumentasi, setDok] = useState(''); 
  const [coords, setCoords] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [other, setOther] = useState('')
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hospitals, setHospitals] = useState([]);


  // cache to avoid refetching same region
  const cacheRef = useRef(new Map());

  // store current AbortController so we can cancel previous requests
  const controllerRef = useRef(null);

  const filteredHospitalData = useMemo(() => {
  if (!Array.isArray(hospitals) || !region) return [];

  const regionLower = region.toLowerCase();
  return hospitals
    .filter(h => (h.region || '').toLowerCase() === regionLower)   // exact region match
    .map(h => ({
      label: (h.name || '').replace(/_/g, ' '),   // display name
      value: String(h.hospital_id ?? ''),         // unique id as string
      raw: h                                       // optional: pass full object if needed
    }));
}, [hospitals, region]);

const searchbarSelect = (hosp_name, addr) => {
  setAlamat(addr)
  setLokasi(hosp_name)
}

  
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

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

//   useEffect(() => {
//   hospitals.forEach(h => {
//     console.log(
//       `${h.hospital_id}: ${h.name} — ${h.street} (${h.latitude}, ${h.longitude})`
//     );
//   });
// }, [hospitals]);


   const onSelectRegion = async (selectReg) => {
    setRegion(selectReg);
    setError(null);

    // if cached, use it and skip network
    if (cacheRef.current.has(selectReg)) {
      setHospitals(cacheRef.current.get(selectReg));
      return;
    }

    // cancel previous request if still pending
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    try {
      const url = `http://192.168.1.17:3000/api/forms/hospital/${encodeURIComponent(selectReg)}`;

      const resp = await axios.get(url, {
        signal: controller.signal, // axios supports AbortController in modern versions
        timeout: 10000,            // optional: 10s hard timeout
      });

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

      // cache response
      cacheRef.current.set(selectReg, normalized);

      setHospitals(normalized);
    } catch (err) {
      if (axios.isCancel?.(err) || err.name === 'CanceledError') {
        // request canceled — ignore
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
   


const onSubmit = async () => {
  try {
    const userId = await AsyncStorage.getItem("user_id");

    const nameToSend = namaSales?.value ?? namaSales ?? "";
    const regionToSend = region?.value ?? region ?? "";
    const lokasiToSend = lokasi?.label ?? '';

    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('nama_sales', nameToSend);
    formData.append('region', regionToSend);
    formData.append('nama_lokasi', lokasiToSend);
    formData.append('alamat_lokasi', alamat);
    formData.append('koordinat_lokasi', coords);

    // Normalize selected items into string values
    const allSelected = [...selected];

    if (other.trim()) {
      allSelected.push({
        label: other.trim(),
        value: other.trim().toLowerCase(),
      });
    }

    // Always produce an array of pure strings
    const values = allSelected.map(item => 
      typeof item === 'string'
        ? item
        : item?.value ?? ''
    );

    // Final comma-separated string
    const tujuanKunjunganString = values.join(',');

    // Debug
    console.log("CLEAN tujuan_kunjungan =", tujuanKunjunganString);

    // Append CORRECT value
    formData.append('tujuan_kunjungan', tujuanKunjunganString);
    formData.append('note_kunjungan', note);
    formData.append('nama_user', namaUser);
    formData.append('jabatan_user', jabat);
    formData.append('status_kunjungan', status);

    if (dokumentasi?.uri) {
      formData.append('dokumentasi_kunjungan', {
        uri: dokumentasi.uri,
        name: dokumentasi.fileName || 'photo.jpg',
        type: 'image/jpeg',
      });
    }

    //  DEBUG PRINT HERE
    if (formData && formData._parts) {
      console.log("----- FORM DATA DEBUG START -----");
      formData._parts.forEach(([key, value]) => {
        console.log(key, ":", value);
      });
      console.log("----- FORM DATA DEBUG END -----");
    }
      const response = await axios.post(
        'http://192.168.1.29:3000/api/forms/customer',
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

  return (
    <View style={[styles.container, { overflow: 'visible' }]}>
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
          <DropdownPicker value={namaSales} title="Nama Sales" options={nama_sales} onSelect={setNamaSales} />
          <DropdownPicker value={region} title="Region" options={regions} onSelect={onSelectRegion}/>
          {loading && (
            <View style={styles.spinner}>
              <ActivityIndicator size="small" />
              <Text style={styles.spinnerText}>Loading hospitals…</Text>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <SearchBar value={lokasi} title="Nama Lokasi" onDropdownOpenChange={setDropdownOpen} onPress={searchbarSelect} hospitalData={hospitals} />
          <CoordinateInput value={coords} onPress={setCoords}/>
          <InputBox value={alamat} title="Alamat Lokasi" onChangeText={setAlamat} />
          <InputBox value={namaUser} title="Nama User" onChangeText={setNamaUser}/>
          <DropdownPicker value={jabat} title="Jabatan User" options={jabatan} onSelect={setJabatan} />
          <MultiSelectCheckbox value={selected} title="Tujuan Kunjungan" options={options} selected={selected} onChange={setSelected} otherValue={other} onOtherChange={setOther} />
          <DropdownPicker value={status} title="Status Kunjungan" options={status_kunjungan} onSelect={setStatus}/>
          <CameraInput image={dokumentasi} title="Dokumentasi kunjungan 0/1" onImageSelected={setDok} />
          <InputBox value={note} title="Note Kunjungan (Hasil/Update Kunjungan)" onChangeText={setNote}/>
          <Text>Mohon dicek kembali sebelum menyelesaikan task !!</Text>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      {!keyboardVisible && !dropdownOpen && (
        <View style={{ paddingBottom: 20 }}>
          <Footer mode="footer" title="Submit" onPress={onSubmit} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  formContent: { flex: 1 },
  spinner: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignSelf: 'flex-start', // similar to inline-block
  },
  spinnerText: {
    fontSize: 14,
    color: '#333',
  }
});
