import { useState, useEffect } from 'react';
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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useAssets } from '../../hooks/useAssets';
import { useSettings } from '../../hooks/useSettings';
import { addAsset, updateAsset, deleteAsset } from '../../lib/firestore';
import { getCurrencies } from '../../lib/frankfurter';
import type { Asset } from '../../lib/types';
import { Colors, Spacing, Radius } from '../../constants/theme';

type FormData = { name: string; amount: string; currency: string };
const EMPTY_FORM: FormData = { name: '', amount: '', currency: 'PLN' };

export default function AssetsScreen() {
  const { user } = useAuth();
  const { assets, loading } = useAssets(user?.uid);
  const { settings } = useSettings(user?.uid);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [currencies, setCurrencies] = useState<string[]>(['PLN', 'EUR', 'CHF', 'USD', 'GBP']);
  const [currencySearch, setCurrencySearch] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrencies().then((c) => setCurrencies(Object.keys(c))).catch(() => {});
  }, []);

  const openAdd = () => {
    setEditingAsset(null);
    setForm({ ...EMPTY_FORM, currency: settings.defaultCurrency });
    setModalVisible(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({ name: asset.name, amount: String(asset.amount), currency: asset.currency });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required');
    const amount = parseFloat(form.amount.replace(',', '.'));
    if (isNaN(amount) || amount < 0) return Alert.alert('Validation', 'Enter a valid amount');

    setSaving(true);
    try {
      if (editingAsset) {
        await updateAsset(user.uid, editingAsset.id, { name: form.name.trim(), amount, currency: form.currency });
      } else {
        await addAsset(user.uid, { name: form.name.trim(), amount, currency: form.currency });
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (asset: Asset) => {
    Alert.alert('Delete Asset', `Delete "${asset.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => user && deleteAsset(user.uid, asset.id),
      },
    ]);
  };

  const filteredCurrencies = currencies.filter((c) =>
    c.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Assets</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : assets.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyText}>No assets yet</Text>
          <Text style={styles.emptySubText}>Tap + to add your first asset</Text>
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity style={styles.cardMain} onPress={() => openEdit(item)}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>{item.currency}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardAmount}>
                    {item.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {item.currency}
                  </Text>
                </View>
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
              <Text style={styles.modalTitle}>{editingAsset ? 'Edit Asset' : 'New Asset'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.modalSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. Savings account"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                value={form.amount}
                onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Currency</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerBtn]}
                onPress={() => { setShowCurrencyPicker(true); setCurrencySearch(''); }}
              >
                <Text style={styles.pickerValue}>{form.currency}</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Currency picker modal */}
      <Modal visible={showCurrencyPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={{ width: 60 }} />
            <Text style={styles.modalTitle}>Select Currency</Text>
            <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
              <Text style={styles.modalSave}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { margin: Spacing.md }]}
            value={currencySearch}
            onChangeText={setCurrencySearch}
            placeholder="Search..."
            placeholderTextColor={Colors.textSecondary}
          />
          <FlatList
            data={filteredCurrencies}
            keyExtractor={(c) => c}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.currencyRow}
                onPress={() => {
                  setForm((f) => ({ ...f, currency: item }));
                  setShowCurrencyPicker(false);
                }}
              >
                <Text style={styles.currencyRowText}>{item}</Text>
                {form.currency === item && (
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
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  currencyBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 48,
    alignItems: 'center',
  },
  currencyBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  cardAmount: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
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
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerValue: { fontSize: 16, color: Colors.text },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  currencyRowText: { fontSize: 16, color: Colors.text },
});
