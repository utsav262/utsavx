import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Gradient from './Gradient';
import Logo from './Logo';
import { IconButton, KeyboardView } from './ui';
import { colors, radius, text } from '../theme';

const GLOW = [
  'rgba(253,135,1,0.45)',
  'rgba(250,19,219,0.35)',
  'rgba(155,27,242,0.0)',
];
const FADE = ['rgba(5,4,26,0)', colors.bg];

/** Shared frame for sign-in and sign-up: brand glow, logo, then the form card. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardView style={styles.screen}>
      <Gradient stops={GLOW} style={styles.glow} />
      <Gradient direction="vertical" stops={FADE} style={styles.glow} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {navigation.canGoBack() ? (
          <IconButton
            icon={ChevronLeft}
            label="Back"
            variant="glass"
            onPress={() => navigation.goBack()}
          />
        ) : (
          <View style={styles.backSpace} />
        )}
        <View style={styles.head}>
          <Logo size={72} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.card}>{children}</View>
        {footer}
      </ScrollView>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
  content: { flexGrow: 1, paddingHorizontal: 20 },
  backSpace: { height: 44 },
  head: { alignItems: 'center', marginTop: 4, marginBottom: 24 },
  title: { ...text.h1, marginTop: 16, textAlign: 'center' },
  subtitle: { ...text.body, marginTop: 6, textAlign: 'center' },
  card: {
    padding: 20,
    gap: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
