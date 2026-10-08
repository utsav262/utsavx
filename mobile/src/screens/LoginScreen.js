import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Lock, Mail } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { Button, Notice, TextField } from '../components/ui';
import { colors } from '../theme';
import { isEmail } from '../lib/validation';

// Seeded customer from the README, offered only in development builds.
const DEMO = { email: 'emma@utsavx.com', password: 'password123' };

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(null);

  const submit = async () => {
    const next = {};
    if (!isEmail(email)) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    setMessage('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await signIn(email, password); // the navigator switches to the app on success
    } catch (e) {
      setMessage(
        e.status === 401 ? 'That email and password don’t match.' : e.message,
      );
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to book tickets and see your passes."
      footer={
        <Pressable
          onPress={() => navigation.replace('Register')}
          style={styles.switch}
          accessibilityRole="button"
        >
          <Text style={styles.switchText}>
            New to UtsavX?{' '}
            <Text style={styles.switchLink}>Create an account</Text>
          </Text>
        </Pressable>
      }
    >
      {message ? <Notice tone="error">{message}</Notice> : null}
      <TextField
        label="Email"
        icon={Mail}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        icon={Lock}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="Your password"
        secure
        autoCapitalize="none"
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button
        title="Sign in"
        loading={busy}
        onPress={submit}
        style={styles.submit}
      />

      {__DEV__ ? (
        <Pressable
          onPress={() => {
            setEmail(DEMO.email);
            setPassword(DEMO.password);
          }}
          style={styles.demo}
          accessibilityRole="button"
        >
          <Text style={styles.demoText}>Dev: fill demo customer</Text>
        </Pressable>
      ) : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  submit: { marginTop: 4 },
  switch: { marginTop: 24, alignItems: 'center', paddingVertical: 8 },
  switchText: { fontSize: 14, color: colors.textMuted },
  switchLink: { color: colors.primary, fontWeight: '800' },
  demo: { alignItems: 'center', paddingVertical: 4 },
  demoText: {
    fontSize: 12,
    color: colors.textFaint,
    textDecorationLine: 'underline',
  },
});
