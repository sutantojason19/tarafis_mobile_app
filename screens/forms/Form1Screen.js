import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, Text } from 'react-native';
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
          <DropdownPicker value={region} title="Region" options={regions} onSelect={setRegion}/>
          <SearchBar value={lokasi} title="Nama Lokasi" onDropdownOpenChange={setDropdownOpen} onPress={setLokasi} />
          <CoordinateInput value={coords} onPress={setCoords}/>
          <InputBox value={lokasi} title="Alamat Lokasi" onChangeText={setNamaUser} />
          <InputBox value={alamat} title="Nama User" onChangeText={setAlamat} />
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
});
