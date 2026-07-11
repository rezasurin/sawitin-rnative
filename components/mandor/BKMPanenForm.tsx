import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Stepper } from '../core/Stepper';
import { BrandColors } from '@/constants/Colors';
import { BKMPanenFormStep1 } from './BKMPanenFormStep1';
import { BKMPanenFormStep2 } from './BKMPanenFormStep2';
import { BKMPanenFormStep3 } from './BKMPanenFormStep3';
import { BKMPanenFormStep4 } from './BKMPanenFormStep4';
import { useBkmPanenStore } from '@/stores/useBkmPanenStore';
import { useNavigation } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { bkmPanenKeys } from '@/services/queryKeys';

const STEPS = [
  { label: 'Detail Dokumen', value: 1, icon: 'file-text-o' as const },
  { label: 'Pilih Pekerja & TPH', value: 2, icon: 'user' as const },
  { label: 'Grading Janjang', value: 3, icon: 'money' as const },
  { label: 'Review & Konfirmasi', value: 4, icon: 'check-square-o' as const },
];

interface Props {
  onSuccess: () => void;
}

export function BKMPanenForm({ onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const { header, details, reset } = useBkmPanenStore();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const isSaving = useRef(false);

  const isDirty =
    !!header.blok_id ||
    !!header.lahan_id ||
    !!header.keterangan ||
    details.length > 0;

  const handleSuccess = useCallback(() => {
    isSaving.current = true;
    reset();
    onSuccess();
  }, [reset, onSuccess]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isSaving.current || !isDirty) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Batal Mengisi Form?',
        'Perubahan yang belum disimpan akan hilang.',
        [
          { text: 'Lanjutkan', style: 'cancel', onPress: () => {} },
          {
            text: 'Keluar',
            style: 'destructive',
            onPress: () => {
              reset();
              if (isOnline) {
                queryClient.invalidateQueries({ queryKey: bkmPanenKeys.lists() });
              }
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isDirty, reset, isOnline, queryClient]);

  return (
    <View style={styles.container}>
      <View style={styles.stepperContainer}>
        <Stepper
          activeStep={step}
          items={STEPS}
          showLabel
        />
      </View>

      <KeyboardAvoidingView
        style={styles.stepContent}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {step === 1 && (
          <BKMPanenFormStep1 onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <BKMPanenFormStep2
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <BKMPanenFormStep3
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <BKMPanenFormStep4
            onBack={() => setStep(3)}
            onSuccess={handleSuccess}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  stepperContainer: {
    paddingVertical: 16,
    backgroundColor: BrandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.inputBorder,
  },
  stepContent: {
    flex: 1,
  },
});
