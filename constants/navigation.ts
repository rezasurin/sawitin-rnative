import { BrandColors } from './Colors';

export const FLOATING_TAB_BAR_STYLE = {
  position: 'absolute' as const,
  bottom: 24,
  left: 20,
  right: 20,
  height: 64,
  marginHorizontal: 20,
  backgroundColor: BrandColors.white,
  borderRadius: 32,
  paddingBottom: 0,
  paddingTop: 0,
  borderTopWidth: 0,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 8,
};

export const TAB_BAR_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: '500' as const,
  marginTop: 2,
};

export const TAB_BAR_ITEM_STYLE = {
  paddingVertical: 4,
};

export type RoleRouteGroup = '(pemanen)' | '(mandor)' | '(krani)' | '(asisten)' | '(admin)';
