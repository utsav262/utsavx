import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgePercent, QrCode, Smartphone } from 'lucide-react-native';
import Gradient from '../components/Gradient';
import { Button } from '../components/ui';
import { colors, text } from '../theme';

const ART = require('../assets/images/Splassh.png');
const FADE = ['rgba(0,1,29,0)', 'rgba(0,1,29,0.75)', colors.bgDeep];

const PERKS = [
  { Icon: Smartphone, label: 'UPI & cards' },
  { Icon: QrCode, label: 'QR entry' },
  { Icon: BadgePercent, label: 'No booking fee' },
];

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <Image source={ART} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <Gradient direction="vertical" stops={FADE} style={styles.fade} />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.title}>Your city's best nights, one tap away</Text>
        <Text style={styles.subtitle}>
          Concerts, festivals, comedy and more. Book in seconds and walk in with
          a QR code.
        </Text>

        <View style={styles.perks}>
          {PERKS.map(({ Icon, label }) => (
            <View key={label} style={styles.perk}>
              <Icon size={14} color={colors.white} />
              <Text style={styles.perkText}>{label}</Text>
            </View>
          ))}
        </View>

        <Button
          title="Create account"
          onPress={() => navigation.navigate('Register')}
        />
        <Button
          title="I already have an account"
          variant="glass"
          onPress={() => navigation.navigate('Login')}
          style={styles.second}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgDeep },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
  },
  title: { ...text.h1, fontSize: 30, lineHeight: 36 },
  subtitle: { ...text.body, color: colors.whiteMuted, marginTop: 10 },
  perks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
    marginBottom: 26,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.glass,
  },
  perkText: { fontSize: 12, fontWeight: '700', color: colors.white },
  second: { marginTop: 12 },
});
