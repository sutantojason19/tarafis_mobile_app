import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import FormHeader from '../../components/FormHeader';
import InputBox from '../../components/InputBox';
import CoordinateInput from '../../components/CoordinateInput';
import DropdownPicker from '../../components/DropdownPicker';
import CameraInput from '../../components/CameraInput';
import Footer from '../../components/Footer';
import SearchBar from '../../components/SearchBar';
import {nama_sales, regions} from "../../data/appData";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


export const HEADER_HEIGHT = 180;

export default function Form2Screen({ navigation}) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [namaSales, setNamaSales] = useState('');
  const [region, setRegion] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [alamat, setAlamat] = useState('');
  const [tujuan, setTujuanKunjungan] = useState('');
  const [dokumentasi, setDok] = useState(''); 
  const [coords, setCoords] = useState('');
  const [note, setNote] = useState('');

  const onSubmit = async () => {
   try {
    const nameToSend = namaSales?.value ?? namaSales ?? "";
    const regionToSend = region?.value ?? region ?? "";
    const lokasiToSend = lokasi?.label ?? '';
    const userId = await AsyncStorage.getItem("user_id");

    // Construct FormData
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('nama_sales', nameToSend);
    formData.append('region', regionToSend);
    formData.append('nama_lokasi', lokasiToSend);
    formData.append('alamat_lokasi', alamat);
    formData.append('koordinat_lokasi', coords);
    formData.append('tujuan_kunjungan', tujuan);
    formData.append('note_kunjungan', note);

    // Append image only if available
    if (dokumentasi?.uri) {
      formData.append('dokumentasi_kunjungan', {
        uri: dokumentasi.uri,
        name: dokumentasi.fileName || 'photo.jpg',
        type: 'image/jpeg',
      });
    }

    // Send to backend

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


  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <View style={[styles.container, { overflow: 'visible' }]}>
      <FormHeader title="Sales Visit Non Faskes" navigation={navigation} />

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
          <DropdownPicker value={namaSales} title="Nama Sales" options={nama_sales} onSelect={setNamaSales}/>
          <DropdownPicker value={region} title="Region" options={regions} onSelect={setRegion} />
          <SearchBar value={lokasi} title="Nama Lokasi" onDropdownOpenChange={setDropdownOpen} onPress={setLokasi} />
          <InputBox value={alamat} title="Alamat Lokasi" onChangeText={setAlamat} />
          <CoordinateInput value={coords} onPress={setCoords}/>
          <InputBox value={tujuan} title="Tujuan Kunjungan" onChangeText={setTujuanKunjungan} />
          <CameraInput image={dokumentasi} title="Dokumentasi kunjungan 0/1" onImageSelected={setDok} />
          <InputBox value={note} title="Note Kunjungan" onChangeText={setNote} />
          <Text style={{fontWeight:'bold', marginTop: 20, fontSize: 18}}>Mohon dicek kembali sebelum menyelesaikan task !!</Text>
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
