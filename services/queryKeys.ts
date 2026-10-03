import type { ApiListParams } from '@/types/common';

export const hargaTbsKeys = {
  all: ['hargaTbs'] as const,
  latest: () => [...hargaTbsKeys.all, 'latest'] as const,
};

export const bkmPanenKeys = {
  all: ['bkmPanen'] as const,
  lists: () => [...bkmPanenKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...bkmPanenKeys.lists(), filters ?? {}] as const,
  details: () => [...bkmPanenKeys.all, 'detail'] as const,
  detail: (id: string) => [...bkmPanenKeys.details(), id] as const,
};

export const materialKeys = {
  all: ['material'] as const,
  lists: () => [...materialKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...materialKeys.lists(), filters ?? {}] as const,
  details: () => [...materialKeys.all, 'detail'] as const,
  detail: (id: string) => [...materialKeys.details(), id] as const,
};

export const bkmCheckerKeys = {
  all: ['bkmChecker'] as const,
  lists: () => [...bkmCheckerKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...bkmCheckerKeys.lists(), filters ?? {}] as const,
  details: () => [...bkmCheckerKeys.all, 'detail'] as const,
  detail: (id: string) => [...bkmCheckerKeys.details(), id] as const,
};

export const lahanKeys = {
  all: ['lahan'] as const,
  lists: () => [...lahanKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...lahanKeys.lists(), filters ?? {}] as const,
  details: () => [...lahanKeys.all, 'detail'] as const,
  detail: (id: string) => [...lahanKeys.details(), id] as const,
};

export const blokKeys = {
  all: ['blok'] as const,
  lists: () => [...blokKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...blokKeys.lists(), filters ?? {}] as const,
  details: () => [...blokKeys.all, 'detail'] as const,
  detail: (id: string) => [...blokKeys.details(), id] as const,
};

export const tphKeys = {
  all: ['tph'] as const,
  lists: () => [...tphKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...tphKeys.lists(), filters ?? {}] as const,
  details: () => [...tphKeys.all, 'detail'] as const,
  detail: (id: string) => [...tphKeys.details(), id] as const,
};

export const pekerjaKeys = {
  all: ['pekerja'] as const,
  lists: () => [...pekerjaKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...pekerjaKeys.lists(), filters ?? {}] as const,
  details: () => [...pekerjaKeys.all, 'detail'] as const,
  detail: (id: string) => [...pekerjaKeys.details(), id] as const,
};

export const grupPekerjaKeys = {
  all: ['grupPekerja'] as const,
  lists: () => [...grupPekerjaKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...grupPekerjaKeys.lists(), filters ?? {}] as const,
  details: () => [...grupPekerjaKeys.all, 'detail'] as const,
  detail: (id: string) => [...grupPekerjaKeys.details(), id] as const,
};

export const tipePekerjaanKeys = {
  all: ['tipePekerjaan'] as const,
  lists: () => [...tipePekerjaanKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...tipePekerjaanKeys.lists(), filters ?? {}] as const,
  details: () => [...tipePekerjaanKeys.all, 'detail'] as const,
  detail: (id: string) => [...tipePekerjaanKeys.details(), id] as const,
};

export const kelompokLahanKeys = {
  all: ['kelompokLahan'] as const,
  lists: () => [...kelompokLahanKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...kelompokLahanKeys.lists(), filters ?? {}] as const,
  details: () => [...kelompokLahanKeys.all, 'detail'] as const,
  detail: (id: string) => [...kelompokLahanKeys.details(), id] as const,
};

export const tutupHarianKeys = {
  all: ['tutupHarian'] as const,
  preview: (kelompokLahanId: string, tanggal: string) => [...tutupHarianKeys.all, 'preview', kelompokLahanId, tanggal] as const,
  detail: (id: string) => [...tutupHarianKeys.all, 'detail', id] as const,
  pending: () => [...tutupHarianKeys.all, 'pending'] as const,
};
