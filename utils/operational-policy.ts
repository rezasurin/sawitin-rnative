import type { DocumentStatus } from '@/types/common';

export type OperationalModule = 'bkmPanen' | 'bkmChecker' | 'bkmRawat' | 'kraniTimbang';
export const modulePermission: Record<OperationalModule, string> = {
  bkmPanen: 'mod_bkm_panen', bkmChecker: 'mod_bkm_checker',
  bkmRawat: 'mod_bkm_rawat', kraniTimbang: 'mod_krani_timbang',
};
/** Modules whose server refuses approval by the document's own author. */
export const makerCheckerModules: readonly OperationalModule[] = ['bkmChecker', 'bkmRawat'];
export type OperationalAction = 'create' | 'edit' | 'addDetail' | 'deleteDetail' | 'submit' | 'reopen' | 'cancel' | 'approve' | 'reject' | 'delete' | 'history';
export type WorkflowPermissions = Partial<Record<'read' | 'write' | 'update' | 'delete' | 'approve', boolean>>;

export function operationalPolicy(status: DocumentStatus | undefined, permissions: WorkflowPermissions, online: boolean, detailCount = 0, ownDocument = false): Record<OperationalAction, boolean> {
  const draft = status === 'DRAFT';
  const submitted = status === 'SUBMITTED';
  return {
    create: !!permissions.write,
    edit: draft && !!permissions.update,
    addDetail: draft && !!permissions.write,
    deleteDetail: draft && !!permissions.delete,
    submit: draft && !!permissions.update && detailCount > 0,
    reopen: (status === 'REVISION_REQUESTED' || submitted) && !!permissions.update,
    cancel: submitted && !!permissions.update && online,
    approve: submitted && !!permissions.approve && online && !ownDocument,
    reject: submitted && !!permissions.approve && online,
    delete: draft && !!permissions.delete,
    history: !!permissions.read && online,
  };
}
