// Şablon alanları, soru kütüphanesi (§6), şablon düzenleyici (§3.1), açık meseleler ve gerekçe defteri (§4.6),
// Dünya Pusulası. Doluluk göstergesi yoktur: cevapsız soru eksik sayılmaz.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AlanVarsayilani, BoslukTuru, Kayit, KayitSablonu, MeseleListesi, SablonBilgisi, SoruSatiri } from '../veri/api';
import { ALAN_TURLERI, VARSAYILAN_EKSENLERI, EVREN_SETLERI, MESELE_DURUMLARI, SORU_SETLERI, soruSetiBul, yeniAlanKodu, type Sablon, type SablonAlani, type Secenek } from '../alan/sablon';
import { tarihAciklamasi, tarihCoz, type EvrenTarihi, type TakvimYa } from '../alan/tarih';
import { TURLER, turBul } from '../alan/turler';
import { KararRozeti, KararSecici, TurSecici } from './ortak';
import { git } from './Uygulama';
import { takvimOrnegi, useTakvim } from './Takvim';

const hataYaz = (e: unknown) => (e as Error).message;

/** Değişiklik bildirimi gelince yeniden okur. */
function useOku<T>(istemci: Istemci, evren: string, oku: () => Promise<T>, bag: unknown[]): T | null {
  const [v, setV] = useState<T | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => { let iptal = false; oku().then((x) => { if (!iptal) setV(x); }, () => {}); return () => { iptal = true; }; }, [...bag, n]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  return v;
}

export const useKayitSablonu = (istemci: Istemci, evren: string, kod: string) =>
  useOku<KayitSablonu>(istemci, evren, () => istemci.iste('kayitSablonu', { evren, kod }), [kod]);

/** Bir alan değerinin okunur hâli (yan panel, eski alanlar). */
export function degerMetni(a: SablonAlani | undefined, d: unknown): string {
  if (d === null || d === undefined) return '';
  if (d === true) return 'Evet';
  if (typeof d === 'object' && d && 'ifade' in d) return (d as EvrenTarihi).ifade;
  if (a?.tur === 'secim') return a.secenekler?.find((x) => x.kod === d)?.ad ?? `${String(d)} (kaldırılmış seçenek)`;
  return String(d);
}

// ---------- Kayıt sayfasında şablon alanları ----------
export function SablonAlanlari({ istemci, evren, kayit, ks }: { istemci: Istemci; evren: string; kayit: Kayit; ks: KayitSablonu | null }) {
  const [hata, setHata] = useState<string | null>(null);
  const takvim = useTakvim(istemci, evren);
  const vs = useOku<Record<string, AlanVarsayilani>>(istemci, evren, () => istemci.iste('kayitVarsayilanlari', { evren, kod: kayit.kod }), [kayit.kod]);
  if (!ks) return null;
  const yaz = (alan: string, deger: unknown) => istemci.iste('kayitAlanYaz', { evren, kod: kayit.kod, alan, deger }).then(() => setHata(null), (e) => setHata(hataYaz(e)));
  return (
    <>
      {ks.sablon.alanlar.map((a) => (
        <div class={a.tur === 'uzun' || ((vs?.[a.kod]?.kaynaklar.length ?? 0) > 1 || vs?.[a.kod]?.fetih) ? 'alan genis' : 'alan'} key={a.kod}>
          <span class="alan-adi satir">{a.ad}
            <KararSecici etiket={a.ad} karar={kayit.alanKararlari[`f:${a.kod}`] ?? 'kesin'} onDegis={(k) => istemci.iste('alanKarari', { evren, kod: kayit.kod, alan: `f:${a.kod}`, karar: k })} />
          </span>
          <AlanGirdisi a={a} takvim={takvim} deger={ks.degerler[a.kod]} yaz={(v) => yaz(a.kod, v)} />
          {vs?.[a.kod] && <VarsayilanGosterimi istemci={istemci} evren={evren} kod={kayit.kod} a={a} v={vs[a.kod]} kabul={(d) => yaz(a.kod, d)} hata={setHata} />}
        </div>
      ))}
      {ks.eskiler.length > 0 && (
        <div class="alan genis eski-alanlar">
          <span class="alan-adi">Şablonda olmayan alanlar</span>
          <span class="soluk kucuk">Tür ya da şablon değişince bu değerler silinmedi. Gerekmiyorsa boşaltabilirsin.</span>
          <ul>
            {ks.eskiler.map((x) => (
              <li key={x.kod} class="satir"><span>{degerMetni(undefined, x.deger)}</span><span class="bosluk" />
                <button class="dugme sade kucuk" onClick={() => yaz(x.kod, null)}>Boşalt</button></li>
            ))}
          </ul>
        </div>
      )}
      {hata && <p class="hata kucuk genis">{hata}</p>}
    </>
  );
}

const BOSLUKLAR: { kod: BoslukTuru | ''; ad: string }[] = [
  { kod: '', ad: 'Henüz düşünülmedi' }, { kod: 'acik', ad: 'Bilerek açık bırakıyorum' },
  { kod: 'bilinmiyor', ad: 'Evrende bilinmiyor' }, { kod: 'gecersiz', ad: 'Bu kayıt için geçersiz' },
];

/**
 * Boş alanın varsayılanı (§3.7): kaynağı ve yolu gösterilir; değer olarak kabul etmek ayrı bir dokunuştur. Birden çok
 * kaynak farklı değer veriyorsa ikisi de gösterilir ve yazar durumu seçer. Yalnızca "henüz düşünülmedi" varsayılan gösterir.
 */
function VarsayilanGosterimi({ istemci, evren, kod, a, v, kabul, hata }: {
  istemci: Istemci; evren: string; kod: string; a: SablonAlani; v: AlanVarsayilani; kabul: (d: unknown) => void; hata: (h: string | null) => void;
}) {
  const [kapsam, setKapsam] = useState(false);
  const [aciklama, setAciklama] = useState(v.karar?.aciklama ?? '');
  const isle = (p: Promise<unknown>) => p.then(() => hata(null), (e) => hata(hataYaz(e)));
  const karar = (k: { durum: 'birlikte' | 'kapsam' | 'oncelik'; oncelikli?: string | null; aciklama?: string } | null) =>
    isle(istemci.iste('varsayilanKarari', { evren, kod, alan: a.kod, karar: k && { durum: k.durum, oncelikli: k.oncelikli ?? null, aciklama: k.aciklama ?? '' } }));
  const bosluk = (t: string) => isle(istemci.iste('alanBoslugu', { evren, kod, alan: a.kod, tur: (t || null) as BoslukTuru | null }));
  const yol = (x: AlanVarsayilani['kaynaklar'][0]) => x.yol.length > 1 ? ` (${x.yol.map((y) => y.ad).join(' → ')} üzerinden)` : '';
  const coklu = v.kaynaklar.length > 1 && v.durum !== 'tek' && v.durum !== 'fetih';
  return (
    <div class="varsayilan kucuk">
      {v.fetih && <FetihSorusuGosterimi istemci={istemci} evren={evren} kod={kod} a={a} f={v.fetih} hata={hata} />}
      {v.durum === 'yok' && <span class="soluk">{v.eksenAdi[0].toLocaleUpperCase('tr-TR') + v.eksenAdi.slice(1)} yoluyla varsayılan veren kayıt yok.</span>}
      {v.durum === 'tek' && (
        <span class="satir"><span>Varsayılan: <strong>{degerMetni(a, v.kaynaklar[0].deger)}</strong>
          <span class="soluk"> · {v.eksenAdi}, <a href={`#/e/${evren}/k/${v.kaynaklar[0].kaynak.kod}`}>{v.kaynaklar[0].kaynak.ad}</a>{yol(v.kaynaklar[0])}{v.kaynaklar.length > 1 ? `; ${v.kaynaklar.length} kaynak aynı değeri veriyor` : ''}</span></span>
          <button class="dugme sade kucuk" onClick={() => kabul(v.kaynaklar[0].deger)}>Değer olarak kabul et</button></span>
      )}
      {coklu && (
        <>
          <span>{v.durum === 'cozulmemis' ? 'Kaynaklar farklı değer veriyor; çatışma çözülmemiş:' : v.durum === 'birlikte' ? 'Birlikte geçerli:'
            : v.durum === 'kapsam' ? `Kapsamları farklı (${v.karar?.aciklama}):` : 'Öncelikli kaynak seçildi:'}</span>
          <ul class="varsayilan-kaynaklari">
            {v.kaynaklar.map((x) => (
              <li key={x.kaynak.kod} class="satir">
                <span><strong>{degerMetni(a, x.deger)}</strong><span class="soluk"> · <a href={`#/e/${evren}/k/${x.kaynak.kod}`}>{x.kaynak.ad}</a>{yol(x)}</span>
                  {v.durum === 'oncelik' && v.karar?.oncelikli === x.kaynak.kod && <span class="rozet">öncelikli</span>}</span>
                <span class="bosluk" />
                {v.durum !== 'oncelik' && <button class="dugme sade kucuk" onClick={() => karar({ durum: 'oncelik', oncelikli: x.kaynak.kod })}>Öncelikli say</button>}
                <button class="dugme sade kucuk" onClick={() => kabul(x.deger)}>Değer olarak kabul et</button>
              </li>
            ))}
          </ul>
          <span class="satir">
            {v.durum !== 'birlikte' && <button class="dugme sade kucuk" onClick={() => karar({ durum: 'birlikte' })}>Birlikte geçerli</button>}
            {v.durum !== 'kapsam' && !kapsam && <button class="dugme sade kucuk" onClick={() => setKapsam(true)}>Kapsamları farklı</button>}
            {v.durum !== 'cozulmemis' && <button class="dugme sade kucuk" onClick={() => karar(null)}>Kararı geri al</button>}
          </span>
          {kapsam && (
            <form class="satir" onSubmit={(e) => { e.preventDefault(); karar({ durum: 'kapsam', aciklama }).then(() => setKapsam(false)); }}>
              <input class="girdi" style="flex:1;min-width:160px" lang="tr" aria-label="Kapsamlar nasıl ayrılıyor" placeholder="ör. biri sarayda, biri pazarda" value={aciklama} onInput={(e) => setAciklama((e.target as HTMLInputElement).value)} />
              <button class="dugme ana kucuk" type="submit" disabled={!aciklama.trim()}>Kaydet</button>
              <button class="dugme sade kucuk" type="button" onClick={() => setKapsam(false)}>Vazgeç</button>
            </form>
          )}
        </>
      )}
      <label class="satir soluk"><span>Boş bırakma nedeni</span>
        <select class="girdi kucuk-secim" aria-label={`${a.ad}: boş bırakma nedeni`} value={v.bosluk ?? ''} onChange={(e) => bosluk((e.target as HTMLSelectElement).value)}>
          {BOSLUKLAR.map((b) => <option value={b.kod}>{b.ad}</option>)}
        </select>
        {v.bosluk && <span>Bu durumda varsayılan gösterilmez.</span>}
      </label>
    </div>
  );
}

/** Bağlılık değişince eski yönetimden gelen alan için tek soru (§3.7); her alan ayrı cevaplanır. */
function FetihSorusuGosterimi({ istemci, evren, kod, a, f, hata }: {
  istemci: Istemci; evren: string; kod: string; a: SablonAlani; f: NonNullable<AlanVarsayilani['fetih']>; hata: (h: string | null) => void;
}) {
  const [tarihli, setTarihli] = useState(false);
  const [tarih, setTarih] = useState('');
  const cevapla = (c: { durum: 'suruyor' | 'yeni' | 'birlikte'; tarih?: string } | null) =>
    istemci.iste('fetihCevabi', { evren, kod, gecis: f.gecis, alan: a.kod, cevap: c }).then(() => { hata(null); setTarihli(false); }, (e) => hata(hataYaz(e)));
  const degerler = (l: AlanVarsayilani['kaynaklar']) => l.length ? l.map((x) => `${degerMetni(a, x.deger)} (${x.kaynak.ad})`).join(', ') : 'değer yok';
  const c = f.cevap;
  return (
    <div class="fetih-sorusu">
      <span><strong>Bağlılık değişti:</strong> “{f.eski.ad}” yönetimi{f.bitis ? ` ${f.bitis} tarihinde` : ''} sona erdi. Eski yönetimden: {degerler(f.eskiKaynaklar)}. Yeni yönetimden: {degerler(f.yeniKaynaklar)}.</span>
      {c ? (
        <span class="satir"><span class="rozet">{c.durum === 'suruyor' ? 'Eski uygulama sürüyor' : c.durum === 'birlikte' ? 'İkisi birlikte geçerli' : `Yeni uygulama başladı${c.tarih ? `: ${c.tarih.ifade}` : ''}`}</span>
          <button class="dugme sade kucuk" onClick={() => cevapla(null)}>Henüz karar vermedim</button></span>
      ) : (
        <>
          <span>Bu alan için sonra ne oldu? Değer o gün kendiliğinden değişmez.</span>
          <span class="satir">
            <button class="dugme sade kucuk" onClick={() => cevapla({ durum: 'suruyor' })}>Eski uygulama sürüyor</button>
            <button class="dugme sade kucuk" onClick={() => setTarihli(true)}>Yeni uygulama şu tarihte başladı</button>
            <button class="dugme sade kucuk" onClick={() => cevapla({ durum: 'birlikte' })}>İkisi birlikte geçerli</button>
            <span class="soluk">Henüz karar vermedin.</span>
          </span>
          {tarihli && (
            <form class="satir" onSubmit={(e) => { e.preventDefault(); cevapla({ durum: 'yeni', tarih }); }}>
              <input class="girdi" style="flex:1;min-width:120px" lang="tr" aria-label={`${a.ad}: yeni uygulamanın başladığı tarih`} placeholder="Tarih (boş bırakılabilir)" value={tarih} onInput={(e) => setTarih((e.target as HTMLInputElement).value)} />
              <button class="dugme ana kucuk" type="submit">Kaydet</button>
              <button class="dugme sade kucuk" type="button" onClick={() => setTarihli(false)}>Vazgeç</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function AlanGirdisi({ a, takvim, deger, yaz }: { a: SablonAlani; takvim: TakvimYa; deger: unknown; yaz: (v: unknown) => Promise<unknown> }) {
  const metin = degerMetni(a, deger);
  const [yerel, setYerel] = useState(metin);
  useEffect(() => setYerel(metin), [metin]);
  const bitir = () => { if (yerel.trim() !== metin) yaz(yerel); };
  if (a.tur === 'onay') {
    return <label class="satir"><input type="checkbox" checked={deger === true} onChange={(e) => yaz((e.target as HTMLInputElement).checked)} /> <span class="kucuk">{a.ipucu ?? 'Evet'}</span></label>;
  }
  if (a.tur === 'secim') {
    return (
      <select class="girdi" aria-label={a.ad} value={(deger as string) ?? ''} onChange={(e) => yaz((e.target as HTMLSelectElement).value || null)}>
        <option value="">—</option>
        {a.secenekler!.map((x) => <option value={x.kod}>{x.ad}</option>)}
        {typeof deger === 'string' && !a.secenekler!.some((x) => x.kod === deger) && <option value={deger}>{degerMetni(a, deger)}</option>}
      </select>
    );
  }
  if (a.tur === 'uzun') {
    return <textarea class="girdi" rows={3} lang="tr" aria-label={a.ad} placeholder={a.ipucu} value={yerel} onInput={(e) => setYerel((e.target as HTMLTextAreaElement).value)} onBlur={bitir} />;
  }
  const onizleme = a.tur === 'tarih' && yerel.trim() ? tarihCoz(yerel, takvim) : null;
  return (
    <>
      <input class="girdi" lang="tr" aria-label={a.ad} placeholder={a.ipucu ?? (a.tur === 'tarih' ? takvimOrnegi(takvim) : '')} value={yerel}
        onInput={(e) => setYerel((e.target as HTMLInputElement).value)} onBlur={bitir} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      {a.tur === 'tarih' && <span class="soluk kucuk">{onizleme ? tarihAciklamasi(onizleme, takvim) : a.ipucu ?? ''}</span>}
    </>
  );
}

// ---------- Sorular ----------
export function SoruBolumu({ istemci, evren, kayit, ks }: { istemci: Istemci; evren: string; kayit: Kayit; ks: KayitSablonu | null }) {
  const [hata, setHata] = useState<string | null>(null);
  if (!ks) return null;
  const sablondakiler = new Set(ks.sablon.sorular.map((q) => q.kod));
  const eklenebilir = SORU_SETLERI.filter((s) => !EVREN_SETLERI.includes(s.kod) && !ks.setler.includes(s.kod) && !s.sorular.every((q) => sablondakiler.has(q.kod)));
  const gruplar: [string, string | null, SoruSatiri[]][] = [['', null, ks.sorular.filter((q) => !q.set && !q.eski)],
    ...ks.setler.map((s) => [soruSetiBul(s)!.ad, s, ks.sorular.filter((q) => q.set === s)] as [string, string, SoruSatiri[]]),
    ['Şablondan çıkarılmış sorular', null, ks.sorular.filter((q) => q.eski)]];
  return (
    <section class="sorular" aria-label="Sorular">
      <details open={ks.sorular.some((q) => q.cevap)}>
        <summary><h2 style="display:inline">Sorular</h2></summary>
        <p class="soluk kucuk">Hepsi isteğe bağlı. Cevaplayabilir, sonraya bırakabilir, bu kayıtla ilgisiz sayabilir ya da yeni bir kayıtla cevaplayabilirsin.
          {' '}<a href={`#/e/${evren}/sablonlar/${kayit.tur}`}>{turBul(kayit.tur).ad} şablonunu düzenle</a></p>
        {gruplar.filter(([, , l]) => l.length).map(([ad, set, liste]) => (
          <div key={ad || 'sablon'} class="soru-grubu">
            {ad && <div class="satir"><strong class="kucuk">{ad}</strong><span class="bosluk" />
              {set && <button class="dugme sade kucuk" onClick={() => istemci.iste('kayitSoruSeti', { evren, kod: kayit.kod, set, ekle: false })}>Bu seti çıkar</button>}</div>}
            <ul class="soru-listesi">{liste.map((q) => <SoruSatir key={q.kod} istemci={istemci} evren={evren} kod={kayit.kod} q={q} hata={setHata} />)}</ul>
          </div>
        ))}
        {!ks.sorular.length && <p class="soluk kucuk">Bu türün şablonunda soru yok.</p>}
        {eklenebilir.length > 0 && (
          <select class="girdi kucuk-secim" aria-label="Bu kayda soru seti ekle" value="" onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            if (v) istemci.iste('kayitSoruSeti', { evren, kod: kayit.kod, set: v, ekle: true }).catch((x) => setHata(hataYaz(x)));
          }}>
            <option value="">Bu kayda soru seti ekle…</option>
            {eklenebilir.map((s) => <option value={s.kod}>{s.ad}</option>)}
          </select>
        )}
        {hata && <p class="hata kucuk">{hata}</p>}
      </details>
    </section>
  );
}

export function SoruSatir({ istemci, evren, kod, q, hata }: { istemci: Istemci; evren: string; kod: string; q: SoruSatiri; hata: (h: string | null) => void }) {
  const [yerel, setYerel] = useState(q.cevap?.cevap ?? '');
  const [kayitla, setKayitla] = useState(false);
  useEffect(() => setYerel(q.cevap?.cevap ?? ''), [q.cevap?.cevap]);
  const isle = (p: Promise<unknown>) => p.then(() => hata(null), (e) => hata(hataYaz(e)));
  const cevapla = (durum: 'cevaplandi' | 'sonra' | 'ilgisiz' | null, cevap = '') => isle(istemci.iste('soruCevapla', { evren, kod, soru: q.kod, durum, cevap }));
  const d = q.cevap?.durum;
  return (
    <li class={d === 'ilgisiz' || d === 'sonra' ? 'soru soluk-soru' : 'soru'}>
      <div class="soru-metni">{q.metin}{q.ipucu && <span class="soluk kucuk"> · {q.ipucu}</span>}</div>
      {d === 'sonra' || d === 'ilgisiz' ? (
        <div class="satir"><span class="rozet">{d === 'sonra' ? 'Sonraya bırakıldı' : 'İlgisiz'}</span><button class="dugme sade kucuk" onClick={() => cevapla(null)}>Geri al</button></div>
      ) : q.cevap?.kayitla ? (
        <div class="satir"><span class="kucuk">Cevabı: <a href={`#/e/${evren}/k/${q.cevap.kayitla.kod}`}>{q.cevap.kayitla.ad}</a></span><button class="dugme sade kucuk" onClick={() => cevapla(null)}>Bağı kaldır</button></div>
      ) : (
        <>
          <textarea class="girdi" rows={yerel ? 2 : 1} lang="tr" aria-label={q.metin} placeholder="Cevap" value={yerel}
            onInput={(e) => setYerel((e.target as HTMLTextAreaElement).value)} onBlur={() => { if (yerel.trim() !== (q.cevap?.cevap ?? '')) cevapla('cevaplandi', yerel); }} />
          {!q.cevap && !kayitla && (
            <div class="satir soru-dugmeleri">
              <button class="dugme sade kucuk" onClick={() => cevapla('sonra')}>Sonraya bırak</button>
              {kod !== 'evren' && <button class="dugme sade kucuk" onClick={() => cevapla('ilgisiz')}>İlgisiz</button>}
              <button class="dugme sade kucuk" onClick={() => setKayitla(true)}>Yeni kayıtla cevapla</button>
            </div>
          )}
          {kayitla && <KayitlaCevapla istemci={istemci} evren={evren} kod={kod} q={q} kapat={() => setKayitla(false)} hata={hata} />}
        </>
      )}
    </li>
  );
}

function KayitlaCevapla({ istemci, evren, kod, q, kapat, hata }: { istemci: Istemci; evren: string; kod: string; q: SoruSatiri; kapat: () => void; hata: (h: string | null) => void }) {
  const [ad, setAd] = useState('');
  const [tur, setTur] = useState(/inan/i.test(q.metin) ? 'inanc' : /hüküm|yönetiyor/i.test(q.metin) ? 'topluluk' : 'karakter');
  return (
    <form class="satir" onSubmit={(e) => { e.preventDefault(); istemci.iste('soruKayitla', { evren, kod, soru: q.kod, ad, tur }).then(() => { hata(null); kapat(); }, (x) => hata(hataYaz(x))); }}>
      <input class="girdi" style="flex:2;min-width:140px" placeholder="Yeni kaydın adı" aria-label="Yeni kaydın adı" lang="tr" value={ad} autoFocus onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
      <span style="flex:1;min-width:140px"><TurSecici deger={tur} onDegis={setTur} /></span>
      <button class="dugme ana kucuk" type="submit" disabled={!ad.trim()}>Oluştur</button>
      <button class="dugme sade kucuk" type="button" onClick={kapat}>Vazgeç</button>
    </form>
  );
}

// ---------- Şablon düzenleyici (evren sekmesi) ----------
export function SablonlarSekmesi({ istemci, evren, tur }: { istemci: Istemci; evren: string; tur: string | null }) {
  const secili = tur && TURLER.some((t) => t.kod === tur) ? tur : 'karakter';
  return (
    <div class="sablonlar">
      <p class="soluk kucuk">Her türün alanları ve soruları burada. Bir alanı kaldırmak kayıtlardaki değerleri silmez; o kayıtlarda “şablonda olmayan alanlar” altında kalır.</p>
      <label class="alan" style="max-width:320px"><span class="alan-adi">Tür</span>
        <TurSecici deger={secili} onDegis={(v) => git(`/e/${evren}/sablonlar/${v}`)} /></label>
      <SablonEditoru key={secili} istemci={istemci} evren={evren} tur={secili} />
    </div>
  );
}

function SablonEditoru({ istemci, evren, tur }: { istemci: Istemci; evren: string; tur: string }) {
  const bilgi = useOku<SablonBilgisi>(istemci, evren, () => istemci.iste('sablon', { evren, tur }), [tur]);
  const [taslak, setTaslak] = useState<Sablon | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedildi, setKaydedildi] = useState(false);
  useEffect(() => { if (bilgi && !taslak) setTaslak(structuredClone(bilgi.sablon)); }, [bilgi]);
  if (!bilgi || !taslak) return null;
  const degisti = JSON.stringify(taslak) !== JSON.stringify(bilgi.sablon);
  const guncelle = (f: (s: Sablon) => void) => { const s = structuredClone(taslak); f(s); setTaslak(s); setKaydedildi(false); };
  const tasi = <T,>(l: T[], i: number, j: number) => { if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; };
  const kaydet = (s: Sablon | null) => istemci.iste('sablonYaz', { evren, tur, sablon: s }).then(() => { setHata(null); setTaslak(structuredClone(s ?? bilgi.varsayilanSablon)); setKaydedildi(true); }, (e) => setHata(hataYaz(e)));
  const kullanilan = (a: SablonAlani) => bilgi.kullanim[a.kod] ?? 0;
  const eklenebilir = SORU_SETLERI.filter((s) => !EVREN_SETLERI.includes(s.kod) && !s.sorular.every((q) => taslak.sorular.some((x) => x.kod === q.kod)));

  return (
    <div class="sablon-editoru">
      <h2>Alanlar</h2>
      {!taslak.alanlar.length && <p class="soluk kucuk">Bu türde ek alan yok.</p>}
      <ul class="sablon-listesi">
        {taslak.alanlar.map((a, i) => (
          <li key={a.kod} class="kart">
            <div class="satir">
              <input class="girdi" style="flex:2;min-width:140px" aria-label="Alanın adı" lang="tr" value={a.ad} onInput={(e) => guncelle((s) => { s.alanlar[i].ad = (e.target as HTMLInputElement).value; })} />
              <select class="girdi" style="flex:1;min-width:130px" aria-label="Alanın türü" value={a.tur} disabled={a.sabit || kullanilan(a) > 0}
                onChange={(e) => guncelle((s) => { const t = (e.target as HTMLSelectElement).value as SablonAlani['tur']; s.alanlar[i].tur = t; if (t === 'secim') s.alanlar[i].secenekler ??= [{ kod: 'o1', ad: 'Birinci' }]; else delete s.alanlar[i].secenekler; })}>
                {ALAN_TURLERI.map((t) => <option value={t.kod}>{t.ad}</option>)}
              </select>
              <button class="dugme sade kucuk" aria-label={`${a.ad}: yukarı`} disabled={i === 0} onClick={() => guncelle((s) => tasi(s.alanlar, i, i - 1))}>↑</button>
              <button class="dugme sade kucuk" aria-label={`${a.ad}: aşağı`} disabled={i === taslak.alanlar.length - 1} onClick={() => guncelle((s) => tasi(s.alanlar, i, i + 1))}>↓</button>
              {!a.sabit && <button class="dugme sade kucuk" aria-label={`${a.ad}: kaldır`} onClick={() => guncelle((s) => { s.alanlar.splice(i, 1); })}>×</button>}
            </div>
            <input class="girdi" aria-label="İpucu" placeholder="İpucu (isteğe bağlı)" lang="tr" value={a.ipucu ?? ''} onInput={(e) => guncelle((s) => { s.alanlar[i].ipucu = (e.target as HTMLInputElement).value; })} />
            <label class="satir kucuk"><span class="soluk">Boşken varsayılan</span>
              <select class="girdi kucuk-secim" aria-label={`${a.ad}: boşken varsayılan`} value={a.varsayilan ?? ''}
                onChange={(e) => guncelle((s) => { const v = (e.target as HTMLSelectElement).value; if (v) s.alanlar[i].varsayilan = v as SablonAlani['varsayilan']; else delete s.alanlar[i].varsayilan; })}>
                <option value="">Almaz</option>
                {VARSAYILAN_EKSENLERI.map((x) => <option value={x.kod}>{x.ad} ({x.ornek})</option>)}
              </select></label>
            {a.tur === 'secim' && <SecenekDuzenleyici secenekler={a.secenekler ?? []} degis={(l) => guncelle((s) => { s.alanlar[i].secenekler = l; })} sabit={a.sabit} />}
            <span class="soluk kucuk">
              {a.sabit ? 'Program bu alanı kullanıyor; adı değişebilir, kaldırılamaz. ' : ''}
              {kullanilan(a) > 0 ? `${kullanilan(a)} kayıtta değeri var${a.sabit ? '' : '; kaldırırsan değerler silinmez'}. Değeri olan alanın türü değişmez.` : ''}
            </span>
          </li>
        ))}
      </ul>
      <button class="dugme kucuk" onClick={() => guncelle((s) => { s.alanlar.push({ kod: yeniAlanKodu('a'), ad: 'Yeni alan', tur: 'metin' }); })}>Alan ekle</button>

      <h2 style="margin-top:20px">Sorular</h2>
      {!taslak.sorular.length && <p class="soluk kucuk">Bu türde soru yok.</p>}
      <ol class="sablon-listesi">
        {taslak.sorular.map((q, i) => (
          <li key={q.kod} class="satir">
            <input class="girdi" style="flex:3;min-width:180px" aria-label="Soru" lang="tr" value={q.metin} onInput={(e) => guncelle((s) => { s.sorular[i].metin = (e.target as HTMLInputElement).value; })} />
            <input class="girdi" style="flex:2;min-width:120px" aria-label="Sorunun ipucu" placeholder="İpucu" lang="tr" value={q.ipucu ?? ''} onInput={(e) => guncelle((s) => { s.sorular[i].ipucu = (e.target as HTMLInputElement).value; })} />
            <button class="dugme sade kucuk" aria-label="Yukarı" disabled={i === 0} onClick={() => guncelle((s) => tasi(s.sorular, i, i - 1))}>↑</button>
            <button class="dugme sade kucuk" aria-label="Aşağı" disabled={i === taslak.sorular.length - 1} onClick={() => guncelle((s) => tasi(s.sorular, i, i + 1))}>↓</button>
            <button class="dugme sade kucuk" aria-label="Soruyu kaldır" onClick={() => guncelle((s) => { s.sorular.splice(i, 1); })}>×</button>
          </li>
        ))}
      </ol>
      <div class="satir">
        <button class="dugme kucuk" onClick={() => guncelle((s) => { s.sorular.push({ kod: yeniAlanKodu('s'), metin: 'Yeni soru' }); })}>Soru ekle</button>
        {eklenebilir.length > 0 && (
          <select class="girdi kucuk-secim" aria-label="Kütüphaneden soru seti ekle" value="" onChange={(e) => {
            const set = soruSetiBul((e.target as HTMLSelectElement).value);
            if (set) guncelle((s) => { for (const q of set.sorular) if (!s.sorular.some((x) => x.kod === q.kod)) s.sorular.push({ ...q }); });
          }}>
            <option value="">Kütüphaneden set ekle…</option>
            {eklenebilir.map((s) => <option value={s.kod}>{s.ad}</option>)}
          </select>
        )}
      </div>
      <p class="soluk kucuk">Kaldırılan bir soru, cevaplandığı kayıtlarda “şablondan çıkarılmış sorular” altında kalır.</p>

      {hata && <p class="hata">{hata}</p>}
      <div class="satir" style="margin-top:12px">
        <button class="dugme ana" disabled={!degisti} onClick={() => kaydet(taslak)}>Şablonu kaydet</button>
        <button class="dugme" disabled={!degisti} onClick={() => setTaslak(structuredClone(bilgi.sablon))}>Değişikliklerden vazgeç</button>
        <span class="bosluk" />
        {!bilgi.varsayilan && <button class="dugme sade" onClick={() => kaydet(null)}>Varsayılana dön</button>}
        {kaydedildi && !degisti && <span class="soluk kucuk">Kaydedildi.</span>}
      </div>
    </div>
  );
}

function SecenekDuzenleyici({ secenekler, degis, sabit }: { secenekler: Secenek[]; degis: (l: Secenek[]) => void; sabit?: boolean }) {
  return (
    <div class="secenekler">
      <span class="alan-adi">Seçenekler</span>
      {secenekler.map((x, i) => (
        <span class="satir" key={x.kod}>
          <input class="girdi" style="flex:1" aria-label="Seçenek" lang="tr" value={x.ad} onInput={(e) => degis(secenekler.map((y, j) => (j === i ? { ...y, ad: (e.target as HTMLInputElement).value } : y)))} />
          {!sabit && secenekler.length > 1 && <button class="dugme sade kucuk" aria-label="Seçeneği kaldır" onClick={() => degis(secenekler.filter((_, j) => j !== i))}>×</button>}
        </span>
      ))}
      {!sabit && <button class="dugme sade kucuk" onClick={() => degis([...secenekler, { kod: yeniAlanKodu('a'), ad: 'Yeni seçenek' }])}>Seçenek ekle</button>}
    </div>
  );
}

// ---------- Açık meseleler ve gerekçe defteri ----------

export function MeseleSekmesi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const l = useOku<MeseleListesi>(istemci, evren, () => istemci.iste('meseleler', { evren }), [evren]);
  if (!l) return null;
  return (
    <div class="meseleler">
      <section aria-label="Açık meseleler">
        <h2>Açık meseleler</h2>
        <p class="soluk kucuk">Henüz kararlaştırmadığın sorular. Boş alanlar burada sayılmaz; yalnızca senin yazdıkların durur.</p>
        <YazarKaydiFormu istemci={istemci} evren={evren} tur="acik_mesele" />
        {MESELE_DURUMLARI.map((d) => {
          const liste = l.meseleler.filter((m) => m.durum === d.kod);
          if (!liste.length) return null;
          return (
            <details key={d.kod} open={d.kod === 'dusunulecek'} class="mesele-grubu">
              <summary class="kucuk"><strong>{d.ad}</strong></summary>
              <MeseleListe istemci={istemci} evren={evren} liste={liste} />
            </details>
          );
        })}
      </section>
      <section aria-label="Gerekçe defteri" style="margin-top:24px">
        <h2>Gerekçe defteri</h2>
        <p class="soluk kucuk">Verdiğin kararlar ve nedenleri: “Büyü iyileştiremez, çünkü yaralar hikâyede ağırlığını korumalı.”</p>
        <YazarKaydiFormu istemci={istemci} evren={evren} tur="gerekce" />
        <GerekceListe evren={evren} liste={l.gerekceler} />
      </section>
    </div>
  );
}

function MeseleListe({ istemci, evren, liste }: { istemci: Istemci; evren: string; liste: MeseleListesi['meseleler'] }) {
  return (
    <ul class="mesele-listesi">
      {liste.map((m) => (
        <li key={m.kod} class="satir">
          <button class={m.onemli ? 'dugme sade kucuk yildiz secili' : 'dugme sade kucuk yildiz'} aria-pressed={m.onemli} title="Önemli"
            aria-label={`${m.ad}: önemli`} onClick={() => istemci.iste('kayitAlanYaz', { evren, kod: m.kod, alan: 'onemli', deger: !m.onemli })}>★</button>
          <a href={`#/e/${evren}/k/${m.kod}`}>{m.ad}</a> <KararRozeti karar={m.karar} />
          {m.bagli.length > 0 && <span class="soluk kucuk">· {m.bagli.map((b, i) => <>{i > 0 && ', '}<a href={`#/e/${evren}/k/${b.kod}`}>{b.ad}</a></>)}</span>}
          <span class="bosluk" />
          <select class="girdi kucuk-secim" aria-label={`${m.ad}: durum`} value={m.durum} onChange={(e) => istemci.iste('kayitAlanYaz', { evren, kod: m.kod, alan: 'durum', deger: (e.target as HTMLSelectElement).value })}>
            {MESELE_DURUMLARI.map((d) => <option value={d.kod}>{d.ad}</option>)}
          </select>
        </li>
      ))}
    </ul>
  );
}

function GerekceListe({ evren, liste }: { evren: string; liste: MeseleListesi['gerekceler'] }) {
  if (!liste.length) return <p class="soluk kucuk">Henüz gerekçe kaydı yok.</p>;
  return (
    <ul class="gerekce-listesi">
      {liste.map((g) => (
        <li key={g.kod}>
          <a href={`#/e/${evren}/k/${g.kod}`}><strong>{g.ad}</strong></a> <KararRozeti karar={g.karar} />
          {g.cozum && <div class="kucuk">Seçilen: {g.cozum}</div>}
          {g.gerekce && <div class="kucuk soluk">Çünkü: {g.gerekce}</div>}
          {g.etkilenen.length > 0 && <div class="kucuk soluk">Etkilediği: {g.etkilenen.map((b, i) => <>{i > 0 && ', '}<a href={`#/e/${evren}/k/${b.kod}`}>{b.ad}</a></>)}</div>}
        </li>
      ))}
    </ul>
  );
}

function YazarKaydiFormu({ istemci, evren, tur, bagla = null }: { istemci: Istemci; evren: string; tur: 'acik_mesele' | 'gerekce'; bagla?: string | null }) {
  const [ad, setAd] = useState('');
  const [onemli, setOnemli] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const ipucu = tur === 'acik_mesele' ? 'Yeni açık mesele (soru olarak)' : 'Hangi soruya karar verdin?';
  return (
    <form class="satir" onSubmit={(e) => {
      e.preventDefault();
      istemci.iste('yazarKaydiEkle', { evren, tur, ad, bagla, onemli }).then(() => { setAd(''); setOnemli(false); setHata(null); }, (x) => setHata(hataYaz(x)));
    }}>
      <input class="girdi" style="flex:1;min-width:180px" placeholder={ipucu} aria-label={ipucu} lang="tr" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
      {tur === 'acik_mesele' && <label class="kucuk satir"><input type="checkbox" checked={onemli} onChange={(e) => setOnemli((e.target as HTMLInputElement).checked)} /> Önemli</label>}
      <button class="dugme kucuk" type="submit" disabled={!ad.trim()}>Ekle</button>
      {hata && <span class="hata kucuk">{hata}</span>}
    </form>
  );
}

/** Kayıt sayfasında: bu kayda bağlı açık meseleler ve gerekçeler. */
export function KayitMeseleleri({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const l = useOku<MeseleListesi>(istemci, evren, () => istemci.iste('meseleler', { evren, kod: kayit.kod }), [kayit.kod]);
  const [ekle, setEkle] = useState<'acik_mesele' | 'gerekce' | null>(null);
  if (!l || kayit.tur === 'acik_mesele' || kayit.tur === 'gerekce') return null;
  return (
    <section class="kayit-meseleleri" aria-label="Açık meseleler ve gerekçeler">
      <div class="satir">
        <h2>Açık meseleler ve gerekçeler</h2>
        <span class="bosluk" />
        <button class="dugme sade kucuk" onClick={() => setEkle('acik_mesele')}>Açık mesele ekle</button>
        <button class="dugme sade kucuk" onClick={() => setEkle('gerekce')}>Gerekçe ekle</button>
      </div>
      {ekle && <YazarKaydiFormu istemci={istemci} evren={evren} tur={ekle} bagla={kayit.kod} />}
      {l.meseleler.length > 0 && <MeseleListe istemci={istemci} evren={evren} liste={l.meseleler} />}
      {l.gerekceler.length > 0 && <GerekceListe evren={evren} liste={l.gerekceler} />}
      {!l.meseleler.length && !l.gerekceler.length && !ekle && <p class="soluk kucuk">Bu kayıtla ilgili düşünülecek bir soru ya da verilmiş bir kararın gerekçesi yok.</p>}
    </section>
  );
}

// ---------- Masa: Dünya Pusulası, başlangıç ve önemli meseleler ----------
export function MasaPusulasi({ istemci, evren, kayitSayisi }: { istemci: Istemci; evren: string; kayitSayisi: number }) {
  const sorular = useOku(istemci, evren, () => istemci.iste('evrenSorulari', { evren }), [evren]);
  const l = useOku<MeseleListesi>(istemci, evren, () => istemci.iste('meseleler', { evren }), [evren]);
  const [hata, setHata] = useState<string | null>(null);
  if (!sorular || !l) return null;
  const set = (k: string) => sorular.find((s) => s.kod === k)!;
  const baslangic = set('baslangic');
  const baslangicAcik = kayitSayisi < 5 && baslangic.sorular.some((q) => !q.cevap);
  const onemli = l.meseleler.filter((m) => m.onemli && m.durum === 'dusunulecek');
  const liste = (k: string) => <ul class="soru-listesi">{set(k).sorular.map((q) => <SoruSatir key={q.kod} istemci={istemci} evren={evren} kod="evren" q={q} hata={setHata} />)}</ul>;
  return (
    <>
      {baslangicAcik && (
        <section class="kart masa-bolum" aria-label="Başlangıç">
          <div class="satir"><h2>Başlamak için</h2><span class="bosluk" />
            <button class="dugme sade kucuk" onClick={() => Promise.all(baslangic.sorular.filter((q) => !q.cevap).map((q) => istemci.iste('soruCevapla', { evren, kod: 'evren', soru: q.kod, durum: 'sonra' })))}>Atla</button></div>
          <p class="soluk kucuk">İstersen bu üç soruyla başla; istersen bir dinle, bir haritayla ya da bir tarihle. Atlamak hiçbir şeyi bozmaz.</p>
          {liste('baslangic')}
        </section>
      )}
      {onemli.length > 0 && (
        <section class="masa-bolum" aria-label="Önemli açık meseleler">
          <div class="satir"><h2>Önemli açık meseleler</h2><span class="bosluk" /><a class="kucuk" href={`#/e/${evren}/meseleler`}>Hepsi</a></div>
          <MeseleListe istemci={istemci} evren={evren} liste={onemli} />
        </section>
      )}
      <section class="masa-bolum pusula" aria-label="Dünya Pusulası">
        <details open={set('pusula').sorular.some((q) => q.cevap?.durum === 'cevaplandi')}>
          <summary><h2 style="display:inline">Dünya Pusulası</h2></summary>
          <p class="soluk kucuk">Evrenin beş temel sorusu. Cevaplarını istediğin zaman yazıp değiştirebilirsin.</p>
          {liste('pusula')}
          <details class="alt-set"><summary class="kucuk">Evren kurma rehberi</summary>{liste('rehber')}</details>
          <details class="alt-set"><summary class="kucuk">Haritasız evren büyütme</summary>{liste('haritasiz')}</details>
        </details>
        {hata && <p class="hata kucuk">{hata}</p>}
      </section>
    </>
  );
}
