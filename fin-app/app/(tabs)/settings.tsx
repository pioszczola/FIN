import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { getCurrencies } from '../../lib/frankfurter';
import {
  requestNotificationPermissions,
  scheduleSnapshotNotification,
  cancelSnapshotNotifications,
} from '../../lib/notifications';
import { useT } from '../../lib/i18n';
import { Colors, Spacing, Radius } from '../../constants/theme';
import type { SnapshotSchedule } from '../../lib/types';

const ITEM_H = 44;
const VISIBLE = 5; // visible rows in wheel
const WHEEL_H = ITEM_H * VISIBLE;

function WheelPicker({
  items,
  selectedIndex,
  onSelect,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const padding = ITEM_H * Math.floor(VISIBLE / 2);

  useEffect(() => {
    ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
  }, [selectedIndex]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    onSelect(Math.max(0, Math.min(items.length - 1, idx)));
  };

  return (
    <View style={wheelStyles.container}>
      {/* Selection highlight */}
      <View style={wheelStyles.highlight} pointerEvents="none" />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: padding }}
        style={{ height: WHEEL_H }}
      >
        {items.map((label, i) => (
          <View key={i} style={wheelStyles.item}>
            <Text style={[wheelStyles.itemText, i === selectedIndex && wheelStyles.itemTextActive]}>
              {label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden' },
  highlight: {
    position: 'absolute',
    top: ITEM_H * Math.floor(VISIBLE / 2),
    left: 0,
    right: 0,
    height: ITEM_H,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E8E8E8',
    zIndex: 1,
  },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 20, color: '#8C8C8C' },
  itemTextActive: { fontSize: 22, fontWeight: '700', color: '#111111' },
});

const FREQ_OPTIONS: SnapshotSchedule['frequency'][] = ['daily', 'weekly', 'monthly'];

export default function SettingsScreen() {
  const { user } = useAuth();
  const { settings, loading, updateSettings } = useSettings(user?.uid);
  const t = useT(settings.language);
  const [currencies, setCurrencies] = useState<string[]>(['PLN', 'EUR', 'CHF', 'USD', 'GBP']);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'time' | 'day' | null>(null);
  const [draftHour, setDraftHour] = useState(0);
  const [draftMinute, setDraftMinute] = useState(0);
  const [draftDay, setDraftDay] = useState(1);

  const schedule: SnapshotSchedule = settings.snapshotSchedule ?? {
    enabled: false,
    frequency: 'daily',
    hour: 20,
    minute: 0,
  };

  useEffect(() => {
    getCurrencies().then((c) => setCurrencies(Object.keys(c))).catch(() => {});
  }, []);

  const handleCurrencySelect = async (currency: string) => {
    setSaving(true);
    await updateSettings({ defaultCurrency: currency });
    setSaving(false);
    setShowPicker(false);
  };

  const applySchedule = async (next: SnapshotSchedule) => {
    await updateSettings({ snapshotSchedule: next });
    if (next.enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('', t.schedulePermissionDenied);
        await updateSettings({ snapshotSchedule: { ...next, enabled: false } });
        return;
      }
      const now = new Date();
      await scheduleSnapshotNotification(
        {
          ...next,
          weekday: next.weekday ?? ((now.getDay() + 1) % 7) + 1, // 1=Sunday
          dayOfMonth: next.dayOfMonth ?? Math.min(now.getDate(), 28),
        },
        t.scheduleNotifTitle,
        t.scheduleNotifBody
      );
    } else {
      await cancelSnapshotNotifications();
    }
  };

  const handleToggleSchedule = (val: boolean) => {
    applySchedule({ ...schedule, enabled: val });
  };

  const handleFrequency = (freq: SnapshotSchedule['frequency']) => {
    applySchedule({ ...schedule, frequency: freq });
  };

  const handleHour = (delta: number) => {
    const h = ((schedule.hour + delta + 24) % 24);
    applySchedule({ ...schedule, hour: h });
  };

  const handleMinute = (delta: number) => {
    const m = ((schedule.minute + delta + 60) % 60);
    applySchedule({ ...schedule, minute: m });
  };

  const handleWeekday = (wd: number) => {
    applySchedule({ ...schedule, weekday: wd });
  };

  const openPicker = (target: 'time' | 'day') => {
    setDraftHour(schedule.hour);
    setDraftMinute(schedule.minute);
    setDraftDay(schedule.dayOfMonth ?? 1);
    setPickerTarget(target);
  };

  const confirmPicker = () => {
    if (pickerTarget === 'time') {
      applySchedule({ ...schedule, hour: draftHour, minute: draftMinute });
    } else {
      applySchedule({ ...schedule, dayOfMonth: draftDay });
    }
    setPickerTarget(null);
  };

  const freqLabel = (f: SnapshotSchedule['frequency']) => {
    if (f === 'daily') return t.scheduleFreqDaily;
    if (f === 'weekly') return t.scheduleFreqWeekly;
    return t.scheduleFreqMonthly;
  };

  const handleSignOut = () => {
    Alert.alert(t.signOutTitle, t.signOutMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: t.signOut, style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const filtered = currencies.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Text style={styles.title}>{t.settings}</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : (
        <View style={styles.content}>
          {/* Account section */}
          <Text style={styles.sectionLabel}>{t.account}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>{t.signedInAs}</Text>
                <Text style={styles.rowValue}>{user?.email || user?.displayName || t.anonymous}</Text>
              </View>
            </View>
          </View>

          {/* Preferences section */}
          <Text style={styles.sectionLabel}>{t.preferences}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => { setShowPicker(true); setSearch(''); }}
            >
              <Ionicons name="cash-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>{t.defaultCurrency}</Text>
                <Text style={styles.rowValue}>{settings.defaultCurrency}</Text>
              </View>
              {saving ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>

            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Ionicons name="language-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>{t.language}</Text>
              </View>
              <View style={styles.langToggle}>
                <TouchableOpacity
                  style={[styles.langBtn, settings.language === 'en' && styles.langBtnActive]}
                  onPress={() => updateSettings({ language: 'en' })}
                >
                  <Text style={[styles.langBtnText, settings.language === 'en' && styles.langBtnTextActive]}>
                    EN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langBtn, settings.language === 'pl' && styles.langBtnActive]}
                  onPress={() => updateSettings({ language: 'pl' })}
                >
                  <Text style={[styles.langBtnText, settings.language === 'pl' && styles.langBtnTextActive]}>
                    PL
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Snapshot schedule section */}
          <Text style={styles.sectionLabel}>{t.snapshotSchedule}</Text>
          <View style={styles.card}>
            {/* Enable toggle */}
            <View style={[styles.row, { borderBottomWidth: schedule.enabled ? 1 : 0 }]}>
              <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>{t.scheduleEnabled}</Text>
              </View>
              <Switch
                value={schedule.enabled}
                onValueChange={handleToggleSchedule}
                trackColor={{ true: Colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {schedule.enabled && (
              <>
                {/* Frequency */}
                <View style={styles.row}>
                  <Ionicons name="repeat-outline" size={20} color={Colors.textSecondary} />
                  <View style={[styles.freqRow, { flex: 1, justifyContent: 'flex-end' }]}>
                    {FREQ_OPTIONS.map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.freqBtn, schedule.frequency === f && styles.freqBtnActive]}
                        onPress={() => handleFrequency(f)}
                      >
                        <Text
                          style={[
                            styles.freqBtnText,
                            schedule.frequency === f && styles.freqBtnTextActive,
                          ]}
                        >
                          {freqLabel(f)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Day of week picker (weekly only) */}
                {schedule.frequency === 'weekly' && (
                  <View style={styles.row}>
                    <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowLabel}>{t.scheduleWeekday}</Text>
                    </View>
                    <View style={styles.freqRow}>
                      {(t.weekdays as readonly string[]).map((label, idx) => {
                        const wd = idx + 1; // 1=Sunday … 7=Saturday
                        const active = (schedule.weekday ?? 2) === wd;
                        return (
                          <TouchableOpacity
                            key={wd}
                            style={[styles.freqBtn, active && styles.freqBtnActive]}
                            onPress={() => handleWeekday(wd)}
                          >
                            <Text style={[styles.freqBtnText, active && styles.freqBtnTextActive]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Day of month picker (monthly only) */}
                {schedule.frequency === 'monthly' && (
                  <View style={styles.row}>
                    <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowLabel}>{t.scheduleDay}</Text>
                    </View>
                    <TouchableOpacity onPress={() => openPicker('day')} style={styles.pickerBtn}>
                      <Text style={styles.pickerBtnText}>{schedule.dayOfMonth ?? 1}</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Time picker */}
                <View style={[styles.row, { borderBottomWidth: 0 }]}>
                  <Ionicons name="alarm-outline" size={20} color={Colors.textSecondary} />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowLabel}>{t.scheduleTime}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openPicker('time')} style={styles.pickerBtn}>
                    <Text style={styles.pickerBtnText}>
                      {String(schedule.hour).padStart(2, '0')}:{String(schedule.minute).padStart(2, '0')}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.signOutText}>{t.signOut}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Wheel picker modal (time + day of month) */}
      <Modal visible={pickerTarget !== null} transparent animationType="slide" onRequestClose={() => setPickerTarget(null)}>
        <View style={styles.wheelOverlay}>
          <View style={styles.wheelSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setPickerTarget(null)}>
                <Text style={styles.modalDone}>{t.cancel}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {pickerTarget === 'time' ? t.scheduleTime : t.scheduleDay}
              </Text>
              <TouchableOpacity onPress={confirmPicker}>
                <Text style={styles.modalDone}>{t.done}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.wheelRow}>
              {pickerTarget === 'time' && (
                <>
                  <WheelPicker
                    items={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))}
                    selectedIndex={draftHour}
                    onSelect={setDraftHour}
                  />
                  <Text style={styles.wheelSep}>:</Text>
                  <WheelPicker
                    items={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))}
                    selectedIndex={draftMinute}
                    onSelect={setDraftMinute}
                  />
                </>
              )}
              {pickerTarget === 'day' && (
                <WheelPicker
                  items={Array.from({ length: 28 }, (_, i) => String(i + 1))}
                  selectedIndex={(draftDay - 1)}
                  onSelect={(i) => setDraftDay(i + 1)}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency picker modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={{ width: 60 }} />
            <Text style={styles.modalTitle}>{t.defaultCurrency}</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={styles.modalDone}>{t.done}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t.searchCurrency}
            placeholderTextColor={Colors.textSecondary}
          />
          <FlatList
            data={filtered}
            keyExtractor={(c) => c}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.currencyRow}
                onPress={() => handleCurrencySelect(item)}
              >
                <Text style={styles.currencyText}>{item}</Text>
                {settings.defaultCurrency === item && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, padding: Spacing.md },
  content: { padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 13, color: Colors.textSecondary },
  rowValue: { fontSize: 15, fontWeight: '500', color: Colors.text, marginTop: 2 },
  langToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  langBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  langBtnTextActive: {
    color: '#fff',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
    justifyContent: 'center',
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: Colors.danger },
  freqRow: { flexDirection: 'row', gap: 4 },
  freqBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  freqBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  freqBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  freqBtnTextActive: { color: '#fff' },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  timeArrow: { padding: 4 },
  timeValue: { fontSize: 16, fontWeight: '700', color: Colors.text, minWidth: 48, textAlign: 'center' },
  timeMinLabel: { fontSize: 11, color: Colors.textSecondary },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  pickerBtnText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  wheelOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  wheelSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Spacing.xl,
  },
  wheelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  wheelSep: { fontSize: 28, fontWeight: '700', color: Colors.text, marginHorizontal: Spacing.sm },
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
  modalDone: { fontSize: 16, fontWeight: '600', color: Colors.primary, minWidth: 60, textAlign: 'right' },
  searchInput: {
    margin: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  currencyText: { fontSize: 16, color: Colors.text },
});
