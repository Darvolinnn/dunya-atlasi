// İleri araçların bir kez tanıtılması (§5.10, K28): bir araç kaydedilmiş veriye göre ilk kez anlamlı olduğunda
// Yaz dışında sayfanın üstünde tek satır bir kez görünür. Yeni evrende başlangıç İlk Kıvılcım'dadır (§5.11, K43).
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AracTanitimDayanaklari } from '../veri/api';
import { git } from './Uygulama';

const okuYerel = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yazYerel = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };

const tanitimAnahtari = 'dunya-atlasi:arac-tanitimlari';
interface Tanitim { kod: string; uygun: (d: AracTanitimDayanaklari) => boolean; metin: (d: AracTanitimDayanaklari) => string; yol: (d: AracTanitimDayanaklari) => string }
const TANITIMLAR: Tanitim[] = [
  { kod: 'orgu', uygun: (d) => (d.enCokSahne?.sayi ?? 0) >= 10, yol: (d) => `orgu/${d.enCokSahne!.eser}`,
    metin: (d) => `Eserinizde ${d.enCokSahne!.sayi} sahne oldu. Olay örgüsü masasında hepsini bir arada görebilirsiniz.` },
  { kod: 'ag', uygun: (d) => d.karakter >= 2, yol: () => 'ag', metin: () => 'İkinci karakteriniz oldu. Ağ, karakterlerin arasındaki ilişkileri bir arada gösterir.' },
  { kod: 'cizelge', uygun: (d) => d.tarihli, yol: () => 'cizelge', metin: () => 'İlk tarihli sahneniz ya da olayınız oldu. Zaman çizelgesi olayları sırasıyla gösterir.' },
  { kod: 'haritalar', uygun: (d) => d.mekan >= 1, yol: () => 'haritalar', metin: () => 'İlk mekânınız oldu. Haritalarda mekânlarınızı bir görselin üstünde işaretleyebilirsiniz.' },
  { kod: 'seri', uygun: (d) => d.eser >= 2, yol: () => 'yaz', metin: () => 'İkinci eseriniz oldu. Eserleri bir seride toplarsanız serinin büyük sorusunu ve okuma sırasını tutabilirsiniz.' },
];
const gorulenTanitimlar = (): string[] => { try { return JSON.parse(okuYerel(tanitimAnahtari) ?? '[]'); } catch { return []; } };

/** Aynı anda en çok bir tanıtım; gösterilen ya da kapatılan bu cihazda bir daha çıkmaz. */
export function AracTanitimi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const [d, setD] = useState<AracTanitimDayanaklari | null>(null);
  const [gorulen, setGorulen] = useState(gorulenTanitimlar);
  const [n, setN] = useState(0);
  useEffect(() => istemci.dinle((x) => { if (x.evren === evren) setN((k) => k + 1); }), [evren]);
  useEffect(() => { if (TANITIMLAR.some((t) => !gorulen.includes(t.kod))) istemci.iste('aracTanitimlari', { evren }).then(setD, () => {}); }, [evren, n]);
  if (!d) return null;
  const t = TANITIMLAR.find((x) => !gorulen.includes(x.kod) && x.uygun(d));
  if (!t) return null;
  const kapat = () => { const l = [...gorulenTanitimlar(), t.kod]; yazYerel(tanitimAnahtari, JSON.stringify(l)); setGorulen(l); };
  return (
    <div class="siradaki-adim arac-tanitimi" role="status" aria-label="Yeni bir araç">
      <span>{t.metin(d)}</span>
      <span class="bosluk" />
      <button class="dugme ana kucuk" onClick={() => { kapat(); git(`/e/${evren}/${t.yol(d)}`); }}>Göster</button>
      <button class="dugme sade kucuk" onClick={kapat}>Bir daha gösterme</button>
    </div>
  );
}
