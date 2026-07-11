import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Stepper } from '../core/Stepper';
import { BrandColors } from '@/constants/Colors';
import { BKMCheckerFormStep1 } from './BKMCheckerFormStep1';
import { BKMCheckerFormStep2 } from './BKMCheckerFormStep2';
import { BKMCheckerFormStep3 } from './BKMCheckerFormStep3';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';

const STEPS = [
  { label: 'Dokumen', value: 1, icon: 'file-text-o' as const },
  { label: 'Truk & Grading', value: 2, icon: 'truck' as const },
  { label: 'Review', value: 3, icon: 'check-square-o' as const },
];

interface Props {
  onSuccess: () => void;
}

export function BKMCheckerForm({ onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const reset = useBkmCheckerStore((s) => s.reset);

  const handleSuccess = useCallback(() => {
    reset();
    onSuccess();
  }, [reset, onSuccess]);

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
