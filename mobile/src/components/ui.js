import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Info,
  Minus,
  Plus,
  TriangleAlert,
} from 'lucide-react-native';
import Gradient from './Gradient';
import { colors, radius, shadow, text } from '../theme';
import { absoluteUrl } from '../api/client';
import { dateParts } from '../lib/format';

/* ------------------------------ Button ------------------------------ */
const BUTTONS = {
  primary: { bg: colors.primary, fg: colors.white, border: 'transparent' }, // gradient drawn on top
  secondary: {
    bg: colors.primarySoft,
    fg: colors.primary,
    border: 'transparent',
  },
  outline: { bg: colors.surface, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  white: { bg: colors.white, fg: colors.bg, border: colors.white },
  glass: {
    bg: colors.glass,
    fg: colors.white,
    border: 'rgba(255,255,255,0.28)',
  },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: 'transparent' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  small = false,
  style,
}) {
  const tone = BUTTONS[variant] || BUTTONS.primary;
  const inactive = disabled || loading;
  const iconSize = small ? 16 : 18;
  const gradient = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: tone.bg, borderColor: tone.border },
        gradient && !inactive && shadow.glow,
        inactive && styles.inactive,
        pressed && styles.pressed,
        style,
      ]}
    >
      {gradient ? (
        <Gradient
          direction="horizontal"
          style={[
            StyleSheet.absoluteFill,
            small ? styles.radiusSmall : styles.radius,
          ]}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <>
          {Icon ? <Icon size={iconSize} color={tone.fg} /> : null}
          <Text
            style={[
              styles.buttonText,
              small && styles.buttonTextSmall,
              { color: tone.fg },
            ]}
          >
            {title}
          </Text>
          {IconRight ? <IconRight size={iconSize} color={tone.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

/* ---------------------------- IconButton ---------------------------- */
export function IconButton({
  icon: Icon,
  onPress,
  variant = 'surface',
  badge,
  label,
  size = 44,
}) {
  const glass = variant === 'glass';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size },
        glass ? styles.iconButtonGlass : styles.iconButtonSurface,
        pressed && styles.pressed,
      ]}
    >
      <Icon size={20} color={colors.white} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/* ----------------------------- TextField ---------------------------- */
export function TextField({
  label,
  icon: Icon,
  error,
  hint,
  secure = false,
  style,
  ...props
}) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  let iconColor = colors.textFaint;
  if (error) iconColor = colors.danger;
  else if (focused) iconColor = colors.primary;
  return (
    <View style={style}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error && styles.fieldError,
          props.editable === false && styles.fieldDisabled,
        ]}
      >
        {Icon ? <Icon size={19} color={iconColor} /> : null}
        <TextInput
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          style={styles.fieldInput}
          secureTextEntry={secure && hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden(value => !value)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            {hidden ? (
              <Eye size={19} color={colors.textFaint} />
            ) : (
              <EyeOff size={19} color={colors.textFaint} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

/* ------------------------------- Chip ------------------------------- */
export function Chip({ label, active = false, onPress, icon: Icon }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}
    >
      {active ? (
        <Gradient
          direction="horizontal"
          style={[StyleSheet.absoluteFill, styles.pillRadius]}
        />
      ) : null}
      {Icon ? (
        <Icon size={14} color={active ? colors.white : colors.textMuted} />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------------------------- Segmented ----------------------------- */
export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map(option => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.segment}
          >
            {active ? (
              <Gradient
                direction="horizontal"
                style={[StyleSheet.absoluteFill, styles.segmentRadius]}
              />
            ) : null}
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------------------- QtyStepper ---------------------------- */
export function QtyStepper({ value, min = 1, max = 10, onChange, disabled }) {
  const dec = !disabled && value > min;
  const inc = !disabled && value < max;
  return (
    <View style={[styles.stepper, disabled && styles.inactive]}>
      <Pressable
        onPress={() => dec && onChange(value - 1)}
        disabled={!dec}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        style={[styles.stepperButton, !dec && styles.inactive]}
      >
        <Minus size={16} color={colors.white} />
      </Pressable>
      <Text
        style={styles.stepperValue}
        accessibilityLabel={`Quantity ${value}`}
      >
        {value}
      </Text>
      <Pressable
        onPress={() => inc && onChange(value + 1)}
        disabled={!inc}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        style={[styles.stepperButton, !inc && styles.inactive]}
      >
        <Gradient style={[StyleSheet.absoluteFill, styles.stepperRadius]} />
        <Plus size={16} color={colors.white} />
      </Pressable>
    </View>
  );
}

/* ------------------------------ Notice ------------------------------ */
const NOTICES = {
  error: { bg: colors.dangerSoft, fg: colors.danger, Icon: CircleAlert },
  warn: { bg: colors.warnSoft, fg: colors.warn, Icon: TriangleAlert },
  success: { bg: colors.successSoft, fg: colors.success, Icon: CircleCheck },
  info: { bg: colors.surfaceAlt, fg: colors.textMuted, Icon: Info },
};

export function Notice({ tone = 'info', children, style }) {
  const t = NOTICES[tone] || NOTICES.info;
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }, style]}>
      <t.Icon size={18} color={t.fg} />
      <Text style={[styles.noticeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

/* ---------------------------- StatusPill ---------------------------- */
const PILLS = {
  green: { bg: colors.successSoft, fg: colors.success },
  red: { bg: colors.dangerSoft, fg: colors.danger },
  amber: { bg: colors.warnSoft, fg: colors.warn },
  grey: { bg: colors.surfaceAlt, fg: colors.textMuted },
  primary: { bg: colors.primary, fg: colors.white },
  soft: { bg: colors.primarySoft, fg: colors.primary },
  glass: { bg: 'rgba(0,0,0,0.45)', fg: colors.white },
  white: { bg: colors.white, fg: colors.bg },
};

export function StatusPill({ label, tone = 'grey', icon: Icon, style }) {
  const t = PILLS[tone] || PILLS.grey;
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      {Icon ? <Icon size={12} color={t.fg} /> : null}
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/* ---------------------------- DateBadge ----------------------------- */
export function DateBadge({ value, style }) {
  const parts = dateParts(value);
  if (!parts) return null;
  return (
    <View style={[styles.dateBadge, style]}>
      <Text style={styles.dateDay}>{parts.day}</Text>
      <Text style={styles.dateMonth}>{parts.month}</Text>
    </View>
  );
}

/* ---------------------------- EmptyState ---------------------------- */
export function EmptyState({ icon: Icon, title, message, action, style }) {
  return (
    <View style={[styles.empty, style]}>
      {Icon ? (
        <View style={styles.emptyIcon}>
          <Icon size={30} color={colors.primary} />
        </View>
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyText}>{message}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

/* ------------------------------- Card ------------------------------- */
export function Card({ children, style, onPress, accessibilityLabel }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------ Avatar ------------------------------ */
export function Avatar({ user, size = 48, ring = false }) {
  const [failed, setFailed] = useState(false);
  const uri = absoluteUrl(user?.avatarUrl);
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  const box = { width: size, height: size, borderRadius: size / 2 };
  const content =
    uri && !failed ? (
      <Image
        source={{ uri }}
        style={[styles.avatar, box]}
        onError={() => setFailed(true)}
      />
    ) : (
      <Gradient style={[styles.avatarFallback, box]}>
        <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>
          {initial}
        </Text>
      </Gradient>
    );
  if (!ring) return content;
  return (
    <View style={[styles.avatarRing, { borderRadius: size / 2 + 3 }]}>
      {content}
    </View>
  );
}

/* ------------------------------ Headers ----------------------------- */
/** Big title at the top of a tab screen. */
export function PageHeader({ title, subtitle, right }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.pageHeader, { paddingTop: insets.top + 18 }]}>
      <View style={styles.flex}>
        <Text style={text.h1}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Back button + centred title for pushed screens. */
export function ScreenHeader({ title, right, glass = false }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screenHeader, { paddingTop: insets.top + 10 }]}>
      <IconButton
        icon={ChevronLeft}
        label="Back"
        variant={glass ? 'glass' : 'surface'}
        onPress={() => navigation.goBack()}
      />
      <Text style={styles.screenTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerSide}>{right}</View>
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction, style }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={text.h3}>{title}</Text>
      {onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={styles.sectionAction}>{actionLabel || 'See all'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------- Misc ------------------------------- */
/**
 * Android edge-to-edge doesn't resize the window for the keyboard,
 * so forms pad themselves above it.
 */
export function KeyboardView({ children, style }) {
  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.keyboard, style]}>
      {children}
    </KeyboardAvoidingView>
  );
}

export function Loader({ style }) {
  return (
    <View style={[styles.loader, style]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.45 },

  button: {
    minHeight: 54,
    paddingHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 42, paddingHorizontal: 16, borderRadius: 12 },
  radius: { borderRadius: 16 },
  radiusSmall: { borderRadius: 12 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonTextSmall: { fontSize: 14 },

  iconButton: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSurface: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonGlass: { backgroundColor: 'rgba(0,0,0,0.38)' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },

  fieldLabel: { ...text.label, marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surfaceAlt,
  },
  fieldFocused: { borderColor: colors.primary },
  fieldError: { borderColor: colors.danger },
  fieldDisabled: { opacity: 0.6 },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
  },
  fieldErrorText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  fieldHint: { marginTop: 6, fontSize: 12, color: colors.textFaint },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: 'transparent' },
  pillRadius: { borderRadius: radius.pill },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.white },

  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentRadius: { borderRadius: 11 },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  segmentTextActive: { color: colors.white },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepperRadius: { borderRadius: 17 },
  stepperValue: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.md,
    padding: 14,
  },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: 11, fontWeight: '700' },

  dateBadge: {
    width: 50,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  dateDay: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.bg,
  },
  dateMonth: { fontSize: 11, fontWeight: '800', color: colors.primary },

  empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  emptyTitle: { ...text.h3, marginTop: 16, textAlign: 'center' },
  emptyText: { ...text.body, marginTop: 6, textAlign: 'center' },
  emptyAction: { marginTop: 20, alignSelf: 'stretch' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  avatar: { backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontWeight: '800', color: colors.white },
  avatarRing: { padding: 3, backgroundColor: colors.bg },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  pageSubtitle: { ...text.small, marginTop: 2 },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  screenTitle: { ...text.h3, flex: 1, textAlign: 'center' },
  headerSide: { width: 44, alignItems: 'flex-end' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionAction: { fontSize: 14, fontWeight: '700', color: colors.primary },

  keyboard: { flex: 1 },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
});
