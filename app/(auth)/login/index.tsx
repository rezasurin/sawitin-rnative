import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { AuthInput, AuthButton } from '@/components/auth';
import { BrandColors } from '@/constants/Colors';
import { useAuthStore } from '@/stores/useAuthStore';
import { ApiError } from '@/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = 'Username wajib diisi';
    }

    if (!password) {
      newErrors.password = 'Kata sandi wajib diisi';
    } 

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await login(username, password);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          Alert.alert('Login Gagal', 'Username atau kata sandi salah');
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    // TODO: Implement when backend is ready
    Alert.alert('Info', 'Fitur lupa kata sandi akan segera hadir');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.title}>Masuk</Text>

          {/* Form */}
          <View style={styles.form}>
            <AuthInput
              label="Email atau Username"
              placeholder="Masukkan email atau username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
              }}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.username}
            />

            <AuthInput
              label="Kata sandi"
              placeholder="Masukkan kata sandi"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              secureTextEntry={!showPassword}
              showPasswordToggle
              isPasswordVisible={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              error={errors.password}
            />

            {/* Forgot Password Link */}
            <View style={styles.forgotPasswordContainer}>
              <AuthButton
                title="Lupa kata sandi ?"
                onPress={handleForgotPassword}
                variant="text"
                style={styles.forgotPasswordButton}
                textStyle={styles.forgotPasswordText}
              />
            </View>

            {/* Login Button */}
            <AuthButton
              title="Masuk"
              onPress={handleLogin}
              loading={isSubmitting}
              disabled={isLoading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: BrandColors.primary,
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordButton: {
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: BrandColors.primary,
    fontSize: 13,
  },
});
