import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { getCurrencies } from '../../lib/frankfurter';
import { Colors, Spacing, Radius } from '../../constants/theme';

export default function SettingsScreen() {
  const { user } = useAuth();
  const { settings, loading, updateSettings } = useSettings(user?.uid);
  const [currencies, setCurrencies] = useState<string[]>(['PLN', 'EUR', 'CHF', 'USD', 'GBP']);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrencies().then((c) => setCurrencies(Object.keys(c))).catch(() => {});
  }, []);

  const handleCurrencySelect = async (currency: string) => {
    setSaving(true);
    await updateSettings({ defaultCurrency: currency });
    setSaving(false);
    setShowPicker(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const filtered = currencies.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Text style={styles.title}>Settings</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : (
        <View style={styles.content}>
          {/* Account section */}
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Signed in as</Text>
                <Text style={styles.rowValue}>{user?.email || user?.displayName || 'Anonymous'}</Text>
              </View>
            </View>
          </View>

          {/* Preferences section */}
          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => { setShowPicker(true); setSearch(''); }}
            >
              <Ionicons name="cash-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Default Currency</Text>
                <Text style={styles.rowValue}>{settings.defaultCurrency}</Text>
              </View>
              {saving ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Currency picker modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={{ width: 60 }} />
            <Text style={styles.modalTitle}>Default Currency</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.searchInput]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search currency..."
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
