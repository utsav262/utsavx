import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  Briefcase,
  Building2,
  Drama,
  Dumbbell,
  Film,
  Laugh,
  Lightbulb,
  Music,
  Palette,
  PartyPopper,
  Presentation,
  Sparkles,
  Ticket,
  Trophy,
  UtensilsCrossed,
} from 'lucide-react-native';
import Gradient from './Gradient';
import { colors } from '../theme';

// Brand-family gradients; each event gets one based on its name so cards don't all look the same.
const PALETTES = [
  ['#FD8701', '#FA13DB'],
  ['#FA13DB', '#9B1BF2'],
  ['#9B1BF2', '#3D5AFE'],
  ['#FF5F6D', '#FFC371'],
  ['#00B4DB', '#9B1BF2'],
  ['#F7971E', '#E8178A'],
];

const CATEGORY_ICONS = [
  [/music|concert|gig|dj/i, Music],
  [/comedy|stand.?up/i, Laugh],
  [/dance|party|night|club/i, Sparkles],
  [/festival|holi|diwali|fest|celebrat/i, PartyPopper],
  [/food|drink|dining|market/i, UtensilsCrossed],
  [/conference|summit|talk|seminar/i, Presentation],
  [/workshop|class|learn/i, Lightbulb],
  [/sport|run|match|marathon/i, Trophy],
  [/fitness|yoga|gym/i, Dumbbell],
  [/art|exhibit|gallery/i, Palette],
  [/theatre|theater|play|drama/i, Drama],
  [/film|movie|cinema|screening/i, Film],
  [/business|network|startup/i, Briefcase],
  [/city/i, Building2],
];

function hash(text) {
  let h = 0;
  for (const ch of String(text || '')) h = (h * 31 + ch.charCodeAt(0)) % 1000003;
  return h;
}

function iconFor(category) {
  const match = CATEGORY_ICONS.find(([pattern]) =>
    pattern.test(category || ''),
  );
  return match ? match[1] : Ticket;
}

/**
 * Event cover. Events created without a photo get a gradient and a category
 * icon instead of an empty box. `seed` (usually the title) picks the gradient.
 */
export default function EventImage({
  uri,
  seed,
  category,
  iconSize = 34,
  style,
  children,
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const showImage = Boolean(uri) && !failed;
  const Icon = iconFor(category);

  return (
    <View style={[styles.box, style]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Gradient
          stops={PALETTES[hash(seed) % PALETTES.length]}
          style={[StyleSheet.absoluteFill, styles.center]}
        >
          <View style={[styles.ring, { padding: iconSize * 0.45 }]}>
            <Icon size={iconSize} color={colors.white} />
          </View>
        </Gradient>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
});
