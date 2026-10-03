import { useModuleGroup } from '@/hooks/useModuleGroup';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useOrgSetting } from '@/hooks/useOrgConfig';
import { KraniTimbangHistory } from '@/components/krani/KraniTimbangHistory';

export default function TimbanganHistoryScreen() {
  const group = useModuleGroup('(krani)');
  const router = useRouter();
  const weighbridge = useOrgSetting('jembatan_timbang');
  const { checkerId, detailId } = useLocalSearchParams<{ checkerId?: string; detailId?: string }>();

  // Preserve links created before input and detail received their own routes.
  if (detailId) return <Redirect href={{ pathname: `/${group}/timbangan/[detailId]`, params: { detailId } }} />;
  if (checkerId) return <Redirect href={{ pathname: `/${group}/timbangan/add`, params: { checkerId } }} />;

  return <KraniTimbangHistory
    onCardPress={(id) => router.push({ pathname: `/${group}/timbangan/[detailId]`, params: { detailId: id } })}
    onScanPress={() => router.push(`/${group}/timbangan/scan`)}
    onTiketPress={() => router.push(`/${group}/timbangan/tiket-spb` as never)}
    weighbridge={weighbridge}
  />;
}
