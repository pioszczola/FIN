import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import { useSettings } from '../../hooks/useSettings';
import { addExpense, updateExpense, deleteExpense } from '../../lib/firestore';
import { formatPLN } from '../../lib/frankfurter';
import { useT } from '../../lib/i18n';
import type { Expense } from '../../lib/types';
import { Colors, Spacing, Radius } from '../../constants/theme';

type FormData = { name: string; amount: string };
const EMPTY_FORM: FormData = { name: '', amount: '' };

const COL_NAME = 1;
const COL_AMOUNT = 100;
const COL_STATUS = 36;
const COL_DELETE = 36;

export default function ExpensesScreen() {
  const { user } = useAuth();
  const { expenses, loading } = useExpenses(user?.uid);
  const { settings } = useSettings(user?.uid);
  const t = useT(settings.language);

  const [infoVisible, setInfoVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  const filtered = expenses.filter((e) => {
    if (filter === 'pending') return !e.done;
    if (filter === 'done') return e.done;
    return true;
  });

  const totalPending = expenses.filter((e) => !e.done).reduce((s, e) => s + e.amount, 0);
  const totalDone = expenses.filter((e) => e.done).reduce((s, e) => s + e.amount, 0);

  const openAdd = () => {
    setEditingExpense(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({ name: expense.name, amount: String(expense.amount) });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim()) return Alert.alert('Validation', t.nameRequired);
    const amount = parseFloat(form.amount.replace(',', '.'));
    if (isNaN(amount) || amount < 0) return Alert.alert('Validation', t.invalidAmount);

    setSaving(true);
    try {
      if (editingExpense) {
        await updateExpense(user.uid, editingExpense.id, { name: form.name.trim(), amount });
      } else {
        await addExpense(user.uid, { name: form.name.trim(), amount, done: false });
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Error', t.saveErrorExpense);
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (expense: Expense) => {
    if (!user) return;
    await updateExpense(user.uid, expense.id, { done: !expense.done });
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(t.deleteExpenseTitle, t.deleteExpenseMsg(expense.name), [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive',
        onPress: () => user && deleteExpense(user.uid, expense.id),
      },
    ]);
  };

  const filterLabels: Record<'all' | 'pending' | 'done', string> = {
    all: t.all,
    pending: t.pendingFilter,
    done: t.doneFilter,
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.expenses}</Text>
        <TouchableOpacity style={styles.infoBtn} onPress={() => setInfoVisible(true)}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t.pendingFilter}</Text>
          <Text style={styles.summaryAmount}>
            {formatPLN(totalPending)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t.doneFilter}</Text>
          <Text style={[styles.summaryAmount, { color: Colors.textSecondary }]}>
            {formatPLN(totalDone)}
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'done'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {filterLabels[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyText}>{t.noExpenses}</Text>
          <Text style={styles.emptySubText}>{t.noExpensesHint}</Text>
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { flex: COL_NAME }]}>{t.name}</Text>
            <Text style={[styles.thCell, styles.thRight, { width: COL_AMOUNT }]}>{t.amount}</Text>
            <View style={{ width: COL_STATUS }} />
            <View style={{ width: COL_DELETE }} />
          </View>

          <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
            {filtered.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.tableRowAlt,
                  item.done && styles.tableRowDone,
                ]}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.tdName, { flex: COL_NAME }, item.done && styles.tdNameDone]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.tdAmount,
                    { width: COL_AMOUNT },
                    item.done && styles.tdAmountDone,
                  ]}
                  numberOfLines={1}
                >
                  {formatPLN(item.amount)}
                </Text>
                <TouchableOpacity
                  onPress={() => toggleDone(item)}
                  style={[styles.tdCell, { width: COL_STATUS }]}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  {item.done ? (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={Colors.border} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={[styles.tdCell, { width: COL_DELETE }]}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addRow} onPress={openAdd} activeOpacity={0.5}>
              <Ionicons name="add" size={16} color={Colors.textSecondary} />
              <Text style={styles.addRowText}>{t.newExpense}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Info modal */}
      <Modal visible={infoVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setInfoVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={{ width: 36 }} />
            <Text style={styles.modalTitle}>{t.expenses}</Text>
            <TouchableOpacity onPress={() => setInfoVisible(false)} style={styles.modalIconBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.infoText}>
              Wpisz tutaj wszystkie koszty jakie spodziewasz się ponieść w okresie, dla którego chcesz mieć balans. Dla niewielkich wydatków najlepiej założyć jakiś z góry ustalony budżet i wpisać go jako jedną kwotę, by ułatwić sobie zarządzanie listą.
            </Text>
            <Text style={styles.infoExamplesTitle}>Przykłady</Text>
            <Text style={styles.infoExample}>• Budżet na wydatki codzienne</Text>
            <Text style={styles.infoExample}>• Wkład do rodzinnego budżetu</Text>
            <Text style={styles.infoExample}>• Duży zakup zaplanowany na ten miesiąc</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalIconBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingExpense ? t.editExpense : t.addExpense}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.modalIconBtn}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="checkmark" size={24} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {editingExpense && (
                <TouchableOpacity
                  style={styles.doneToggleRow}
                  onPress={() => {
                    toggleDone(editingExpense);
                    setModalVisible(false);
                  }}
                >
                  <Ionicons
                    name={editingExpense.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={editingExpense.done ? Colors.success : Colors.border}
                  />
                  <Text style={styles.doneToggleText}>
                    {editingExpense.done ? t.toggleDone : t.togglePending}
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.fieldLabel}>{t.name}</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder={t.namePlaceholderExpense}
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>{t.amountPLN}</Text>
              <TextInput
                style={styles.input}
                value={form.amount}
                onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={styles.hint}>{t.markDoneHint}</Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  infoBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  summaryAmount: { fontSize: 18, fontWeight: '700' },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: '#fff' },

  // Table
  tableWrapper: {
    flex: 1,
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thRight: { textAlign: 'right' },
  tableBody: { flex: 1 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableRowAlt: { backgroundColor: '#F9F9F9' },
  tableRowDone: { opacity: 0.55 },
  tdName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    paddingRight: Spacing.xs,
  },
  tdNameDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  tdAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.danger,
    textAlign: 'right',
    paddingRight: Spacing.xs,
  },
  tdAmountDone: { color: Colors.textSecondary },
  tdCell: { alignItems: 'center', justifyContent: 'center' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
  },
  addRowText: { fontSize: 14, color: Colors.textSecondary },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary },
  emptySubText: { fontSize: 14, color: Colors.textSecondary },

  // Modal
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
  modalIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: Spacing.md },
  doneToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  doneToggleText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  hint: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.md, lineHeight: 18 },
  infoText: { fontSize: 16, color: Colors.text, lineHeight: 24, marginBottom: Spacing.lg },
  infoExamplesTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  infoExample: { fontSize: 15, color: Colors.text, lineHeight: 26 },
});
