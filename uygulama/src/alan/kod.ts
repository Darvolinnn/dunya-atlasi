// Değişmeyen kodlar (§2.1, §18.1 "Kod ve kimlik"): cihazlar arası eşgüdüm gerektirmeden üretilir.
// Biçim: 10 karakter zaman + 16 karakter rastgele (Crockford base32), zamana göre sıralanabilir.

const ALFABE = '0123456789abcdefghjkmnpqrstvwxyz';

export function yeniKod(simdi = Date.now()): string {
  let zaman = '';
  let t = simdi;
  for (let i = 0; i < 10; i++) { zaman = ALFABE[t % 32] + zaman; t = Math.floor(t / 32); }
  const rastgele = new Uint8Array(16);
  crypto.getRandomValues(rastgele);
  let son = '';
  for (const b of rastgele) son += ALFABE[b % 32];
  return zaman + son;
}

export function kodGecerliMi(kod: unknown): kod is string {
  return typeof kod === 'string' && /^[0-9a-hjkmnp-tv-z]{26}$/.test(kod);
}
