// "İlk adımlar" (K26, K27): yeni bir evrende başlamanın dört adımı; yol seçimi başlangıç noktasını değiştirir.
// Adımın yapıldığı kayıtlı veriden anlaşılır. "Geç" adımı yapılmış saymaz; liste her adım yapıldığında ya da ilgisiz
// sayıldığında, ya da "Gizle"ye basılınca görünmez. Yol, geçilen adımlar ve "Gizle" bu cihazda evren başına saklanır.
// Her adımın "Yap" düğmesi kullanıcıyı işin yapılacağı yere götürür; Yaz sayfası dışında sıradaki adım üstte tek
// satır olarak görünür.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AracTanitimDayanaklari, IlkAdimDayanaklari } from '../veri/api';
import { git } from './Uygulama';
import { yazarlikRehberiAc } from './YazarlikRehberi';
import { gitVeYap, PALET_OLAYI, YENI_SAHNE_OLAYI } from './yonlendirme';

const okuYerel = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yazYerel = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };
/** Liste ile üstteki satır aynı tercihleri okur; biri değiştirince öbürü yeniden okur. */
const DEGISTI = 'dunya-atlasi:ilk-adimlar-degisti';

type Yol = 'sahne' | 'fikir' | 'karakter' | 'dunya';
type Yapici = (evren: string, h: IlkAdimDayanaklari['hedefler']) => void;
interface Adim { kod: string; tamam: (d: IlkAdimDayanaklari) => boolean; metin: preact.ComponentChildren; kisa: string; yap: Yapici; soru?: string }

// "Yap" eylemleri: önce gerekli kayıt yoksa bir önceki adımın yerine gidilir.
const eserYap: Yapici = (ev) => void gitVeYap(`/e/${ev}/yaz`, [{ odak: 'input[placeholder="Yeni eserin adı"]' }]);
const sahneYap: Yapici = (ev, h) => h.eser
  ? void gitVeYap(`/e/${ev}/yaz/${h.eser}`, [{ bekle: `.eser-agaci a[href$="/yaz/${h.eser}"]`, olay: YENI_SAHNE_OLAYI, detay: h.eser }])
  : eserYap(ev, h);
const baglamYap: Yapici = (ev, h) => h.sahne
  ? void gitVeYap(`/e/${ev}/yaz/${h.sahne}`, [{ dugme: ['Bağlam ekle', 'Bağlamı göster'], yoksaGec: true }, { dugme: ['Bağlam'], yoksaGec: true }, { dugme: ['Düzenle'], yoksaGec: true }, { odak: '.yaz-baglami input' }])
  : sahneYap(ev, h);
const paletYap: Yapici = () => { dispatchEvent(new Event(PALET_OLAYI)); };
const notYap: Yapici = () => { document.dispatchEvent(new Event('hizli-not-ac')); };
const karakterdeYap = (soru: string): Yapici => (ev, h) => h.karakter
  ? void gitVeYap(`/e/${ev}/k/${h.karakter}`, [{ odak: `textarea[aria-label="${soru}"]` }]) : paletYap(ev, h);
const pusulaYap = (soru: string): Yapici => (ev) => void gitVeYap(`/e/${ev}/masa`, [{ odak: `textarea[aria-label="${soru}"]` }]);

const YOLLAR: { kod: Yol; ad: string; konu: number; adimlar: Adim[] }[] = [
  { kod: 'sahne', ad: 'Bir sahneyle', konu: 20, adimlar: [
    { kod: 'eser', tamam: (d) => d.eser, kisa: 'Bir eser oluşturun', yap: eserYap, metin: <>Bir eser oluşturun: aşağıya romanınızın ya da öykünüzün adını yazın.</> },
    { kod: 'sahne', tamam: (d) => d.sahne, kisa: 'İlk sahnenizi ekleyin', yap: sahneYap, metin: <>İlk sahnenizi ekleyin: soldaki listede eserin altındaki kutuya sahnenin adını yazın (“Başla” ya da “+ Sahne” açar) ve yazmaya başlayın.</> },
    { kod: 'baglanti', tamam: (d) => d.baglanti, kisa: 'Metinde bir adı [[ ile bağlayın', yap: (ev, h) => h.sahne ? void gitVeYap(`/e/${ev}/yaz/${h.sahne}`, [{ odak: '.ProseMirror[aria-label="Metin"]' }]) : sahneYap(ev, h),
      metin: <>Metinde bir karakterin ya da yerin adını <strong>[[</strong> ya da <strong>@</strong> ile başlayarak yazın; kaydı yoksa oluşturulur ve metne bağlanır.</> },
    { kod: 'baglam', tamam: (d) => d.baglam, kisa: 'Sahneye bir tarih ya da mekân verin', yap: baglamYap, metin: <>Sahneye bir tarih ya da mekân verin: başlıktaki “Bağlam ekle”ye basın. Bağlam paneli o andaki durumu göstermeye başlar.</> },
  ] },
  { kod: 'fikir', ad: 'Bir hikâye fikriyle', konu: 1, adimlar: [
    { kod: 'not', tamam: (d) => d.not, kisa: 'Fikrinizi not alın', yap: notYap, metin: <>Fikrinizi not alın: Alt+N ile hızlı notu açıp aklınızdakini tek cümleyle yazın. Ayrıntı şimdi gerekmiyor.</> },
    { kod: 'nottanEser', tamam: (d) => d.nottanEser, kisa: 'Nottan bir eser oluşturun', yap: (ev, h) => h.not ? void gitVeYap(`/e/${ev}/k/${h.not}`, [{ dugme: ['Kayda dönüştür'] }]) : notYap(ev, h),
      metin: <>Nottan bir eser oluşturun: notun sayfasındaki “Kayda dönüştür” ile türü “Eser” seçin; not yerinde kalır.</> },
    { kod: 'cekirdek', tamam: (d) => d.cekirdek, kisa: 'Kim, ne istiyor?', yap: (ev, h) => h.eser ? void gitVeYap(`/e/${ev}/k/${h.eser}`, [{ odak: 'textarea[aria-label="Kim, ne istiyor?"]' }]) : eserYap(ev, h),
      metin: <>Eserin “Hikâye çekirdeği” sorularından ilkini cevaplayın: kim, ne istiyor?</> },
    { kod: 'sahne', tamam: (d) => d.sahne, kisa: 'İlk sahneyi ekleyin', yap: sahneYap, metin: <>İlk sahneyi ekleyin ve yazmaya başlayın.</> },
  ] },
  { kod: 'karakter', ad: 'Bir karakterle', konu: 5, adimlar: [
    { kod: 'karakter', tamam: (d) => d.karakter, kisa: 'Bir karakter oluşturun', yap: paletYap, metin: <>Bir karakter oluşturun: “Kayıtlar” sayfasında ya da Ctrl+K ile adını yazarak.</> },
    { kod: 'istek', tamam: (d) => d.istek, kisa: 'Karakter en çok ne istiyor?', yap: karakterdeYap('En çok ne istiyor?'), metin: <>Karakterin “En çok ne istiyor?” sorusunu cevaplayın. Somut bir hedef olsun.</> },
    { kod: 'karsit', tamam: (d) => d.karsit, kisa: 'Karşıt gücü belirleyin',
      yap: (ev, h) => h.karakter ? void gitVeYap(`/e/${ev}/k/${h.karakter}`, [{ dugme: ['+ İlişki', 'İlişki ekle'] }]) : paletYap(ev, h),
      metin: <>Karşıt gücü belirleyin: karakteri bir rakibine ya da düşmanına ilişkiyle bağlayın, ya da “Karşıt karakter” sorularından ilkini cevaplayın.</> },
    { kod: 'karakterSahnede', tamam: (d) => d.karakterSahnede, kisa: 'Karakteri bir sahneye koyun',
      yap: (ev, h) => h.sahne ? void gitVeYap(`/e/${ev}/k/${h.sahne}`, [{ dugme: ['Katılımcı ekle'] }]) : sahneYap(ev, h),
      metin: <>Karakterin bulunduğu ilk sahneyi ekleyin ve onu sahnedekilere “Bulunuyor” olarak ekleyin.</> },
  ] },
  { kod: 'dunya', ad: 'Bir dünyayla', konu: 19, adimlar: [
    { kod: 'kural', tamam: (d) => d.kural, soru: 'pusula.4', kisa: 'Dünyanızın kuralını yazın', yap: pusulaYap('Hangi kural kırılırsa her şey değişir?'),
      metin: <>Dünyanızın kuralını yazın: Genel bakış sayfasındaki Dünya Pusulası’nda “Hangi kural kırılırsa her şey değişir?” ya da bir “Evren kuralı” kaydı.</> },
    { kod: 'guc', tamam: (d) => d.guc, soru: 'pusula.3', kisa: 'Güç kimde ve bedeli ne?', yap: pusulaYap('Güç kimde ve bedeli ne?'), metin: <>Güç kimde ve bedeli ne? Dünya Pusulası’nın üçüncü sorusu.</> },
    { kod: 'yer', tamam: (d) => d.yer, kisa: 'Bir yer oluşturun', yap: paletYap, metin: <>Bir yer oluşturun: bir mekân, şehir ya da ülke kaydı.</> },
    { kod: 'yerdeIs', tamam: (d) => d.yerdeIs, kisa: 'O yerde geçen bir sahne yazın', yap: baglamYap, metin: <>O yerde geçen bir sahne yazın ya da bir notta o yere [[ ile bağlanın.</> },
  ] },
];

/** Listenin ve üstteki satırın ortak durumu. */
function useIlkAdimlar(istemci: Istemci, evren: string) {
  const anahtar = `dunya-atlasi:ilk-adimlar-gizli:${evren}`;
  const yolAnahtari = `dunya-atlasi:ilk-adimlar-yol:${evren}`;
  const gecAnahtari = `dunya-atlasi:ilk-adimlar-gecilen:${evren}`;
  const oku = () => ({
    gizli: okuYerel(anahtar) === '1',
    yol: (YOLLAR.some((y) => y.kod === okuYerel(yolAnahtari)) ? okuYerel(yolAnahtari) : 'sahne') as Yol,
    gecilen: ((): string[] => { try { return JSON.parse(okuYerel(gecAnahtari) ?? '[]'); } catch { return []; } })(),
  });
  const [t, setT] = useState(oku);
  const [n, setN] = useState(0);
  const [d, setD] = useState<IlkAdimDayanaklari | null>(null);
  useEffect(() => { setT(oku()); const f = () => setT(oku()); addEventListener(DEGISTI, f); return () => removeEventListener(DEGISTI, f); }, [evren]);
  useEffect(() => istemci.dinle((x) => { if (x.evren === evren) setN((k) => k + 1); }), [evren]);
  useEffect(() => { if (!t.gizli) istemci.iste('ilkAdimlar', { evren }).then(setD, () => {}); }, [evren, n, t.gizli]);
  const yaz = (k: string, v: string) => { yazYerel(k, v); dispatchEvent(new Event(DEGISTI)); };
  if (t.gizli || !d) return null;
  const y = YOLLAR.find((x) => x.kod === t.yol)!;
  const durum = (a: Adim) => a.tamam(d) ? 'tamam' : a.soru && d.sorular[a.soru] === 'ilgisiz' ? 'ilgisiz'
    : t.gecilen.includes(`${t.yol}.${a.kod}`) || (a.soru && d.sorular[a.soru] === 'sonra') ? 'gecildi' : 'baslanmadi';
  const adimlar = y.adimlar.map((a) => ({ a, durum: durum(a) })).filter((x) => x.durum !== 'ilgisiz');
  if (adimlar.every((x) => x.durum === 'tamam')) return null;
  return {
    y, yol: t.yol, adimlar, d,
    yapilan: adimlar.filter((x) => x.durum === 'tamam').length,
    sira: adimlar.findIndex((x) => x.durum === 'baslanmadi'),
    yap: (a: Adim) => a.yap(evren, d.hedefler),
    gec: (a: Adim) => {
      if (a.soru) { istemci.iste('soruCevapla', { evren, kod: 'evren', soru: a.soru, durum: 'sonra' }).catch(() => {}); return; }
      yaz(gecAnahtari, JSON.stringify([...t.gecilen, `${t.yol}.${a.kod}`]));
    },
    gizle: () => yaz(anahtar, '1'),
    yolSec: (k: Yol) => yaz(yolAnahtari, k),
  };
}

export function IlkAdimlar({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const s = useIlkAdimlar(istemci, evren);
  if (!s) return null;
  return (
    <section class="kart ilk-adimlar" aria-label="İlk adımlar">
      <div class="satir">
        <strong>İlk adımlar</strong><span class="bosluk" />
        <span class="soluk kucuk">{s.yapilan} / {s.adimlar.length} tamam</span>
        <button class="dugme sade kucuk" onClick={s.gizle}>Gizle</button>
      </div>
      <fieldset class="ilk-adim-yollari">
        <legend class="soluk kucuk">Nasıl başlamak istersiniz?</legend>
        {YOLLAR.map((x) => (
          <label key={x.kod}><input type="radio" name={`ilk-adim-yolu-${evren}`} checked={s.yol === x.kod} onChange={() => s.yolSec(x.kod)} /> {x.ad}</label>
        ))}
      </fieldset>
      <ol>
        {s.adimlar.map(({ a, durum: dr }, i) => (
          <li key={a.kod} class={dr === 'tamam' ? 'tamam' : dr === 'gecildi' ? 'gecildi' : i === s.sira ? 'sirada' : 'soluk'}>
            {a.metin}{dr === 'tamam' && <span aria-label="tamam"> ✓</span>}
            {dr === 'gecildi' && <span class="soluk kucuk"> · Atlandı</span>}
            {dr !== 'tamam' && <> <button class={i === s.sira ? 'dugme ana kucuk' : 'dugme sade kucuk'} aria-label={`Başla: ${a.kisa}`} onClick={() => s.yap(a)}>Başla</button></>}
            {dr === 'baslanmadi' && <> <button class="dugme sade kucuk" onClick={() => s.gec(a)}>Şimdilik atla</button></>}
          </li>
        ))}
      </ol>
      <button class="dugme sade kucuk" onClick={() => yazarlikRehberiAc(s.y.konu)}>Bu adımlar neden?</button>
    </section>
  );
}

/** Yaz sayfasının dışında sıradaki adım: tek satır. */
export function SiradakiAdim({ istemci, evren, yazda = false }: { istemci: Istemci; evren: string; yazda?: boolean }) {
  const s = useIlkAdimlar(istemci, evren);
  if (!s || s.sira < 0) return yazda ? null : <AracTanitimi istemci={istemci} evren={evren} />;
  const a = s.adimlar[s.sira].a;
  return (
    <div class="siradaki-adim" role="status" aria-label="Sıradaki adım">
      <span class="soluk kucuk">İlk adımlar · {s.yapilan}/{s.adimlar.length}</span>
      <span>Sıradaki: <strong>{a.kisa}</strong></span>
      <button class="dugme ana kucuk" onClick={() => s.yap(a)}>Başla</button>
      <button class="dugme sade kucuk" onClick={() => s.gec(a)}>Şimdilik atla</button>
      <span class="bosluk" />
      <a class="kucuk" href={`#/e/${evren}/yaz`}>Bütün adımlar</a>
      <button class="dugme sade kucuk" aria-label="İlk adımları gizle" onClick={s.gizle}>Gizle</button>
    </div>
  );
}

// ---------- İleri araçların bir kez tanıtılması (§5.10, K28) ----------
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
