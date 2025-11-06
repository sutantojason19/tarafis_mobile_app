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
import {nama_sales, regions, jabatan, status_kunjungan } from "../../data/appData";

export const HEADER_HEIGHT = 180;

export default function Form2Screen({ navigation }) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const options = [
    'Persentasi',
    'Kunjungan Rutin',
    'Follow Up Produk',
    'Check Stock',
    'Entertain',
    'Trial',
    'Penanganan Complaint',
  ];

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
          <DropdownPicker title="Nama Sales" options={nama_sales} />
          <DropdownPicker title="Region" options={regions} />
          <SearchBar title="Nama Lokasi" onDropdownOpenChange={setDropdownOpen} />
          <CoordinateInput />
          <InputBox title="Tujuan Kunjungan" />
          <CameraInput title="Dokumentasi kunjungan 0/1" />
          <Text style={{fontWeight:'bold', marginTop: 20, fontSize: 18}}>Mohon dicek kembali sebelum menyelesaikan task !!</Text>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      {!keyboardVisible && !dropdownOpen && (
        <View style={{ paddingBottom: 20 }}>
          <Footer mode="footer" title="Submit" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  formContent: { flex: 1 },
});
