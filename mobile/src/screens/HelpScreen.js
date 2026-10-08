import React, { useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react-native';
import { api } from '../api';
import { Card, Loader, ScreenHeader, SectionHeader } from '../components/ui';
import { HOLD_MINUTES } from '../config';
import { colors, radius, text } from '../theme';

const FAQ = [
  {
    q: 'Where are my tickets?',
    a: 'In the Tickets tab, straight after payment. Each ticket has its own QR code.',
  },
  {
    q: 'Is there a booking fee?',
    a: 'No. The price you see on the event is the price you pay.',
  },
  {
    q: 'What if I close the payment screen?',
    a: `Your seats stay held for ${HOLD_MINUTES} minutes. Tap Pay again from checkout to finish; after that they are released.`,
  },
  {
    q: 'How do I get in?',
    a: 'Open the ticket and show the QR code at the entrance. Staff scan it to check you in.',
  },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(0);

  useEffect(() => {
    api
      .siteSettings()
      .then(res => setSettings(res?.result || null))
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  const email = settings?.support_email;
  const phone = settings?.support_phone;
  const hasContact = Boolean(email || phone || settings?.office_address);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Help & support" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Contact us" />
        {loading ? <Loader style={styles.loader} /> : null}
        {!loading && hasContact ? (
          <Card style={styles.card}>
            {email ? (
              <Contact
                icon={Mail}
                label="Email"
                value={email}
                onPress={() => Linking.openURL(`mailto:${email}`)}
              />
            ) : null}
            {phone ? (
              <Contact
                icon={Phone}
                label="Phone"
                value={phone}
                onPress={() =>
                  Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`)
                }
              />
            ) : null}
            {settings?.support_hours ? (
              <Contact
                icon={Clock}
                label="Hours"
                value={settings.support_hours}
              />
            ) : null}
            {settings?.office_address ? (
              <Contact
                icon={MapPin}
                label="Office"
                value={settings.office_address}
              />
            ) : null}
          </Card>
        ) : null}
        {!loading && !hasContact ? (
          <Text style={text.body}>
            Support contact details aren't available right now.
          </Text>
        ) : null}

        <SectionHeader title="FAQs" style={styles.section} />
        {FAQ.map((item, index) => {
          const expanded = open === index;
          return (
            <Pressable
              key={item.q}
              onPress={() => setOpen(expanded ? -1 : index)}
              style={[styles.faq, expanded && styles.faqOpen]}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              <View style={styles.faqHead}>
                <Text style={styles.question}>{item.q}</Text>
                {expanded ? (
                  <ChevronUp size={18} color={colors.primary} />
                ) : (
                  <ChevronDown size={18} color={colors.textFaint} />
                )}
              </View>
              {expanded ? <Text style={styles.answer}>{item.a}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Contact({ icon: Icon, label, value, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.contact}
      accessibilityRole={onPress ? 'link' : undefined}
    >
      <View style={styles.contactIcon}>
        <Icon size={18} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={text.caption}>{label}</Text>
        <Text style={[styles.value, onPress && styles.link]}>{value}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  loader: { paddingVertical: 30 },
  card: { paddingHorizontal: 14, paddingVertical: 4 },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  value: { marginTop: 2, fontSize: 15, fontWeight: '600', color: colors.text },
  link: { color: colors.primary },
  section: { marginTop: 28 },
  faq: {
    padding: 16,
    marginBottom: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqOpen: { borderColor: colors.primary },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  question: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  answer: { ...text.small, marginTop: 8, lineHeight: 20 },
});
