// Büyük harita görsellerinin döşemeyle gösterimi (§8.1, K38): görsel 512 piksellik parçalara bölünür; her yakınlıkta
// yeterince keskin olan en küçük seviye seçilir ve yalnız ekranda görünen parçalar çözülür. Hesaplar saf; çizim
// `DosemeliGorsel.tsx`'te, parçaların üretimi `doseme-calisani.ts`'te.

/** Bu boyu aşan görsel döşenir; altındakiler tek parça gösterilir. */
export const DOSEME_SINIRI = 4096;
export const DOSEME = 512;

export interface Doseme { anahtar: string; seviye: number; sx: number; sy: number; sg: number; sy2: number; g: number; y: number; sol: number; ust: number; gen: number; yuk: number }

export const doselenir = (en: number, boy: number) => Math.max(en, boy) > DOSEME_SINIRI;

/** En kaba seviye: görselin tamamı tek parçaya sığar. */
export const enKabaSeviye = (en: number, boy: number) => Math.max(0, Math.ceil(Math.log2(Math.max(en, boy) / DOSEME)));

/**
 * Ekran pikseli başına görsel pikseli `olcek` (CSS pikseli / görsel pikseli) ve ekran yoğunluğu `dpr` iken seçilecek
 * seviye: seviye k, görseli 2^k kat küçültür. Seçilen seviye ekrandakinden daha kaba olmaz.
 */
export function dosemeSeviyesi(olcek: number, dpr: number, en: number, boy: number): number {
  const gereken = Math.max(1e-6, olcek * Math.max(1, dpr));
  const k = Math.floor(Math.log2(1 / gereken));
  return Math.max(0, Math.min(enKabaSeviye(en, boy), k));
}

/** Bir seviyenin parçaları: kaynak dikdörtgen görsel pikseliyle, yer ve boy katmanın yüzdesiyle. */
export function seviyeDosemeleri(en: number, boy: number, seviye: number): Doseme[] {
  const b = 2 ** seviye;
  const ken = Math.ceil(en / b), kboy = Math.ceil(boy / b);
  const l: Doseme[] = [];
  for (let j = 0; j * DOSEME < kboy; j++) for (let i = 0; i * DOSEME < ken; i++) {
    const g = Math.min(DOSEME, ken - i * DOSEME), y = Math.min(DOSEME, kboy - j * DOSEME);
    const sx = i * DOSEME * b, sy = j * DOSEME * b;
    const sg = Math.min(en - sx, g * b), sy2 = Math.min(boy - sy, y * b);
    l.push({ anahtar: `${seviye}:${i}:${j}`, seviye, sx, sy, sg, sy2, g, y,
      sol: (sx / en) * 100, ust: (sy / boy) * 100, gen: (sg / en) * 100, yuk: (sy2 / boy) * 100 });
  }
  return l;
}
