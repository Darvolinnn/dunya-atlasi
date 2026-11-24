// Okur yayını (§11.2, §11.3; K38 E3). Okurun göreceği evren rehberi ayrı bir paket olarak kurulur: ana veritabanı
// okura gitmez, paket yalnız seçilen kapsamdaki bilgilerden yazılır. Kapsam bir eser ve bir sınırdır (bir bölümün
// sonu). "Teslim sınırı" kipinde sınırdan sonra okura açılan hiçbir bilgi pakete girmez; "okuma tercihi" kipinde
// bütün eserin bilgisi pakettedir, okur ileriyi kendisi gizler.
// Okur bir bilendir (§3.6): okurun bilgisi eserin bilgi kayıtlarıdır, zamanı okuma sırasıdır. Gizli gerçek pakete
// yazılmaz; okurun inancı olan kayıt (katmanı eser) okurun inandığı hâliyle girer. Kişi ile kimliğin eşitliği okura
// açıklanana dek iki ayrı sayfadır (§3.12): açıklanma, okurun kimlik kaydına bağlı bir sorunun gerçek cevabını
// öğrenmesi ya da kimlik bağının görünürlüğünde eserin bilenler arasında olmasıdır.
// Paketteki bütün kodlar yayın serisine (esere) özel gizli anahtarla iç kodlardan türetilir; iç kod pakete girmez.
// Paket indirilmeden önce gizli kapsamdaki adlar, lakaplar, eski adlar, iç kodlar ve görsel adları paketin her
// dosyasında aranır (§11.2). Program metinden anlam çıkarmaz (K1): yalnız dizge eşleşir.
import { A } from '../alan/automerge';
import { belgeyeCevir, xmlKacis } from '../alan/cikti';
import { gorunurlukOku, goruyorMu } from '../alan/gorunurluk';
import { iliskiTuruBul, rolAdi } from '../alan/iliski-turleri';
import { kodGecerliMi } from '../alan/kod';
import { sayiDegeriMi, sayiMetni } from '../alan/nicelik';
import { turBul } from '../alan/turler';
import { katla, turkceKarsilastir } from '../alan/turkce';
import type { BilgiSatiri, KisaKayit, OkurKayitDurumu, OkurKimlikEsi, OkurYayini, OkurYayiniAyari, OkurYayiniBaskisi, OkurYayiniKaydi, OkurYayiniTaramasi, SizintiBulgusu } from '../veri/api';
import { eserYapisi } from './anlati';
import { belgeCiktisi, sunumOku } from './belge';
import { bilenBilgileri } from './bilgi';
import type { DurumBaglami } from './durum';
import type { EvrenVt } from './evren-vt';
import { metinBelgesi, yonlendir } from './izdusum';
import { KIMLIK_ILISKISI } from './kimlik';
import { kayitSablonu } from './sablon';

/** Okur rehberine girmeyen türler: anlatının kendisi ve yazar notları. */
const DISARIDA = new Set(['eser', 'bolum', 'sahne', 'seri', 'not']);
const UZANTI: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
export const BOS_AYAR: OkurYayiniAyari = { sinir: null, kip: 'teslim', secimler: {}, gorseller: [], onaylar: [] };

interface Kayitli { ayar: OkurYayiniAyari; anahtar: string; baskilar: OkurYayiniBaskisi[] }
const json = (s: unknown) => { try { return typeof s === 'string' && s ? JSON.parse(s) : null; } catch { return null; } };

export interface YayinBaglami { b: DurumBaglami; medyaOku: (ad: string) => Promise<Uint8Array | null> }

// ---------- Saklanan ayar ----------
export function kayitliOku(e: EvrenVt, eser: string): Kayitli | null {
  const v = json(e.db.selectValue('SELECT veri FROM okur_yayinlari WHERE eser=? AND silindi IS NULL', [eser]));
  if (!v || typeof v !== 'object' || typeof v.anahtar !== 'string') return null;
  return { ayar: ayarDuzelt(v.ayar), anahtar: v.anahtar, baskilar: Array.isArray(v.baskilar) ? v.baskilar : [] };
}

/** Gelen ayarı sınırlar içinde düzeltir; bilinmeyen değerler atılır. */
export function ayarDuzelt(a: unknown): OkurYayiniAyari {
  const v = (a && typeof a === 'object' ? a : {}) as Partial<OkurYayiniAyari>;
  const dizi = (x: unknown, n: number) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string' && y.length <= 200).slice(0, n) : []);
  const secimler: Record<string, string[]> = {};
  if (v.secimler && typeof v.secimler === 'object') for (const [k, l] of Object.entries(v.secimler).slice(0, 5000)) if (kodGecerliMi(k)) secimler[k] = dizi(l, 200);
  return {
    sinir: typeof v.sinir === 'string' && kodGecerliMi(v.sinir) ? v.sinir : null,
    kip: v.kip === 'tercih' ? 'tercih' : 'teslim',
    secimler, gorseller: dizi(v.gorseller, 2000), onaylar: dizi(v.onaylar, 500),
  };
}

// ---------- Kapsam ----------
interface Okuma {
  eser: KisaKayit; sinirSira: number; sonSira: number;
  bolumler: { kod: string; ad: string; sira: number; sonSahne: number }[];
  bolumAdi(sira: number): string | null;
}

function okumaKur(e: EvrenVt, eser: string, sinir: string | null): Okuma {
  const y = eserYapisi(e, eser);
  const bolumler = y.bolumler.map((b) => ({ kod: b.kod, ad: b.ad, sira: b.sira, sonSahne: b.sahneler.length ? b.sahneler[b.sahneler.length - 1].sira : 0 }));
  let onceki = y.dogrudan.length;
  for (const b of bolumler) { if (!b.sonSahne) b.sonSahne = onceki; onceki = b.sonSahne; }
  const sonSira = Math.max(onceki, y.dogrudan.length);
  const s = sinir ? bolumler.find((b) => b.kod === sinir) : undefined;
  const sahneBolumu = new Map<number, { sira: number; ad: string }>();
  for (const b of y.bolumler) for (const x of b.sahneler) sahneBolumu.set(x.sira, { sira: b.sira, ad: b.ad });
  return {
    eser: { kod: eser, ad: y.eser.ad, tur: 'eser' }, sinirSira: s ? s.sonSahne : sonSira, sonSira, bolumler,
    bolumAdi: (sira) => { const b = sahneBolumu.get(sira); return b ? `${b.sira}. bölüm` : sira ? 'eserin başı' : null; },
  };
}

/** Sahnelerin okuma sırası: kod → sıra. */
function sahneSiralari(e: EvrenVt, eser: string): Map<string, number> {
  const y = eserYapisi(e, eser);
  return new Map([...y.dogrudan, ...y.bolumler.flatMap((b) => b.sahneler)].map((s) => [s.kod, s.sira]));
}

/** Her kaydın eserde ilk göründüğü sahnenin sırası: sahnede bulunma, sahne metnindeki bağlantı, sahnenin olayı, okurun öğrenmesi. */
function ilkGorunusler(b: DurumBaglami, eser: string, bilgiler: BilgiSatiri[]): Map<string, number> {
  const e = b.e, sira = sahneSiralari(e, eser), ilk = new Map<string, number>();
  const ekle = (k: unknown, n: number | undefined) => {
    if (typeof k !== 'string' || n === undefined) return;
    const kod = yonlendir(e.db, k) as string;
    if ((ilk.get(kod) ?? Infinity) > n) ilk.set(kod, n);
  };
  for (const r of e.db.selectObjects("SELECT a, b FROM iliskiler WHERE tur='sahnede' AND silindi IS NULL")) ekle(r.a, sira.get(yonlendir(e.db, r.b as string) as string));
  for (const r of e.db.selectObjects('SELECT kaynak, hedef FROM baglantilar')) ekle(r.hedef, sira.get(r.kaynak as string));
  for (const [s, n] of sira) ekle(e.db.selectValue('SELECT sahne_olayi FROM kayitlar WHERE kod=?', [s]), n);
  for (const x of bilgiler) if (x.okumaSirasi !== null && x.karar !== 'vazgecildi') ekle(x.iddia.konu.kod, x.okumaSirasi);
  return ilk;
}

type Satir = Record<string, unknown>;
interface Bolum { anahtar: string; ad: string; varsayilan: boolean; not: string | null }

/** Okurun bildikleri: soru başına, okuma sırasına göre ardışık durumlar (her durum bir sonrakine dek geçerli). */
interface OkurBilgisi { iddia: string; soru: string; metin: string; sira: number; son: number | null }
function okurBilgileri(b: DurumBaglami, eser: string, bilgiler: BilgiSatiri[]): Map<string, OkurBilgisi[]> {
  const gruplar = new Map<string, Map<number, OkurBilgisi[]>>();
  const konular = new Map<string, string>();
  for (const x of bilgiler) {
    if (x.karar === 'vazgecildi' || x.okumaSirasi === null || x.iddia.konu.kod === eser) continue;
    const sec = x.secenek?.metin;
    if (!sec) continue;
    const inanc = x.inanc === 'inaniyor' ? '' : x.inanc === 'supheleniyor' ? ' (şüpheli)' : x.inanc === 'reddediyor' ? ' (inanılmıyor)' : '';
    const m = gruplar.get(x.iddia.kod) ?? new Map();
    m.set(x.okumaSirasi, [...(m.get(x.okumaSirasi) ?? []), { iddia: x.iddia.kod, soru: x.iddia.soru, metin: `${sec}${inanc}`, sira: x.okumaSirasi, son: null }]);
    gruplar.set(x.iddia.kod, m);
    konular.set(x.iddia.kod, yonlendir(b.e.db, x.iddia.konu.kod) as string);
  }
  const sonuc = new Map<string, OkurBilgisi[]>();
  for (const [iddia, m] of gruplar) {
    const siralar = [...m.keys()].sort((a, z) => a - z);
    const l = siralar.flatMap((s, i) => m.get(s)!.map((x) => ({ ...x, son: siralar[i + 1] ?? null })));
    const konu = konular.get(iddia)!;
    sonuc.set(konu, [...(sonuc.get(konu) ?? []), ...l]);
  }
  return sonuc;
}

/** Sınırda geçerli olanlar (teslim) ya da bütünü (tercih). */
const sinirdaGecerli = (l: OkurBilgisi[], sinir: number) => l.filter((x) => x.sira <= sinir && (x.son === null || x.son > sinir));

interface Kapsam {
  okuma: Okuma; ayar: OkurYayiniAyari;
  kayitlar: (OkurYayiniKaydi & { satir: Satir; secili: string[]; varsayilanlar: Bolum[] })[];
  kimlikler: OkurKimlikEsi[];
  okur: Map<string, OkurBilgisi[]>;
  iliskiler: Satir[];
}

function kapsamKur(b: DurumBaglami, eser: string, ayar: OkurYayiniAyari): Kapsam {
  const e = b.e;
  if (e.db.selectValue("SELECT 1 FROM kayitlar WHERE kod=? AND tur='eser' AND silindi IS NULL", [eser]) === undefined) throw new Error('Eser bulunamadı.');
  const okuma = okumaKur(e, eser, ayar.sinir);
  const bilgiler = bilenBilgileri(b, eser);
  const ilk = ilkGorunusler(b, eser, bilgiler);
  const okur = okurBilgileri(b, eser, bilgiler);
  const sinir = ayar.kip === 'teslim' ? okuma.sinirSira : okuma.sonSira;
  const iliskiler = e.db.selectObjects("SELECT * FROM iliskiler WHERE silindi IS NULL AND karar NOT IN ('vazgecildi','fikir')");
  const iliskiGorunur = (i: Satir) => {
    const g = gorunurlukOku(i.gorunurluk);
    return g.katman ? yonlendir(e.db, g.katman) === eser : goruyorMu(g, eser, (k) => yonlendir(e.db, k) as string);
  };
  const kayitlar: Kapsam['kayitlar'] = [];
  for (const r of e.db.selectObjects("SELECT * FROM kayitlar WHERE silindi IS NULL AND karar<>'vazgecildi' AND kod NOT IN (SELECT kod FROM yonlendirmeler) ORDER BY tur, ad")) {
    const kod = r.kod as string, tur = r.tur as string;
    if (DISARIDA.has(tur)) continue;
    const g = gorunurlukOku(r.gorunurluk);
    if (g.katman && yonlendir(e.db, g.katman) !== eser) continue;
    const ilkSira = ilk.get(kod) ?? null;
    let durum: OkurKayitDurumu = g.katman ? 'inanc' : 'acik';
    if (!g.katman && g.gizli && !g.bilenler.some((x) => yonlendir(e.db, x) === eser)) durum = 'gizli';
    else if (ilkSira === null) durum = 'gecmiyor';
    else if (ayar.kip === 'teslim' && ilkSira > okuma.sinirSira) durum = 'sonra';
    const bolumler: Bolum[] = [];
    if (r.ozet) bolumler.push({ anahtar: 'ozet', ad: 'Özet', varsayilan: true, not: null });
    try {
      const ks = kayitSablonu(e, kod);
      const kararlar = (json(r.alan_kararlari) ?? {}) as Record<string, string>;
      for (const a of ks.sablon.alanlar) {
        const v = ks.degerler[a.kod];
        if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue;
        const k = kararlar[a.kod];
        if (k === 'vazgecildi') continue;
        bolumler.push({ anahtar: `alan:${a.kod}`, ad: a.ad, varsayilan: k !== 'fikir', not: k === 'fikir' ? 'fikir' : null });
      }
    } catch { /* şablonsuz kayıt */ }
    const govde = metinBelgesi(e.db, kod, 'govde');
    if (govde && (A.spans(govde, ['t']) as { type: string; value?: string }[]).some((s) => s.type === 'text' && s.value?.trim())) bolumler.push({ anahtar: 'govde', ad: 'Gövde metni', varsayilan: false, not: null });
    if (tur === 'belge' && sunumOku(e, kod).okurYayini) bolumler.push({ anahtar: 'belge', ad: 'Belgenin görünümü', varsayilan: true, not: null });
    if (iliskiler.some((i) => (i.a === kod || i.b === kod) && i.tur !== KIMLIK_ILISKISI && i.tur !== 'sahnede' && iliskiGorunur(i))) bolumler.push({ anahtar: 'iliskiler', ad: 'İlişkiler', varsayilan: true, not: null });
    const ob = okur.get(kod);
    if (ob && (ayar.kip === 'tercih' ? ob.length : sinirdaGecerli(ob, sinir).length)) bolumler.push({ anahtar: 'okur', ad: 'Okurun bildikleri', varsayilan: true, not: null });
    const varsayilan = durum === 'acik' || durum === 'inanc' ? bolumler.filter((x) => x.varsayilan).map((x) => x.anahtar) : [];
    const secili = durum === 'gizli' || durum === 'sonra' ? [] : (ayar.secimler[kod] ?? varsayilan).filter((a) => bolumler.some((x) => x.anahtar === a));
    kayitlar.push({
      kod, ad: r.ad as string, tur, durum, ilk: ilkSira, ilkBolum: ilkSira === null ? null : okuma.bolumAdi(ilkSira),
      bolumler: bolumler.map((x) => ({ anahtar: x.anahtar, ad: x.ad, secili: secili.includes(x.anahtar), not: x.not })),
      satir: r, secili, varsayilanlar: bolumler,
    });
  }
  // Kişi ile kimlik: açıklanana dek ayrı.
  const kimlikler: OkurKimlikEsi[] = [];
  const kisa = (k: string): KisaKayit | null => { const x = kayitlar.find((y) => y.kod === k); return x ? { kod: x.kod, ad: x.ad, tur: x.tur } : null; };
  for (const i of iliskiler) {
    if (i.tur !== KIMLIK_ILISKISI) continue;
    const kisi = kisa(yonlendir(e.db, i.a as string) as string), kimlik = kisa(yonlendir(e.db, i.b as string) as string);
    if (!kisi || !kimlik) continue;
    const g = gorunurlukOku(i.gorunurluk);
    let aciklanma: number | null = g.gizli && g.bilenler.some((x) => yonlendir(e.db, x) === eser) ? 0 : null;
    for (const x of bilgiler) {
      if (x.karar === 'vazgecildi' || x.okumaSirasi === null || !x.iddia.gercek || x.secenek?.kod !== x.iddia.gercek || x.inanc !== 'inaniyor') continue;
      if (yonlendir(e.db, x.iddia.konu.kod) !== kimlik.kod) continue;
      if (aciklanma === null || x.okumaSirasi < aciklanma) aciklanma = x.okumaSirasi;
    }
    kimlikler.push({ kisi, kimlik, acik: aciklanma !== null && (ayar.kip === 'tercih' || aciklanma <= okuma.sinirSira), aciklanma: aciklanma === null ? null : { sira: aciklanma, bolum: okuma.bolumAdi(aciklanma) } });
  }
  return { okuma, ayar, kayitlar, kimlikler, okur, iliskiler: iliskiler.filter(iliskiGorunur) };
}

// ---------- Okunan bilgi ----------
export function okurYayini(y: YayinBaglami, eser: string): OkurYayini {
  const e = y.b.e;
  const k = kayitliOku(e, eser);
  const ayar = k?.ayar ?? BOS_AYAR;
  const c = kapsamKur(y.b, eser, ayar);
  const gorseller: OkurYayini['gorseller'] = [];
  for (const x of c.kayitlar) {
    if (!x.secili.length) continue;
    for (const g of (json(x.satir.gorseller) ?? []) as string[]) {
      const m = e.db.selectObject('SELECT en, boy FROM medya WHERE ad=?', [g]);
      if (!m || gorseller.some((z) => z.ad === g)) continue;
      gorseller.push({ ad: g, kayit: { kod: x.kod, ad: x.ad, tur: x.tur }, izin: ayar.gorseller.includes(g), en: Number(m.en) || null, boy: Number(m.boy) || null });
    }
  }
  return {
    eser: c.okuma.eser, ayar, bolumler: c.okuma.bolumler, sinirSira: c.okuma.sinirSira,
    kayitlar: c.kayitlar.map(({ satir: _s, secili: _x, varsayilanlar: _v, ...x }) => x).sort((a, z) => DURUM_SIRASI[a.durum] - DURUM_SIRASI[z.durum] || turkceKarsilastir(a.ad, z.ad)),
    kimlikler: c.kimlikler, gorseller, baskilar: k?.baskilar ?? [],
  };
}
const DURUM_SIRASI: Record<OkurKayitDurumu, number> = { acik: 0, inanc: 1, gecmiyor: 2, sonra: 3, gizli: 4 };

// ---------- Paket kodları ----------
async function kodlayici(anahtar: string): Promise<(on: string, kod: string) => Promise<string>> {
  const ham = new Uint8Array(anahtar.match(/../g)!.map((h) => parseInt(h, 16)));
  const k = await crypto.subtle.importKey('raw', ham, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bellek = new Map<string, string>();
  return async (on, kod) => {
    const a = `${on}:${kod}`;
    const v = bellek.get(a);
    if (v) return v;
    const imza = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(a)));
    let s = '';
    // Yalnız rakam: türetilmiş kod bir adın parçası gibi okunup taramayı yanıltmasın.
    for (let i = 0; i < 14; i++) s += String(imza[i] % 10);
    bellek.set(a, s);
    return s;
  };
}
export function yeniAnahtar(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// ---------- Paket ----------
/** Bir dosyanın parçaları; her parçanın nereden geldiği taramada gösterilir. */
interface Parca { metin: string; kaynak: { kayit: string; anahtar: string; ad: string } | null }
interface PaketDosyasi { ad: string; baslik: string; parcalar: Parca[]; veri?: Uint8Array; tur?: string; /** Bu dosyaya özel gizli dizgeler (açıklanmamış kimlik eşi). */ ozel?: { dizge: string; kaynak: KisaKayit; neden: string }[] }
export interface Paket { dosyalar: PaketDosyasi[]; kapsam: Kapsam; eksikGorsel: number }

const ESC = xmlKacis;
const STIL = `*{box-sizing:border-box}body{margin:0;background:#f7f2e8;color:#2a251d;font:17px/1.65 Georgia,"Iowan Old Style","Times New Roman",serif}
header{background:#efe6d4;padding:10px 20px;font:14px system-ui,sans-serif;color:#5b5448;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
header a{color:#5b5448}main{max-width:760px;margin:0 auto;padding:20px 20px 48px}h1{font-size:30px;margin:8px 0 2px;font-weight:600}h2{font-size:19px;margin:28px 0 6px}
.ust{font:14px system-ui,sans-serif;color:#6b6152;margin-bottom:14px}a{color:#7d5210}dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:12px 0}dt{color:#6b6152;font:14px system-ui,sans-serif;padding-top:3px}dd{margin:0}
ul{padding-left:22px}img{max-width:100%;border-radius:8px;margin:8px 0}.bos{color:#6b6152}input,select{font:15px system-ui,sans-serif;padding:6px 10px;border:1px solid #d6cbb5;border-radius:8px;background:#fff}
.liste{columns:2 220px}.liste li{break-inside:avoid}.gizle{display:none}@media (prefers-color-scheme:dark){body{background:#1c1813;color:#efe6d4}header{background:#26211a;color:#b3a68e}header a,.ust,dt,.bos{color:#b3a68e}a{color:#e0a83e}input,select{background:#26211a;color:#efe6d4;border-color:#3d3426}}`;
const YER_BETIGI = `(function(){var a='okunan-yer:'+document.documentElement.dataset.rehber,s=document.getElementById('yer'),v=+(localStorage.getItem(a)||0)||Infinity;
function uygula(){document.querySelectorAll('[data-sira]').forEach(function(x){var b=+x.dataset.sira,o=x.dataset.son?+x.dataset.son:Infinity;x.classList.toggle('gizle',b>v||o<=v)})}
if(s){s.value=isFinite(v)?String(v):'';s.onchange=function(){v=+s.value||Infinity;try{localStorage.setItem(a,s.value)}catch(e){}uygula()}}uygula()})();`;
const ARA_BETIGI = `(function(){var g=document.getElementById('ara'),l=document.getElementById('sonuclar');if(!g)return;function k(s){return s.toLocaleLowerCase('tr-TR')}
g.oninput=function(){var q=k(g.value.trim());l.innerHTML='';if(!q)return;ARA.filter(function(x){return k(x.a+' '+x.o).indexOf(q)>=0}).slice(0,30).forEach(function(x){var li=document.createElement('li'),a=document.createElement('a');a.href='k/'+x.k+'.html';a.textContent=x.a;li.appendChild(a);li.appendChild(document.createTextNode(' · '+x.t));if(x.s)li.dataset.sira=x.s;l.appendChild(li)})}})();`;

function satirIci(n: { forEach(f: (c: { isText: boolean; text?: string | null; marks: readonly { type: { name: string }; attrs: Record<string, unknown> }[] }) => void): void }, bag: (hedef: string) => string | null): string {
  let s = '';
  n.forEach((c) => {
    if (!c.isText) return;
    let t = ESC(c.text ?? '');
    if (c.marks.some((m) => m.type.name === 'strong')) t = `<strong>${t}</strong>`;
    if (c.marks.some((m) => m.type.name === 'em')) t = `<em>${t}</em>`;
    const m = c.marks.find((x) => x.type.name === 'bag');
    const h = m ? bag(String(m.attrs.hedef)) : null;
    s += h ? `<a href="${h}">${t}</a>` : t;
  });
  return s;
}

export async function paketKur(y: YayinBaglami, eser: string, ayarGirdisi?: OkurYayiniAyari): Promise<Paket> {
  const e = y.b.e;
  const k = kayitliOku(e, eser);
  const ayar = ayarGirdisi ?? k?.ayar ?? BOS_AYAR;
  const c = kapsamKur(y.b, eser, ayar);
  const kodla = await kodlayici(k?.anahtar ?? yeniAnahtar());
  const tercih = ayar.kip === 'tercih';
  const sinir = tercih ? c.okuma.sonSira : c.okuma.sinirSira;
  const girenler = c.kayitlar.filter((x) => x.secili.length);
  const pk = new Map<string, string>();
  for (const x of girenler) pk.set(x.kod, await kodla('k', x.kod));
  const bag = (onek: string) => (hedef: string) => { const p = pk.get(yonlendir(e.db, hedef) as string); return p ? `${onek}${p}.html` : null; };
  const adi = (kod: string) => (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [yonlendir(e.db, kod)]) as string | undefined) ?? '';
  const baglanti = (kod: string, onek: string) => { const h = bag(onek)(kod); return h ? `<a href="${h}">${ESC(adi(kod))}</a>` : ESC(adi(kod)); };
  const siraAt = (s: number | null, son?: number | null) => (tercih && s ? ` data-sira="${s}"${son ? ` data-son="${son}"` : ''}` : '');
  const sinirYazisi = c.okuma.sinirSira >= c.okuma.sonSira || tercih ? 'eserin sonuna' : `${c.okuma.bolumler.find((b) => b.kod === ayar.sinir)?.sira ?? ''}. bölümün sonuna`;
  const rehber = await kodla('r', eser);
  const kafa = (baslik: string, onek: string) => `<!DOCTYPE html><html lang="tr" data-rehber="${rehber}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ESC(baslik)}</title><link rel="stylesheet" href="${onek}stil.css"></head><body>`;
  const ust = (onek: string) => `<header><a href="${onek}index.html">${ESC(c.okuma.eser.ad)} · Evren rehberi</a>${tercih ? `<label>Okuduğunuz yer <select id="yer"><option value="">Hepsi</option>${c.okuma.bolumler.map((b) => `<option value="${b.sonSahne}">${b.sira}. bölümün sonu</option>`).join('')}</select></label>` : ''}</header>`;
  const dosyalar: PaketDosyasi[] = [];
  const gorselDosyalari = new Map<string, string>();
  let eksikGorsel = 0;

  for (const x of girenler) {
    const p = pk.get(x.kod)!, r = x.satir, parcalar: Parca[] = [];
    const ekle = (metin: string, anahtar: string | null) => parcalar.push({ metin, kaynak: anahtar ? { kayit: x.kod, anahtar, ad: x.varsayilanlar.find((b) => b.anahtar === anahtar)?.ad ?? anahtar } : null });
    const tur = turBul(x.tur).ad;
    ekle(`${kafa(`${x.ad} · ${c.okuma.eser.ad}`, '../')}${ust('../')}<main><h1>${ESC(x.ad)}</h1><div class="ust">${ESC(tur)}${x.ilkBolum ? ` · ilk görünüş: ${ESC(x.ilkBolum)}` : ''}</div>`, null);
    if (x.secili.includes('ozet')) ekle(`<p>${ESC(String(r.ozet))}</p>`, 'ozet');
    const alanlar = x.secili.filter((a) => a.startsWith('alan:'));
    if (alanlar.length) {
      const ks = kayitSablonu(e, x.kod);
      ekle('<dl>', null);
      for (const a of alanlar) {
        const t = ks.sablon.alanlar.find((z) => z.kod === a.slice(5));
        if (!t) continue;
        const deger = (v: unknown): string => Array.isArray(v) ? v.map(deger).join(', ')
          : typeof v === 'string' && kodGecerliMi(v) && adi(v) ? baglanti(v, '')
          : typeof v === 'object' && v && 'ifade' in v ? ESC(String((v as { ifade: string }).ifade))
          : sayiDegeriMi(v) ? ESC(sayiMetni(v)) : t.secenekler && typeof v === 'string' ? ESC(t.secenekler.find((s) => s.kod === v)?.ad ?? v) : v === true ? 'Evet' : v === false ? 'Hayır' : ESC(String(v));
        ekle(`<dt>${ESC(t.ad)}</dt><dd>${deger(ks.degerler[t.kod])}</dd>`, a);
      }
      ekle('</dl>', null);
    }
    if (x.secili.includes('govde')) {
      const belge = metinBelgesi(e.db, x.kod, 'govde');
      if (belge) {
        const d = belgeyeCevir(A.spans(belge, ['t']) as unknown[]);
        const l: string[] = [];
        d.forEach((bl) => {
          const t = satirIci(bl as never, bag(''));
          if (bl.type.name === 'heading') l.push(`<h2>${t}</h2>`);
          else if (t.trim()) l.push(bl.type.name === 'blockquote' ? `<blockquote>${ESC(bl.textContent)}</blockquote>` : `<p>${t}</p>`);
        });
        ekle(l.join('\n'), 'govde');
      }
    }
    if (x.secili.includes('belge')) ekle(`<p><a href="../b/${p}.html">Belgeyi açın</a></p>`, 'belge');
    if (x.secili.includes('okur')) {
      const l = (tercih ? c.okur.get(x.kod) ?? [] : sinirdaGecerli(c.okur.get(x.kod) ?? [], sinir));
      if (l.length) ekle(`<h2>Bilinenler</h2><ul>${l.map((o) => `<li${siraAt(o.sira, o.son)}>${ESC(o.soru)} ${ESC(o.metin)}</li>`).join('')}</ul>`, 'okur');
    }
    if (x.secili.includes('iliskiler')) {
      const l: string[] = [];
      for (const i of c.iliskiler) {
        if (i.tur === KIMLIK_ILISKISI || i.tur === 'sahnede') continue;
        const a = yonlendir(e.db, i.a as string), b2 = yonlendir(e.db, i.b as string);
        if (a !== x.kod && b2 !== x.kod) continue;
        const karsi = (a === x.kod ? b2 : a) as string;
        if (!pk.has(karsi)) continue;
        const t = iliskiTuruBul(i.tur as string), rol = rolAdi(i.tur as string, (i.rol as string) ?? null);
        l.push(`<li>${ESC(a === x.kod ? t.aIcin : t.bIcin)}: ${baglanti(karsi, '')}${rol ? `, ${ESC(rol)}` : ''}</li>`);
      }
      if (l.length) ekle(`<h2>İlişkiler</h2><ul>${l.join('')}</ul>`, 'iliskiler');
    }
    // Açıklanmış kimlik eşleri.
    const ozel: PaketDosyasi['ozel'] = [];
    for (const ki of c.kimlikler) {
      const ben = ki.kisi.kod === x.kod ? 'kisi' : ki.kimlik.kod === x.kod ? 'kimlik' : null;
      if (!ben) continue;
      const karsi = ben === 'kisi' ? ki.kimlik : ki.kisi;
      if (ki.acik && pk.has(karsi.kod)) ekle(`<p${siraAt(ki.aciklanma?.sira ?? null)}>${ben === 'kisi' ? 'Kullandığı kimlik' : 'Bu kimliği kullanan'}: ${baglanti(karsi.kod, '')}</p>`, null);
      else if (!ki.acik) for (const d of adlar(e, karsi.kod)) ozel.push({ dizge: d, kaynak: karsi, neden: `${ki.kimlik.ad} ile ${ki.kisi.ad} okura henüz açıklanmadı` });
    }
    const gorseller = ((json(r.gorseller) ?? []) as string[]).filter((g) => ayar.gorseller.includes(g));
    if (gorseller.length) {
      const l: string[] = [];
      for (const g of gorseller) {
        let ad = gorselDosyalari.get(g);
        if (!ad) {
          const m = e.db.selectObject('SELECT tur FROM medya WHERE ad=?', [g]);
          const veri = m ? await y.medyaOku(g) : null;
          if (!m || !veri) { eksikGorsel++; continue; }
          ad = `g/${await kodla('g', g)}.${UZANTI[m.tur as string] ?? 'bin'}`;
          gorselDosyalari.set(g, ad);
          dosyalar.push({ ad, baslik: `${x.ad} görseli`, parcalar: [], veri: m.tur === 'image/png' ? pngTemizle(veri) : veri, tur: m.tur as string });
        }
        l.push(`<img src="../${ad}" alt="">`);
      }
      if (l.length) ekle(l.join(''), null);
    }
    ekle(`</main>${tercih ? `<script>${YER_BETIGI}</script>` : ''}</body></html>`, null);
    dosyalar.push({ ad: `k/${p}.html`, baslik: `${x.ad} sayfası`, parcalar, ozel });
    if (x.secili.includes('belge')) dosyalar.push({ ad: `b/${p}.html`, baslik: `${x.ad} belgesi`, parcalar: [{ metin: belgeCiktisi(e, x.kod), kaynak: { kayit: x.kod, anahtar: 'belge', ad: 'Belgenin görünümü' } }] });
  }

  // İçindekiler ve arama dizini.
  const turler = new Map<string, typeof girenler>();
  for (const x of girenler) turler.set(turBul(x.tur).ad, [...(turler.get(turBul(x.tur).ad) ?? []), x]);
  const icindekiler = [...turler].sort(([a], [z]) => turkceKarsilastir(a, z)).map(([t, l]) =>
    `<h2>${ESC(t)}</h2><ul class="liste">${l.sort((a, z) => turkceKarsilastir(a.ad, z.ad)).map((x) => `<li${siraAt(x.ilk)}><a href="k/${pk.get(x.kod)}.html">${ESC(x.ad)}</a></li>`).join('')}</ul>`).join('');
  dosyalar.unshift({ ad: 'index.html', baslik: 'İçindekiler', parcalar: [{ metin: `${kafa(c.okuma.eser.ad, '')}${ust('')}<main><h1>${ESC(c.okuma.eser.ad)}</h1><div class="ust">Evren rehberi · ${tercih ? 'bütün eser; okuduğunuz yeri seçerek ilerisini gizleyebilirsiniz' : `${sinirYazisi} kadar`}</div>
<p><input id="ara" type="search" placeholder="Rehberde ara" aria-label="Rehberde ara"></p><ul id="sonuclar"></ul>${icindekiler || '<p class="bos">Bu kapsamda rehbere girecek kayıt yok.</p>'}</main><script src="ara.js"></script><script>${ARA_BETIGI}${tercih ? YER_BETIGI : ''}</script></body></html>`, kaynak: null }] });
  const dizin = girenler.map((x) => ({ k: pk.get(x.kod), a: x.ad, t: turBul(x.tur).ad, o: x.secili.includes('ozet') ? String(x.satir.ozet) : '', ...(tercih && x.ilk ? { s: x.ilk } : {}) }));
  dosyalar.push({ ad: 'ara.js', baslik: 'Arama dizini', parcalar: girenler.map((x, i) => ({ metin: `${i ? ',' : 'var ARA=['}${JSON.stringify(dizin[i]).replace(/</g, '\\u003c')}`, kaynak: x.secili.includes('ozet') ? { kayit: x.kod, anahtar: 'ozet', ad: 'Özet' } : null })).concat([{ metin: girenler.length ? '];' : 'var ARA=[];', kaynak: null }]) });
  dosyalar.push({ ad: 'stil.css', baslik: 'Görünüm', parcalar: [{ metin: STIL, kaynak: null }] });
  return { dosyalar, kapsam: c, eksikGorsel };
}

/** Bir kaydın adları: ad, lakaplar, eski adlar. */
function adlar(e: EvrenVt, kod: string): string[] {
  const r = e.db.selectObject('SELECT ad, lakaplar, onceki_adlar FROM kayitlar WHERE kod=?', [kod]);
  if (!r) return [];
  const eski = ((json(r.onceki_adlar) ?? []) as unknown[]).map((x) => (typeof x === 'string' ? x : (x as { ad?: string })?.ad ?? ''));
  return [r.ad as string, ...((json(r.lakaplar) ?? []) as string[]), ...eski].filter((x) => typeof x === 'string' && x.trim());
}

/** PNG'nin metin, zaman ve fotoğraf bilgisi bölümlerini atar (görüntü bölümleri aynen kalır). */
export function pngTemizle(v: Uint8Array): Uint8Array {
  if (v.length < 8 || v[0] !== 0x89 || v[1] !== 0x50) return v;
  const at = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);
  const parcalar: Uint8Array[] = [v.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= v.length) {
    const uzunluk = ((v[i] << 24) | (v[i + 1] << 16) | (v[i + 2] << 8) | v[i + 3]) >>> 0;
    const son = i + 12 + uzunluk;
    if (son > v.length) return v;
    const tur = String.fromCharCode(v[i + 4], v[i + 5], v[i + 6], v[i + 7]);
    if (!at.has(tur)) parcalar.push(v.subarray(i, son));
    i = son;
  }
  const sonuc = new Uint8Array(parcalar.reduce((t, p) => t + p.length, 0));
  let o = 0;
  for (const p of parcalar) { sonuc.set(p, o); o += p.length; }
  return sonuc;
}

// ---------- Sızıntı taraması ----------
/** Türkçe katlama, karakter karakter; her katlanmış karakterin asıl metindeki yeri tutulur. */
function katlaEsli(s: string): { k: string; yer: number[] } {
  let k = '';
  const yer: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = katla(s[i]);
    for (let j = 0; j < c.length; j++) yer.push(i);
    k += c;
  }
  return { k, yer };
}
const HARF = /[\p{L}\p{N}]/u;

interface Gizli { dizge: string; k: string; kaynak: KisaKayit | null; neden: string }

export function tara(e: EvrenVt, p: Paket): OkurYayiniTaramasi {
  const c = p.kapsam;
  const giren = new Set(c.kayitlar.filter((x) => x.secili.length).map((x) => x.kod));
  const gizliler: Gizli[] = [];
  const ekle = (dizge: string, kaynak: KisaKayit | null, neden: string) => {
    const k = katla(dizge.trim());
    if (k.replace(/[^\p{L}\p{N}]/gu, '').length < 3) return;
    gizliler.push({ dizge: dizge.trim(), k, kaynak, neden });
  };
  for (const x of c.kayitlar) {
    if (x.durum !== 'gizli' && x.durum !== 'sonra') continue;
    for (const a of adlar(e, x.kod)) ekle(a, { kod: x.kod, ad: x.ad, tur: x.tur }, x.durum === 'gizli' ? 'okurdan gizli kayıt' : 'okura sınırdan sonra açılıyor');
  }
  // İç kodlar hiçbir dosyaya girmez; yazarın görselleri de asıl adlarıyla girmez.
  for (const r of e.db.selectObjects('SELECT kod, ad, tur FROM kayitlar')) ekle(r.kod as string, { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string }, 'iç kod');
  for (const r of e.db.selectObjects('SELECT ad, dosya_adi FROM medya')) { ekle(r.ad as string, null, 'görselin iç adı'); if (r.dosya_adi) ekle(r.dosya_adi as string, null, 'görselin dosya adı'); }
  // Pakete giren kayıtların adları ve lakapları: eşadlı eşleşmede yazara sorulur.
  const acikAdlar = [...new Set([...giren].flatMap((k) => adlar(e, k)).map((a) => katla(a.trim())).filter((a) => a.length >= 3))];

  const bulgular = new Map<string, SizintiBulgusu>();
  const taraParca = (dosya: PaketDosyasi, metin: string, kaynak: Parca['kaynak'], ozel: Gizli[]) => {
    const { k, yer } = katlaEsli(metin);
    for (const g of [...gizliler, ...ozel]) {
      let i = k.indexOf(g.k);
      while (i >= 0) {
        if (i === 0 || !HARF.test(k[i - 1])) {
          // Açık bir kaydın adının içinde mi?
          const esadli = acikAdlar.find((a) => {
            if (a === g.k && g.kaynak && giren.has(g.kaynak.kod)) return false;
            for (let d = a.indexOf(g.k); d >= 0; d = a.indexOf(g.k, d + 1)) if (i - d >= 0 && k.startsWith(a, i - d)) return true;
            return false;
          }) ?? null;
          const anahtar = JSON.stringify([g.k, esadli]);
          const imza = esadli ? anahtar : JSON.stringify([g.k, g.kaynak?.kod ?? null, g.neden]);
          const bas = yer[i], son = yer[i + g.k.length - 1] + 1;
          const b = bulgular.get(imza) ?? { anahtar: imza, dizge: g.dizge, kaynak: g.kaynak, neden: g.neden, esadli: esadli ? (acikAdOrijinali(e, giren, esadli) ?? esadli) : null, yerler: [] };
          if (b.yerler.length < 20 && !b.yerler.some((y) => y.dosya === dosya.ad && y.bolum?.anahtar === kaynak?.anahtar)) {
            b.yerler.push({ dosya: dosya.ad, yazi: dosya.baslik, bolum: kaynak, once: duz(metin.slice(Math.max(0, bas - 60), bas)), eslesen: metin.slice(bas, son), sonra: duz(metin.slice(son, son + 60)) });
          }
          bulgular.set(imza, b);
        }
        i = k.indexOf(g.k, i + 1);
      }
    }
  };
  let sayfa = 0, veri = 0, gorsel = 0;
  for (const d of p.dosyalar) {
    const ozel = (d.ozel ?? []).map((o) => ({ dizge: o.dizge, k: katla(o.dizge.trim()), kaynak: o.kaynak, neden: o.neden })).filter((o) => o.k.length >= 3);
    taraParca({ ...d, baslik: 'Dosya adı' }, d.ad, null, ozel);
    if (d.veri) {
      gorsel++;
      taraParca(d, latin1(d.veri), null, ozel);
      taraParca(d, new TextDecoder('utf-8', { fatal: false }).decode(d.veri), null, ozel);
      continue;
    }
    if (d.ad.endsWith('.html')) sayfa++; else veri++;
    for (const pr of d.parcalar) taraParca(d, pr.metin, pr.kaynak, ozel);
  }
  const ayar = c.ayar;
  const liste = [...bulgular.values()];
  return {
    durduran: liste.filter((b) => !b.esadli),
    bekleyen: liste.filter((b) => b.esadli && !ayar.onaylar.includes(b.anahtar)),
    onaylanan: liste.filter((b) => b.esadli && ayar.onaylar.includes(b.anahtar)).length,
    taranan: { sayfa, veri, gorsel, gizliDizge: gizliler.length },
    eksikGorsel: p.eksikGorsel,
    sayfalar: p.dosyalar.filter((d) => d.ad.startsWith('k/') || d.ad === 'index.html').map((d) => ({ dosya: d.ad, ad: d.baslik })),
  };
}
const duz = (s: string) => s.replace(/^[^<]*>/, '').replace(/<[^>]*$/, '').replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[{}]|"[a-z]":"?|"(?=,|$)/g, ' ').replace(/\s+/g, ' ');
function latin1(v: Uint8Array) { let s = ''; for (let i = 0; i < v.length; i += 8192) s += String.fromCharCode(...v.subarray(i, i + 8192)); return s; }
function acikAdOrijinali(e: EvrenVt, giren: Set<string>, k: string): string | null {
  for (const kod of giren) for (const a of adlar(e, kod)) if (katla(a.trim()) === k) return a.trim();
  return null;
}

/** Önizleme için bir sayfa: stil ve görseller içine gömülür, bağlantılar `data-dosya` ile işaretlenir. */
export function onizlemeSayfasi(p: Paket, dosya: string): string {
  const d = p.dosyalar.find((x) => x.ad === dosya && !x.veri);
  if (!d) throw new Error('Sayfa bulunamadı.');
  const onek = dosya.includes('/') ? dosya.slice(0, dosya.lastIndexOf('/') + 1) : '';
  const coz = (h: string) => { const l = (onek + h).split('/'); const s: string[] = []; for (const x of l) { if (x === '..') s.pop(); else if (x !== '.') s.push(x); } return s.join('/'); };
  let html = d.parcalar.map((x) => x.metin).join('');
  html = html.replace(/<link rel="stylesheet" href="[^"]*">/, `<style>${STIL}</style>`);
  html = html.replace(/<script src="ara\.js"><\/script>/, `<script>${p.dosyalar.find((x) => x.ad === 'ara.js')!.parcalar.map((x) => x.metin).join('')}</script>`);
  html = html.replace(/<img src="([^"]+)"/g, (_m, s: string) => {
    const g = p.dosyalar.find((x) => x.ad === coz(s));
    return g?.veri ? `<img src="data:${g.tur};base64,${base64(g.veri)}"` : '<img alt=""';
  });
  html = html.replace(/<a href="([^"#]+\.html)"/g, (_m, h: string) => `<a href="#" data-dosya="${coz(h)}"`);
  return html;
}
function base64(v: Uint8Array) { return btoa(latin1(v)); }

/** Dosyaları zip için düzler. */
export function paketDosyalari(p: Paket): { ad: string; veri: Uint8Array; sikistirma?: boolean }[] {
  return p.dosyalar.map((d) => d.veri ? { ad: d.ad, veri: d.veri, sikistirma: false } : { ad: d.ad, veri: new TextEncoder().encode(d.parcalar.map((x) => x.metin).join('')) });
}
