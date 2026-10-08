import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { Camera, Mail, Phone, Trash2, User } from 'lucide-react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Gradient from '../components/Gradient';
import {
  Avatar,
  Button,
  KeyboardView,
  Notice,
  ScreenHeader,
  TextField,
} from '../components/ui';
import { colors } from '../theme';

const PHONE_RE = /^\+?[0-9 -]{7,20}$/; // same rule as server/src/validators/account.js
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 1024 * 1024;

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    api
      .profile()
      .then(res => {
        const profile = res?.result;
        if (!profile) return;
        setName(current => current || profile.name || '');
        setPhone(profile.phone || '');
        updateUser({ phone: profile.phone, avatarUrl: profile.avatarUrl });
      })
      .catch(() => {});
  }, [updateUser]);

  const applyProfile = profile => {
    if (profile)
      updateUser({
        name: profile.name,
        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
      });
  };

  const choosePhoto = async () => {
    setMessage(null);
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      maxWidth: 600,
      maxHeight: 600,
      quality: 0.7,
    });
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (result.errorCode || !asset?.uri) {
      setMessage({
        tone: 'error',
        text: result.errorMessage || 'Could not open your photos.',
      });
      return;
    }
    const type = asset.type || 'image/jpeg';
    if (!AVATAR_TYPES.includes(type)) {
      setMessage({ tone: 'error', text: 'Choose a JPG, PNG or WebP photo.' });
      return;
    }
    if (asset.fileSize && asset.fileSize > AVATAR_MAX_BYTES) {
      setMessage({ tone: 'error', text: 'Photo must be 1 MB or smaller.' });
      return;
    }

    const form = new FormData();
    form.append('avatar', {
      uri: asset.uri,
      name: asset.fileName || 'avatar.jpg',
      type,
    });
    setPhotoBusy(true);
    try {
      applyProfile((await api.uploadAvatar(form))?.result);
      setMessage({ tone: 'success', text: 'Photo updated.' });
    } catch (e) {
      setMessage({ tone: 'error', text: e.message });
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setMessage(null);
    try {
      applyProfile((await api.deleteAvatar())?.result);
    } catch (e) {
      setMessage({ tone: 'error', text: e.message });
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async () => {
    const next = {};
    if (!name.trim()) next.name = 'Name is required';
    if (phone.trim() && !PHONE_RE.test(phone.trim()))
      next.phone = 'Enter a valid phone number';
    setErrors(next);
    setMessage(null);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      applyProfile(
        (await api.updateProfile({ name: name.trim(), phone: phone.trim() }))
          ?.result,
      );
      navigation.goBack();
    } catch (e) {
      setErrors(e.fieldErrors || {});
      setMessage({ tone: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardView style={styles.screen}>
      <ScreenHeader title="Edit profile" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.photo}>
          <View>
            <Avatar user={user} size={104} />
            <Pressable
              onPress={choosePhoto}
              disabled={photoBusy}
              style={styles.camera}
              accessibilityRole="button"
              accessibilityLabel="Change photo"
            >
              <Gradient
                style={[StyleSheet.absoluteFill, styles.cameraRadius]}
              />
              <Camera size={18} color={colors.white} />
            </Pressable>
          </View>
          {user?.avatarUrl ? (
            <Button
              title="Remove photo"
              icon={Trash2}
              variant="ghost"
              small
              loading={photoBusy}
              onPress={removePhoto}
              style={styles.remove}
            />
          ) : (
            <Text style={styles.photoHint}>JPG, PNG or WebP, up to 1 MB</Text>
          )}
        </View>

        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

        <TextField
          label="Full name"
          icon={User}
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoCapitalize="words"
          autoComplete="name"
          style={styles.gap}
        />
        <TextField
          label="Phone"
          icon={Phone}
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          autoComplete="tel"
          style={styles.gap}
        />
        <TextField
          label="Email"
          icon={Mail}
          value={user?.email || ''}
          editable={false}
          hint="Email can't be changed."
          style={styles.gap}
        />

        <Button
          title="Save changes"
          loading={saving}
          onPress={save}
          style={styles.save}
        />
      </ScrollView>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  photo: { alignItems: 'center', marginBottom: 20 },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  cameraRadius: { borderRadius: 19 },
  remove: { marginTop: 8 },
  photoHint: { marginTop: 12, fontSize: 12, color: colors.textFaint },
  gap: { marginTop: 16 },
  save: { marginTop: 28 },
});
