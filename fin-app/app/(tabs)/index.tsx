import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useAssets } from '../../hooks/useAssets';
import { useExpenses } from '../../hooks/useExpenses';
import { useCurrencyRates } from '../../hooks/useCurrencyRates';
import { toPLN, formatPLN } from '../../lib/frankfurter';
import { Colors, Spacing, Radius } from '../../constants/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { assets } = useAssets(user?.uid);
  const { expenses } = useExpenses(user?.uid);
  const { rates, loading: ratesLoading, error: ratesError, refresh } = useCurrencyRates();

  const totalAssetsPLN = assets.reduce(
    (sum, a) => sum + toPLN(a.amount, a.currency, rates),
    0
  );

  const pendingExpenses = expenses.filter((e) => !e.done);
  const totalPendingPLN = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const availablePLN = totalAssetsPLN - totalPendingPLN;

  const doneExpenses = expenses.filter((e) => e.done);
  const totalDonePLN = doneExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Dashboard</Text>
          <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {ratesError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color={Colors.warning} />
            <Text style={styles.errorText}>Rates unavailable — using cached values</Text>
          </View>
        )}

        {/* Main summary card */}
        <View style={[styles.card, styles.mainCard]}>
          <Text style={styles.mainLabel}>Available</Text>
          {ratesLoading ? (
            <ActivityIndicator color={Colors.card} size="large" style={{ marginVertical: 8 }} />
          ) : (
            <Text style={styles.mainAmount}>{formatPLN(availablePLN)}</Text>
          )}
          <Text style={styles.mainSub}>after pending expenses</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
            <Text style={styles.statLabel}>Total Assets</Text>
            <Text style={styles.statAmount}>{formatPLN(totalAssetsPLN)}</Text>
            <Text style={styles.statSub}>{assets.length} item{assets.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={[styles.card, styles.statCard]}>
            <Ionicons name="receipt-outline" size={20} color={Colors.danger} />
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statAmount, { color: Colors.danger }]}>
              {formatPLN(totalPendingPLN)}
            </Text>
            <Text style={styles.statSub}>{pendingExpenses.length} item{pendingExpenses.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Assets breakdown */}
        {assets.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Assets Breakdown</Text>
            {assets.map((a) => {
              const plnVal = toPLN(a.amount, a.currency, rates);
              return (
                <View key={a.id} style={styles.row}>
                  <View>
                    <Text style={styles.rowLabel}>{a.name}</Text>
                    <Text style={styles.rowSub}>
                      {a.amount.toLocaleString('pl-PL')} {a.currency}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatPLN(plnVal)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Pending expenses */}
        {pendingExpenses.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pending Expenses</Text>
            {pendingExpenses.map((e) => (
              <View key={e.id} style={styles.row}>
                <Text style={styles.rowLabel}>{e.name}</Text>
                <Text style={[styles.rowAmount, { color: Colors.danger }]}>
                  -{formatPLN(e.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Done expenses info */}
        {doneExpenses.length > 0 && (
          <View style={[styles.card, styles.doneCard]}>
            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
            <Text style={styles.doneText}>
              {doneExpenses.length} expense{doneExpenses.length !== 1 ? 's' : ''} marked as done
              ({formatPLN(totalDonePLN)} — not deducted)
            </Text>
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
    backgroundColor: '#FEF3C7',
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
  rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '600', color: Colors.text },
  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successLight,
  },
  doneText: { fontSize: 13, color: Colors.text, flex: 1 },
});
