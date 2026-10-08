import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyRound, Lock } from 'lucide-react-native';
import { api } from '../api';
import {
  Button,
  KeyboardView,
  Notice,
  ScreenHeader,
  TextField,
} from '../components/ui';
import { colors, text } from '../theme';
import { passwordProblem } from '../lib/validation';

export default function ChangePasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const next = {};
    if (!current) next.current_password = 'Enter your current password';
    const problem = passwordProblem(password);
    if (problem) next.password = problem;
    else if (password !== confirm) next.confirm = 'Passwords do not match';
    setErrors(next);
    setMessage('');
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.changePassword({ current_password: current, password });
      Alert.alert(
        'Password updated',
        'Use your new password next time you sign in.',
      );
      navigation.goBack();
    } catch (e) {
      const fields = e.fieldErrors || {};
      setErrors(fields);
      if (!Object.keys(fields).length) setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardView style={styles.screen}>
      <ScreenHeader title="Change password" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={text.body}>
          Use at least 8 characters, including a letter and a number.
        </Text>
        {message ? (
          <Notice tone="error" style={styles.gap}>
            {message}
          </Notice>
        ) : null}
        <TextField
          label="Current password"
          icon={Lock}
          value={current}
          onChangeText={setCurrent}
          error={errors.current_password}
          secure
          autoCapitalize="none"
          autoComplete="current-password"
          style={styles.gap}
        />
        <TextField
          label="New password"
          icon={KeyRound}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          style={styles.gap}
        />
        <TextField
          label="Confirm new password"
          icon={KeyRound}
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          onSubmitEditing={save}
          style={styles.gap}
        />
        <Button
          title="Update password"
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
  gap: { marginTop: 16 },
  save: { marginTop: 28 },
});
