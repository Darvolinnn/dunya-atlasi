// Okunabilir dışa aktarma (§10.11): bütün evren bağlantıları korunmuş Markdown olarak (Obsidian uyumlu), bir eser
// EPUB olarak ve yazdırılabilir sayfa (PDF) olarak. Neyin kaybolduğu açıklama dosyasında yazılır. Tam ve kayıpsız
// taşıma için taşınabilir paket (yedek) vardır; bu çıktılar okumak içindir.
import { belgeyeCevir, dosyaAdi, markdownYaz, xhtmlYaz, xmlKacis, yamlDeger } from '../alan/cikti';
import { iliskiTuruBul, rolAdi } from '../alan/iliski-turleri';
import { KARARLAR, turBul } from '../alan/turler';
import { A } from '../alan/automerge';
import type { ZipDosyasi } from '../alan/zip';
import { AYRAC_METNI, SUS, bloklaraCevir, gorunumDuzelt, siraSayisi, type Kitap, type KitapEki, type KitapGorseli, type KitapGorunumu, type KitapSahnesi } from '../alan/kitap';
import { bagsizAdlar, type AranacakAd } from '../alan/bagsiz-ad';
import { turkceKarsilastir } from '../alan/turkce';
import { sozlukKayitlari } from './terim-sozlugu';
import { katmanlarOku } from './harita';
import { takvimOku } from './izdusum';
import { eserYapisi } from './anlati';
import type { CiktiAgaci, CiktiSahnesi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { metinBelgesi } from './izdusum';
import { kayitSablonu } from './sablon';
import { sayiDegeriMi, sayiMetni } from '../alan/nicelik';

const yazi = (s: string) => new TextEncoder().encode(s);
const json = (s: unknown) => (typeof s === 'string' && s ? JSON.parse(s) : null);
const ifade = (ham: unknown): string | null => { const v = json(ham); return v ? v.ifade ?? v.tarih?.ifade ?? null : null; };
const UZANTI: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

const KAYIPLAR = [
  'Değişiklik geçmişi, adlandırılmış sürümler ve deneme kopyaları',
  'Tarihli inançlar ve kimin neyi bildiği (bilgi katmanları); “belgede yazan” ile “gerçekte olan” ayrımı',
  'Alan alan karar durumları (yalnızca kaydın genel karar durumu yazılır)',
  'Haritalar, harita işaretleri ve bölgeler',
  'Takvim hesapları: tarihler yalnızca yazıldığı gibi durur',
  'Hesap kuralları, süreçler, hukuk kuralları, varsayım paketleri ve konu dosyaları',
  'Görsel panolardaki notlar, gezintiler ve sahne niyet işaretleri',
  'İki cihaz arasında henüz çözülmemiş farklar',
];

/** Bütün evrenin Markdown klasörü: her kayıt bir dosya, türüne göre klasörde. */
export async function markdownDosyalari(e: EvrenVt, evrenAdi: string, medyaOku: (ad: string) => Promise<Uint8Array | null>): Promise<{ dosyalar: ZipDosyasi[]; kayitSayisi: number; eksikGorsel: number }> {
  const kayitlar = e.db.selectObjects('SELECT * FROM kayitlar WHERE silindi IS NULL AND kod NOT IN (SELECT kod FROM yonlendirmeler) ORDER BY tur, ad');
  // Dosya yolları: aynı türde aynı ad varsa sona sayı eklenir.
  const yollar = new Map<string, { klasor: string; dosya: string }>();
  const kullanilan = new Set<string>();
  const adSayisi = new Map<string, number>();
  for (const r of kayitlar) {
    const klasor = dosyaAdi(turBul(r.tur as string).ad);
    let dosya = dosyaAdi(r.ad as string), n = 2;
    while (kullanilan.has(`${klasor}/${dosya}`.toLocaleLowerCase('tr-TR'))) dosya = `${dosyaAdi(r.ad as string)} (${n++})`;
    kullanilan.add(`${klasor}/${dosya}`.toLocaleLowerCase('tr-TR'));
    yollar.set(r.kod as string, { klasor, dosya });
    adSayisi.set(dosya.toLocaleLowerCase('tr-TR'), (adSayisi.get(dosya.toLocaleLowerCase('tr-TR')) ?? 0) + 1);
  }
  // Ad tek ise [[Ad]], değilse [[Klasör/Ad]] (Obsidian ikisini de çözer).
  const hedefAdi = (kod: string) => {
    const y = yollar.get((e.db.selectValue('SELECT hedef FROM yonlendirmeler WHERE kod=?', [kod]) as string | undefined) ?? kod);
    if (!y) return null;
    return (adSayisi.get(y.dosya.toLocaleLowerCase('tr-TR')) ?? 0) > 1 ? `${y.klasor}/${y.dosya}` : y.dosya;
  };
  const dosyalar: ZipDosyasi[] = [];
  const medyalar = new Map<string, string>();
  for (const r of kayitlar) {
    const kod = r.kod as string;
    const y = yollar.get(kod)!;
    const on: [string, unknown][] = [['ad', r.ad], ['tur', turBul(r.tur as string).ad], ['karar', KARARLAR.find((k) => k.kod === r.karar)?.ad ?? r.karar]];
    if (r.ozet) on.push(['ozet', r.ozet]);
    if (r.okunus) on.push(['okunus', r.okunus]);
    const lakaplar = json(r.lakaplar) as string[], etiketler = json(r.etiketler) as string[];
    if (lakaplar?.length) on.push(['lakaplar', lakaplar]);
    if (etiketler?.length) on.push(['etiketler', etiketler]);
    if (ifade(r.tarih)) on.push(['tarih', ifade(r.tarih)]);
    try {
      const ks = kayitSablonu(e, kod);
      for (const a of ks.sablon.alanlar) {
        const v = ks.degerler[a.kod];
        if (v === null || v === undefined || v === '') continue;
        const d = typeof v === 'object' && v && 'ifade' in v ? (v as { ifade: string }).ifade
          : sayiDegeriMi(v) ? sayiMetni(v)
          : a.secenekler && typeof v === 'string' ? a.secenekler.find((s) => s.kod === v)?.ad ?? v : v === true ? 'Evet' : String(v);
        if (!on.some(([k]) => k === a.ad)) on.push([a.ad, d]);
      }
    } catch { /* şablonsuz kayıt */ }
    const parcalar = [`---\n${on.map(([k, v]) => `${/^[\p{L}\p{N} _-]+$/u.test(k) ? k : JSON.stringify(k)}: ${yamlDeger(v)}`).join('\n')}\n---`];
    const belge = metinBelgesi(e.db, kod, 'govde');
    if (belge) { const md = markdownYaz(belgeyeCevir(A.spans(belge, ['t']) as unknown[]), hedefAdi); if (md.trim()) parcalar.push(md); }
    const iliskiler = e.db.selectObjects('SELECT * FROM iliskiler WHERE silindi IS NULL AND (a=? OR b=?) ORDER BY tur', [kod, kod]);
    if (iliskiler.length) {
      parcalar.push('## İlişkiler\n\n' + iliskiler.map((i) => {
        const t = iliskiTuruBul(i.tur as string);
        const ben = i.a === kod;
        const karsi = (ben ? i.b : i.a) as string;
        const rol = rolAdi(i.tur as string, (i.rol as string) ?? null);
        const zaman = i.baslangic || i.bitis ? ` (${ifade(i.baslangic) ?? '…'} – ${ifade(i.bitis) ?? '…'})` : '';
        const ad = hedefAdi(karsi);
        return `- ${ben ? t.aIcin : t.bIcin}: ${ad ? `[[${ad}]]` : 'silinmiş kayıt'}${rol ? `, ${rol}` : ''}${zaman}${i.aciklama ? ` — ${i.aciklama}` : ''}`;
      }).join('\n'));
    }
    const durumlar = e.db.selectObjects('SELECT * FROM durumlar WHERE konu=? AND silindi IS NULL ORDER BY ozellik, olusturma', [kod]);
    if (durumlar.length) {
      parcalar.push('## Zamanla değişenler\n\n' + durumlar.map((d) => {
        const h = d.hedef ? hedefAdi(d.hedef as string) : null;
        return `- ${d.ozellik}: ${d.deger}${h ? ` [[${h}]]` : ''}${d.baslangic || d.bitis ? ` (${ifade(d.baslangic) ?? '…'} – ${ifade(d.bitis) ?? '…'})` : ''}`;
      }).join('\n'));
    }
    const gorseller = json(r.gorseller) as string[];
    if (gorseller?.length) {
      const satir: string[] = [];
      for (const g of gorseller) {
        const tur = e.db.selectValue('SELECT tur FROM medya WHERE ad=?', [g]) as string | undefined;
        const ad = `${g.slice(0, 16)}.${UZANTI[tur ?? ''] ?? 'bin'}`;
        medyalar.set(g, ad);
        satir.push(`![[${ad}]]`);
      }
      parcalar.push('## Görseller\n\n' + satir.join('\n'));
    }
    dosyalar.push({ ad: `${y.klasor}/${y.dosya}.md`, veri: yazi(parcalar.join('\n\n') + '\n') });
  }
  let eksikGorsel = 0;
  for (const [g, ad] of medyalar) {
    const v = await medyaOku(g);
    if (v) dosyalar.push({ ad: `Görseller/${ad}`, veri: v, sikistirma: false });
    else eksikGorsel++;
  }
  const okubeni = [
    `# ${evrenAdi}`, '',
    'Bu klasör, okunabilmesi için Dünya Atlası\'ndan dışa aktarıldı. Her kayıt bir Markdown dosyasıdır; kayıtlar türlerine göre klasörlerdedir.',
    'Bağlantılar [[Ad]] biçimindedir; Obsidian gibi programlarda tıklanabilir. Her dosyanın başındaki bilgi bölümünde tür, karar durumu, lakaplar, etiketler, tarih ve şablon alanları vardır.',
    '', '## Bu çıktıda olmayanlar', '', ...KAYIPLAR.map((k) => `- ${k}`),
    ...(eksikGorsel ? ['', `${eksikGorsel} görsel bu cihazda olmadığı için klasöre konamadı.`] : []),
    '', 'Hiçbir şey kaybetmeden taşımak ya da geri yüklemek için evrenin "Yedek" sekmesindeki tam yedeği kullanın.', '',
  ].join('\n');
  dosyalar.unshift({ ad: 'OKUBENI.md', veri: yazi(okubeni) });
  return { dosyalar, kayitSayisi: kayitlar.length, eksikGorsel };
}

// ---------- Eser: EPUB ve yazdırılabilir sayfa ----------
interface Bolum { baslik: string; numara: string | null; govde: string; sahneler: { id: string; ad: string }[] }

const ayracHtml = (g: KitapGorunumu) => g.ayrac === 'bos' ? '<p class="ayrac bos">&#160;</p>' : `<p class="ayrac">${xmlKacis(AYRAC_METNI[g.ayrac].replace(/ {3}/g, ' '))}</p>`;

/**
 * Eserin bölümleri; her bölümde sahneler sırayla, aralarında sahne ayracıyla. Vazgeçilmiş sahne girmez.
 * `secili` verilirse yalnız oradaki sahneler girer; seçili sahnesi olmayan bölüm hiç yazılmaz.
 */
function eserBolumleri(e: EvrenVt, eser: string, sahneBasliklari: boolean, secili?: ReadonlySet<string>): { ad: string; bolumler: Bolum[]; g: KitapGorunumu } {
  const y = eserYapisi(e, eser);
  const g = gorunumOku(e, eser);
  const girer = (x: { kod: string; karar: string }) => x.karar !== 'vazgecildi' && (!secili || secili.has(x.kod));
  let sayac = 0;
  const sahneHtml = (s: { kod: string; ad: string; karar: string }[]) => {
    const liste: { id: string; ad: string }[] = [];
    const govde = s.filter(girer).map((x) => {
      const b = metinBelgesi(e.db, x.kod, 'govde');
      const govde = b ? xhtmlYaz(belgeyeCevir(A.spans(b, ['t']) as unknown[])) : '';
      if (!govde.trim() && !sahneBasliklari) return '';
      const id = `s${++sayac}`;
      liste.push({ id, ad: x.ad });
      return `<div id="${id}">${sahneBasliklari ? `<h3>${xmlKacis(x.ad)}</h3>\n` : ''}${govde}</div>`;
    }).filter((x) => x.trim()).join(`\n${ayracHtml(g)}\n`);
    // Bölümün ilk paragrafı büyük baş harfle başlar.
    return { govde: g.basHarf ? govde.replace('<p>', '<p class="bas-harf">') : govde, liste };
  };
  const bolumler: Bolum[] = [];
  if (y.dogrudan.length) { const h = sahneHtml(y.dogrudan); if (h.govde) bolumler.push({ baslik: y.bolumler.length ? 'Giriş' : y.eser.ad, numara: null, govde: h.govde, sahneler: h.liste }); }
  let n = 0;
  for (const b of y.bolumler) {
    if (b.karar === 'vazgecildi') continue;
    const h = sahneHtml(b.sahneler);
    if (secili && !h.govde) continue;
    n++;
    bolumler.push({ baslik: b.ad, numara: g.bolumYaziyla ? `${siraSayisi(n)} Bölüm` : null, govde: h.govde, sahneler: h.liste });
  }
  return { ad: y.eser.ad, bolumler, g };
}

const bolumBasi = (b: Bolum, g: KitapGorunumu) =>
  `${b.numara ? `<p class="numara">${xmlKacis(b.numara)}</p>\n` : ''}<h2>${xmlKacis(b.baslik)}</h2>\n${g.sus ? `<p class="sus">${SUS}</p>\n` : ''}`;

/** Kitap sonu eki: başlık, satırlar ve (haritada) görsel. */
const ekHtml = (k: KitapEki, gorsel: string | null) => `<h2>${xmlKacis(k.baslik)}</h2>
${gorsel ? `<p class="gorsel"><img src="${gorsel}" alt="${xmlKacis(k.baslik)}"/></p>` : ''}
${k.girdiler.length ? `<dl>${k.girdiler.map((x) => `<dt>${xmlKacis(x.ad)}</dt><dd>${xmlKacis(x.aciklama) || '&#160;'}</dd>`).join('\n')}</dl>` : ''}
${k.not ? `<p class="not">${xmlKacis(k.not)}</p>` : ''}`;

/** Çıktıda seçilebilecek bölüm ve sahneler (vazgeçilmişler hariç), sahnenin çalışma durumuyla (§10.11). */
export function ciktiAgaci(e: EvrenVt, eser: string): CiktiAgaci {
  const y = eserYapisi(e, eser);
  const sahne = (x: { kod: string; ad: string }): CiktiSahnesi => {
    const d = e.db.selectValue("SELECT deger FROM alan_degerleri WHERE kayit=? AND alan='calisma'", [x.kod]);
    const b = metinBelgesi(e.db, x.kod, 'govde');
    const metinli = !!b && (A.spans(b, ['t']) as { type: string; value?: unknown }[]).some((p) => p.type === 'text' && typeof p.value === 'string' && p.value.trim() !== '');
    return { kod: x.kod, ad: x.ad, calisma: typeof d === 'string' ? JSON.parse(d) as string : null, metinli };
  };
  const acik = <T extends { karar: string }>(l: T[]) => l.filter((x) => x.karar !== 'vazgecildi');
  return {
    dogrudan: acik(y.dogrudan).map(sahne),
    bolumler: acik(y.bolumler).map((b) => ({ kod: b.kod, ad: b.ad, sahneler: acik(b.sahneler).map(sahne) })),
  };
}

/** Eserin kayıtlı kitap görünümü (K38); yoksa varsayılan. */
export function gorunumOku(e: EvrenVt, eser: string): KitapGorunumu {
  const v = e.db.selectValue('SELECT gorunum FROM kitap_gorunumleri WHERE kod=?', [eser]);
  return gorunumDuzelt(typeof v === 'string' ? JSON.parse(v) : null);
}

/** Eserin PDF ve Word çıktısı için okuma düzeni; bölüm ve sahne sırası, vazgeçilenler ve "Giriş" EPUB'la aynı. */
export function eserKitabi(e: EvrenVt, eser: string, sahneBasliklari: boolean, secili?: ReadonlySet<string>): Kitap & { sahneKodlari: string[] } {
  const y = eserYapisi(e, eser);
  const g = gorunumOku(e, eser);
  const kodlar: string[] = [];
  const sahneler = (s: { kod: string; ad: string; karar: string }[]): KitapSahnesi[] => s.filter((x) => x.karar !== 'vazgecildi' && (!secili || secili.has(x.kod))).map((x) => {
    const b = metinBelgesi(e.db, x.kod, 'govde');
    const bloklar = b ? bloklaraCevir(belgeyeCevir(A.spans(b, ['t']) as unknown[])) : [];
    if (bloklar.length) kodlar.push(x.kod);
    return { baslik: sahneBasliklari ? x.ad : null, ad: x.ad, bloklar };
  }).filter((x) => x.bloklar.length);
  const bolumler: Kitap['bolumler'] = [];
  if (y.dogrudan.length) { const s = sahneler(y.dogrudan); if (s.length) bolumler.push({ baslik: y.bolumler.length ? 'Giriş' : y.eser.ad, sahneler: s }); }
  let n = 0;
  for (const b of y.bolumler) {
    if (b.karar === 'vazgecildi') continue;
    const s = sahneler(b.sahneler);
    if (secili && !s.length) continue;
    n++;
    bolumler.push({ baslik: b.ad, sahneler: s, ...(g.bolumYaziyla ? { numara: `${siraSayisi(n)} Bölüm` } : {}) });
  }
  if (!bolumler.some((b) => b.sahneler.length)) throw new Error(secili ? 'Seçtiğiniz sahnelerde metin yok.' : 'Eserde metni olan sahne yok.');
  return { ad: y.eser.ad, bolumler, gorunum: g, sahneKodlari: kodlar };
}

/** Çıktıya giren sahnelerde geçen karakterler ve sözlük kayıtları: bağlantı, sahnedeki yer ya da adın geçmesi (K1: anlam çıkarılmaz). */
export function gecenKayitlar(e: EvrenVt, sahneler: readonly string[]) {
  const kumesi = new Set(sahneler);
  const metinler = sahneler.map((k) => (e.db.selectValue("SELECT duz FROM metinler WHERE kayit=? AND alan='govde'", [k]) as string | undefined) ?? '');
  const bloklar = metinler.flatMap((m) => m.split('\n')).map((metin) => ({ metin, bagli: [] as boolean[] }));
  const anilan = (adlar: AranacakAd[]) => { const l = new Set<string>(); if (adlar.length) for (const x of bagsizAdlar(bloklar, adlar, new Set(), 1_000_000)) for (const k of x.kodlar) l.add(k); return l; };
  const baglanan = new Set<string>();
  for (const k of kumesi) for (const r of e.db.selectObjects("SELECT hedef FROM baglantilar WHERE kaynak=? AND alan='govde'", [k])) baglanan.add(r.hedef as string);
  const karakterler = e.db.selectObjects("SELECT kod, ad, ozet, lakaplar FROM kayitlar WHERE tur='karakter' AND silindi IS NULL") as { kod: string; ad: string; ozet: string; lakaplar: string }[];
  const katilan = new Set<string>();
  for (const k of kumesi) for (const r of e.db.selectObjects("SELECT a FROM iliskiler WHERE b=? AND tur IN ('sahnede','bakis','anlatici','odak') AND silindi IS NULL", [k])) katilan.add(r.a as string);
  const adla = anilan(karakterler.flatMap((r) => [r.ad, ...(JSON.parse(r.lakaplar) as string[])].filter((x) => typeof x === 'string' && x.trim()).map((ifade) => ({ kod: r.kod, ifade }))));
  const kisiler = karakterler.filter((r) => baglanan.has(r.kod) || katilan.has(r.kod) || adla.has(r.kod))
    .map((r) => ({ ad: r.ad, aciklama: r.ozet ?? '' })).sort((a, b) => turkceKarsilastir(a.ad, b.ad));
  const sozluk = sozlukKayitlari(e);
  const terimAdla = anilan(sozluk.flatMap((t) => t.ifadeler.map((ifade) => ({ kod: t.kod, ifade }))));
  const terimler = sozluk.filter((t) => baglanan.has(t.kod) || terimAdla.has(t.kod)).map((t) => ({ ad: t.ad, aciklama: t.anlam })).sort((a, b) => turkceKarsilastir(a.ad, b.ad));
  return { kisiler, terimler };
}

/** Takvim eki: ay adları ve gün sayıları, mevsimler, günün bölümleri. */
export function takvimEki(e: EvrenVt): KitapEki {
  const t = takvimOku(e.db);
  const aylar = t.aylar ?? [];
  const girdiler = [
    ...aylar.map((a) => ({ ad: a.ad, aciklama: `${a.gun} gün` })),
    ...(t.mevsimler ?? []).map((m) => ({ ad: m.ad, aciklama: aylar[m.ilkAy] && aylar[m.sonAy] ? `${aylar[m.ilkAy].ad} – ${aylar[m.sonAy].ad}` : '' })),
    ...(t.gunBolumleri?.length ? [{ ad: 'Günün bölümleri', aciklama: t.gunBolumleri.join(', ') }] : []),
  ];
  return { baslik: 'Takvim', girdiler, not: `Bir yıl ${t.yilGun} gün${aylar.length ? `, ${aylar.length} ay` : ''}. Yıllar “${t.ad} 412” gibi yazılır.` };
}

/** Haritanın ilk görünür katmanının görseli. */
export function haritaGorseli(e: EvrenVt, harita: string): { ad: string; gorsel: string } | null {
  const r = e.db.selectObject('SELECT ad, katmanlar FROM haritalar WHERE kod=? AND silindi IS NULL', [harita]);
  const g = r ? katmanlarOku(r.katmanlar as string).find((k) => !k.silindi)?.gorsel : null;
  return r && g ? { ad: r.ad as string, gorsel: g } : null;
}

const STIL = `body { font-family: Georgia, "Times New Roman", serif; line-height: 1.55; margin: 0 5%; }
h1, h2 { text-align: center; font-weight: normal; margin: 2em 0 1em; }
h3 { font-size: 1em; font-style: italic; font-weight: normal; margin-top: 1.5em; }
p { margin: 0; text-indent: 1.5em; text-align: justify; }
h2 + p, h3 + p, p.ayrac + div > p:first-child, p.sus + div > p:first-child, h2 + div > p:first-child, blockquote + p, div > h3 + p { text-indent: 0; }
p.ayrac { text-align: center; text-indent: 0; margin: 1.2em 0; }
p.numara { text-align: center; text-indent: 0; letter-spacing: 0.2em; font-size: 0.8em; margin-top: 3em; text-transform: uppercase; }
p.numara + h2 { margin-top: 0.3em; }
p.sus { text-align: center; text-indent: 0; margin: -0.5em 0 1.5em; font-size: 1.3em; }
p.bas-harf::first-letter { float: left; font-size: 3.3em; line-height: 0.85; padding: 0.06em 0.08em 0 0; }
blockquote { margin: 1em 2em; font-style: italic; }
dt { font-weight: bold; margin-top: 0.6em; }
dd { margin: 0 0 0 1.5em; }
p.not { text-indent: 0; margin-top: 1em; font-style: italic; }
p.gorsel { text-align: center; text-indent: 0; }
p.gorsel img { max-width: 100%; max-height: 90vh; }
.kapak-gorseli { text-align: center; }
.kapak-gorseli img { max-width: 100%; max-height: 95vh; }
nav ol { list-style: none; padding-left: 0; } nav ol ol { padding-left: 1.5em; }`;

const xhtmlSayfa = (baslik: string, govde: string) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="tr" lang="tr">
<head><meta charset="utf-8"/><title>${xmlKacis(baslik)}</title><link rel="stylesheet" type="text/css" href="stil.css"/></head>
<body>
${govde}
</body>
</html>
`;

export interface KitapEkVerisi { kapak: KitapGorseli | null; ekler: KitapEki[] }
const UZ = (g: KitapGorseli) => (g.tur === 'image/png' ? 'png' : 'jpg');

export function epubDosyalari(e: EvrenVt, eser: string, sahneBasliklari: boolean, zaman = new Date(), secili?: ReadonlySet<string>, ek: KitapEkVerisi = { kapak: null, ekler: [] }): { ad: string; dosyalar: ZipDosyasi[] } {
  const { ad, bolumler, g } = eserBolumleri(e, eser, sahneBasliklari, secili);
  if (!bolumler.length) throw new Error(secili ? 'Seçtiğiniz sahnelerde metin yok.' : 'Eserde metni olan sahne yok.');
  const sayfalar = bolumler.map((b, i) => ({ dosya: `bolum-${String(i + 1).padStart(3, '0')}.xhtml`, ...b }));
  const ekSayfalari = ek.ekler.map((k, i) => ({ dosya: `ek-${i + 1}.xhtml`, k, gorsel: k.gorsel ? `ek-${i + 1}.${UZ(k.gorsel)}` : null }));
  const degisti = zaman.toISOString().replace(/\.\d+Z$/, 'Z');
  const kapakDosyasi = ek.kapak ? `kapak.${UZ(ek.kapak)}` : null;
  const icindekilerOkunur = g.icindekiler !== 'yok';
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="kimlik" xml:lang="tr">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="kimlik">urn:dunya-atlasi:${xmlKacis(eser)}</dc:identifier>
    <dc:title>${xmlKacis(ad)}</dc:title>
    <dc:language>tr</dc:language>
    <meta property="dcterms:modified">${degisti}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="icindekiler.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="stil" href="stil.css" media-type="text/css"/>
    <item id="kapak" href="kapak.xhtml" media-type="application/xhtml+xml"/>
${kapakDosyasi ? `    <item id="kapak-gorseli" href="${kapakDosyasi}" media-type="${ek.kapak!.tur}" properties="cover-image"/>\n` : ''}${sayfalar.map((s, i) => `    <item id="b${i + 1}" href="${s.dosya}" media-type="application/xhtml+xml"/>`).join('\n')}
${ekSayfalari.map((x, i) => `    <item id="e${i + 1}" href="${x.dosya}" media-type="application/xhtml+xml"/>${x.gorsel ? `\n    <item id="eg${i + 1}" href="${x.gorsel}" media-type="${x.k.gorsel!.tur}"/>` : ''}`).join('\n')}
  </manifest>
  <spine>
    <itemref idref="kapak"/>
${icindekilerOkunur ? '    <itemref idref="nav"/>\n' : ''}${sayfalar.map((_, i) => `    <itemref idref="b${i + 1}"/>`).join('\n')}
${ekSayfalari.map((_, i) => `    <itemref idref="e${i + 1}"/>`).join('\n')}
  </spine>
</package>
`;
  const sahneListesi = (s: (typeof sayfalar)[number]) => g.icindekiler === 'sahneler' && s.sahneler.length
    ? `<ol>${s.sahneler.map((x) => `<li><a href="${s.dosya}#${x.id}">${xmlKacis(x.ad)}</a></li>`).join('')}</ol>` : '';
  const nav = xhtmlSayfa('İçindekiler', `<nav epub:type="toc" id="toc"><h2>İçindekiler</h2><ol>
${sayfalar.map((s) => `<li><a href="${s.dosya}">${xmlKacis(s.numara ? `${s.numara}: ${s.baslik}` : s.baslik)}</a>${sahneListesi(s)}</li>`).join('\n')}
${ekSayfalari.map((x) => `<li><a href="${x.dosya}">${xmlKacis(x.k.baslik)}</a></li>`).join('\n')}
</ol></nav>`);
  const kapakGovde = kapakDosyasi
    ? `<section epub:type="cover" class="kapak-gorseli"><img src="${kapakDosyasi}" alt="${xmlKacis(ad)}"/></section>\n<section epub:type="titlepage"><h1>${xmlKacis(ad)}</h1></section>`
    : `<section epub:type="titlepage"><h1>${xmlKacis(ad)}</h1></section>`;
  const dosyalar: ZipDosyasi[] = [
    { ad: 'mimetype', veri: yazi('application/epub+zip'), sikistirma: false },
    { ad: 'META-INF/container.xml', veri: yazi(`<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/icerik.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`) },
    { ad: 'OEBPS/icerik.opf', veri: yazi(opf) },
    { ad: 'OEBPS/icindekiler.xhtml', veri: yazi(nav) },
    { ad: 'OEBPS/stil.css', veri: yazi(STIL) },
    { ad: 'OEBPS/kapak.xhtml', veri: yazi(xhtmlSayfa(ad, kapakGovde)) },
    ...(kapakDosyasi ? [{ ad: `OEBPS/${kapakDosyasi}`, veri: ek.kapak!.veri, sikistirma: false }] : []),
    ...sayfalar.map((s) => ({ ad: `OEBPS/${s.dosya}`, veri: yazi(xhtmlSayfa(s.baslik, `<section epub:type="chapter">${bolumBasi(s, g)}${s.govde}</section>`)) })),
    ...ekSayfalari.flatMap((x) => [
      { ad: `OEBPS/${x.dosya}`, veri: yazi(xhtmlSayfa(x.k.baslik, `<section epub:type="backmatter">${ekHtml(x.k, x.gorsel)}</section>`)) },
      ...(x.gorsel ? [{ ad: `OEBPS/${x.gorsel}`, veri: x.k.gorsel!.veri, sikistirma: false }] : []),
    ]),
  ];
  return { ad, dosyalar };
}

/** Yazdırılabilir sayfa (tarayıcının "PDF olarak kaydet"i ile PDF olur). Görseller sayfaya gömülür. */
export function eserBaskiSayfasi(e: EvrenVt, eser: string, sahneBasliklari: boolean, secili?: ReadonlySet<string>, ek: KitapEkVerisi = { kapak: null, ekler: [] }): string {
  const { ad, bolumler, g } = eserBolumleri(e, eser, sahneBasliklari, secili);
  if (!bolumler.length) throw new Error(secili ? 'Seçtiğiniz sahnelerde metin yok.' : 'Eserde metni olan sahne yok.');
  const veriAdresi = (x: KitapGorseli) => `data:${x.tur};base64,${base64(x.veri)}`;
  const icindekiler = g.icindekiler === 'yok' ? '' : `<section class="bolum"><h2>İçindekiler</h2><ol class="icindekiler">${bolumler.map((b) =>
    `<li>${xmlKacis(b.numara ? `${b.numara}: ${b.baslik}` : b.baslik)}${g.icindekiler === 'sahneler' && b.sahneler.length ? `<ol>${b.sahneler.map((x) => `<li>${xmlKacis(x.ad)}</li>`).join('')}</ol>` : ''}</li>`).join('')}</ol></section>`;
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${xmlKacis(ad)}</title><style>
${STIL}
@page { size: A5; margin: 18mm 16mm; }
body { margin: 0; font-size: 11pt; }
.kapak { height: 90vh; display: flex; align-items: center; justify-content: center; }
.kapak h1 { font-size: 24pt; }
.kapak-gorseli { height: 95vh; display: flex; align-items: center; justify-content: center; break-after: page; }
section.bolum { break-before: page; }
ol.icindekiler { list-style: none; padding: 0; } ol.icindekiler ol { list-style: none; padding-left: 1.5em; }
</style></head><body>
${ek.kapak ? `<div class="kapak-gorseli"><img src="${veriAdresi(ek.kapak)}" alt=""></div>` : ''}
<div class="kapak"><h1>${xmlKacis(ad)}</h1></div>
${icindekiler}
${bolumler.map((b) => `<section class="bolum">${bolumBasi(b, g)}${b.govde}</section>`).join('\n')}
${ek.ekler.map((k) => `<section class="bolum">${ekHtml(k, k.gorsel ? veriAdresi(k.gorsel) : null)}</section>`).join('\n')}
</body></html>`;
}

function base64(v: Uint8Array): string {
  let s = '';
  for (let i = 0; i < v.length; i += 0x8000) s += String.fromCharCode(...v.subarray(i, i + 0x8000));
  return btoa(s);
}
