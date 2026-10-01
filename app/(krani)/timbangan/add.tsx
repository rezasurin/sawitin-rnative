import { useLocalSearchParams } from 'expo-router';
import TimbanganScreen from '@/components/krani/TimbanganScreen';
import TimbanganSpbScreen from '@/components/krani/TimbanganSpbScreen';
import { WeighbridgeGate } from '@/components/krani/WeighbridgeGate';

/** `nomorSpb` is the SPB-number weighing; `checkerId` + `qrPayload` is the legacy V3 QR one. */
export default function AddWeighing() {
  const { nomorSpb } = useLocalSearchParams<{ nomorSpb?: string }>();
  return <WeighbridgeGate>{nomorSpb ? <TimbanganSpbScreen nomorSpb={nomorSpb} /> : <TimbanganScreen />}</WeighbridgeGate>;
}
