import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ModulePermissionGuard } from '@/components/core/ModulePermissionGuard';
import { ObservationForm } from '@/components/phase4/ObservationScreens';
export default function Screen() { const { id } = useLocalSearchParams<{ id?: string }>(); return <ModulePermissionGuard module="mod_bkm_rawat" action={id ? 'update' : 'write'}><ObservationForm /></ModulePermissionGuard>; }
