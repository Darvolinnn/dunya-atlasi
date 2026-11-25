// Araçlar sayfası (§5.11, K43): grafikler ve az kullanılan sayfalar yazarın sorusuna göre gruplanmış kartlardır.
// Her kartın altında hazırlık satırı (kaydedilmiş veriye göre; yalnız bu sayfa açıkken hesaplanır) ve köşesinde
// gezinti çubuğuna sabitleme düğmesi durur. Kurgu türüne uzak araçlar en alttaki katlı gruba iner (§4, K28).
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AracHazirligi } from '../veri/api';
import { uzakGorunumMu } from '../alan/turler';
import { katla } from '../alan/turkce';
import { useKurgu } from './kurgu';
import { SAYFA_ADI } from './Kabuk';
import { sabitDegistir, useKip, useSabitler } from './kip';

type Hazirlik = [hazir: boolean, metin: string] | null;
type Arac = { kod: string; ad?: string; ne: string; hz: (h: AracHazirligi) => Hazirlik };

const n = (x: number) => (x > 99 ? '99+' : String(x));
const hazir = (...parca: [number, string][]): Hazirlik => {
  const dolu = parca.filter(([x]) => x > 0);
  return [true, dolu.length ? `Hazır · ${dolu.map(([x, ad]) => `${n(x)} ${ad}`).join(', ')}` : `Hazır · henüz ${parca[0][1]} yok`];
};
const yok = (ne: string): Hazirlik => [false, `Henüz veri yok · ${ne}`];

const GRUPLAR: readonly (readonly [string, Arac[]])[] = [
  ['Kurguyu ve bölümleri planlarken', [
    { kod: 'orgu', ne: 'Bir eserin sahneleri okuma sırasıyla; dönüm noktaları, kurgu hatları ve ipuçları altında.', hz: (h) => h.sahne ? hazir([h.sahne, 'sahne'], [h.eser, 'eser']) : yok('çalışması için en az bir sahne yazın') },
    { kod: 'hatlar', ne: 'Hangi alt hikâye hangi bölümlerde görünüyor, nerede kopuyor?', hz: (h) => h.kurguHatti ? hazir([h.kurguHatti, 'kurgu hattı']) : yok('bir kurgu hattı kaydı ekleyin') },
    { kod: 'matris', ne: 'Hangi karakter ya da eşya hangi bölümde kaç sahnede geçiyor?', hz: (h) => h.sahne ? hazir([h.sahne, 'sahne']) : yok('bir esere bölüm ve sahne ekleyin') },
    { kod: 'karsilastir', ne: 'İki metni ya da iki sahneyi yan yana okuyun.', hz: (h) => h.sahne >= 2 ? hazir([h.sahne, 'sahne']) : yok('en az 2 sahne yazın') },
    { kod: 'gezinti', ne: 'Yalnız bir karakterin ya da yerin sahnelerini sırayla okuyun.', hz: (h) => hazir([h.gezinti, 'gezinti']) },
    { kod: 'bahsedilen', ne: 'Metinde @ ile andığınız ama sayfasını doldurmadığınız kayıtlar.', hz: () => [true, 'Hazır'] },
    { kod: 'meseleler', ne: 'Henüz karar vermediğiniz sorular ve kararlarınızın gerekçeleri.', hz: (h) => hazir([h.mesele, 'açık mesele']) },
    { kod: 'masa', ne: 'Nerede kaldığınız, son neyle uğraştığınız ve bekleyen düşünceler.', hz: () => [true, 'Hazır'] },
    { kod: 'tuval', ne: 'Kayıtları ve notları serbest bir yüzeye dizin, aralarına çizgi çekin.', hz: () => [true, 'Hazır'] },
  ]],
  ['Zamanı, yaşları ve takvimi kontrol ederken', [
    { kod: 'cizelge', ne: 'Olaylar hangi sırayla yaşandı, o gün kim kaç yaşındaydı?', hz: (h) => h.tarihli ? hazir([h.tarihli, 'tarihli olay ya da sahne'], [h.karakter, 'karakter']) : yok('en az bir sahneye ya da olaya tarih verin') },
    { kod: 'takvim', ne: 'Evrenin ayları, mevsimleri, günün bölümleri ve çağları.', hz: () => [true, 'Hazır'] },
    { kod: 'durumlar', ne: 'Bir kişi ya da şehir yıllar içinde nasıl değişti?', hz: (h) => h.degisim ? hazir([h.degisim, 'durum değişimi']) : yok('bir olaya durum değişimi ekleyin') },
    { kod: 'gun', ne: 'Bir yerde ya da bir kişi için sıradan bir günün akışı.', hz: () => [true, 'Hazır'] },
    { kod: 'gokyuzu', ne: 'Seçtiğiniz tarihte ayın evresi ve mevsim neydi?', hz: (h) => h.gokyuzu ? [true, 'Hazır'] : yok('bu sayfada bir ay ya da mevsim tanımlayın') },
  ]],
  ['Karakterleri, aileleri ve ilişkileri incelerken', [
    { kod: 'ag', ne: 'Kim kime dost, düşman ya da bağlı? Çizim ve tablo.', hz: (h) => h.iliski ? hazir([h.iliski, 'ilişki']) : yok('iki kaydı bir ilişkiyle bağlayın') },
    { kod: 'soy', ne: 'Ebeveyn, eş ve kardeş ilişkilerinden ailenin kuşakları.', hz: (h) => h.aile ? hazir([h.aile, 'aile bağı']) : yok('iki karakteri ebeveyn, eş ya da kardeş olarak bağlayın') },
    { kod: 'neden', ne: 'Hangi olay neyi doğurdu, neyi engelledi?', hz: (h) => h.neden ? hazir([h.neden, 'neden–sonuç bağı']) : yok('iki olayı "neden oldu" bağıyla bağlayın') },
  ]],
  ['Mekânları ve yolculukları çizerken', [
    { kod: 'haritalar', ne: 'Harita yükleyin, yerleri işaretleyin, yolculukları ve süreleri izleyin.', hz: (h) => h.harita ? hazir([h.harita, 'harita'], [h.mekan, 'mekân']) : [true, 'Hazır · ilk haritayı burada yükleyin'] },
  ]],
  ['Çelişkileri ve kelimeleri denetlerken', [
    { kod: 'inceleme', ne: 'Tutarsızlıklar, kopuk bağlantılar ve iki cihazda ayrı yapılmış değişiklikler.', hz: () => [true, 'Hazır'] },
    { kod: 'terimler', ne: 'Evrenin kendi sözcükleri; metinde üzerine gelince anlamı görünür.', hz: (h) => hazir([h.terim, 'terim']) },
    { kod: 'sozluk', ne: 'Döneme uymayan ya da yasak sözcüklerin metinde geçtiği yerler.', hz: (h) => h.sozluk ? hazir([h.sozluk, 'sözcük listesi']) : yok('bu sayfada bir sözcük listesi kurun') },
  ]],
  ['Kitap çıktısı, sürümler ve düzen', [
    { kod: 'yedek', ad: 'Yedek ve kitap çıktısı', ne: 'Evreni dosyaya yedekleyin; eserleri PDF, Word ya da EPUB olarak alın.', hz: () => [true, 'Hazır'] },
    { kod: 'okur-yayini', ne: 'Okurlara açmak istediğiniz bölümleri ve kayıtları seçin.', hz: (h) => hazir([h.okurYayini, 'yayın']) },
    { kod: 'pano', ne: 'Görselleri ve alıntıları bir pano olarak derleyin.', hz: (h) => hazir([h.pano, 'pano']) },
    { kod: 'surumler', ne: 'Evrenin bir anını saklayın, büyük değişiklikleri ayrı kopyada deneyin.', hz: (h) => hazir([h.surum, 'kayıtlı an']) },
    { kod: 'masalar', ne: 'Bir konu için ilgili kayıtları, tarihleri ve notları bir araya toplayın.', hz: (h) => hazir([h.masa, 'konu dosyası']) },
    { kod: 'sablonlar', ne: 'Her kayıt türünün alanlarını ve sorularını belirleyin.', hz: () => [true, 'Hazır'] },
    { kod: 'gorunum', ne: 'Metindeki bağlantıların ve yazının nasıl görüneceği.', hz: () => [true, 'Hazır'] },
    { kod: 'gecmis', ne: 'Bu evrende yapılan her değişiklik, en yenisi üstte.', hz: () => [true, 'Hazır'] },
    { kod: 'cop', ne: 'Sildiğiniz kayıtlar; buradan geri getirilir.', hz: (h) => h.cop ? [true, `${n(h.cop)} kayıt`] : [true, 'Boş'] },
  ]],
];
const ILERI: Arac[] = [
  { kod: 'kosullar', ne: 'Bir yere belli sürede varmak için kayıtlı rotalardan yolculuk planları.', hz: (h) => h.mekan ? [true, 'Hazır'] : yok('en az iki yer ve aralarında bir rota ekleyin') },
  { kod: 'kesif', ne: 'İlişkilerden ve tarihlerden hikâye fikri çıkabilecek durumlar.', hz: (h) => h.iliski ? hazir([h.iliski, 'ilişki']) : yok('kayıtlar arasında ilişki kurun') },
  { kod: 'sozlesme', ne: 'Anlatıyla ilgili bilinçli kararlarınız, madde madde.', hz: () => [true, 'Hazır'] },
  { kod: 'yogunluk', ne: 'Hangi dönemde ve yerde çok şey oldu, hangisi boş kaldı?', hz: (h) => h.tarihli ? hazir([h.tarihli, 'tarihli olay ya da sahne']) : yok('en az bir sahneye ya da olaya tarih verin') },
];

export function AraclarSayfasi({ istemci, evren, bagli }: { istemci: Istemci; evren: string; bagli: boolean }) {
  const [h, setH] = useState<AracHazirligi | null>(null);
  const [ara, setAra] = useState('');
  const kip = useKip(evren);
  const sabitler = useSabitler(evren);
  const kurgu = useKurgu();
  useEffect(() => { istemci.iste('aracHazirligi', { evren }).then(setH, () => {}); }, [evren]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) istemci.iste('aracHazirligi', { evren }).then(setH, () => {}); }), [evren]);

  const q = katla(ara.trim());
  const uygun = (a: Arac) => !(bagli && ['surumler', 'yedek'].includes(a.kod)) && (!q || katla(`${ad(a)} ${a.ne}`).includes(q));
  const uzak = (a: Arac) => uzakGorunumMu(kurgu, a.kod);
  const kart = (a: Arac) => {
    const hz = h ? a.hz(h) : null;
    const sabit = sabitler.includes(a.kod);
    return (
      <div key={a.kod} class="kart arac-karti">
        <h3><a class="arac-bag" href={`#/e/${evren}/${a.kod}`}>{ad(a)}</a></h3>
        <p>{a.ne}</p>
        {hz && <span class={hz[0] ? 'hazir' : 'hazir yok'}>{hz[1]}</span>}
        <button type="button" class={sabit ? 'dugme kucuk sabitle secili' : 'dugme kucuk sabitle'} aria-pressed={sabit}
          title={sabit ? 'Sabitlemeyi kaldır' : 'Gezinti çubuğuna sabitle'} onClick={() => sabitDegistir(evren, a.kod)}>{sabit ? 'Sabit ✓' : 'Sabitle'}</button>
      </div>
    );
  };
  const gruplar = GRUPLAR.map(([g, l]) => [g, l.filter((a) => uygun(a) && !uzak(a))] as const).filter(([, l]) => l.length);
  const ileri = ILERI.filter((a) => uygun(a) && !uzak(a));
  const uzaklar = [...GRUPLAR.flatMap(([, l]) => l), ...ILERI].filter((a) => uygun(a) && uzak(a));
  const hicbiri = !gruplar.length && !ileri.length && !uzaklar.length;
  return (
    <>
      <p class="soluk araclar-giris">Ne yapmak istiyorsunuz? Araçlar verinize göre hazır olunca işe yarar; hiçbiri veri silmez.</p>
      <input class="girdi araclar-arama" type="search" placeholder="Araç arayın: soy ağacı, harita, çıktı…" aria-label="Araç arayın"
        value={ara} onInput={(e) => setAra((e.target as HTMLInputElement).value)} />
      {gruplar.map(([g, l]) => (
        <section key={g} class="arac-grubu"><h2>{g}</h2><div class="kartlar">{l.map(kart)}</div></section>
      ))}
      {!!ileri.length && (
        <details key={`ileri-${kip}-${!!q}`} class="katlanir arac-katli" open={kip !== 'sade' || !!q || undefined}>
          <summary><strong>İleri dünya mimarisi</strong></summary>
          <div class="kartlar">{ileri.map(kart)}</div>
        </details>
      )}
      {!!uzaklar.length && (
        <details key={`uzak-${!!q}`} class="katlanir arac-katli" open={!!q || undefined}>
          <summary><strong>Kurgu türünüze uzak araçlar</strong> <span class="soluk kucuk">· {uzaklar.length}</span></summary>
          <div class="kartlar">{uzaklar.map(kart)}</div>
          <p class="soluk kucuk">Kurgu türü Genel bakış sayfasında değişir. Bu araçların kayıtları silinmez.</p>
        </details>
      )}
      {hicbiri && <p class="soluk">Bu aramaya uyan araç yok.</p>}
    </>
  );
}

const ad = (a: Arac) => a.ad ?? SAYFA_ADI.get(a.kod) ?? a.kod;
/** Araçlar sayfasındaki her aracın kodu (komut paleti ve testler için). */
export const ARAC_KODLARI = [...GRUPLAR.flatMap(([, l]) => l), ...ILERI].map((a) => a.kod);
