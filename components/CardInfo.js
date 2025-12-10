// CardInfo.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import CameraInput from './CameraInput';

// NOTE: import SafeAreaView + hook from react-native-safe-area-context
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function CardInfo(props) {
  // ---- hooks (must be inside component) ----
  const insets = useSafeAreaInsets();

  const {
    route,
    navigation,
    data: dataProp,
    onSave,
    onCancel,
    uploadingHost: uploadingHostProp,
  } = props;

  const data = dataProp ?? route?.params?.data ?? null;
  const uploadingHost = uploadingHostProp ?? '';

  const [local, setLocal] = useState(data ? { ...data } : null);
  const [saving, setSaving] = useState(false);
  const [showDatePickerKey, setShowDatePickerKey] = useState(null);

  const safeOnSave = onSave || (async () => {});
  const safeOnCancel =
    onCancel ||
    (() => {
      if (navigation && navigation.goBack) navigation.goBack();
    });

  useEffect(() => {
    setLocal(data ? { ...data } : null);
  }, [data]);

  // helpers
  const isImageKey = useCallback((k) => /foto|dokumentasi|selfie|bukti/i.test(k), []);
  const isReadOnlyKey = useCallback(
    (k) => ['id', 'form_id', 'user_id', 'created_at', 'updated_at', 'form_type'].includes(k),
    []
  );

  // Title case helper: "nama_lokasi" -> "Nama Lokasi"
  const titleCase = (raw = '') =>
    raw
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' ');

  // --- IMPORTANT: skip rendering these fields when null/empty
  const SKIP_IF_NULL = useMemo(() => new Set(['nama_user', 'jabatan_user', 'status_kunjungan']), []);

  const safeKeys = useMemo(() => {
    if (!local) return [];
    const priority = [
      'nama_lokasi',
      'nama_customer',
      'nama_sales',
      'nama_teknisi',
      'region',
      'alamat_lokasi',
      'tanggal_aktivitas',
      'tanggal_pengambilan',
    ];
    const keys = Object.keys(local);

    // make ordered array (priority first)
    const ordered = [...priority.filter((k) => keys.includes(k)), ...keys.filter((k) => !priority.includes(k))];

    // filter out keys that we explicitly skip when null/empty
    const filtered = ordered.filter((k) => {
      // always include read-only keys (even if empty) — optional, but keeps id/form_id visible
      if (isReadOnlyKey(k)) return true;

      // if key is in SKIP_IF_NULL and value is null/undefined/empty-string => don't include
      if (SKIP_IF_NULL.has(k)) {
        const v = local[k];
        if (v === null || typeof v === 'undefined') return false;
        if (typeof v === 'string' && v.trim() === '') return false;
      }

      // otherwise include key (we keep original behavior — you can add more filters)
      return true;
    });

    return filtered;
  }, [local, isReadOnlyKey, SKIP_IF_NULL]);

  // upload images helper
  const uploadNewImages = useCallback(
    async (obj) => {
      const updated = { ...obj };
      const imageKeys = Object.keys(updated).filter(
        (k) => isImageKey(k) && updated[k] && typeof updated[k] === 'object' && updated[k].__new
      );
      if (imageKeys.length === 0) return updated;

      const uploads = imageKeys.map(async (k) => {
        const file = updated[k];
        const fd = new FormData();
        fd.append('file', {
          name: file.fileName || `upload_${Date.now()}.jpg`,
          type: file.type || 'image/jpeg',
          uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
        });

        const resp = await fetch(`${uploadingHost}/uploads`, { method: 'POST', body: fd });
        if (!resp.ok) {
          const t = await resp.text().catch(() => null);
          throw new Error(`Upload failed${t ? `: ${t}` : ''}`);
        }
        const json = await resp.json();
        return { key: k, filename: json.filename || json.fileName || json.name };
      });

      const results = await Promise.all(uploads);
      results.forEach((r) => {
        updated[r.key] = r.filename;
      });
      return updated;
    },
    [isImageKey, uploadingHost]
  );

  // ---- render helpers ----
  const renderLabel = (key, required = false) => (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{titleCase(key)}</Text>
      {required && <Text style={styles.required}> *</Text>}
    </View>
  );

  const renderReadOnly = (key, value) => (
    <View key={key} style={styles.row}>
      {renderLabel(key)}
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{String(value ?? '')}</Text>
      </View>
    </View>
  );

  const renderTextField = (key) => (
    <View key={key} style={styles.row}>
      <Text style={styles.label}>{titleCase(key)}</Text>
      <TextInput
        value={local[key] != null ? String(local[key]) : ''}
        onChangeText={(t) => setLocal((prev) => ({ ...prev, [key]: t }))}
        style={styles.formInput}
        multiline={key.length > 12 || key.includes('note') || key.includes('keterangan')}
        placeholder={titleCase(key)}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );

  const renderDateField = (key) => {
    const dateVal = local[key] ? new Date(local[key]) : null;
    return (
      <View key={key} style={styles.row}>
        <Text style={styles.label}>{titleCase(key)}</Text>
        <TouchableOpacity onPress={() => setShowDatePickerKey(key)} style={styles.formInput}>
          <Text style={styles.inputText}>{dateVal ? dateVal.toISOString().slice(0, 10) : 'Select date'}</Text>
        </TouchableOpacity>
        {showDatePickerKey === key && (
          <DateTimePicker
            value={dateVal || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, picked) => {
              setShowDatePickerKey(null);
              if (picked) setLocal((p) => ({ ...p, [key]: picked.toISOString().slice(0, 10) }));
            }}
          />
        )}
      </View>
    );
  };

  // ---------- IMAGE FIELD: OLD camera styles (reverted) ----------
  const renderImageField = (key) => {
    const val = local[key];
    const isNew = val && typeof val === 'object' && val.__new;
    const uri = isNew ? val.uri : val ? `${uploadingHost}/uploads/${val}` : null;

    return (
      <View key={key} style={styles.row}>
        <Text style={styles.label}>{titleCase(key)}</Text>

        {/* old-style image box */}
        <View style={styles.imageFieldBoxOld}>
          <CameraInput
            title={'none'}
            image={uri}
            onImageSelected={(asset) => {
              if (!asset) return;
              setLocal((prev) => ({
                ...prev,
                [key]: {
                  __new: true,
                  uri: asset.uri,
                  fileName: asset.fileName,
                  type: asset.type,
                },
              }));
            }}
          />
        </View>

        <TouchableOpacity
          onPress={() => setLocal((p) => ({ ...p, [key]: null }))}
          style={[styles.smallBtn, { marginTop: 8 }]}
        >
          <Text style={styles.smallBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderField = (key) => {
    if (key === 'form_type') return null;
    if (isReadOnlyKey(key)) return renderReadOnly(key, local[key]);
    if (isImageKey(key)) return renderImageField(key);
    if (/tanggal|date/i.test(key)) return renderDateField(key);
    return renderTextField(key);
  };

  // ---- save / download handlers ----
  const handleSave = async () => {
    try {
      if (!local) return;
      if (
        local.form_type === 'technician_activity' &&
        (!local.nama_teknisi || !local.nama_teknisi.trim())
      ) {
        return Alert.alert('Validation', 'Nama teknisi is required');
      }

      setSaving(true);
      const withUploadedImages = await uploadNewImages(local);
      await safeOnSave(withUploadedImages);
    } catch (err) {
      Alert.alert('Save failed', String(err?.message ?? err));
    } finally {
      setSaving(false);
    }
  };

  const buildHtmlForPdf = (obj) => {
    const rows = Object.keys(obj)
      .map((k) => {
        const v = obj[k] && obj[k].__new ? '(new image)' : obj[k] ?? '';
        return `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:600;">${titleCase(
          k
        )}</td><td style="padding:8px;border:1px solid #ddd;">${String(v)}</td></tr>`;
      })
      .join('');
    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="font-family: Arial, sans-serif; padding:20px;">
          <h2>Form Export — ${obj.form_type} — ID: ${obj.id ?? ''}</h2>
          <table style="border-collapse: collapse; width:100%;">${rows}</table>
        </body>
      </html>`;

  };

  const handleDownload = async () => {
  try {
    if (!local) return Alert.alert('Nothing to export');

    const html = buildHtmlForPdf(local);
    // printToFileAsync returns { uri: 'file://...' }
    const { uri: pdfUri } = await Print.printToFileAsync({ html });

    if (!pdfUri) throw new Error('Failed to generate PDF');

    // Use the temp file directly with the sharing UI
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      // on most platforms this opens share/save dialog allowing user to save exported pdf
      await Sharing.shareAsync(pdfUri, { dialogTitle: 'Export PDF' });
    } else {
      // fallback: inform user where the temp file is (rare)
      Alert.alert('Saved', `PDF generated at: ${pdfUri}`);
    }
  } catch (err) {
    console.error('Export failed', err);
    Alert.alert('Export failed', String(err?.message ?? err));
  }
};

  // ---- empty state ----
  if (!local) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <LinearGradient colors={['#60A5FA', '#3B82F6']} style={[styles.topSection, { paddingTop: insets.top }]} />
        <View style={[styles.bottomSection, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#666' }}>No data to display.</Text>
          <TouchableOpacity style={[styles.smallBtn, { marginTop: 12 }]} onPress={safeOnCancel}>
            <Text style={styles.smallBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---- main render ----
  return (
    // exclude top edge so gradient can cover status bar / notch area
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={['#60A5FA', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.topSection,
          {
            paddingTop: insets.top,
            height: insets.top + 160,
          },
        ]}
      >
        <Text style={styles.headerText}>Form Details</Text>
      </LinearGradient>

      <View style={styles.bottomSection}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <Text style={styles.headerId}>ID: {local.id}</Text>
            <Text style={styles.headerType}>{local.form_type}</Text>
          </View>

          {safeKeys.map((k) => renderField(k))}

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={handleDownload} style={styles.downloadBtn} disabled={saving}>
              <Text style={styles.downloadText}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={safeOnCancel} style={styles.cancelBtn} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

  // Top gradient area (like Login)
  topSection: {
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  headerText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 40,
  },

  // bottom white rounded card
  bottomSection: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },

  // form container inside the white panel
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
  },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  headerId: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  headerType: { fontSize: 12, color: '#6B7280', textTransform: 'lowercase' },

  row: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#1E40AF' },
  required: { color: '#D92D20', marginLeft: 6, fontWeight: '700' },

  formInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 15,
  },

  inputText: { color: '#111827', fontSize: 15 },

  // read-only boxed style
  readOnlyBox: {
    borderRadius: 12,
    backgroundColor: '#FBFBFC',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  readOnlyText: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },

  // ---- OLD camera/image styles (reverted) ----
  imageFieldBoxOld: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#FFFFFF',
  },

  imageRow: { flexDirection: 'row', alignItems: 'center' },
  imagePreview: { width: '100%', height: '100%' },

  // small remove like old
  smallBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#E5E7EB', borderRadius: 6, alignSelf: 'flex-start' },
  smallBtnText: { fontSize: 13, color: '#374151' },

  removeBtn: {
    marginLeft: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EDEFF2',
  },
  removeBtnText: { color: '#111827', fontWeight: '700' },

  // buttons (matching login)
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  downloadBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDEFF2',
  },
  downloadText: { color: '#111827', fontWeight: '700' },

  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 30,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },

  cancelBtn: {
    flex: 1,
    backgroundColor: 'red',
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDEFF2',
  },
  cancelText: { color: 'white', fontWeight: '700' },
});

