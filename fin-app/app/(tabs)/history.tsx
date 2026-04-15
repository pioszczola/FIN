import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../hooks/useAuth';
import { useAssets } from '../../hooks/useAssets';
import { useExpenses } from '../../hooks/useExpenses';
import { useSettings } from '../../hooks/useSettings';
import { useSnapshots } from '../../hooks/useSnapshots';
import { useCurrencyRates } from '../../hooks/useCurrencyRates';
import { toPLN, formatPLN } from '../../lib/frankfurter';
import { addSnapshot, deleteSnapshot } from '../../lib/firestore';
import { consumePendingAutoSave } from '../../lib/notificationState';
import { useT } from '../../lib/i18n';
import { Colors, Radius, Spacing } from '../../constants/theme';
import type { BalanceSnapshot } from '../../lib/types';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const { assets } = useAssets(user?.uid);
  const { expenses } = useExpenses(user?.uid);
  const { settings } = useSettings(user?.uid);
  const { rates } = useCurrencyRates();
  const { snapshots, loading } = useSnapshots(user?.uid);
  const t = useT(settings.language);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute current net balance
  const totalAssetsPLN = assets.reduce(
    (sum, a) => sum + toPLN(a.amount, a.currency, rates),
    0
  );
  const totalPendingPLN = expenses
    .filter((e) => !e.done)
    .reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalAssetsPLN - totalPendingPLN;

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const handleSaveSnapshot = async () => {
    if (!user?.uid) return;
    await addSnapshot(user.uid, {
      timestamp: Date.now(),
      netBalance,
      currency: 'PLN',
    });
    showToast(t.snapshotSaved);
  };

  // Auto-save when opened via notification
  const autoSaveHandled = useRef(false);
  useEffect(() => {
    if (autoSaveHandled.current) return;
    autoSaveHandled.current = true;
    if (consumePendingAutoSave()) {
      handleSaveSnapshot();
    }
  }, []);

  const handleDelete = (snapshot: BalanceSnapshot) => {
    Alert.alert(t.deleteSnapshotTitle, t.deleteSnapshotMsg, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: () => user?.uid && deleteSnapshot(user.uid, snapshot.id),
      },
    ]);
  };

  const handleExport = async () => {
    if (snapshots.length === 0) return;

    const header = `${t.tableDate},${t.tableBalance},Currency`;
    const rows = snapshots.map((s) => {
      const dateStr = `${formatDate(s.timestamp)} ${formatTime(s.timestamp)}`;
      return `${dateStr},${s.netBalance.toFixed(2)},${s.currency}`;
    });
    const csv = [header, ...rows].join('\n');

    const fileUri = (FileSystem.documentDirectory ?? '') + 'fin_history.csv';
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={snapshots}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Header row */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>{t.history}</Text>
              <View style={styles.headerActions}>
                {snapshots.length > 0 && (
                  <TouchableOpacity style={styles.iconBtn} onPress={handleExport}>
                    <Ionicons name="share-outline" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSnapshot}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>{t.saveNow}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Toast */}
            {toast && (
              <View style={styles.toast}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text style={styles.toastText}>{toast}</Text>
              </View>
            )}

            {/* Table header */}
            {snapshots.length > 0 && (
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>
                  {t.tableDate}
                </Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>
                  {t.tableBalance}
                </Text>
                <View style={{ width: 36 }} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.tableCell}>{formatDate(item.timestamp)}</Text>
              <Text style={styles.tableCellSub}>{formatTime(item.timestamp)}</Text>
            </View>
            <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', fontWeight: '600' }]}>
              {formatPLN(item.netBalance)}
            </Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyTitle}>{t.noSnapshots}</Text>
              <Text style={styles.emptyHint}>{t.noSnapshotsHint}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.sm },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  toastText: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableHeader: {
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: { fontSize: 14, color: Colors.text },
  tableCellSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  deleteBtn: { width: 36, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: Spacing.xl * 2, gap: Spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
  emptyHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
