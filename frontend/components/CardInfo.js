/**
 * CardInfo.js
 *
 * Main changes:
 * - controlled by canEdit prop from previous screen/tabs
 * - multiple customer contacts support
 * - customer_contacts shown as editable rows (nama + jabatan)
 * - save button only shown if canEdit === true
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

/**
 * Maps each visit type to the image fields that belong to that form.
 * This helps the component know which fields should be treated as images.
 */
const IMAGE_FIELDS_BY_TYPE = {
  sales: ['visit_documentation'],
  technician_activity: ['selfie_photo', 'attendance_document_photo'],
  technician_service: [
    'corrective_proof',
    'capa_action_image',
    'device_before_service_photo',
  ],
};

/**
 * Default empty customer contact object.
 * Used when there is no contact yet or when adding a new blank row.
 */
const EMPTY_CONTACT = { nama: '', jabatan: '' };

/**
 * Converts customer_contacts from whatever format comes from backend
 * into a clean array of objects: [{ nama, jabatan }].
 *
 * Handles:
 * - null / undefined
 * - already-an-array
 * - JSON string from DB
 */
const parseCustomerContacts = (value) => {
  if (!value) return [{ ...EMPTY_CONTACT }];

  if (Array.isArray(value)) {
    return value.length
      ? value.map((item) => ({
          nama: item?.nama ?? '',
          jabatan: item?.jabatan ?? '',
        }))
      : [{ ...EMPTY_CONTACT }];
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((item) => ({
          nama: item?.nama ?? '',
          jabatan: item?.jabatan ?? '',
        }));
      }
    } catch (err) {
      console.warn('Failed to parse customer_contacts:', err);
    }
  }

  return [{ ...EMPTY_CONTACT }];
};

/**
 * Cleans customer contacts before sending to backend.
 * - trims spaces
 * - removes completely empty rows
 *
 * This prevents saving useless blank contacts.
 */
const cleanCustomerContacts = (contacts = []) => {
  return contacts
    .map((item) => ({
      nama: item?.nama?.trim?.() ?? '',
      jabatan: item?.jabatan?.trim?.() ?? '',
    }))
    .filter((item) => item.nama || item.jabatan);
};

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */

export default function CardInfo(props) {
  const insets = useSafeAreaInsets();

  const {
    route,
    navigation,
    data: dataProp,
    onSave,
    onCancel,
    uploadingHost: uploadingHostProp,
    formTypeColor,
    canEdit: canEditProp,
  } = props;

  const data = dataProp ?? route?.params?.data ?? null;

  /**
   * Determines whether the current screen should allow editing.
   * Falls back to route params if prop is not explicitly passed.
   */
  const canEdit = canEditProp ?? route?.params?.canEdit ?? false;

  const apiHost = API_BASE;

  /**
   * local = editable copy of the form record
   * saving = shows loading spinner while saving
   * showDatePickerKey = stores which date field is currently open
   * resolvedImageUrls = stores signed URLs or local preview URIs for image fields
   * loadingImages = spinner while existing images are being resolved
   * customerContacts = editable list of contacts shown in UI
   */
  const [local, setLocal] = useState(data ? { ...data } : null);
  const [saving, setSaving] = useState(false);
  const [showDatePickerKey, setShowDatePickerKey] = useState(null);
  const [resolvedImageUrls, setResolvedImageUrls] = useState({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [customerContacts, setCustomerContacts] = useState([{ ...EMPTY_CONTACT }]);

  /**
   * Safe fallback for onSave.
   * If parent does not pass one, this becomes a no-op async function.
   */
  const safeOnSave = onSave || (async () => {});

  /**
   * Safe fallback for onCancel.
   * If parent does not pass one, it simply goes back in navigation.
   */
  const safeOnCancel =
    onCancel ||
    (() => {
      if (navigation && navigation.goBack) navigation.goBack();
    });

  /**
   * Whenever the source data changes, reset:
   * - local editable record
   * - customer contacts list
   */
  useEffect(() => {
    const nextLocal = data ? { ...data } : null;
    setLocal(nextLocal);
    setCustomerContacts(parseCustomerContacts(nextLocal?.customer_contacts));
  }, [data]);

  /* -------------------------
   * Small helper utilities
   * ------------------------- */

  /**
   * Returns true if a field name looks like an image field
   * based on its key name alone.
   */
  const isImageKey = useCallback(
    (k) => /foto|dokumentasi|selfie|bukti|proof|image|photo/i.test(k),
    []
  );

  /**
   * Returns true if a field is explicitly listed in IMAGE_FIELDS_BY_TYPE.
   * This is more reliable than checking key names alone.
   */
  const isKnownImageField = useCallback((k) => {
    return Object.values(IMAGE_FIELDS_BY_TYPE).some((fields) => fields.includes(k));
  }, []);

  /**
   * Returns true if the value looks like an S3 key stored in DB,
   * rather than a full image URL.
   */
  const isLikelyS3Key = useCallback((value) => {
    if (!value || typeof value !== 'string') return false;
    if (value.startsWith('http://') || value.startsWith('https://')) return false;
    return true;
  }, []);

  /**
   * Returns the image field list for the given visit type.
   * Example: sales -> ['visit_documentation']
   */
  const getImageFieldsForType = useCallback((visitType) => {
    return IMAGE_FIELDS_BY_TYPE[visitType] || [];
  }, []);

  /**
   * Requests a signed image URL from backend for an S3 object key.
   * Used so private images can be viewed in the app.
   */
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

  /**
   * Resolves all existing image fields for the current record.
   *
   * Handles 3 cases:
   * - newly selected local image -> use local URI
   * - already full URL -> use directly
   * - S3 key from DB -> request signed URL from backend
   */
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

          if (typeof value === 'object' && value.__new && value.uri) {
            nextImageUrls[field] = value.uri;
            continue;
          }

          if (typeof value === 'string' && !isLikelyS3Key(value)) {
            nextImageUrls[field] = value;
            continue;
          }

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

  /**
   * Whenever the active local record changes, refresh image previews.
   */
  useEffect(() => {
    if (!local) {
      setResolvedImageUrls({});
      return;
    }

    resolveExistingImages(local);
  }, [local?.id, local?.visit_type, resolveExistingImages]);

  /**
   * Read-only fields specific to sales form detail.
   */
  const READ_ONLY_SALES_FIELDS = new Set([
    'visit_id',
    'is_draft',
    'visit_form_type',
  ]);

  /**
   * Read-only fields specific to technician activity detail.
   */
  const READ_ONLY_ACTIVITY_FIELDS = new Set([
    'visit_id',
    'is_draft',
    'product_id',
  ]);

  /**
   * Visit header fields that are allowed to be updated separately.
   * These go to /visit patch instead of detail patch.
   */
  const VISIT_EDITABLE_FIELDS = new Set([
    'latitude',
    'longitude',
    'note',
  ]);

  /**
   * General visit-level fields that should never be editable in this screen.
   */
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

  /**
   * Fields completely hidden from UI.
   */
  const HIDDEN_FIELDS = new Set([
    'deleted_at',
    'form_type',
  ]);

  /**
   * Combined set of all fields that should be shown as read-only.
   */
  const READ_ONLY_FIELDS = new Set([
    ...READ_ONLY_VISIT_FIELDS,
    ...READ_ONLY_ACTIVITY_FIELDS,
    ...READ_ONLY_SALES_FIELDS,
  ]);

  /**
   * Returns true if a field should be displayed as read-only.
   */
  const isReadOnlyKey = useCallback((k) => READ_ONLY_FIELDS.has(k), []);

  /**
   * Returns true if a field should be hidden completely.
   */
  const isHiddenKey = useCallback((k) => HIDDEN_FIELDS.has(k), []);

  /**
   * Converts snake_case field names into readable labels.
   * Example: customer_contacts -> Customer Contacts
   */
  const titleCase = (raw = '') =>
    raw
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' ');

  /**
   * Fields that should be skipped if their value is null or blank.
   */
  const SKIP_IF_NULL = useMemo(
    () => new Set(['nama_user', 'jabatan_user', 'users_json', 'status_kunjungan']),
    []
  );

  /**
   * Renders a list of users_json in a readable card format.
   */
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

  /**
   * Visit types where latitude/longitude should not be shown.
   */
  const HIDE_LAT_LNG_VISIT_TYPES = new Set([
    'technician_activity',
    'technician_service',
  ]);

  /**
   * Builds the final ordered list of fields to render on screen.
   * Also filters out hidden/blank fields and preserves some priority order.
   */
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
      if (k === 'customer_contacts') return true;

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
   * Uploads newly selected images to S3 through a backend presign flow.
   *
   * Flow:
   * 1. Find image fields with __new flag
   * 2. Ask backend for presigned URL
   * 3. Upload blob directly to S3
   * 4. Replace local image object with stored S3 key
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

        const localFileResp = await fetch(file.uri);
        const blob = await localFileResp.blob();

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
   * Customer contacts handlers
   * ------------------------- */

  /**
   * Updates one field (nama or jabatan) for one customer contact row.
   */
  const handleCustomerContactChange = (index, field, value) => {
    if (!canEdit) return;

    setCustomerContacts((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  /**
   * Adds a new blank customer contact row to the form.
   */
  const handleAddCustomerContact = () => {
    if (!canEdit) return;
    setCustomerContacts((prev) => [...prev, { ...EMPTY_CONTACT }]);
  };

  /**
   * Removes one customer contact row by index.
   * Keeps at least one blank row so the UI never fully disappears.
   */
  const handleRemoveCustomerContact = (index) => {
    if (!canEdit) return;

    setCustomerContacts((prev) => {
      if (prev.length === 1) return [{ ...EMPTY_CONTACT }];
      return prev.filter((_, i) => i !== index);
    });
  };

  /* -------------------------
   * Render helpers
   * ------------------------- */

  /**
   * Renders a standard label for a field.
   * Can optionally show a required asterisk.
   */
  const renderLabel = (key, required = false) => {
    const labelColor = formTypeColor || styles.label.color || '#1E40AF';
    return (
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: labelColor }]}>{titleCase(key)}</Text>
        {required && <Text style={styles.required}> *</Text>}
      </View>
    );
  };

  /**
   * Formats field values for read-only display.
   * Handles:
   * - date formatting
   * - customer_contacts pretty formatting
   * - default string conversion
   */
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

    if (key === 'customer_contacts') {
      try {
        const parsed = parseCustomerContacts(value);
        return parsed.map((c, i) => `${i + 1}. ${c.nama || '-'} (${c.jabatan || '-'})`).join('\n');
      } catch {
        return String(value);
      }
    }

    return String(value);
  };

  /**
   * Renders a single read-only field in a styled box.
   */
  const renderReadOnly = (key, value) => (
    <View key={key} style={styles.row}>
      {renderLabel(key)}
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{formatDisplayValue(key, value)}</Text>
      </View>
    </View>
  );

  /**
   * Renders a normal editable text input field.
   * Automatically becomes non-editable if canEdit is false.
   */
  const renderTextField = (key) => (
    <View key={key} style={styles.row}>
      <Text style={styles.label}>{titleCase(key)}</Text>
      <TextInput
        value={local[key] != null ? String(local[key]) : ''}
        onChangeText={(t) => {
          if (!canEdit) return;
          setLocal((prev) => ({ ...prev, [key]: t }));
        }}
        style={[
          styles.formInput,
          !canEdit && styles.disabledInput,
        ]}
        multiline={key.length > 12 || key.includes('note') || key.includes('keterangan')}
        placeholder={titleCase(key)}
        placeholderTextColor="#9CA3AF"
        editable={canEdit}
      />
    </View>
  );

  /**
   * Renders a date field.
   * Tapping opens the date picker if editing is allowed.
   */
  const renderDateField = (key) => {
    const dateVal = local[key] ? new Date(local[key]) : null;
    return (
      <View key={key} style={styles.row}>
        <Text style={styles.label}>{titleCase(key)}</Text>
        <TouchableOpacity
          onPress={() => {
            if (!canEdit) return;
            setShowDatePickerKey(key);
          }}
          style={[styles.formInput, !canEdit && styles.disabledInput]}
          activeOpacity={canEdit ? 0.7 : 1}
        >
          <Text style={styles.inputText}>
            {dateVal ? dateVal.toISOString().slice(0, 10) : 'Select date'}
          </Text>
        </TouchableOpacity>

        {canEdit && showDatePickerKey === key && (
          <DateTimePicker
            value={dateVal || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, picked) => {
              setShowDatePickerKey(null);
              if (picked) {
                setLocal((p) => ({ ...p, [key]: picked.toISOString().slice(0, 10) }));
              }
            }}
          />
        )}
      </View>
    );
  };

  /**
   * Renders an image field using CameraInput.
   * Allows:
   * - picking a new image
   * - previewing current image
   * - removing image (if editable)
   */
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
              if (!canEdit) return;
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
            disabled={!canEdit}
          />
        </View>

        {loadingImages && !uri ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : null}

        {canEdit && (
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
        )}
      </View>
    );
  };

  /**
   * Renders the customer_contacts section.
   * - read-only mode shows formatted text
   * - edit mode shows repeatable input rows
   */
  const renderCustomerContactsField = () => {
    if (!canEdit) {
      return renderReadOnly('customer_contacts', customerContacts);
    }

    return (
      <View key="customer_contacts" style={styles.row}>
        <Text style={styles.label}>Customer Contacts</Text>

        {customerContacts.map((contact, index) => (
          <View key={`contact-${index}`} style={styles.contactCard}>
            <Text style={styles.contactTitle}>Contact {index + 1}</Text>

            <TextInput
              value={contact.nama}
              onChangeText={(text) =>
                handleCustomerContactChange(index, 'nama', text)
              }
              style={styles.formInput}
              placeholder="Nama"
              placeholderTextColor="#9CA3AF"
              editable={canEdit}
            />

            <TextInput
              value={contact.jabatan}
              onChangeText={(text) =>
                handleCustomerContactChange(index, 'jabatan', text)
              }
              style={styles.formInput}
              placeholder="Jabatan"
              placeholderTextColor="#9CA3AF"
              editable={canEdit}
            />

            <TouchableOpacity
              onPress={() => handleRemoveCustomerContact(index)}
              style={styles.removeContactBtn}
            >
              <Text style={styles.removeContactText}>Remove Contact</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={handleAddCustomerContact}
          style={styles.addContactBtn}
        >
          <Text style={styles.addContactText}>+ Add Contact</Text>
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Main field router.
   * Chooses how each field should be rendered:
   * - hidden
   * - customer contacts custom section
   * - read-only
   * - image
   * - date
   * - standard text field
   */
  const renderField = (key) => {
    if (isHiddenKey(key)) return null;
    if (key === 'customer_contacts') return renderCustomerContactsField();
    if (isReadOnlyKey(key)) return renderReadOnly(key, local[key]);
    if (isImageKey(key) || isKnownImageField(key)) return renderImageField(key);
    if (/tanggal|date/i.test(key)) return renderDateField(key);
    return renderTextField(key);
  };

  /* -------------------------
   * Save / export logic
   * ------------------------- */

  /**
   * Saves the edited form.
   *
   * High-level flow:
   * 1. block save if read-only
   * 2. validate required basics
   * 3. clean customer contacts
   * 4. upload new images
   * 5. diff against original data
   * 6. split visit header updates vs detail updates
   * 7. PATCH both endpoints if needed
   * 8. refresh local state
   */
  const handleSave = async () => {
    try {
      if (!canEdit) {
        Alert.alert('Info', 'This form is read only.');
        return;
      }

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

      const preparedLocal = {
        ...local,
        customer_contacts: cleanCustomerContacts(customerContacts),
      };

      let withUploadedImages = preparedLocal;
      try {
        withUploadedImages = await uploadNewImages(preparedLocal);
      } catch (uploadErr) {
        console.error('Image upload failed', uploadErr);
        Alert.alert('Upload failed', String(uploadErr?.message ?? uploadErr));
        setSaving(false);
        return;
      }

      const original = {
        ...(data ?? {}),
        customer_contacts: cleanCustomerContacts(parseCustomerContacts(data?.customer_contacts)),
      };

      /**
       * Fields that should never be included in outgoing PATCH updates.
       */
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

      /**
       * Normalizes values so comparisons are more reliable.
       * Prevents false positives when checking whether fields changed.
       */
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

      /**
       * Build update payload by comparing edited values to original values.
       * Only changed fields are included.
       */
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

        updates[k] = newVal instanceof Date ? newVal.toISOString() : newVal;
      }

      if (Object.keys(updates).length === 0) {
        setLocal(withUploadedImages);
        await resolveExistingImages(withUploadedImages);
        await safeOnSave(withUploadedImages);
        Alert.alert('No changes', 'Nothing to update.');
        return;
      }

      /**
       * Split changed fields into:
       * - visitUpdates -> goes to visit header endpoint
       * - detailUpdates -> goes to sales/service/activity detail endpoint
       */
      const visitUpdates = {};
      const detailUpdates = {};

      for (const [k, v] of Object.entries(updates)) {
        if (VISIT_EDITABLE_FIELDS.has(k)) {
          visitUpdates[k] = v;
        } else {
          detailUpdates[k] = v;
        }
      }

      /**
       * Read current user_id from local storage for API calls.
       */
      let userId = '1';
      try {
        const stored = await AsyncStorage.getItem('user_id');
        if (stored) userId = stored;
      } catch (e) {
        console.warn('Failed reading user_id from storage, using fallback "1"', e);
      }

      const host = apiHost;
      const token = await AsyncStorage.getItem('token');

      /**
       * Determine the visit id to use in PATCH endpoints.
       */
      const visitId = withUploadedImages.visit_id || withUploadedImages.id;

      if (!visitId) {
        throw new Error('Missing visit id.');
      }

      /**
       * Determine which detail endpoint to hit based on form type.
       */
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

      /**
       * PATCH visit header fields first if there are any.
       */
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
        } catch (e) {}

        if (!visitResp.ok) {
          throw new Error(
            visitJson?.message || `Failed to update visit header (status ${visitResp.status})`
          );
        }
      }

      /**
       * PATCH detail fields next if there are any.
       */
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
        } catch (e) {}

        if (!detailResp.ok) {
          throw new Error(
            detailJson?.message || `Failed to update ${detailType} detail (status ${detailResp.status})`
          );
        }
      }

      /**
       * Refresh local state after a successful save.
       */
      setLocal(withUploadedImages);
      setCustomerContacts(parseCustomerContacts(withUploadedImages.customer_contacts));
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

  /**
   * Builds printable HTML used to export the form into a PDF.
   * Includes special formatting for users_json and customer_contacts.
   */
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
                .map((u, i) => `${i + 1}. ${u.nama || '-'} (${u.jabatan || '-'})`)
                .join('<br/>');
            } else {
              displayValue = '-';
            }
          } catch (e) {
            displayValue = '-';
          }
        } else if (k === 'customer_contacts') {
          try {
            const contacts = parseCustomerContacts(obj[k]);
            displayValue = contacts.length
              ? contacts
                  .map((u, i) => `${i + 1}. ${u.nama || '-'} (${u.jabatan || '-'})`)
                  .join('<br/>')
              : '-';
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

  /**
   * Exports the current form data as a PDF and opens the share sheet.
   */
  const handleDownload = async () => {
    try {
      if (!local) return Alert.alert('Nothing to export');

      const html = buildHtmlForPdf({
        ...local,
        customer_contacts: cleanCustomerContacts(customerContacts),
      });

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

  /**
   * Empty state when there is no local record to display.
   */
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

  /**
   * Main screen render:
   * - header
   * - optional read-only banner
   * - dynamic fields
   * - action buttons
   */
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

          {!canEdit && (
            <View style={styles.readOnlyBanner}>
              <Text style={styles.readOnlyBannerText}>Read only</Text>
            </View>
          )}

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

            {canEdit && (
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            )}

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
  safeArea: {flex: 1, backgroundColor: '#fff'},
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
  headerId: {fontSize: 14, fontWeight: '700', color: '#0F172A'},
  headerType: {fontSize: 12, color: '#6B7280', textTransform: 'lowercase'},
  readOnlyBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  readOnlyBannerText: {
    color: '#92400E',
    fontWeight: '700',
  },
  row: {marginBottom: 18},
  labelRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  label: {fontSize: 14, fontWeight: '600', color: '#1E40AF', marginBottom: 8},
  required: {color: '#D92D20', marginLeft: 6, fontWeight: '700'},
  formInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 15,
  },
  disabledInput: {
    color: '#6B7280',
    backgroundColor: '#F8FAFC',
  },
  inputText: {color: '#111827', fontSize: 15},
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
    lineHeight: 22,
    fontWeight: '600',
  },
  imageFieldBoxOld: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  smallBtnText: { fontSize: 13, color: '#374151' },
  contactCard: {
    backgroundColor: '#FBFBFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  addContactBtn: {
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addContactText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  removeContactBtn: {
    marginTop: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  removeContactText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
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