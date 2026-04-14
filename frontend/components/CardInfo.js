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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import CameraInput from './CameraInput';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE from '../config/api';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

/* ------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------ */

const IMAGE_FIELDS_BY_TYPE = {
  sales: ['visit_documentation'],
  technician_activity: ['selfie_photo', 'attendance_document_photo'],
  technician_service: [
    'corrective_proof',
    'capa_action_image',
    'device_before_service_photo',
  ],
};

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

  // Prefer explicit prop, otherwise env, otherwise fallback host
  const apiHost = API_BASE;
   console.log(apiHost)

  // Local editable copy of the record
  const [local, setLocal] = useState(data ? { ...data } : null);
  const [saving, setSaving] = useState(false);
  const [showDatePickerKey, setShowDatePickerKey] = useState(null);
  const [resolvedImageUrls, setResolvedImageUrls] = useState({});
  const [loadingImages, setLoadingImages] = useState(false);
  
  // Safe callbacks
  const safeOnSave = onSave || (async () => {});
  const safeOnCancel =
    onCancel ||
    (() => {
      if (navigation && navigation.goBack) navigation.goBack();
    });

  // When source data changes, reset local state
  useEffect(() => {
    setLocal(data ? { ...data } : null);
  }, [data]);

  /* -------------------------
   * Small helper utilities
   * ------------------------- */

  // Detect likely image keys
  const isImageKey = useCallback((k) => /foto|dokumentasi|selfie|bukti|proof|image|photo/i.test(k), []);

  // Exact image field detection for your forms
  const isKnownImageField = useCallback((k) => {
    return Object.values(IMAGE_FIELDS_BY_TYPE).some((fields) => fields.includes(k));
  }, []);

  const isLikelyS3Key = useCallback((value) => {
    if (!value || typeof value !== 'string') return false;
    if (value.startsWith('http://') || value.startsWith('https://')) return false;
    return true;
  }, []);

  const getImageFieldsForType = useCallback((visitType) => {
    return IMAGE_FIELDS_BY_TYPE[visitType] || [];
  }, []);

  const getSignedImageUrl = useCallback(
    async (key) => {
      try {
        const token = await AsyncStorage.getItem('token');

        const response = await fetch(
          `${apiHost}/api/uploads/image?key=${encodeURIComponent(key)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        let json = null;
        try {
          json = await response.json();
        } catch (e) {}

        if (!response.ok) {
          throw new Error(json?.message || `Failed to get signed image URL (${response.status})`);
        }

        return json?.imageUrl || null;
      } catch (error) {
        console.error('getSignedImageUrl error:', error?.message || error);
        return null;
      }
    },
    [apiHost]
  );

  const resolveExistingImages = useCallback(
    async (obj) => {
      if (!obj?.visit_type) {
        setResolvedImageUrls({});
        return;
      }

      const imageFields = getImageFieldsForType(obj.visit_type);
      if (!imageFields.length) {
        setResolvedImageUrls({});
        return;
      }

      setLoadingImages(true);

      try {
        const nextImageUrls = {};

        for (const field of imageFields) {
          const value = obj[field];

          if (!value) continue;

          // New unsaved image selected in UI
          if (typeof value === 'object' && value.__new && value.uri) {
            nextImageUrls[field] = value.uri;
            continue;
          }

          // Already a full URL
          if (typeof value === 'string' && !isLikelyS3Key(value)) {
            nextImageUrls[field] = value;
            continue;
          }

          // Stored DB key -> resolve signed URL
          if (typeof value === 'string' && isLikelyS3Key(value)) {
            const signedUrl = await getSignedImageUrl(value);
            if (signedUrl) {
              nextImageUrls[field] = signedUrl;
            }
          }
        }

        setResolvedImageUrls(nextImageUrls);
      } catch (err) {
        console.error('resolveExistingImages failed:', err?.message || err);
        setResolvedImageUrls({});
      } finally {
        setLoadingImages(false);
      }
    },
    [getImageFieldsForType, getSignedImageUrl, isLikelyS3Key]
  );

  useEffect(() => {
    if (!local) {
      setResolvedImageUrls({});
      return;
    }

    resolveExistingImages(local);
  }, [local?.id, local?.visit_type, resolveExistingImages]);

  // Read-only fields
  const READ_ONLY_SALES_FIELDS = new Set([
    'visit_id',
    'is_draft',
    'visit_form_type',
  ]);

  const READ_ONLY_ACTIVITY_FIELDS = new Set([
    'visit_id',
    'is_draft',
    'product_id',
  ]);

  const VISIT_EDITABLE_FIELDS = new Set([
    'latitude',
    'longitude',
    'note',
  ]);

  const READ_ONLY_VISIT_FIELDS = new Set([
    'id',
    'user_id',
    'customer_id',
    'visited_at',
    'visit_type',
    'is_draft',
    'sales_category',
    'created_at',
    'updated_at',
    'visit_id',
    'product_id',
  ]);

  // Hidden fields
  const HIDDEN_FIELDS = new Set([
    'deleted_at',
    'form_type',
  ]);

  // Combined read-only fields
  const READ_ONLY_FIELDS = new Set([
    ...READ_ONLY_VISIT_FIELDS,
    ...READ_ONLY_ACTIVITY_FIELDS,
    ...READ_ONLY_SALES_FIELDS,
  ]);

  const isReadOnlyKey = useCallback((k) => READ_ONLY_FIELDS.has(k), []);
  const isHiddenKey = useCallback((k) => HIDDEN_FIELDS.has(k), []);

  const titleCase = (raw = '') =>
    raw
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' ');

  const SKIP_IF_NULL = useMemo(
    () => new Set(['nama_user', 'jabatan_user', 'users_json', 'status_kunjungan']),
    []
  );

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

  const HIDE_LAT_LNG_VISIT_TYPES = new Set([
    'technician_activity',
    'technician_service',
  ]);

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

    const ordered = [
      ...priority.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !priority.includes(k)),
    ];

    const filtered = ordered.filter((k) => {
      if (isHiddenKey(k)) return false;

      const visitType = local?.visit_type;

      if (
        HIDE_LAT_LNG_VISIT_TYPES.has(visitType) &&
        (k === 'latitude' || k === 'longitude')
      ) {
        return false;
      }

      if (isReadOnlyKey(k)) return true;

      if (SKIP_IF_NULL.has(k)) {
        const v = local[k];
        if (v === null || typeof v === 'undefined') return false;
        if (typeof v === 'string' && v.trim() === '') return false;
      }

      return true;
    });

    return filtered;
  }, [local, isReadOnlyKey, isHiddenKey, SKIP_IF_NULL]);

  /**
   * uploadNewImages
   *
   * Finds fields that are newly selected images (`{ __new: true, uri, fileName, type }`),
   * uploads them to `${apiHost}/uploads`, and replaces the field value with the returned filename.
   *
   * Returns a new object with updated values.
   */
  const uploadNewImages = useCallback(
    async (obj) => {
      const updated = { ...obj };

      const imageKeys = Object.keys(updated).filter(
        (k) =>
          (isImageKey(k) || isKnownImageField(k)) &&
          updated[k] &&
          typeof updated[k] === 'object' &&
          updated[k].__new
      );

      if (imageKeys.length === 0) return updated;

      const uploads = imageKeys.map(async (k) => {
        const file = updated[k];
        const token = await AsyncStorage.getItem('token');

        // 1. Ask backend for presigned upload URL
        const presignResp = await fetch(`${apiHost}/api/uploads/presign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            fileName: file.fileName || `upload_${Date.now()}.jpg`,
            contentType: file.type || 'image/jpeg',
            folder: 'uploads',
          }),
        });

        let presignJson = null;
        try {
          presignJson = await presignResp.json();
        } catch (e) {}

        if (!presignResp.ok) {
          throw new Error(
            presignJson?.message || `Failed to create presigned upload (${presignResp.status})`
          );
        }

        const uploadUrl = presignJson?.uploadUrl;
        const uploadedKey = presignJson?.key;

        if (!uploadUrl || !uploadedKey) {
          throw new Error('Presign response missing uploadUrl or key');
        }

        // 2. Read local file into blob
        const localFileResp = await fetch(file.uri);
        const blob = await localFileResp.blob();

        // 3. Upload directly to S3
        const s3UploadResp = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'image/jpeg',
          },
          body: blob,
        });

        if (!s3UploadResp.ok) {
          throw new Error(`S3 upload failed (${s3UploadResp.status})`);
        }

        // 4. Save returned S3 key into form data
        return { key: k, filename: uploadedKey };
      });

      const results = await Promise.all(uploads);
      results.forEach((r) => {
        updated[r.key] = r.filename;
      });

      return updated;
    },
    [apiHost, isImageKey, isKnownImageField]
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

  const formatDisplayValue = (key, value) => {
    if (value == null) return '';

    if (
      /tanggal|date|visited_at|created_at|updated_at/i.test(key) &&
      typeof value === 'string'
    ) {
      const d = new Date(value);

      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    return String(value);
  };

  const renderReadOnly = (key, value) => (
    <View key={key} style={styles.row}>
      {renderLabel(key)}
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{formatDisplayValue(key, value)}</Text>
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
          <Text style={styles.inputText}>
            {dateVal ? dateVal.toISOString().slice(0, 10) : 'Select date'}
          </Text>
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

  const renderImageField = (key) => {
    const val = local[key];
    const isNew = val && typeof val === 'object' && val.__new;
    const uri = isNew ? val.uri : resolvedImageUrls[key] || null;

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
              setResolvedImageUrls((prev) => ({
                ...prev,
                [key]: asset.uri,
              }));
            }}
          />
        </View>

        {loadingImages && !uri ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : null}

        <TouchableOpacity
          onPress={() => {
            setLocal((p) => ({ ...p, [key]: null }));
            setResolvedImageUrls((prev) => ({
              ...prev,
              [key]: null,
            }));
          }}
          style={[styles.smallBtn, { marginTop: 8 }]}
        >
          <Text style={styles.smallBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderField = (key) => {
    if (isHiddenKey(key)) return null;
    if (isReadOnlyKey(key)) return renderReadOnly(key, local[key]);
    if (isImageKey(key) || isKnownImageField(key)) return renderImageField(key);
    if (/tanggal|date/i.test(key)) return renderDateField(key);
    return renderTextField(key);
  };

  /* -------------------------
   * Save / export logic
   * ------------------------- */

  const handleSave = async () => {
    try {
      if (!local) {
        Alert.alert('Error', 'Nothing to save.');
        return;
      }

      if (!local.id) {
        Alert.alert('Error', 'Missing form id.');
        return;
      }

      if (!local.visit_type) {
        Alert.alert('Error', 'Missing form_type.');
        return;
      }

      if (
        local.visit_type === 'technician_activity' &&
        (!local.technician_name || !String(local.technician_name).trim())
      ) {
        Alert.alert('Validation', 'Nama teknisi is required');
        return;
      }

      setSaving(true);

      let withUploadedImages = local;
      try {
        withUploadedImages = await uploadNewImages(local);
      } catch (uploadErr) {
        console.error('Image upload failed', uploadErr);
        Alert.alert('Upload failed', String(uploadErr?.message ?? uploadErr));
        setSaving(false);
        return;
      }

      const original = data ?? {};

      const protectedCols = new Set([
        'id',
        'user_id',
        'form_id',
        'form_type',
        'created_at',
        'updated_at',
        'deleted_at',
        'visit_id',
        'is_draft',
        'visit_form_type',
        'product_id',
        'customer_id',
        'visited_at',
        'visit_type',
        'sales_category',
        'users_json',
      ]);

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

      const updates = {};
      for (const k of Object.keys(withUploadedImages)) {
        if (protectedCols.has(k)) continue;
        if (isHiddenKey(k)) continue;

        const newVal = withUploadedImages[k];
        const origVal = original[k];

        const n = normalize(newVal);
        const o = normalize(origVal);

        const changed =
          (n === null && o !== null) ||
          (n !== null && o === null) ||
          (n !== null && o !== null && n !== o);

        if (!changed) continue;

        if (k === 'users_json' && typeof newVal !== 'string') {
          updates[k] = JSON.stringify(newVal);
        } else {
          updates[k] = newVal instanceof Date ? newVal.toISOString() : newVal;
        }
      }

      if (Object.keys(updates).length === 0) {
        setLocal(withUploadedImages);
        await resolveExistingImages(withUploadedImages);
        await safeOnSave(withUploadedImages);
        Alert.alert('No changes', 'Nothing to update.');
        return;
      }

      const visitUpdates = {};
      const detailUpdates = {};

      for (const [k, v] of Object.entries(updates)) {
        if (VISIT_EDITABLE_FIELDS.has(k)) {
          visitUpdates[k] = v;
        } else {
          detailUpdates[k] = v;
        }
      }

      let userId = '1';
      try {
        const stored = await AsyncStorage.getItem('user_id');
        if (stored) userId = stored;
      } catch (e) {
        console.warn('Failed reading user_id from storage, using fallback "1"', e);
      }

      const host = apiHost;
      const token = await AsyncStorage.getItem('token');

      const visitId = withUploadedImages.visit_id || withUploadedImages.id;

      if (!visitId) {
        throw new Error('Missing visit id.');
      }

      let detailType = null;

      if (
        withUploadedImages.form_type === 'technician_activity' ||
        withUploadedImages.visit_type === 'technician_activity'
      ) {
        detailType = 'activity';
      } else if (
        withUploadedImages.form_type === 'technician_service' ||
        withUploadedImages.visit_type === 'technician_service'
      ) {
        detailType = 'service';
      } else {
        detailType = 'sales';
      }

      if (Object.keys(visitUpdates).length > 0) {
        const visitUrl = `${host}/api/visits/${encodeURIComponent(
          visitId
        )}/visit?user_id=${encodeURIComponent(userId)}`;

        const visitResp = await fetch(visitUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(visitUpdates),
        });

        let visitJson = null;
        try {
          visitJson = await visitResp.json();
        } catch (e) {
          // ignore
        }

        if (!visitResp.ok) {
          throw new Error(
            visitJson?.message || `Failed to update visit header (status ${visitResp.status})`
          );
        }
      }

      if (Object.keys(detailUpdates).length > 0) {
        const detailUrl = `${host}/api/visits/${encodeURIComponent(
          visitId
        )}/${detailType}?user_id=${encodeURIComponent(userId)}`;

        const detailResp = await fetch(detailUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(detailUpdates),
        });

        let detailJson = null;
        try {
          detailJson = await detailResp.json();
        } catch (e) {
          // ignore
        }

        if (!detailResp.ok) {
          throw new Error(
            detailJson?.message || `Failed to update ${detailType} detail (status ${detailResp.status})`
          );
        }
      }

      setLocal(withUploadedImages);
      await resolveExistingImages(withUploadedImages);
      await safeOnSave(withUploadedImages);
      Alert.alert('Success', 'Form updated successfully.');
    } catch (err) {
      console.error('Save failed', err);
      Alert.alert('Save failed', err?.message ?? String(err));
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------
   * Export to PDF
   * ------------------------- */

  const buildHtmlForPdf = (obj) => {
    const rows = Object.keys(obj)
      .map((k) => {
        let displayValue = '';

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
        } else if (obj[k] && typeof obj[k] === 'object' && obj[k].__new) {
          displayValue = '(new image)';
        } else if (Array.isArray(obj[k])) {
          displayValue = obj[k].join(', ');
        } else if (typeof obj[k] === 'object' && obj[k] !== null) {
          try {
            displayValue = JSON.stringify(obj[k]);
          } catch {
            displayValue = String(obj[k]);
          }
        } else {
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

  if (!local) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <LinearGradient
          colors={['#60A5FA', '#3B82F6']}
          style={[styles.topSection, { paddingTop: insets.top }]}
        />
        <View style={[styles.bottomSection, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#666' }}>No data to display.</Text>
          <TouchableOpacity style={[styles.smallBtn, { marginTop: 12 }]} onPress={safeOnCancel}>
            <Text style={styles.smallBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <KeyboardAwareScrollView
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
          enableResetScrollToCoords={false}
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerId}>ID: {local.id}</Text>
            <Text style={styles.headerType}>{local.form_type}</Text>
          </View>

          {local.users_json &&
            renderUsersField(
              typeof local.users_json === 'string'
                ? JSON.parse(local.users_json)
                : local.users_json
            )}

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
        </KeyboardAwareScrollView>
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

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
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

  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
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