import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';
import { useAuth } from '../../hooks/useAuth';
import { useAssets } from '../../hooks/useAssets';
import { useExpenses } from '../../hooks/useExpenses';
import { useSettings } from '../../hooks/useSettings';
import { useSnapshots } from '../../hooks/useSnapshots';
import { useCurrencyRates } from '../../hooks/useCurrencyRates';
import { toPLN, formatPLN } from '../../lib/frankfurter';
import { useT } from '../../lib/i18n';
import { Colors, Spacing, Radius } from '../../constants/theme';

const CHART_HEIGHT = 220;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { assets } = useAssets(user?.uid);
  const { expenses } = useExpenses(user?.uid);
  const { settings } = useSettings(user?.uid);
  const { snapshots } = useSnapshots(user?.uid);
  const { rates, loading: ratesLoading, error: ratesError, refresh } = useCurrencyRates();
  const t = useT(settings.language);

  const totalAssetsPLN = assets.reduce(
    (sum, a) => sum + toPLN(a.amount, a.currency, rates),
    0
  );

  const pendingExpenses = expenses.filter((e) => !e.done);
  const totalPendingPLN = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const availablePLN = totalAssetsPLN - totalPendingPLN;

  const doneExpenses = expenses.filter((e) => e.done);
  const totalDonePLN = doneExpenses.reduce((sum, e) => sum + e.amount, 0);

  const itemsLabel = (n: number) =>
    n === 1 ? `1 ${t.items_one}` : `${n} ${t.items_other}`;

  const doneLabel =
    doneExpenses.length === 1
      ? t.doneExpenses_one(doneExpenses.length, formatPLN(totalDonePLN))
      : t.doneExpenses_other(doneExpenses.length, formatPLN(totalDonePLN));

  const chartWidth = SCREEN_WIDTH - Spacing.md * 4;
  const chartPadL = 52;
  const chartPadB = 28;
  const chartPadT = 12;
  const plotW = chartWidth - chartPadL - 8;
  const plotH = CHART_HEIGHT - chartPadT - chartPadB;

  const renderChart = () => {
    if (snapshots.length < 2) return null;
    const vals = snapshots.map((s) => s.netBalance);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const toX = (i: number) => chartPadL + (i / (snapshots.length - 1)) * plotW;
    const toY = (v: number) => chartPadT + plotH - ((v - minV) / range) * plotH;
    const points = snapshots.map((s, i) => `${toX(i)},${toY(s.netBalance)}`).join(' ');
    const ticks = 4;
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t.chartTitle}</Text>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          {Array.from({ length: ticks + 1 }).map((_, i) => {
            const v = minV + (range * i) / ticks;
            const y = toY(v);
            return (
              <React.Fragment key={i}>
                <Line x1={chartPadL} y1={y} x2={chartWidth - 8} y2={y}
                  stroke={Colors.border} strokeWidth={1} />
                <SvgText x={chartPadL - 4} y={y + 4} fontSize={9}
                  fill={Colors.textSecondary} textAnchor="end">
                  {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
                </SvgText>
              </React.Fragment>
            );
          })}
          <SvgText x={toX(0)} y={CHART_HEIGHT - 6} fontSize={9}
            fill={Colors.textSecondary} textAnchor="middle">
            {formatDate(snapshots[0].timestamp)}
          </SvgText>
          <SvgText x={toX(snapshots.length - 1)} y={CHART_HEIGHT - 6} fontSize={9}
            fill={Colors.textSecondary} textAnchor="middle">
            {formatDate(snapshots[snapshots.length - 1].timestamp)}
          </SvgText>
          <Polyline points={points} fill="none"
            stroke={Colors.primary} strokeWidth={2} strokeLinejoin="round" />
          {snapshots.map((s, i) => (
            <Circle key={s.id} cx={toX(i)} cy={toY(s.netBalance)}
              r={3} fill={Colors.primary} />
          ))}
        </Svg>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t.dashboard}</Text>
          <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {ratesError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color={Colors.warning} />
            <Text style={styles.errorText}>{t.ratesUnavailable}</Text>
          </View>
        )}

        {/* Main summary card */}
        <View style={[styles.card, styles.mainCard]}>
          <Text style={styles.mainLabel}>{t.available}</Text>
          {ratesLoading ? (
            <ActivityIndicator color={Colors.card} size="large" style={{ marginVertical: 8 }} />
          ) : (
            <Text style={styles.mainAmount}>{formatPLN(availablePLN)}</Text>
          )}
          <Text style={styles.mainSub}>{t.afterPendingExpenses}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
            <Text style={styles.statLabel}>{t.totalAssets}</Text>
            <Text style={styles.statAmount}>{formatPLN(totalAssetsPLN)}</Text>
            <Text style={styles.statSub}>{itemsLabel(assets.length)}</Text>
          </View>
          <View style={[styles.card, styles.statCard]}>
            <Ionicons name="receipt-outline" size={20} color={Colors.danger} />
            <Text style={styles.statLabel}>{t.pending}</Text>
            <Text style={[styles.statAmount, { color: Colors.danger }]}>
              {formatPLN(totalPendingPLN)}
            </Text>
            <Text style={styles.statSub}>{itemsLabel(pendingExpenses.length)}</Text>
          </View>
        </View>

        {/* Pending expenses (max 5) */}
        {pendingExpenses.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t.pendingExpenses}</Text>
            {pendingExpenses.slice(0, 5).map((e) => (
              <View key={e.id} style={styles.row}>
                <Text style={styles.rowLabel}>{e.name}</Text>
                <Text style={[styles.rowAmount, { color: Colors.danger }]}>
                  -{formatPLN(e.amount)}
                </Text>
              </View>
            ))}
            {pendingExpenses.length > 5 && (
              <Text style={styles.seeAll}>{t.seeAll}</Text>
            )}
          </View>
        )}

        {/* Historical balance chart */}
        {renderChart()}

        {/* Done expenses info */}
        {doneExpenses.length > 0 && (
          <View style={[styles.card, styles.doneCard]}>
            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
            <Text style={styles.doneText}>{doneLabel}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  refreshBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  errorText: { fontSize: 13, color: Colors.warning },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mainCard: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  mainLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  mainAmount: { fontSize: 40, fontWeight: '800', color: '#fff', marginVertical: Spacing.xs },
  mainSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, gap: Spacing.xs },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: Spacing.xs },
  statAmount: { fontSize: 18, fontWeight: '700', color: Colors.text },
  statSub: { fontSize: 11, color: Colors.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  rowAmount: { fontSize: 15, fontWeight: '600', color: Colors.text },
  seeAll: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successLight,
  },
  doneText: { fontSize: 13, color: Colors.text, flex: 1 },
});
