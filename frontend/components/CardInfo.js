/**
 * CardInfo.js
 *
 * Form detail screen used to view, edit, export and save a single form record.
 *
 * Responsibilities:
 * - Render fields found in `data` (passed via props or navigation params)
 * - Support read-only fields and editable fields
 * - Special rendering for date fields and image fields (CameraInput)
 * - Upload newly selected images before submitting updates
 * - Perform a PATCH to /api/forms/:form_type/:id?user_id=...
 * - Export the current form as a PDF via Expo Print + Sharing
 *
 * Props:
 * - route (optional)            : react-navigation route (used to get params.data)
 * - navigation (optional)       : react-navigation navigation (used for goBack)
 * - data (object | null)        : initial form data to display
 * - onSave (fn)                 : optional callback invoked after successful save
 * - onCancel (fn)               : optional callback for cancel action
 * - uploadingHost (string)      : base host used when uploading images and creating preview URLs
 * - formTypeColor (string)      : optional color used for header label coloring
 *
 * Notes:
 * - The component attempts to minimize data sent to server by diffing changed fields.
 * - Image upload endpoint is expected at `${uploadingHost}/uploads` and returns JSON with `filename`.
 * - This file uses Expo APIs (Print, FileSystem, Sharing) and expo-image-picker via CameraInput component.
 */

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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */

export default function CardInfo(props) {
  const insets = useSafeAreaInsets();

  // Props (with defaults/fallbacks)
  const {
    route,
    navigation,
    data: dataProp,
    onSave,
    onCancel,
    uploadingHost: uploadingHostProp,
    formTypeColor,
  } = props;

  // Data source: explicit prop -> route param -> null
  const data = dataProp ?? route?.params?.data ?? null;

  // Host used to build preview URLs and upload endpoint.
  // Prefer explicit prop (useful in tests), otherwise use empty string (will fallback later).
  const uploadingHost = uploadingHostProp ?? '';

  // Local editable copy of the record
  const [local, setLocal] = useState(data ? { ...data } : null);
  const [saving, setSaving] = useState(false);
  const [showDatePickerKey, setShowDatePickerKey] = useState(null);

  // Safe callbacks: if parent doesn't provide onSave/onCancel, provide sensible defaults.
  const safeOnSave = onSave || (async () => {});
  const safeOnCancel =
    onCancel ||
    (() => {
      if (navigation && navigation.goBack) navigation.goBack();
    });

  // When the source `data` changes (navigation param or prop), reset local state
  useEffect(() => {
    setLocal(data ? { ...data } : null);
  }, [data]);

  /* -------------------------
   * Small helper utilities
   * ------------------------- */

  // Detect likely image keys (field names containing foto/dokumentasi/selfie/bukti)
  const isImageKey = useCallback((k) => /foto|dokumentasi|selfie|bukti/i.test(k), []);

  // Fields that should be displayed as read-only
  const isReadOnlyKey = useCallback(
    (k) => ['id', 'form_id', 'user_id', 'created_at', 'updated_at', 'form_type'].includes(k),
    []
  );

  // Title case: "nama_lokasi" -> "Nama Lokasi"
  const titleCase = (raw = '') =>
    raw
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' ');

  // Set of keys to hide when null/empty (used to reduce clutter)
  const SKIP_IF_NULL = useMemo(() =>
    new Set(['nama_user', 'jabatan_user', 'users_json', 'status_kunjungan']),
  []);

  const renderUsersField = (users) => {
    if (!Array.isArray(users) || users.length === 0) return null;

    return (
      <View style={styles.row}>
        <Text style={styles.label}>User yang Dikunjungi</Text>

        {users.map((u, i) => (
          <View
            key={i}
            style={{
              backgroundColor: '#FBFBFC',
              borderRadius: 10,
              padding: 12,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#EEF2F6',
            }}
          >
            <Text style={{ fontWeight: '600', color: '#111827' }}>
              {i + 1}. {u.nama || '-'}
            </Text>
            <Text style={{ color: '#6B7280', marginTop: 4 }}>
              Jabatan: {u.jabatan || '-'}
            </Text>
          </View>
        ))}
      </View>
    );
  };



  // Compute keys to render and their order:
  // - Prioritize commonly important fields using `priority` array
  // - Filter out keys that should be skipped when empty
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

    // Put priority fields first, then others
    const ordered = [...priority.filter((k) => keys.includes(k)), ...keys.filter((k) => !priority.includes(k))];

    // Filter according to SKIP_IF_NULL and preserve read-only keys
    const filtered = ordered.filter((k) => {
      if (isReadOnlyKey(k)) return true;
      if (SKIP_IF_NULL.has(k)) {
        const v = local[k];
        if (v === null || typeof v === 'undefined') return false;
        if (typeof v === 'string' && v.trim() === '') return false;
      }
      return true;
    });

    return filtered;
  }, [local, isReadOnlyKey, SKIP_IF_NULL]);

  /**
   * uploadNewImages
   *
   * Finds fields that are newly selected images (`{ __new: true, uri, fileName, type }`),
   * uploads them to `${uploadingHost}/uploads`, and replaces the field value with the returned filename.
   *
   * Returns a new object with updated values.
   */
  const uploadNewImages = useCallback(
    async (obj) => {
      const updated = { ...obj };

      // Find keys whose value signals a new image object
      const imageKeys = Object.keys(updated).filter(
        (k) => isImageKey(k) && updated[k] && typeof updated[k] === 'object' && updated[k].__new
      );

      if (imageKeys.length === 0) return updated;

      // Create upload promises
      const uploads = imageKeys.map(async (k) => {
        const file = updated[k];
        const fd = new FormData();
        fd.append('file', {
          name: file.fileName || `upload_${Date.now()}.jpg`,
          type: file.type || 'image/jpeg',
          uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
        });

        // Upload to /uploads endpoint on uploadingHost
        const resp = await fetch(`${uploadingHost}/uploads`, { method: 'POST', body: fd });

        if (!resp.ok) {
          // try to read response text for helpful error
          const t = await resp.text().catch(() => null);
          throw new Error(`Upload failed${t ? `: ${t}` : ''}`);
        }

        const json = await resp.json();
        // Support multiple possible server response keys: filename / fileName / name
        return { key: k, filename: json.filename || json.fileName || json.name };
      });

      // Wait for all uploads and update values
      const results = await Promise.all(uploads);
      results.forEach((r) => {
        updated[r.key] = r.filename;
      });

      return updated;
    },
    [isImageKey, uploadingHost]
  );

  /* -------------------------
   * Render helpers
   * ------------------------- */

  const renderLabel = (key, required = false) => {
    const labelColor = formTypeColor || styles.label.color || '#1E40AF';
    return (
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: labelColor }]}>{titleCase(key)}</Text>
        {required && <Text style={styles.required}> *</Text>}
      </View>
    );
  };

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

  // Render image field using CameraInput. Supports removing the image.
  const renderImageField = (key) => {
    const val = local[key];
    const isNew = val && typeof val === 'object' && val.__new;
    const uri = isNew ? val.uri : val ? `${uploadingHost}/uploads/${val}` : null;

    return (
      <View key={key} style={styles.row}>
        <Text style={styles.label}>{titleCase(key)}</Text>

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

        <TouchableOpacity onPress={() => setLocal((p) => ({ ...p, [key]: null }))} style={[styles.smallBtn, { marginTop: 8 }]}>
          <Text style={styles.smallBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Generic field renderer based on key name and content
  const renderField = (key) => {
    if (key === 'form_type') return null; // hide the internal form_type field
    if (isReadOnlyKey(key)) return renderReadOnly(key, local[key]);
    if (isImageKey(key)) return renderImageField(key);
    if (/tanggal|date/i.test(key)) return renderDateField(key);
    return renderTextField(key);
  };

  /* -------------------------
   * Save / export logic
   * ------------------------- */

  /**
   * handleSave
   *
   * - Uploads new images first
   * - Builds an "updates" object by diffing original data and local state
   * - Sends PATCH request with changed fields only
   * - On success updates local state and calls safeOnSave
   */
  const handleSave = async () => {
    try {
      if (!local) return Alert.alert('Error', 'Nothing to save.');

      // Minimal validation examples
      if (!local.id) return Alert.alert('Error', 'Missing form id.');
      if (!local.form_type) return Alert.alert('Error', 'Missing form_type.');
      if (local.form_type === 'technician_activity' && (!local.nama_teknisi || !local.nama_teknisi.trim())) {
        return Alert.alert('Validation', 'Nama teknisi is required');
      }

      setSaving(true);

      // 1) Upload all newly selected images (if any)
      let withUploadedImages;
      try {
        withUploadedImages = await uploadNewImages(local);
      } catch (uploadErr) {
        console.error('Image upload failed', uploadErr);
        Alert.alert('Upload failed', String(uploadErr?.message ?? uploadErr));
        setSaving(false);
        return;
      }

      // 2) Diff original and new to produce minimal updates
      const original = data ?? {};
      const protectedCols = new Set(['id', 'user_id', 'form_id', 'form_type', 'created_at', 'updated_at']);

      const updatesRaw = {};
      for (const k of Object.keys(withUploadedImages)) {
        if (protectedCols.has(k)) continue;

        const newVal = withUploadedImages[k];
        const origVal = original[k];

        // Normalization for comparison (dates, strings, JSON)
        const normalize = (v) => {
          if (v instanceof Date) return v.toISOString();
          if (v === null || typeof v === 'undefined') return null;
          if (typeof v === 'string') {
            const s = v.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
            const isoMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(s);
            if (isoMatch) return s;
            return s;
          }
          try {
            return JSON.stringify(v);
          } catch {
            return String(v);
          }
        };

        const n = normalize(newVal);
        const o = normalize(origVal);

        const changed = (n === null && o !== null) || (n !== null && o === null) || (n !== null && o !== null && n !== o);

        if (changed) updatesRaw[k] = newVal;
      }

      // 3) Build final updates payload (remove undefined, convert Date -> ISO)
      const updates = {};
      for (const [k, v] of Object.entries(updatesRaw)) {
        if (!k || typeof k !== 'string') continue;
        if (protectedCols.has(k)) continue;
        if (typeof v === 'undefined') continue;

        if (k === 'users_json' && typeof v !== 'string') {
          updates[k] = JSON.stringify(v);
        } else {
          updates[k] = v instanceof Date ? v.toISOString() : v;
        }
      }

      // Nothing changed? notify parent and return
      if (Object.keys(updates).length === 0) {
        await safeOnSave(withUploadedImages);
        setLocal(withUploadedImages);
        setSaving(false);
        return Alert.alert('No changes', 'Nothing to update.');
      }

      // 4) Get user_id from AsyncStorage (fallback to '1' if missing)
      let userId = '1';
      try {
        const stored = await AsyncStorage.getItem('user_id');
        if (stored) userId = stored;
      } catch (e) {
        console.warn('Failed reading user_id from storage, using fallback "1"', e);
      }

      // 5) Send PATCH request to server
      const host = API_URL?.replace(/\/$/, '') || 'http://192.168.1.20:3000';
      const url = `${host}/api/forms/${encodeURIComponent(local.form_type)}/${encodeURIComponent(local.id)}?user_id=${encodeURIComponent(
        userId
      )}`;

      const resp = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      // Attempt to parse json response (if any)
      let respJson = null;
      try {
        respJson = await resp.json();
      } catch (e) {
        // ignore: server may return no body
      }

      if (!resp.ok) {
        const message = respJson?.message || `Update failed (status ${resp.status})`;
        throw new Error(message);
      }

      const affectedRows = Number(
        respJson?.affectedRows ?? respJson?.affected_rows ?? respJson?.affected ?? respJson?.changedRows ?? 0
      );

      if (affectedRows === 0) {
        Alert.alert('Warning', respJson?.message || 'Request succeeded but no rows were updated.');
      }

      // 6) Success: update local state and notify parent
      setLocal(withUploadedImages);
      await safeOnSave(withUploadedImages);
      Alert.alert('Success', 'Form updated successfully.');
    } catch (err) {
      console.error('Save failed', err);
      const friendly = err?.message ?? String(err);
      Alert.alert('Save failed', friendly);
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------
   * Export to PDF
   * ------------------------- */

  // Build a simple HTML representation for the PDF export
  const buildHtmlForPdf = (obj) => {
    const rows = Object.keys(obj)
      .map((k) => {
        let displayValue = '';

        // --- Special case: users_json (array of users) ---
        if (k === 'users_json') {
          try {
            const users =
              typeof obj[k] === 'string'
                ? JSON.parse(obj[k])
                : obj[k];

            if (Array.isArray(users) && users.length > 0) {
              displayValue = users
                .map(
                  (u, i) =>
                    `${i + 1}. ${u.nama || '-'} (${u.jabatan || '-'})`
                )
                .join('<br/>');
            } else {
              displayValue = '-';
            }
          } catch (e) {
            displayValue = '-';
          }
        }

        // --- New image placeholder ---
        else if (obj[k] && typeof obj[k] === 'object' && obj[k].__new) {
          displayValue = '(new image)';
        }

        // --- Arrays (fallback) ---
        else if (Array.isArray(obj[k])) {
          displayValue = obj[k].join(', ');
        }

        // --- Objects (fallback) ---
        else if (typeof obj[k] === 'object' && obj[k] !== null) {
          try {
            displayValue = JSON.stringify(obj[k]);
          } catch {
            displayValue = String(obj[k]);
          }
        }

        // --- Primitives ---
        else {
          displayValue = obj[k] ?? '';
        }

        return `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:600;vertical-align:top;">
              ${titleCase(k)}
            </td>
            <td style="padding:8px;border:1px solid #ddd;">
              ${String(displayValue)}
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="font-family: Arial, sans-serif; padding:20px;">
          <h2>Form Export — ${obj.form_type} — ID: ${obj.id ?? ''}</h2>
          <table style="border-collapse: collapse; width:100%;">
            ${rows}
          </table>
        </body>
      </html>
    `;
  };

  const handleDownload = async () => {
    try {
      if (!local) return Alert.alert('Nothing to export');

      const html = buildHtmlForPdf(local);
      const { uri: pdfUri } = await Print.printToFileAsync({ html });

      if (!pdfUri) throw new Error('Failed to generate PDF');

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(pdfUri, { dialogTitle: 'Export PDF' });
      } else {
        Alert.alert('Saved', `PDF generated at: ${pdfUri}`);
      }
    } catch (err) {
      console.error('Export failed', err);
      Alert.alert('Export failed', String(err?.message ?? err));
    }
  };

  /* -------------------------
   * Render
   * ------------------------- */

  // Empty / no-data state
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

  // Main render: header + scrollable form fields + actions
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={['#60A5FA', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.topSection,
          { paddingTop: insets.top, height: insets.top + 160 },
          { backgroundColor: formTypeColor },
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

          {/* Render users separately */}
          {local.users_json && renderUsersField(
            typeof local.users_json === 'string'
              ? JSON.parse(local.users_json)
              : local.users_json
          )}

          {/* Render all other fields */}
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

/* -------------------------
 * Styles
 * ------------------------- */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

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

  imageFieldBoxOld: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#FFFFFF',
  },

  imageRow: { flexDirection: 'row', alignItems: 'center' },
  imagePreview: { width: '100%', height: '100%' },

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

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  downloadBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDEFF2',
  },
  downloadText: { color: 'white', fontWeight: '700' },

  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 30,
    alignItems: 'center',
    backgroundColor: '#63bf3c',
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
