import { useApproveBkmPanen, useDeleteBkmPanen, useRejectBkmPanen, useUpdateBkmPanen } from "@/hooks/useBkmPanen";
import { useAuthStore } from "@/stores/useAuthStore";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useNetworkStore } from "@/stores/useNetworkStore";
import { useSyncQueueStore } from "@/stores/useSyncQueueStore";
import { useState } from "react";

export function useBkmPanenActions(id: string | undefined) {
  const router = useRouter();
  const { hasPermission } = useAuthStore();
  const approveMutation = useApproveBkmPanen();
  const rejectMutation = useRejectBkmPanen();
  const deleteMutation = useDeleteBkmPanen();
  const updateMutation = useUpdateBkmPanen();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const addToQueue = useSyncQueueStore((s) => s.addToQueue);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [revokeModalVisible, setRevokeModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const handleApprove = async () => {
    if (!id) return;
    setApproveModalVisible(false);
    try {
      await approveMutation.mutateAsync(id);
      router.back();
    } catch {
      Alert.alert("Gagal", "Tidak dapat menyetujui dokumen");
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await rejectMutation.mutateAsync({ id, note: rejectReason });
      setRejectModalVisible(false);
      setRejectReason("");
      router.back();
    } catch {
      Alert.alert("Gagal", "Tidak dapat menolak dokumen");
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert("Hapus BKM Panen?", "Data akan dihapus permanen.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          if (!isOnline) {
            addToQueue({
              module: "bkm_panen",
              action: "DELETE",
              endpoint: `/bkmPanen/${id}`,
              payload: { id },
            });
            Alert.alert("Antrian Offline", "Dokumen akan dihapus saat terhubung ke internet.");
            router.back();
            return;
          }
          deleteMutation.mutate(id, {
            onSuccess: () => router.back(),
            onError: () => Alert.alert("Gagal", "Tidak dapat menghapus dokumen"),
          });
        },
      },
    ]);
  };

  const handleRevoke = async () => {
    if (!id) return;
    setRevokeModalVisible(false);
    if (!isOnline) {
      addToQueue({
        module: "bkm_panen",
        action: "UPDATE",
        endpoint: `/bkmPanen/${id}`,
        payload: { id, data: { status: "DRAFT" } },
      });
      Alert.alert("Antrian Offline", "Status dokumen akan ditarik kembali saat terhubung ke internet.");
      router.back();
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, data: { status: "DRAFT" } });
      router.back();
    } catch {
      Alert.alert("Gagal", "Tidak dapat menarik kembali dokumen");
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setCancelModalVisible(false);
    if (!isOnline) {
      addToQueue({
        module: "bkm_panen",
        action: "UPDATE",
        endpoint: `/bkmPanen/${id}`,
        payload: { id, data: { status: "CANCELLED" } },
      });
      Alert.alert("Antrian Offline", "Dokumen akan dibatalkan saat terhubung ke internet.");
      router.back();
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, data: { status: "CANCELLED" } });
      router.back();
    } catch {
      Alert.alert("Gagal", "Tidak dapat membatalkan dokumen");
    }
  };

  const handleSubmit = () => {
    if (!id) return;
    Alert.alert("Submit BKM Panen?", "Dokumen akan dikirim untuk disetujui.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Submit",
        onPress: async () => {
          if (!isOnline) {
            addToQueue({
              module: "bkm_panen",
              action: "UPDATE",
              endpoint: `/bkmPanen/${id}`,
              payload: { id, data: { status: "SUBMITTED" } },
            });
            Alert.alert("Antrian Offline", "Dokumen akan disubmit saat terhubung ke internet.");
            router.back();
            return;
          }
          try {
            await updateMutation.mutateAsync({ id, data: { status: "SUBMITTED" } });
            router.back();
          } catch {
            Alert.alert("Gagal", "Tidak dapat mengirim dokumen");
          }
        },
      },
    ]);
  };

  return {
    canApprove: hasPermission("mod_bkm_panen", "approve"),
    handleApprove,
    handleReject,
    handleDelete,
    handleRevoke,
    handleCancel,
    handleSubmit,
    rejectModalVisible,
    setRejectModalVisible,
    rejectReason,
    setRejectReason,
    approveModalVisible,
    setApproveModalVisible,
    revokeModalVisible,
    setRevokeModalVisible,
    cancelModalVisible,
    setCancelModalVisible,
    approveMutation,
    rejectMutation,
    deleteMutation,
    updateMutation,
  };
}
