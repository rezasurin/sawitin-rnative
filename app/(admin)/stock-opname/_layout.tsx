import React from 'react';
import { Stack } from 'expo-router';
import { ModulePermissionGuard } from '@/components/core/ModulePermissionGuard';
export default function Layout() { return <ModulePermissionGuard module="mod_material"><Stack screenOptions={{ headerShown: false }} /></ModulePermissionGuard>; }
