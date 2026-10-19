// Okunabilir dışa aktarma (§10.11): bütün evren bağlantıları korunmuş Markdown olarak (Obsidian uyumlu), bir eser
// EPUB olarak ve yazdırılabilir sayfa (PDF) olarak. Neyin kaybolduğu açıklama dosyasında yazılır. Tam ve kayıpsız
// taşıma için taşınabilir paket (yedek) vardır; bu çıktılar okumak içindir.
import { belgeyeCevir, dosyaAdi, markdownYaz, xhtmlYaz, xmlKacis, yamlDeger } from '../alan/cikti';
import { iliskiTuruBul, rolAdi } from '../alan/iliski-turleri';
import { KARARLAR, turBul } from '../alan/turler';
import { A } from '../alan/automerge';
import type { ZipDosyasi } from '../alan/zip';
import { eserYapisi } from './anlati';
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
interface Bolum { baslik: string; govde: string }

/** Eserin bölümleri; her bölümde sahneler sırayla, aralarında sahne ayracıyla. Vazgeçilmiş sahne girmez. */
function eserBolumleri(e: EvrenVt, eser: string, sahneBasliklari: boolean): { ad: string; bolumler: Bolum[] } {
  const y = eserYapisi(e, eser);
  const sahneHtml = (s: { kod: string; ad: string; karar: string }[]) => s.filter((x) => x.karar !== 'vazgecildi').map((x) => {
    const b = metinBelgesi(e.db, x.kod, 'govde');
    const govde = b ? xhtmlYaz(belgeyeCevir(A.spans(b, ['t']) as unknown[])) : '';
    return `${sahneBasliklari ? `<h3>${xmlKacis(x.ad)}</h3>\n` : ''}${govde}`;
  }).filter((x) => x.trim()).join('\n<hr class="ara"/>\n');
  const bolumler: Bolum[] = [];
  if (y.dogrudan.length) { const g = sahneHtml(y.dogrudan); if (g) bolumler.push({ baslik: y.bolumler.length ? 'Giriş' : y.eser.ad, govde: g }); }
  for (const b of y.bolumler) if (b.karar !== 'vazgecildi') bolumler.push({ baslik: b.ad, govde: sahneHtml(b.sahneler) });
  return { ad: y.eser.ad, bolumler };
}

const STIL = `body { font-family: Georgia, "Times New Roman", serif; line-height: 1.55; margin: 0 5%; }
h1, h2 { text-align: center; font-weight: normal; margin: 2em 0 1em; }
h3 { font-size: 1em; font-style: italic; font-weight: normal; margin-top: 1.5em; }
p { margin: 0; text-indent: 1.5em; text-align: justify; }
h2 + p, h3 + p, hr + p, blockquote + p { text-indent: 0; }
hr.ara { border: 0; text-align: center; margin: 1.2em 0; }
hr.ara::after { content: "⁂"; }
blockquote { margin: 1em 2em; font-style: italic; }`;

const xhtmlSayfa = (baslik: string, govde: string) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="tr" lang="tr">
<head><meta charset="utf-8"/><title>${xmlKacis(baslik)}</title><link rel="stylesheet" type="text/css" href="stil.css"/></head>
<body>
${govde}
</body>
</html>
`;

export function epubDosyalari(e: EvrenVt, eser: string, sahneBasliklari: boolean, zaman = new Date()): { ad: string; dosyalar: ZipDosyasi[] } {
  const { ad, bolumler } = eserBolumleri(e, eser, sahneBasliklari);
  if (!bolumler.length) throw new Error('Eserde metni olan sahne yok.');
  const sayfalar = bolumler.map((b, i) => ({ dosya: `bolum-${String(i + 1).padStart(3, '0')}.xhtml`, ...b }));
  const degisti = zaman.toISOString().replace(/\.\d+Z$/, 'Z');
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
${sayfalar.map((s, i) => `    <item id="b${i + 1}" href="${s.dosya}" media-type="application/xhtml+xml"/>`).join('\n')}
  </manifest>
  <spine>
    <itemref idref="kapak"/>
${sayfalar.map((_, i) => `    <itemref idref="b${i + 1}"/>`).join('\n')}
  </spine>
</package>
`;
  const nav = xhtmlSayfa('İçindekiler', `<nav epub:type="toc" id="toc"><h2>İçindekiler</h2><ol>
${sayfalar.map((s) => `<li><a href="${s.dosya}">${xmlKacis(s.baslik)}</a></li>`).join('\n')}
</ol></nav>`);
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
    { ad: 'OEBPS/kapak.xhtml', veri: yazi(xhtmlSayfa(ad, `<section epub:type="titlepage"><h1>${xmlKacis(ad)}</h1></section>`)) },
    ...sayfalar.map((s) => ({ ad: `OEBPS/${s.dosya}`, veri: yazi(xhtmlSayfa(s.baslik, `<section epub:type="chapter"><h2>${xmlKacis(s.baslik)}</h2>\n${s.govde}</section>`)) })),
  ];
  return { ad, dosyalar };
}

/** Yazdırılabilir sayfa (tarayıcının "PDF olarak kaydet"i ile PDF olur). */
export function eserBaskiSayfasi(e: EvrenVt, eser: string, sahneBasliklari: boolean): string {
  const { ad, bolumler } = eserBolumleri(e, eser, sahneBasliklari);
  if (!bolumler.length) throw new Error('Eserde metni olan sahne yok.');
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${xmlKacis(ad)}</title><style>
${STIL}
@page { size: A5; margin: 18mm 16mm; }
body { margin: 0; font-size: 11pt; }
.kapak { height: 90vh; display: flex; align-items: center; justify-content: center; }
.kapak h1 { font-size: 24pt; }
section.bolum { break-before: page; }
</style></head><body>
<div class="kapak"><h1>${xmlKacis(ad)}</h1></div>
${bolumler.map((b) => `<section class="bolum"><h2>${xmlKacis(b.baslik)}</h2>\n${b.govde}</section>`).join('\n')}
</body></html>`;
}
