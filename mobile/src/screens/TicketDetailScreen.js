import React from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Share2, ShieldCheck } from 'lucide-react-native';
import { absoluteUrl } from '../api/client';
import EventImage from '../components/EventImage';
import Gradient from '../components/Gradient';
import { Button, ScreenHeader, StatusPill } from '../components/ui';
import { colors, fonts, radius } from '../theme';
import { formatDate, formatTime } from '../lib/format';
import { venueLine } from '../lib/events';
import { ticketQrValue, ticketStatus } from '../lib/tickets';

const BACKDROP = ['#3B0A5C', '#1A0838', colors.bg];
const INK = '#16131F';
const INK_MUTED = '#6F6A80';

export default function TicketDetailScreen({ route }) {
  const { ticket } = route.params;
  const event = ticket.event || {};
  const code = ticketQrValue(ticket);
  const status = ticketStatus(ticket.status);
  const usable = !ticket.status || ticket.status === 'valid';

  let hint =
    'Show this QR at the entrance — staff will scan it to check you in.';
  if (ticket.status === 'used')
    hint = 'This ticket has already been scanned at the door.';
  else if (!usable) hint = 'This ticket is no longer valid for entry.';

  const share = () =>
    Share.share({
      message: `My ticket for ${event.title || 'an UtsavX event'} — ${
        formatDate(event.startsAt) || ''
      } ${formatTime(event.startsAt) || ''}\nConfirmation: ${code}`,
    }).catch(() => {});

  return (
    <View style={styles.screen}>
      <Gradient
        direction="vertical"
        stops={BACKDROP}
        style={StyleSheet.absoluteFill}
      />
      <ScreenHeader title="E-ticket" glass />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ticket}>
          <EventImage
            uri={absoluteUrl(event.imageUrl)}
            seed={event.title}
            category={event.category}
            iconSize={44}
            style={styles.cover}
          />
          <View style={styles.body}>
            <Text style={styles.title}>{event.title || 'Event'}</Text>
            <View style={styles.grid}>
              <Info label="Date" value={formatDate(event.startsAt) || 'TBA'} />
              <Info label="Time" value={formatTime(event.startsAt) || 'TBA'} />
              <Info
                label="Venue"
                value={venueLine(event.venue) || 'Venue TBA'}
                wide
              />
              <Info
                label="Ticket"
                value={ticket.ticketType || 'General Admission'}
              />
              <Info label="Status" value={status.label} />
            </View>
          </View>

          <View style={styles.perforation}>
            <View style={[styles.notch, styles.notchLeft]} />
            <View style={styles.dash} />
            <View style={[styles.notch, styles.notchRight]} />
          </View>

          <View style={styles.qrArea}>
            <View style={[styles.qr, !usable && styles.qrDim]}>
              {code ? (
                <QRCode
                  value={code}
                  size={200}
                  color={INK}
                  backgroundColor={colors.white}
                />
              ) : null}
            </View>
            <Text style={styles.code} selectable>
              {code}
            </Text>
            <StatusPill
              label={status.label}
              tone={status.tone}
              style={styles.status}
            />
            <Text style={styles.hint}>{hint}</Text>
          </View>
        </View>

        <View style={styles.note}>
          <ShieldCheck size={16} color={colors.success} />
          <Text style={styles.noteText}>
            Carry a valid photo ID along with this ticket.
          </Text>
        </View>
        <Button
          title="Share ticket"
          icon={Share2}
          variant="glass"
          onPress={share}
          style={styles.share}
        />
      </ScrollView>
    </View>
  );
}

function Info({ label, value, wide }) {
  return (
    <View style={[styles.info, wide && styles.infoWide]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  ticket: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    overflow: 'hidden',
    marginTop: 8,
  },
  cover: { height: 150 },
  body: { padding: 20 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: INK },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, marginTop: 16 },
  info: { width: '50%', paddingRight: 8 },
  infoWide: { width: '100%' },
  infoLabel: { fontSize: 12, fontWeight: '600', color: INK_MUTED },
  infoValue: { marginTop: 2, fontSize: 15, fontWeight: '700', color: INK },
  perforation: { height: 26, justifyContent: 'center' },
  dash: {
    marginHorizontal: 22,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E3E0EA',
  },
  notch: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1F0A3D',
  },
  notchLeft: { left: -13 },
  notchRight: { right: -13 },
  qrArea: { alignItems: 'center', padding: 20, paddingTop: 8 },
  qr: { padding: 10, borderRadius: radius.md, backgroundColor: colors.white },
  qrDim: { opacity: 0.25 },
  code: {
    marginTop: 12,
    fontFamily: fonts.mono,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    color: INK,
  },
  status: { marginTop: 10, alignSelf: 'center' },
  hint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    color: INK_MUTED,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 18,
  },
  noteText: { fontSize: 13, color: colors.textMuted },
  share: { marginTop: 16 },
});
