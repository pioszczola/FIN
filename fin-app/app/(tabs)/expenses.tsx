import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import { addExpense, updateExpense, deleteExpense } from '../../lib/firestore';
import { formatPLN } from '../../lib/frankfurter';
import type { Expense } from '../../lib/types';
import { Colors, Spacing, Radius } from '../../constants/theme';

type FormData = { name: string; amount: string };
const EMPTY_FORM: FormData = { name: '', amount: '' };

export default function ExpensesScreen() {
  const { user } = useAuth();
  const { expenses, loading } = useExpenses(user?.uid);

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
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required');
    const amount = parseFloat(form.amount.replace(',', '.'));
    if (isNaN(amount) || amount < 0) return Alert.alert('Validation', 'Enter a valid amount');

    setSaving(true);
    try {
      if (editingExpense) {
        await updateExpense(user.uid, editingExpense.id, { name: form.name.trim(), amount });
      } else {
        await addExpense(user.uid, { name: form.name.trim(), amount, done: false });
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save expense');
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (expense: Expense) => {
    if (!user) return;
    await updateExpense(user.uid, expense.id, { done: !expense.done });
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert('Delete Expense', `Delete "${expense.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => user && deleteExpense(user.uid, expense.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryAmount, { color: Colors.danger }]}>
            {formatPLN(totalPending)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Done</Text>
          <Text style={[styles.summaryAmount, { color: Colors.success }]}>
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
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyText}>No expenses</Text>
          <Text style={styles.emptySubText}>Tap + to add an expense</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, item.done && styles.cardDone]}>
              {/* Done toggle */}
              <TouchableOpacity onPress={() => toggleDone(item)} style={styles.checkbox}>
                {item.done ? (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color={Colors.border} />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cardMain} onPress={() => openEdit(item)}>
                <Text style={[styles.cardName, item.done && styles.cardNameDone]}>
                  {item.name}
                </Text>
                <Text style={[styles.cardAmount, item.done && styles.cardAmountDone]}>
                  {formatPLN(item.amount)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingExpense ? 'Edit Expense' : 'New Expense'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.modalSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. Rent"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Amount (PLN)</Text>
              <TextInput
                style={styles.input}
                value={form.amount}
                onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={styles.hint}>
                Mark as "done" to exclude from available balance calculation.
              </Text>
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
  addBtn: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
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
  list: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardDone: { opacity: 0.6 },
  checkbox: { marginRight: Spacing.sm },
  cardMain: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  cardNameDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  cardAmount: { fontSize: 15, fontWeight: '600', color: Colors.danger },
  cardAmountDone: { color: Colors.textSecondary },
  deleteBtn: { padding: Spacing.sm },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary },
  emptySubText: { fontSize: 14, color: Colors.textSecondary },
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
  modalCancel: { fontSize: 16, color: Colors.textSecondary },
  modalSave: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  modalBody: { padding: Spacing.md },
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
});
