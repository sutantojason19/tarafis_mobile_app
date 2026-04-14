import { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Button } from 'react-native';
import { CameraView, Camera } from 'expo-camera';

export default function BarcodeScanner() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [serial, setSerial] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarcodeScanned = ({ data }) => {
    // Match your serial format
    const isSerial =
      data.startsWith('SK') &&
      data.length >= 8 &&
      data.length <= 15;

    if (!isSerial) return;

    setScanned(true);
    setSerial(data);
    console.log('Serial scanned:', data);
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission…</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['code128', 'code39'],
        }}
      />

      {serial && (
        <View style={styles.resultBox}>
          <Text style={styles.label}>Serial Number:</Text>
          <Text style={styles.serial}>{serial}</Text>

          <Button
            title="Scan again"
            onPress={() => {
              setScanned(false);
              setSerial(null);
            }}
          />
        </View>
      )}
    </View>
  );
}
