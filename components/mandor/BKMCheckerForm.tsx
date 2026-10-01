import { usePreventRemove } from 'expo-router/react-navigation';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Stepper } from '../core/Stepper';
import { BrandColors } from '@/constants/Colors';
import { BKMCheckerFormStep1 } from './BKMCheckerFormStep1';
import { BKMCheckerFormStep2 } from './BKMCheckerFormStep2';
import { BKMCheckerFormStep3 } from './BKMCheckerFormStep3';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';

const STEPS = [
  { label: 'SPB', value: 1, icon: 'file-text-o' as const },
  { label: 'Muatan TPH', value: 2, icon: 'truck' as const },
  { label: 'Review', value: 3, icon: 'check-square-o' as const },
];

interface Props {
  onSuccess: () => void;
}

export function BKMCheckerForm({ onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const { header, details, reset } = useBkmCheckerStore();
  const navigation = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [leaveAction, setLeaveAction] = useState<Parameters<typeof navigation.dispatch>[0] | null>(null);
  // The day is pre-filled, so it alone is not unsaved work.
  const { tanggal: _prefilled, ...typed } = header;
  const isDirty = Object.values(typed).some(Boolean) || details.length > 0;
  usePreventRemove((isDirty || isSaving) && !saved && !leaveAction, ({ data }) => {
    if (isSaving) {
      Alert.alert("Sedang Menyimpan", "Tunggu sampai penyimpanan selesai.");
      return;
    }
    Alert.alert('Batal Mengisi Form?', 'Perubahan yang belum disimpan akan hilang.', [
      { text: 'Lanjutkan', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => setLeaveAction(data.action) },
    ]);
  });
  useEffect(() => {
    if (leaveAction) navigation.dispatch(leaveAction);
    else if (saved) onSuccess();
  }, [leaveAction, saved, navigation, onSuccess]);

  const handleSuccess = useCallback(() => {
    setStep(1);
    reset();
    setSaved(true);
  }, [reset, onSuccess]);

  useEffect(() => {
    return () => {
      setStep(1);
      reset();
    };
  }, [reset]);

  return (
    <View style={styles.container}>
      <View style={styles.stepperContainer}>
        <Stepper activeStep={step} items={STEPS} showLabel />
      </View>

      <KeyboardAvoidingView
        style={styles.stepContent}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {step === 1 && (
          <BKMCheckerFormStep1 onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <BKMCheckerFormStep2
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <BKMCheckerFormStep3
            onBack={() => setStep(2)}
            onSuccess={handleSuccess}
            onSavingChange={setIsSaving}
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
