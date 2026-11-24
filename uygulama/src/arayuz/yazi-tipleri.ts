// PDF'e gömülen yazı tipleri (Literata). Derlemede programın dosyalarına konur; yalnız PDF istenince yüklenir,
// ağ gerekmez.
import duz from '@expo-google-fonts/literata/400Regular/Literata_400Regular.ttf?url';
import egik from '@expo-google-fonts/literata/400Regular_Italic/Literata_400Regular_Italic.ttf?url';
import kalin from '@expo-google-fonts/literata/700Bold/Literata_700Bold.ttf?url';
import kalinEgik from '@expo-google-fonts/literata/700Bold_Italic/Literata_700Bold_Italic.ttf?url';
import yDuz from '@expo-google-fonts/noto-serif/400Regular/NotoSerif_400Regular.ttf?url';
import yEgik from '@expo-google-fonts/noto-serif/400Regular_Italic/NotoSerif_400Regular_Italic.ttf?url';
import yKalin from '@expo-google-fonts/noto-serif/700Bold/NotoSerif_700Bold.ttf?url';
import yKalinEgik from '@expo-google-fonts/noto-serif/700Bold_Italic/NotoSerif_700Bold_Italic.ttf?url';
import type { YaziTipleri } from '../alan/pdf';

const al = async (u: string) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error('PDF için yazı tipi yüklenemedi.');
  return new Uint8Array(await r.arrayBuffer());
};

export async function kitapYaziTipleri(): Promise<YaziTipleri> {
  const [d, e, k, ke] = await Promise.all([duz, egik, kalin, kalinEgik].map(al));
  return { duz: d, egik: e, kalin: k, kalinEgik: ke };
}

/** Literata'da olmayan harfler (ses yazısı işaretleri, ※ gibi) için Noto Serif; yalnız gerekince yüklenir. */
export async function yedekYaziTipleri(): Promise<NonNullable<YaziTipleri['yedek']>> {
  const [d, e, k, ke] = await Promise.all([yDuz, yEgik, yKalin, yKalinEgik].map(al));
  return { duz: d, egik: e, kalin: k, kalinEgik: ke };
}
