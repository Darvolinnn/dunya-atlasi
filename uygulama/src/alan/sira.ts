// Sıra anahtarları: iki komşunun arasına başka hiçbir şeyi kaydırmadan yeni bir yer açar. Böylece bir
// sahnenin yerini değiştirmek tek bir işlemdir ve iki cihaz aynı anda farklı sahneleri taşıyınca ikisi de
// korunur. Aynı anahtarı alan iki öğe kodlarına göre sıralanır.
const ALFABE = '0123456789abcdefghijklmnopqrstuvwxyz';
const TABAN = ALFABE.length;
const deger = (c: string) => { const i = ALFABE.indexOf(c); if (i < 0) throw new Error('Geçersiz sıra anahtarı.'); return i; };

export const siraGecerli = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-z]{1,200}$/.test(s) && !s.endsWith('0');

/** a ile b arasına düşen anahtar (a < b). null: baştan ya da sondan sınırsız. */
export function araKonum(a: string | null, b: string | null): string {
  const alt = a ?? '';
  let ust = b;
  if (ust !== null && alt >= ust) throw new Error('Sıra anahtarları ters.');
  let sonuc = '';
  for (let i = 0; ; i++) {
    const da = i < alt.length ? deger(alt[i]) : 0;
    const db = ust !== null ? (i < ust.length ? deger(ust[i]) : 0) : TABAN;
    if (db - da > 1) return sonuc + ALFABE[Math.floor((da + db) / 2)];
    sonuc += ALFABE[da];
    // Üst sınırdan bir küçük basamak alındı: bundan sonrası üst sınırdan zaten küçük.
    if (db - da === 1) ust = null;
  }
}
