import { useState, useEffect } from 'react';
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
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useAssets } from '../../hooks/useAssets';
import { useSettings } from '../../hooks/useSettings';
import { addAsset, updateAsset, deleteAsset } from '../../lib/firestore';
import { getCurrencies } from '../../lib/frankfurter';
import { useT } from '../../lib/i18n';
import type { Asset } from '../../lib/types';
import { Colors, Spacing, Radius } from '../../constants/theme';

type FormData = { name: string; amount: string; currency: string };
const EMPTY_FORM: FormData = { name: '', amount: '', currency: 'PLN' };

const COL_CURRENCY = 48;
const COL_NAME = 1;
const COL_AMOUNT = 110;
const COL_DELETE = 36;

export default function AssetsScreen() {
  const { user } = useAuth();
  const { assets, loading } = useAssets(user?.uid);
  const { settings } = useSettings(user?.uid);
  const t = useT(settings.language);

  const [infoVisible, setInfoVisible] = useState(false);
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
    if (!form.name.trim()) return Alert.alert('Validation', t.nameRequired);
    const amount = parseFloat(form.amount.replace(',', '.'));
    if (isNaN(amount) || amount < 0) return Alert.alert('Validation', t.invalidAmount);

    setSaving(true);
    try {
      if (editingAsset) {
        await updateAsset(user.uid, editingAsset.id, { name: form.name.trim(), amount, currency: form.currency });
      } else {
        await addAsset(user.uid, { name: form.name.trim(), amount, currency: form.currency });
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Error', t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (asset: Asset) => {
    Alert.alert(t.deleteAssetTitle, t.deleteAssetMsg(asset.name), [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive',
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
        <Text style={styles.title}>{t.assets}</Text>
        <TouchableOpacity style={styles.infoBtn} onPress={() => setInfoVisible(true)}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : assets.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyText}>{t.noAssets}</Text>
          <Text style={styles.emptySubText}>{t.noAssetsHint}</Text>
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <View style={{ width: COL_CURRENCY }} />
            <Text style={[styles.thCell, { flex: COL_NAME }]}>{t.name}</Text>
            <Text style={[styles.thCell, styles.thRight, { width: COL_AMOUNT }]}>{t.amount}</Text>
            <View style={{ width: COL_DELETE }} />
          </View>

          <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
            {assets.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.tableRowAlt,
                ]}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.currencyBadge, { width: COL_CURRENCY - Spacing.xs }]}>
                  <Text style={styles.currencyBadgeText} numberOfLines={1}>{item.currency}</Text>
                </View>
                <Text style={[styles.tdName, { flex: COL_NAME }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.tdAmount, { width: COL_AMOUNT }]} numberOfLines={1}>
                  {item.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                </Text>
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
              <Text style={styles.addRowText}>{t.newAsset}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalIconBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingAsset ? t.editAsset : t.addAsset}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.modalIconBtn}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="checkmark" size={24} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>{t.name}</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder={t.namePlaceholderAsset}
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>{t.amount}</Text>
              <TextInput
                style={styles.input}
                value={form.amount}
                onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>{t.currency}</Text>
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

      {/* Info modal */}
      <Modal visible={infoVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setInfoVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={{ width: 36 }} />
            <Text style={styles.modalTitle}>{t.assets}</Text>
            <TouchableOpacity onPress={() => setInfoVisible(false)} style={styles.modalIconBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.infoText}>
              Wpisz tutaj wszystkie środki które obecnie posiadasz, a które są dostępne do spłaty ponoszonych wydatków. Inwestycje, których nie zamierzasz w tym celu używać nie muszą być tu dodane, będą tylko zaciemniać sytuację.
            </Text>
            <Text style={styles.infoExamplesTitle}>Przykłady</Text>
            <Text style={styles.infoExample}>• Stan konta codziennego</Text>
            <Text style={styles.infoExample}>• Konto walutowe</Text>
            <Text style={styles.infoExample}>• Konto z rezerwą gotówki</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Currency picker modal */}
      <Modal visible={showCurrencyPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCurrencyPicker(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={{ width: 60 }} />
            <Text style={styles.modalTitle}>{t.selectCurrency}</Text>
            <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
              <Text style={styles.modalDone}>{t.done}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { margin: Spacing.md }]}
            value={currencySearch}
            onChangeText={setCurrencySearch}
            placeholder={t.searchCurrency}
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
  infoBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

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
  currencyBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  currencyBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  tdName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    paddingRight: Spacing.xs,
  },
  tdAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    paddingRight: Spacing.xs,
  },
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
  modalDone: { fontSize: 16, fontWeight: '600', color: Colors.primary, minWidth: 60, textAlign: 'right' },
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
  infoText: { fontSize: 16, color: Colors.text, lineHeight: 24, marginBottom: Spacing.lg },
  infoExamplesTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  infoExample: { fontSize: 15, color: Colors.text, lineHeight: 26 },
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
