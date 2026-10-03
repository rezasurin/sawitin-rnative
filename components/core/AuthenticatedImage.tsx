import React, { useEffect, useState } from 'react';
import { Image, Text, View, type ImageStyle } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '@/services/api';

/** Stored /media paths require the same bearer token as API requests. */
export function AuthenticatedImage({ uri, style }: { uri: string; style: ImageStyle }) {
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    void SecureStore.getItemAsync(TOKEN_KEY).then((value) => { if (active) setToken(value); });
    return () => { active = false; };
  }, [uri]);
  if (uri.startsWith('file://')) return <Image source={{ uri }} style={style} />;
  if (!token) return <Text>Foto membutuhkan sesi aktif.</Text>;
  if (failed) return <View><Text>Foto tidak tersedia. Periksa sesi atau arsip bukti.</Text></View>;
  return <Image source={{ uri, headers: { Authorization: token } }} style={style}
    onError={() => setFailed(true)} />;
}
