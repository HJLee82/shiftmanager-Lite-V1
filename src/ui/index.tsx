// Shared building blocks, styled after the reference screenshots.
import { Picker } from '@react-native-picker/picker';
import { Image } from 'expo-image';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { colors, MAX_WIDTH } from './theme';

// ─── Layout ──────────────────────────────────────────────────────────────

/** Scrollable page with a centred, max-width column. */
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.screen}>
      <View style={s.column}>{children}</View>
    </ScrollView>
  );
}

export function Row({ children, style, gap = 8 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap }, style]}>{children}</View>;
}

export function Card({ title, children, style }: { title?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.card, style]}>
      {title && <H2 style={{ marginBottom: 14 }}>{title}</H2>}
      {children}
    </View>
  );
}

export const Loading = () => (
  <View style={{ padding: 40, alignItems: 'center' }}>
    <ActivityIndicator color={colors.blue} />
  </View>
);

// ─── Text ────────────────────────────────────────────────────────────────

type TextProps = { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
export const H1 = ({ children, style }: TextProps) => <Text style={[s.h1, style]}>{children}</Text>;
export const H2 = ({ children, style }: TextProps) => <Text style={[s.h2, style]}>{children}</Text>;
export const Body = ({ children, style, numberOfLines }: TextProps) => (
  <Text style={[s.body, style]} numberOfLines={numberOfLines}>{children}</Text>
);
export const Muted = ({ children, style }: TextProps) => <Text style={[s.muted, style]}>{children}</Text>;
export const Label = ({ children, style }: TextProps) => <Text style={[s.label, style]}>{children}</Text>;

// ─── Controls ────────────────────────────────────────────────────────────

const BUTTON_COLORS = {
  blue: [colors.blue, '#fff'],
  green: [colors.green, '#fff'],
  red: [colors.red, '#fff'],
  purple: [colors.purple, '#fff'],
  orange: [colors.orange, '#fff'],
  grey: [colors.subtle, '#374151'],
  outline: ['#fff', colors.blue],
} as const;

export function Button({
  title, onPress, color = 'blue', disabled, small, style,
}: {
  title: string;
  onPress: () => void;
  color?: keyof typeof BUTTON_COLORS;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [bg, fg] = BUTTON_COLORS[color];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        small && s.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        color === 'outline' && { borderWidth: 1, borderColor: colors.blue },
        style,
      ]}
    >
      <Text style={[s.buttonText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

/** Text-only pressable, e.g. "← Back", "+ Add", ✏️, 🗑. */
export function Link({ title, onPress, color = colors.muted, style, label }: { title: string; onPress: () => void; color?: string; style?: StyleProp<TextStyle>; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}>
      <Text style={[{ color, fontSize: 14 }, style]}>{title}</Text>
    </Pressable>
  );
}

export function TextField({
  label, value, onChangeText, placeholder, required, secure, onSubmit, style,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  secure?: boolean;
  onSubmit?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label && (
        <Text style={s.fieldLabel}>
          {label}
          {required && <Text style={{ color: colors.red }}> *</Text>}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        secureTextEntry={secure}
        onSubmitEditing={onSubmit}
        accessibilityLabel={label}
        style={s.input}
      />
    </View>
  );
}

export type Option = { label: string; value: string };

/** Dropdown (a native <select> on web). Empty value shows the placeholder. */
export function Select({
  value, onChange, options, placeholder, disabled, style,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.select, disabled && { opacity: 0.5 }, style]}>
      <Picker
        selectedValue={value}
        onValueChange={(v) => onChange(String(v))}
        enabled={!disabled}
        style={s.picker}
      >
        {placeholder !== undefined && <Picker.Item label={placeholder} value="" />}
        {options.map((o) => (
          <Picker.Item key={o.value} label={o.label} value={o.value} />
        ))}
      </Picker>
    </View>
  );
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: disabled ? 0.4 : 1 }}
    >
      <View style={[s.checkbox, checked && { backgroundColor: colors.blue, borderColor: colors.blue }]}>
        {checked && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
      </View>
      {label && <Body>{label}</Body>}
    </Pressable>
  );
}

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: disabled ? 0.4 : 1 }}>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.green, false: '#d1d5db' }}
        thumbColor="#fff"
        accessibilityLabel={label}
      />
      <Body>{label}</Body>
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "HH:MM" picker as [hour] [:mm] [AM/PM]. */
export function TimeSelect({ value, onChange, minutes = [0, 15, 30, 45], disabled }: { value: string; onChange: (v: string) => void; minutes?: number[]; disabled?: boolean }) {
  const [h24, m] = (value || '09:00').split(':').map(Number);
  const pm = h24 >= 12;
  const h12 = h24 % 12 || 12;
  const set = (hour12: number, minute: number, isPm: boolean) => onChange(`${pad((hour12 % 12) + (isPm ? 12 : 0))}:${pad(minute)}`);
  const minuteOptions = minutes.includes(m) ? minutes : [...minutes, m].sort((a, b) => a - b);
  return (
    <Row gap={4} style={{ flexWrap: 'nowrap' }}>
      <Select style={{ width: 64 }} disabled={disabled} value={String(h12)} onChange={(v) => set(Number(v), m, pm)}
        options={Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) }))} />
      {minutes.length > 1 && (
        <Select style={{ width: 68 }} disabled={disabled} value={String(m)} onChange={(v) => set(h12, Number(v), pm)}
          options={minuteOptions.map((x) => ({ label: `:${pad(x)}`, value: String(x) }))} />
      )}
      <Select style={{ width: 72 }} disabled={disabled} value={pm ? 'PM' : 'AM'} onChange={(v) => set(h12, m, v === 'PM')}
        options={[{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }]} />
    </Row>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────

/** Photo, or a light-blue circle with the name's first letter. */
export function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (url) return <Image source={{ uri: url }} style={box} contentFit="cover" accessibilityLabel={name} />;
  return (
    <View style={[box, { backgroundColor: colors.avatarBg, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: colors.blue, fontWeight: '700', fontSize: size * 0.36 }}>{name[0]?.toUpperCase()}</Text>
    </View>
  );
}

/** First letter of the role in a circle. */
export function RoleBadge({ name, color = colors.blue }: { name?: string; color?: string }) {
  if (!name) return null;
  return (
    <View accessibilityLabel={name} style={[s.roleBadge, { borderColor: color }]}>
      <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{name[0].toUpperCase()}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48, alignItems: 'center' },
  column: { width: '100%', maxWidth: MAX_WIDTH, gap: 20 },
  card: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 20 },
  h1: { fontSize: 24, fontWeight: '700', color: colors.text },
  h2: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  label: { fontSize: 12, color: colors.faint },
  fieldLabel: { fontSize: 13, color: colors.text, fontWeight: '500' },
  button: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  buttonSmall: { paddingHorizontal: 10, paddingVertical: 5 },
  buttonText: { fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: '#fff' },
  select: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 7, backgroundColor: '#fff', justifyContent: 'center', minHeight: 36 },
  picker: { borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 8, height: 36, fontSize: 14, color: colors.text },
  checkbox: { width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: '#9ca3af', alignItems: 'center', justifyContent: 'center' },
  roleBadge: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
