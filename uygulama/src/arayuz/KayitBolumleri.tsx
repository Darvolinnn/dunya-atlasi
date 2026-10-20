// Kayıt sayfasının bölümleri: evren tarihi, görseller, ilişkiler, sahne olayı ve değişimler, notu kayda dönüştürme.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { DegisimSatiri, IliskiSatiri, Kayit, SahneOlayBilgisi } from '../veri/api';
import { farkYazisi, paralelYazilar, tarihAciklamasi, tarihCoz, type EvrenTarihi, type ZamanSeti } from '../alan/tarih';
import { ILISKI_SECENEKLERI, iliskiTuruBul } from '../alan/iliski-turleri';
import { turBul } from '../alan/turler';
import { BaglantiSecici, type Secim } from './BaglantiSecici';
import { KararRozeti, KararSecici, TurSecici } from './ortak';
import { Gorsel, gorselAdresi } from './gorsel';
import { git } from './Uygulama';
import { takvimOrnegi, useTakvim } from './Takvim';
import { gorseldeIsaretle } from './Harita';
import { EtkiRaporuPaneli } from './Gorunumler';
import { DegisiklikMasasiPaneli } from './DegisiklikMasasi';
import { GorunurlukAlani, GorunurlukRozeti } from './Bilgiler';
import { SureklilikDefteri } from './Sureklilik';
import { onayla } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;

// ---------- Evren tarihi ----------
export function TarihAlani({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const goreli = kayit.tarih?.bicim === 'goreli';
  const [yerel, setYerel] = useState(goreli ? '' : kayit.tarih?.ifade ?? '');
  const [kip, setKip] = useState<'yaz' | 'goreli'>(goreli ? 'goreli' : 'yaz');
  const [hata, setHata] = useState<string | null>(null);
  // Tarih değişince etki raporu (§9.2): önceki ifade saklanır, böylece tek dokunuşla geri dönülebilir (T4).
  const [etki, setEtki] = useState<{ once: string | null } | null>(null);
  // Kayıttaki tarih değişince girdi ona döner. İlk çizimde çalışmaz: açılır açılmaz yazılan tarih silinmesin.
  const sonTarih = useRef(`${kayit.tarih?.bicim}|${kayit.tarih?.ifade}`);
  useEffect(() => {
    const t = `${kayit.tarih?.bicim}|${kayit.tarih?.ifade}`;
    if (t === sonTarih.current) return;
    sonTarih.current = t;
    setYerel(kayit.tarih?.bicim === 'goreli' ? '' : kayit.tarih?.ifade ?? ''); setKip(kayit.tarih?.bicim === 'goreli' ? 'goreli' : 'yaz');
  }, [kayit.tarih?.ifade, kayit.tarih?.bicim]);
  const [masa, setMasa] = useState(false);
  useEffect(() => { setEtki(null); setMasa(false); }, [kayit.kod]);
  const z = useTakvim(istemci, evren);
  const onizleme = tarihCoz(yerel, z);
  const bitir = async () => {
    const once = goreli ? '' : kayit.tarih?.ifade ?? '';
    if (yerel.trim() === once) return;
    try {
      await istemci.iste('kayitTarih', { evren, kod: kayit.kod, ifade: yerel });
      setHata(null);
      if (once) setEtki({ once });
    } catch (e) { setHata(hataYaz(e)); }
  };
  const sahneden = !kayit.tarih && kayit.sahneOlayi && kayit.sahneTarihi;
  const gosterilen = kip === 'yaz' ? onizleme : kayit.tarih;
  const paralel = gosterilen ? paralelYazilar(gosterilen, z) : [];
  return (
    <div class="alan">
      <span class="alan-adi satir">Evren tarihi
        <KararSecici etiket="Evren tarihi" karar={kayit.alanKararlari.tarih ?? 'kesin'} onDegis={(k) => istemci.iste('alanKarari', { evren, kod: kayit.kod, alan: 'tarih', karar: k })} />
        <span class="bosluk" />
        <button class="dugme sade kucuk" onClick={() => setKip(kip === 'yaz' ? 'goreli' : 'yaz')}>{kip === 'yaz' ? 'Bir olaya göre ver' : 'Tarihi yaz'}</button>
      </span>
      {kip === 'yaz' ? <>
        <input class="girdi" aria-label="Evren tarihi" value={yerel} lang="tr" placeholder={sahneden ? `${kayit.sahneTarihi!.ifade} (sahneden)` : goreli ? kayit.tarih!.ifade : takvimOrnegi(z)}
          onInput={(e) => setYerel((e.target as HTMLInputElement).value)} onBlur={bitir}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        <span class="soluk kucuk">
          {sahneden ? <>Tarih sahneden geliyor: <a href={`#/e/${evren}/k/${kayit.sahneOlayi}`}>{tarihAciklamasi(kayit.sahneTarihi!, z)}</a></>
            : onizleme ? tarihAciklamasi(onizleme, z) : goreli ? <>Tarih şu an bir olaya göre verilmiş; buraya yazarsanız onun yerine geçer.</> : <>Takvimi “Takvim” sayfasından tanımlayabilirsiniz.</>}
        </span>
      </> : <GoreliTarih istemci={istemci} evren={evren} kayit={kayit} z={z} />}
      {paralel.map((p) => <span class="soluk kucuk tarih-paralel">{p.takvim}: {p.yazi}</span>)}
      {hata && <span class="hata kucuk">{hata}</span>}
      {!etki && !masa && kayit.tarih && <span class="satir">
        <button class="dugme sade kucuk" onClick={() => setEtki({ once: null })}>Bu tarih değişirse neler etkilenir?</button>
        {kayit.tarih.eksen && <button class="dugme sade kucuk" onClick={() => setMasa(true)}>Değişiklik masasında dene</button>}
      </span>}
      {masa && <DegisiklikMasasiPaneli istemci={istemci} evren={evren} kayit={kayit} kapat={() => setMasa(false)} />}
      {etki && <EtkiRaporuPaneli istemci={istemci} evren={evren} kod={kayit.kod} once={etki.once}
        geriAl={etki.once ? async () => { await istemci.iste('kayitTarih', { evren, kod: kayit.kod, ifade: etki.once! }); setEtki(null); } : null}
        kapat={() => setEtki(null)} />}
    </div>
  );
}

/**
 * Göreli ve çapalı tarih (§3.4): bir ya da birkaç olaya göre ("Tufan'dan 80–120 yıl sonra", "Kralın ölümünden önce").
 * Olası aralığı program hesaplar; dayanağın tarihi değişince kayar. Kısıtlar çelişirse çelişen zincir gösterilir.
 */
function GoreliTarih({ istemci, evren, kayit, z }: { istemci: Istemci; evren: string; kayit: Kayit; z: ZamanSeti }) {
  type Satir = { olay: Secim | null; fark: string };
  const ilk = (): Satir[] => kayit.tarih?.bicim === 'goreli' ? (kayit.tarih.kisitlar ?? []).map((k) => ({ olay: { kod: k.olay, ad: '…' }, fark: farkYazisi(k) })) : [{ olay: null, fark: 'sonra' }];
  const [satirlar, setSatirlar] = useState<Satir[]>(ilk);
  const [hata, setHata] = useState<string | null>(null);
  const [degisti, setDegisti] = useState(false);
  useEffect(() => {
    setSatirlar(ilk()); setDegisti(false);
    // Dayanakların adları
    const k = kayit.tarih?.kisitlar ?? [];
    Promise.all(k.map((x) => istemci.iste('kayit', { evren, kod: x.olay }).then((r) => ({ kod: r.kod, ad: r.ad }), () => ({ kod: x.olay, ad: 'Silinmiş kayıt' }))))
      .then((adlar) => setSatirlar((s) => s.map((x, i) => (adlar[i] && x.olay?.kod === k[i]?.olay ? { ...x, olay: adlar[i] } : x))));
  }, [kayit.kod, JSON.stringify(kayit.tarih?.kisitlar ?? null)]);
  const degis = (i: number, f: (s: Satir) => Satir) => { setSatirlar(satirlar.map((s, j) => (j === i ? f(s) : s))); setDegisti(true); };
  const kaydet = async () => {
    try {
      const k = satirlar.filter((s) => s.olay);
      if (!k.length) throw new Error('En az bir olay seçin.');
      await istemci.iste('kayitTarih', { evren, kod: kayit.kod, kisitlar: k.map((s) => ({ olay: s.olay!.kod, fark: s.fark })) });
      setHata(null); setDegisti(false);
    } catch (e) { setHata(hataYaz(e)); }
  };
  const t = kayit.tarih?.bicim === 'goreli' ? kayit.tarih : null;
  return (
    <div>
      <ul class="goreli-kisitlar">
        {satirlar.map((s, i) => (
          <li class="satir" key={i}>
            <KayitSec istemci={istemci} evren={evren} secili={s.olay} sec={(x) => degis(i, (y) => ({ ...y, olay: x }))} etiket="Olay seç" />
            <input class="girdi" style="flex:1;min-width:140px" lang="tr" aria-label="Fark" value={s.fark} placeholder="sonra · 14 gün sonra · 80–120 yıl önce"
              onInput={(e) => degis(i, (y) => ({ ...y, fark: (e.target as HTMLInputElement).value }))} />
            {satirlar.length > 1 && <button class="dugme sade kucuk tehlikeli" onClick={() => { setSatirlar(satirlar.filter((_, j) => j !== i)); setDegisti(true); }}>Kaldır</button>}
          </li>
        ))}
      </ul>
      <div class="satir">
        <button class="dugme kucuk" onClick={() => { setSatirlar([...satirlar, { olay: null, fark: 'önce' }]); setDegisti(true); }}>Kısıt ekle</button>
        <button class="dugme ana kucuk" disabled={!degisti} onClick={kaydet}>Kaydet</button>
      </div>
      <p class="soluk kucuk">Fark yazılmazsa yalnızca önce mi sonra mı olduğu bilinir. Yıl olarak yazılan fark yıl olarak kalır; program gün uydurmaz. Hesaplanan aralık bir olasılık değil, yalnızca kısıtların izin verdiği aralıktır.</p>
      {t && !degisti && <p class={t.celiski ? 'hata kucuk' : 'kucuk'}>
        {t.ifade}. {tarihAciklamasi(t, z)}{t.celiski && t.celiskiAdlari ? `. Çelişen kısıt zinciri: ${t.celiskiAdlari.join(' → ')}` : ''}.</p>}
      {hata && <span class="hata kucuk">{hata}</span>}
    </div>
  );
}
export const tarihKisa = (t: EvrenTarihi | null) => t ? t.ifade : '';

// ---------- Görseller ----------
export function Gorseller({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(0);
  const [buyuk, setBuyuk] = useState<string | null>(null);
  const [ustunde, setUstunde] = useState(false);
  const dosyaGirdisi = useRef<HTMLInputElement>(null);

  const ekle = async (dosyalar: FileList | File[]) => {
    setHata(null);
    for (const f of [...dosyalar]) {
      setYukleniyor((n) => n + 1);
      try {
        await istemci.iste('gorselEkle', { evren, kod: kayit.kod, dosyaAdi: f.name, tur: f.type, veri: new Uint8Array(await f.arrayBuffer()) });
      } catch (e) { setHata(`${f.name}: ${hataYaz(e)}`); }
      finally { setYukleniyor((n) => n - 1); }
    }
  };

  return (
    <section class={`gorseller${ustunde ? ' ustunde' : ''}`} aria-label="Görseller"
      onDragOver={(e) => { e.preventDefault(); setUstunde(true); }} onDragLeave={() => setUstunde(false)}
      onDrop={(e) => { e.preventDefault(); setUstunde(false); if (e.dataTransfer?.files.length) void ekle(e.dataTransfer.files); }}>
      <div class="satir">
        <h2>Görseller</h2>
        <span class="bosluk" />
        <button class="dugme kucuk" onClick={() => dosyaGirdisi.current?.click()}>Görsel ekle</button>
        <input ref={dosyaGirdisi} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden
          onChange={(e) => { const f = (e.target as HTMLInputElement).files; if (f?.length) void ekle(f); (e.target as HTMLInputElement).value = ''; }} />
      </div>
      {kayit.gorseller.length === 0 && !yukleniyor && <p class="soluk kucuk">Görsel yok. Dosyayı buraya sürükleyebilir ya da “Görsel ekle”ye basabilirsiniz. Fotoğraflardaki konum bilgisi eklenirken silinir.</p>}
      <div class="gorsel-izgara">
        {kayit.gorseller.map((ad) => (
          <button key={ad} class="gorsel-kucuk" onClick={() => setBuyuk(ad)} aria-label="Görseli büyüt">
            <Gorsel istemci={istemci} evren={evren} ad={ad} alt="" />
          </button>
        ))}
        {yukleniyor > 0 && <span class="gorsel-kucuk yukleniyor soluk kucuk">Ekleniyor…</span>}
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      {buyuk && <GorselGorunumu istemci={istemci} evren={evren} ad={buyuk} kapat={() => setBuyuk(null)}
        isaretle={() => gorseldeIsaretle(istemci, evren, kayit.kod, buyuk).catch((e) => setHata(hataYaz(e)))}
        cikar={async () => { if (!(onayla('Bu görsel kayıttan çıkarılsın mı?'))) return; await istemci.iste('kayitGorselCikar', { evren, kod: kayit.kod, ad: buyuk }); setBuyuk(null); }} />}
    </section>
  );
}

function GorselGorunumu({ istemci, evren, ad, kapat, cikar, isaretle }: { istemci: Istemci; evren: string; ad: string; kapat: () => void; cikar: () => void; isaretle: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { gorselAdresi(istemci, evren, ad, false).then((x) => setUrl(x.url)); }, [ad]);
  useEffect(() => {
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') kapat(); };
    addEventListener('keydown', tus);
    return () => removeEventListener('keydown', tus);
  }, []);
  return (
    <div class="perde" role="dialog" aria-label="Görsel" onClick={(e) => { if (e.target === e.currentTarget) kapat(); }}>
      <div class="perde-ic">
        <div class="satir">
          <span class="bosluk" />
          <button class="dugme" onClick={isaretle}>Üzerinde işaretle</button>
          {url && <a class="dugme" href={url} download>İndir</a>}
          <button class="dugme tehlikeli" onClick={cikar}>Kayıttan çıkar</button>
          <button class="dugme" onClick={kapat} autoFocus>Kapat</button>
        </div>
        {url ? <img src={url} alt="" class="gorsel-buyuk" /> : <p class="soluk">Açılıyor…</p>}
      </div>
    </div>
  );
}

// ---------- Kayıt seçme düğmesi ----------
export function KayitSec({ istemci, evren, secili, sec, etiket = 'Kayıt seç' }: {
  istemci: Istemci; evren: string; secili: Secim | null; sec: (s: Secim | null) => void; etiket?: string;
}) {
  const [konum, setKonum] = useState<{ left: number; top: number } | null>(null);
  return (
    <>
      <button type="button" class="dugme" onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setKonum({ left: r.left, top: r.bottom + 4 }); }}>
        {secili ? secili.ad : etiket}
      </button>
      {konum && <BaglantiSecici istemci={istemci} evren={evren} sorgu="" konum={konum}
        sec={(s) => { sec({ kod: s.kod, ad: s.ad }); setKonum(null); }} kapat={() => setKonum(null)} />}
    </>
  );
}

// ---------- İlişkiler ----------
const aralikYaz = (i: IliskiSatiri) => i.baslangic || i.bitis ? `${i.baslangic?.ifade ?? '…'} – ${i.bitis?.ifade ?? '…'}` : '';

/** gizli: bölüm boşken çizilmez (Aşama C); sayiBildir görünen ilişki sayısını bildirir; formAcik ekleme formuyla açar. */
export function Iliskiler({ istemci, evren, kayit, surum, gizli = false, sayiBildir, formAcik = false }: {
  istemci: Istemci; evren: string; kayit: Kayit; surum: number; gizli?: boolean; sayiBildir?: (n: number) => void; formAcik?: boolean;
}) {
  const [liste, setListe] = useState<IliskiSatiri[] | null>(null);
  const [ekle, setEkle] = useState(formAcik);
  useEffect(() => { if (formAcik) setEkle(true); }, [formAcik]);
  useEffect(() => { istemci.iste('iliskiler', { evren, kod: kayit.kod }).then(setListe); }, [kayit.kod, surum]);
  // Sahne katılımcıları ve anlatılan olaylar sahne bölümünde gösterilir.
  // Mekân, bakış açısı, anlatıcı ve odak sahnenin alanlarında gösterilir.
  const gorunen = !liste ? null : kayit.tur === 'sahne' ? liste.filter((i) => !(i.ben === 'b' && ['sahnede', 'bakis', 'anlatici', 'odak'].includes(i.tur)) && !(i.ben === 'a' && ['anlatir', 'sahne_yeri'].includes(i.tur))) : liste;
  useEffect(() => { if (gorunen) sayiBildir?.(gorunen.length); }, [gorunen?.length]);
  if (!gorunen || gizli) return null;
  return (
    <section class="iliskiler" aria-label="İlişkiler">
      <div class="satir">
        <h2>İlişkiler</h2>
        <span class="bosluk" />
        {!ekle && <button class="dugme kucuk" onClick={() => setEkle(true)}>İlişki ekle</button>}
      </div>
      {ekle && <IliskiFormu istemci={istemci} evren={evren} ben={kayit.kod} kapat={() => setEkle(false)} />}
      {gorunen.length === 0 && !ekle && <p class="soluk kucuk">Henüz ilişki yok. Aile, üyelik, sahiplik, düşmanlık gibi bağları buradan kurun. İlişkiler metindeki bağlantılardan ayrı tutulur.</p>}
      {gorunen.length > 0 && (
        <ul class="iliski-listesi">
          {gorunen.map((i) => <IliskiSatir key={i.kod} istemci={istemci} evren={evren} i={i} />)}
        </ul>
      )}
    </section>
  );
}

function IliskiSatir({ istemci, evren, i }: { istemci: Istemci; evren: string; i: IliskiSatiri }) {
  const [ac, setAc] = useState(false);
  const tur = turBul(i.karsi.tur);
  return (
    <li class={`karar-satir-${i.karar}`}>
      <div class="satir">
        <span class="iliski-etiket soluk">{i.etiket}{i.rolAdi ? ` (${i.rolAdi.toLocaleLowerCase('tr-TR')})` : ''}</span>
        <a href={`#/e/${evren}/k/${i.karsi.kod}`} title={tur.ad}>{i.karsi.ad}</a>
        <KararRozeti karar={i.karar} />
        <GorunurlukRozeti g={i.gorunurluk} />
        {aralikYaz(i) && <span class="soluk kucuk">{aralikYaz(i)}</span>}
        {i.aciklama && <span class="soluk kucuk">· {i.aciklama}</span>}
        <span class="bosluk" />
        <button class="dugme sade kucuk" aria-expanded={ac} onClick={() => setAc(!ac)}>{ac ? 'Kapat' : 'Düzenle'}</button>
      </div>
      {i.uyari && <p class="uyari kucuk">{i.uyari}</p>}
      {ac && (
        <div class="iliski-duzenle">
          <SatirGirdisi etiket="Başlangıç" deger={i.baslangic?.ifade ?? ''} ipucu="Örn. 412" kaydet={(v) => istemci.iste('iliskiDegistir', { evren, kod: i.kod, alan: 'baslangic', deger: v })} />
          <SatirGirdisi etiket="Bitiş" deger={i.bitis?.ifade ?? ''} ipucu="Sürüyorsa boş bırakın" kaydet={(v) => istemci.iste('iliskiDegistir', { evren, kod: i.kod, alan: 'bitis', deger: v })} />
          <SatirGirdisi etiket="Açıklama" deger={i.aciklama} kaydet={(v) => istemci.iste('iliskiDegistir', { evren, kod: i.kod, alan: 'aciklama', deger: v })} />
          {iliskiTuruBul(i.tur).roller && (
            <label class="alan"><span class="alan-adi">{iliskiTuruBul(i.tur).rolIstegeBagli ? 'Niteliği' : 'Rol'}</span>
              <select class="girdi" value={i.rol ?? ''} onChange={(e) => istemci.iste('iliskiDegistir', { evren, kod: i.kod, alan: 'rol', deger: (e.target as HTMLSelectElement).value })}>
                {iliskiTuruBul(i.tur).rolIstegeBagli && <option value="">Belirtilmemiş</option>}
                {iliskiTuruBul(i.tur).roller!.map((r) => <option value={r.kod}>{r.ad}</option>)}
              </select></label>
          )}
          <label class="alan"><span class="alan-adi">Karar durumu</span>
            <KararSecici etiket="İlişki" karar={i.karar} onDegis={(k) => istemci.iste('iliskiDegistir', { evren, kod: i.kod, alan: 'karar', deger: k })} /></label>
          <GorunurlukAlani istemci={istemci} evren={evren} kod={i.kod} nesne="iliski" deger={i.gorunurluk} />
          <button class="dugme tehlikeli kucuk" onClick={() => onayla('Bu ilişki kaldırılsın mı?') && istemci.iste('iliskiSil', { evren, kod: i.kod })}>İlişkiyi kaldır</button>
        </div>
      )}
    </li>
  );
}

export function SatirGirdisi({ etiket, deger, kaydet, ipucu }: { etiket: string; deger: string; kaydet: (v: string) => Promise<unknown>; ipucu?: string }) {
  const [yerel, setYerel] = useState(deger);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => setYerel(deger), [deger]);
  return (
    <label class="alan"><span class="alan-adi">{etiket}</span>
      <input class="girdi" value={yerel} placeholder={ipucu} lang="tr" onInput={(e) => setYerel((e.target as HTMLInputElement).value)}
        onBlur={async () => { if (yerel !== deger) { try { await kaydet(yerel); setHata(null); } catch (e) { setHata(hataYaz(e)); } } }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      {hata && <span class="hata kucuk">{hata}</span>}
    </label>
  );
}

const GRUPLAR = [...new Set(ILISKI_SECENEKLERI.map((s) => s.grup))];

function IliskiFormu({ istemci, evren, ben, kapat, varsayilan = 'ilgili:a', karsiVarsayilan = null }: {
  istemci: Istemci; evren: string; ben: string; kapat: () => void; varsayilan?: string; karsiVarsayilan?: Secim | null;
}) {
  const [secenek, setSecenek] = useState(varsayilan);
  const [karsi, setKarsi] = useState<Secim | null>(karsiVarsayilan);
  const [rol, setRol] = useState<string | null>(null);
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [turKod, yon] = secenek.split(':');
  const tur = iliskiTuruBul(turKod);
  useEffect(() => setRol(tur.rolIstegeBagli ? null : tur.roller?.[0]?.kod ?? null), [turKod]);
  const kaydet = async (e: Event) => {
    e.preventDefault();
    if (!karsi) return;
    try {
      const [a, b] = yon === 'a' ? [ben, karsi.kod] : [karsi.kod, ben];
      await istemci.iste('iliskiEkle', { evren, tur: turKod, a, b, rol, baslangic, bitis, aciklama });
      kapat();
    } catch (err) { setHata(hataYaz(err)); }
  };
  return (
    <form class="kart iliski-formu" onSubmit={kaydet}>
      <div class="satir">
        <select class="girdi" style="flex:1;min-width:160px" aria-label="İlişki türü" value={secenek} onChange={(e) => setSecenek((e.target as HTMLSelectElement).value)}>
          {GRUPLAR.map((g) => <optgroup label={g}>{ILISKI_SECENEKLERI.filter((s) => s.grup === g).map((s) => <option value={s.deger}>{s.etiket}</option>)}</optgroup>)}
        </select>
        <KayitSec istemci={istemci} evren={evren} secili={karsi} sec={setKarsi} />
        {tur.roller && (
          <select class="girdi" style="flex:1;min-width:140px" aria-label={tur.rolIstegeBagli ? 'Niteliği' : 'Rol'} value={rol ?? ''} onChange={(e) => setRol((e.target as HTMLSelectElement).value || null)}>
            {tur.rolIstegeBagli && <option value="">Niteliği belirtilmemiş</option>}
            {tur.roller.map((r) => <option value={r.kod}>{r.ad}</option>)}
          </select>
        )}
      </div>
      <div class="satir">
        <input class="girdi" style="flex:1;min-width:120px" placeholder="Başlangıç (isteğe bağlı)" aria-label="Başlangıç" value={baslangic} onInput={(e) => setBaslangic((e.target as HTMLInputElement).value)} />
        <input class="girdi" style="flex:1;min-width:120px" placeholder="Bitiş (isteğe bağlı)" aria-label="Bitiş" value={bitis} onInput={(e) => setBitis((e.target as HTMLInputElement).value)} />
        <input class="girdi" style="flex:2;min-width:160px" placeholder="Açıklama (isteğe bağlı)" aria-label="Açıklama" value={aciklama} lang="tr" onInput={(e) => setAciklama((e.target as HTMLInputElement).value)} />
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button class="dugme ana" type="submit" disabled={!karsi}>Ekle</button>
        <button class="dugme" type="button" onClick={kapat}>Vazgeç</button>
      </div>
    </form>
  );
}

// ---------- Sahne: katılımcılar, olaylar ve değişimler ----------
export function SahneBolumu({ istemci, evren, kayit, surum }: { istemci: Istemci; evren: string; kayit: Kayit; surum: number }) {
  const [olaylar, setOlaylar] = useState<SahneOlayBilgisi[] | null>(null);
  const [katilimcilar, setKatilimcilar] = useState<IliskiSatiri[]>([]);
  const [katilimciEkle, setKatilimciEkle] = useState(false);
  useEffect(() => {
    istemci.iste('sahneOlaylari', { evren, sahne: kayit.kod }).then(setOlaylar);
    istemci.iste('iliskiler', { evren, kod: kayit.kod }).then((l) => setKatilimcilar(l.filter((i) => i.tur === 'sahnede' && i.ben === 'b')));
  }, [kayit.kod, surum]);
  if (!olaylar) return null;
  return (
    <section class="sahne-bolumu" aria-label="Sahne">
      <div class="satir">
        <h2>Sahnedekiler</h2>
        <span class="bosluk" />
        {!katilimciEkle && <button class="dugme kucuk" onClick={() => setKatilimciEkle(true)}>Katılımcı ekle</button>}
      </div>
      {katilimciEkle && <IliskiFormu istemci={istemci} evren={evren} ben={kayit.kod} varsayilan="sahnede:b" kapat={() => setKatilimciEkle(false)} />}
      {katilimcilar.length === 0 && !katilimciEkle && <p class="soluk kucuk">Sahnede bulunan, adı anılan ya da hatırlanan kayıtları ekleyin.</p>}
      <ul class="iliski-listesi">
        {katilimcilar.map((i) => <IliskiSatir key={i.kod} istemci={istemci} evren={evren} i={{ ...i, etiket: i.rolAdi ?? 'Sahnede', rolAdi: null }} />)}
      </ul>

      <h2 style="margin-top:16px">Bu sahnede olanlar</h2>
      <p class="soluk kucuk">Sahnedeki değişimleri yazın (“eli yaralandı”, “kılıç Mira'ya geçti”). Ayrı bir olay açmanız gerekmez; değişim sahnenin kendi olayına bağlanır.</p>
      {olaylar.map((o) => (
        <div class="sahne-olayi" key={o.kod}>
          <div class="satir">
            <a href={`#/e/${evren}/k/${o.kod}`}><strong>{o.ad}</strong></a>
            {o.tarih && <span class="soluk kucuk">{o.tarih.ifade}</span>}
            {!o.sahneOlayi && <span class="rozet">başka sahnede de anlatılıyor</span>}
          </div>
          <DegisimListesi istemci={istemci} evren={evren} liste={o.degisimler} konuGoster />
        </div>
      ))}
      <DegisimFormu istemci={istemci} evren={evren} sahne={kayit.kod} olaylar={olaylar} />
      <SureklilikDefteri istemci={istemci} evren={evren} sahne={kayit.kod} olaylar={olaylar} surum={surum} />
    </section>
  );
}

function DegisimFormu({ istemci, evren, sahne, olaylar }: { istemci: Istemci; evren: string; sahne: string; olaylar: SahneOlayBilgisi[] }) {
  const [metin, setMetin] = useState('');
  const [konu, setKonu] = useState<Secim | null>(null);
  const [olay, setOlay] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const kaydet = async (e: Event) => {
    e.preventDefault();
    if (!metin.trim()) return;
    try {
      await istemci.iste('degisimEkle', { evren, sahne, olay: olay || null, konu: konu?.kod ?? null, metin });
      setMetin(''); setHata(null);
    } catch (err) { setHata(hataYaz(err)); }
  };
  const baskaOlay = olaylar.filter((o) => !o.sahneOlayi);
  return (
    <form class="satir degisim-formu" onSubmit={kaydet}>
      <KayitSec istemci={istemci} evren={evren} secili={konu} sec={setKonu} etiket="Kimde / neyde (isteğe bağlı)" />
      {konu && <button type="button" class="dugme sade kucuk" onClick={() => setKonu(null)} aria-label="Seçimi kaldır">×</button>}
      <input class="girdi" style="flex:2;min-width:180px" placeholder="Ne değişti?" aria-label="Değişim" value={metin} lang="tr" onInput={(e) => setMetin((e.target as HTMLInputElement).value)} />
      {baskaOlay.length > 0 && (
        <select class="girdi" style="flex:1;min-width:140px" aria-label="Hangi olaya" value={olay} onChange={(e) => setOlay((e.target as HTMLSelectElement).value)}>
          <option value="">Sahne olayına</option>
          {baskaOlay.map((o) => <option value={o.kod}>{o.ad}</option>)}
        </select>
      )}
      <button class="dugme ana" type="submit" disabled={!metin.trim()}>Kaydet</button>
      {hata && <span class="hata kucuk">{hata}</span>}
    </form>
  );
}

function DegisimListesi({ istemci, evren, liste, konuGoster, olayGoster }: { istemci: Istemci; evren: string; liste: DegisimSatiri[]; konuGoster?: boolean; olayGoster?: boolean }) {
  if (!liste.length) return null;
  return (
    <ul class="degisim-listesi">
      {liste.map((d) => (
        <li key={d.kod} class="satir">
          {konuGoster && d.konu && <a href={`#/e/${evren}/k/${d.konu.kod}`}>{d.konu.ad}:</a>}
          <span>{d.metin}</span>
          <KararRozeti karar={d.karar} />
          {olayGoster && <span class="soluk kucuk">· <a href={`#/e/${evren}/k/${d.sahne?.kod ?? d.olay.kod}`}>{d.sahne?.ad ?? d.olay.ad}</a>{d.tarih ? ` · ${d.tarih.ifade}` : ''}</span>}
          <span class="bosluk" />
          <button class="dugme sade kucuk" aria-label="Değişimi kaldır" onClick={() => onayla('Bu değişim kaldırılsın mı?') && istemci.iste('degisimSil', { evren, kod: d.kod })}>×</button>
        </li>
      ))}
    </ul>
  );
}

export function KayitDegisimleri({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [liste, setListe] = useState<DegisimSatiri[]>([]);
  useEffect(() => { istemci.iste('kayitDegisimleri', { evren, kod }).then(setListe); }, [kod, surum]);
  if (!liste.length) return null;
  return (
    <section class="degisimler" aria-label="Geçirdiği değişimler">
      <h2>Geçirdiği değişimler</h2>
      <p class="soluk kucuk">Sahnelerde yazılan değişimler, evren tarihine göre sıralı.</p>
      <DegisimListesi istemci={istemci} evren={evren} liste={liste} olayGoster />
    </section>
  );
}

// ---------- Not → kayıt ----------
export function NotDonustur({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const [ac, setAc] = useState(false);
  const [ad, setAd] = useState(kayit.ad.replace(/…$/, ''));
  const [tur, setTur] = useState('karakter');
  const [hata, setHata] = useState<string | null>(null);
  if (!ac) return <button class="dugme" onClick={() => setAc(true)}>Kayda dönüştür</button>;
  return (
    <form class="kart satir not-donustur" onSubmit={async (e) => {
      e.preventDefault();
      try { const { kod } = await istemci.iste('nottanKayit', { evren, not: kayit.kod, ad, tur }); git(`/e/${evren}/k/${kod}`); }
      catch (err) { setHata(hataYaz(err)); }
    }}>
      <span class="soluk kucuk" style="flex-basis:100%">Notun metni yeni kayda kopyalanır. Not yerinde kalır ve yeni kayda bağlanır.</span>
      <input class="girdi" style="flex:2;min-width:160px" aria-label="Yeni kaydın adı" value={ad} lang="tr" onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
      <span style="flex:1;min-width:150px"><TurSecici deger={tur} onDegis={setTur} /></span>
      <button class="dugme ana" type="submit" disabled={!ad.trim()}>Dönüştür</button>
      <button class="dugme" type="button" onClick={() => setAc(false)}>Vazgeç</button>
      {hata && <span class="hata kucuk">{hata}</span>}
    </form>
  );
}
