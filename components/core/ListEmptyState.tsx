import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/Colors';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ListEmptyStateProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  emptyIcon?: React.ComponentProps<typeof Ionicons>['name'];
  emptyText?: string;
  emptySubtext?: string;
  errorText?: string;
  errorIcon?: React.ComponentProps<typeof Ionicons>['name'];
}

export function ListEmptyState({
  isLoading = false,
  isError = false,
  isEmpty = false,
  onRetry,
  emptyIcon = 'document-text-outline',
  emptyText = 'Belum ada data',
  emptySubtext,
  errorText = 'Gagal memuat data',
  errorIcon = 'alert-circle-outline',
}: ListEmptyStateProps) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Ionicons name={errorIcon} size={40} color={BrandColors.error} />
        <Text style={styles.errorText}>{errorText}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.centered}>
        <Ionicons name={emptyIcon} size={48} color={BrandColors.textMuted} />
        <Text style={styles.emptyText}>{emptyText}</Text>
        {emptySubtext ? <Text style={styles.emptySubtext}>{emptySubtext}</Text> : null}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: BrandColors.textMuted,
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    color: BrandColors.textMuted,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  errorText: {
    color: BrandColors.error,
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  retryText: {
    color: BrandColors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
