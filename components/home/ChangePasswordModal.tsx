import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/core/Button';
import { FormField } from '@/components/form';
import { BrandColors } from '@/constants/Colors';
import { authApi } from '@/services/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';

/**
 * Mirrors the backend `newPasswordSchema`; the server has the final say.
 * ASCII letters only here because Hermes regex support for `\p{L}` is not
 * something to bet a sign-in on.
 */
function passwordRuleError(password: string, oldPassword: string, username?: string) {
  if (password.length < 8) return 'Kata sandi minimal 8 karakter';
  if (new TextEncoder().encode(password).length > 72) return 'Kata sandi maksimal 72 byte';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Kata sandi harus berisi huruf dan angka';
  if (password === oldPassword) return 'Kata sandi baru harus berbeda dari kata sandi lama';
  if (username && password.toLowerCase() === username.toLowerCase()) return 'Kata sandi tidak boleh sama dengan username';
  return null;
}

/** Validation errors arrive as `[{ field, message }]`, everything else as a string. */
function serverMessage(error: unknown) {
  const body = (error as { data?: { error?: unknown } }).data?.error;
  if (Array.isArray(body)) return body.map((issue: { message: string }) => issue.message).join(', ');
  return typeof body === 'string' ? body : 'Gagal mengubah kata sandi. Coba lagi.';
}

const EMPTY = { oldPassword: '', newPassword: '', confirm: '' };

export function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const ruleError = passwordRuleError(form.newPassword, form.oldPassword, user?.username);
  const confirmError = form.confirm && form.confirm !== form.newPassword ? 'Konfirmasi kata sandi tidak cocok' : undefined;

  const close = () => {
    if (submitting) return;
    setForm(EMPTY);
    setTouched(false);
    onClose();
  };

  const submit = async () => {
    setTouched(true);
    if (!form.oldPassword || ruleError || form.confirm !== form.newPassword) return;
    if (!isOnline) {
      Alert.alert('Tidak ada sinyal', 'Hubungkan internet untuk mengubah kata sandi.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword(form.oldPassword, form.newPassword);
    } catch (error) {
      setSubmitting(false);
      Alert.alert('Gagal', serverMessage(error));
      return;
    }
    // The server already ended every session. Queued work stays on this phone
    // and is sent once this same account signs in again.
    Alert.alert('Kata sandi diubah', 'Silakan masuk kembali dengan kata sandi baru.');
    await logout();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Ubah kata sandi</Text>
          <Text style={styles.secondary}>
            Setelah diubah, akun ini keluar dari semua perangkat dan perlu masuk kembali.
          </Text>
          <FormField
            label="Kata sandi lama"
            value={form.oldPassword}
            onChangeText={(oldPassword) => setForm((prev) => ({ ...prev, oldPassword }))}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            error={touched && !form.oldPassword ? 'Isi kata sandi lama' : undefined}
          />
          <FormField
            label="Kata sandi baru"
            value={form.newPassword}
            onChangeText={(newPassword) => setForm((prev) => ({ ...prev, newPassword }))}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            error={touched && ruleError ? ruleError : undefined}
            containerStyle={touched && ruleError ? undefined : styles.tight}
          />
          {!(touched && ruleError) && <Text style={styles.hint}>Minimal 8 karakter, berisi huruf dan angka.</Text>}
          <FormField
            label="Ulangi kata sandi baru"
            value={form.confirm}
            onChangeText={(confirm) => setForm((prev) => ({ ...prev, confirm }))}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            error={confirmError}
          />
          <View style={styles.actions}>
            <Button title="Ubah kata sandi" onPress={() => void submit()} loading={submitting} />
            <Button title="Batal" variant="ghost" onPress={close} disabled={submitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  content: { padding: 20, paddingTop: 28 },
  title: { fontSize: 20, fontWeight: '700', color: BrandColors.textPrimary, marginBottom: 8 },
  secondary: { fontSize: 14, lineHeight: 21, color: BrandColors.textSecondary, marginBottom: 20 },
  tight: { marginBottom: 6 },
  hint: { fontSize: 12, color: BrandColors.textSecondary, marginBottom: 16 },
  actions: { gap: 10, marginTop: 8 },
});
