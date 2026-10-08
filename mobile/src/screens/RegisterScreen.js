import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Lock, Mail, User } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { Button, Notice, TextField } from '../components/ui';
import { colors } from '../theme';
import { isEmail, passwordProblem } from '../lib/validation';

// Same rule as the API (server/src/validators/auth.js), shown as a live checklist.
const RULES = [
  { label: '8+ characters', test: value => value.length >= 8 },
  { label: 'A letter', test: value => /[A-Za-z]/.test(value) },
  { label: 'A number', test: value => /[0-9]/.test(value) },
];

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const submit = async () => {
    const next = {};
    if (!name.trim()) next.name = 'Enter your name';
    if (!isEmail(email)) next.email = 'Enter a valid email address';
    const problem = passwordProblem(password);
    if (problem) next.password = problem;
    setErrors(next);
    setMessage('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await signUp({ name, email, password }); // the navigator switches to the app on success
    } catch (e) {
      const fields = e.fieldErrors || {};
      setErrors(fields);
      if (!Object.keys(fields).length) setMessage(e.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join UtsavX and never miss a show."
      footer={
        <Pressable
          onPress={() => navigation.replace('Login')}
          style={styles.switch}
          accessibilityRole="button"
        >
          <Text style={styles.switchText}>
            Already have an account?{' '}
            <Text style={styles.switchLink}>Sign in</Text>
          </Text>
        </Pressable>
      }
    >
      {message ? <Notice tone="error">{message}</Notice> : null}
      <TextField
        label="Full name"
        icon={User}
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
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
      <View>
        <TextField
          ref={passwordRef}
          label="Password"
          icon={Lock}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          placeholder="Create a password"
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <View style={styles.rules}>
          {RULES.map(rule => {
            const ok = rule.test(password);
            return (
              <View key={rule.label} style={[styles.rule, ok && styles.ruleOk]}>
                <Check
                  size={12}
                  color={ok ? colors.success : colors.textFaint}
                />
                <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>
                  {rule.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <Button
        title="Create account"
        loading={busy}
        onPress={submit}
        style={styles.submit}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  submit: { marginTop: 4 },
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  ruleOk: { backgroundColor: colors.successSoft },
  ruleText: { fontSize: 12, fontWeight: '600', color: colors.textFaint },
  ruleTextOk: { color: colors.success },
  switch: { marginTop: 24, alignItems: 'center', paddingVertical: 8 },
  switchText: { fontSize: 14, color: colors.textMuted },
  switchLink: { color: colors.primary, fontWeight: '800' },
});
