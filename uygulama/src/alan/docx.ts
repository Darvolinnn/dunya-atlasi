// Eserin Word (.docx) çıktısı (§10.11): Office Open XML dosyaları elle yazılır, ZIP'lenir; ağ ya da ek program
// gerekmez. Bölümler yeni sayfada başlar ve Word'ün gezinti bölmesinde görünür (Başlık 1); sahneler ayraçla ayrılır;
// sayfa altında sayfa numarası vardır. Metin UTF-8'dir, dil Türkçe işaretlenir (yazım denetimi ve tireleme için).
import { xmlKacis } from './cikti';
import { AYRAC_METNI, SUS, VARSAYILAN_GORUNUM, type Blok, type Kitap, type KitapGorseli, type Parca } from './kitap';
import type { ZipDosyasi } from './zip';

const yazi = (s: string) => new TextEncoder().encode(s);
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
// Yayınevlerinin dosya gönderiminde istediği düzen: A4, Times New Roman 12 punto, 1,5 satır, 2,5 cm kenar.
const YAZI_TIPI = 'Times New Roman';

/** Bir parça: satır sonu ve sekme Word'ün kendi öğelerine çevrilir. */
function parcaXml(p: Parca): string {
  const ozellik = (p.kalin ? '<w:b/><w:bCs/>' : '') + (p.egik ? '<w:i/><w:iCs/>' : '');
  const rPr = ozellik ? `<w:rPr>${ozellik}</w:rPr>` : '';
  const ic = p.metin.split('\n').map((satir) => satir.split('\t').map((t) => t ? `<w:t xml:space="preserve">${xmlKacis(t)}</w:t>` : '').join('<w:tab/>')).join('<w:br/>');
  return `<w:r>${rPr}${ic}</w:r>`;
}
const paragraf = (stil: string, parcalar: Parca[]) => `<w:p><w:pPr><w:pStyle w:val="${stil}"/></w:pPr>${parcalar.map(parcaXml).join('')}</w:p>`;
const duz = (stil: string, metin: string) => paragraf(stil, [{ metin }]);

const EMU = 9525; // bir pikselin (96 dpi) EMU karşılığı
/** Satır içi görsel; en çok `enCm` genişliğinde, oranı korunur. */
function gorselXml(no: number, g: KitapGorseli, enCm: number, boyCm: number): string {
  const en = g.en || 1, boy = g.boy || 1;
  const o = Math.min((enCm * 360000) / (en * EMU), (boyCm * 360000) / (boy * EMU));
  const cx = Math.round(en * EMU * o), cy = Math.round(boy * EMU * o);
  return `<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${no}" name="Görsel ${no}"/>`
    + `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`
    + `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${no}" name="gorsel${no}"/><pic:cNvPicPr/></pic:nvPicPr>`
    + `<pic:blipFill><a:blip r:embed="rIdGorsel${no}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
    + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}
const SAYFA_SONU = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
const SUS_RUN = `<w:r><w:rPr><w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol"/><w:sz w:val="32"/></w:rPr><w:t>${SUS}</w:t></w:r>`;

/** Bölümün ilk paragrafının büyük baş harfi: Word'ün kendi "baş harf" çerçevesi (üç satır). */
function basHarfli(parcalar: Parca[]): string {
  const ilk = Array.from(parcalar[0]?.metin ?? '')[0];
  if (!ilk || !/\p{L}/u.test(ilk)) return paragraf('IlkParagraf', parcalar);
  const p0 = parcalar[0];
  const harf = `<w:p><w:pPr><w:pStyle w:val="IlkParagraf"/><w:keepNext/><w:framePr w:dropCap="drop" w:lines="3" w:wrap="around" w:vAnchor="text" w:hAnchor="text"/><w:spacing w:line="1080" w:lineRule="exact"/><w:textAlignment w:val="baseline"/></w:pPr>`
    + `<w:r><w:rPr>${p0.kalin ? '<w:b/>' : ''}${p0.egik ? '<w:i/>' : ''}<w:position w:val="-10"/><w:sz w:val="118"/><w:szCs w:val="118"/></w:rPr><w:t>${xmlKacis(ilk)}</w:t></w:r></w:p>`;
  return harf + paragraf('IlkParagraf', [{ ...p0, metin: p0.metin.slice(ilk.length) }, ...parcalar.slice(1)]);
}

function belge(k: Kitap, gorselNo: Map<KitapGorseli, number>): string {
  const g = k.gorunum ?? VARSAYILAN_GORUNUM;
  const out: string[] = [];
  if (k.kapak && gorselNo.has(k.kapak)) out.push(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${gorselXml(gorselNo.get(k.kapak)!, k.kapak, 16, 24)}</w:p>`, SAYFA_SONU);
  out.push(duz('KitapAdi', k.ad));
  if (g.icindekiler !== 'yok') {
    const duzey = g.icindekiler === 'sahneler' ? '1-2' : '1-1';
    const girdiler = [
      ...k.bolumler.flatMap((b) => [{ m: b.numara ? `${b.numara}: ${b.baslik}` : b.baslik, d: 1 }, ...(g.icindekiler === 'sahneler' ? b.sahneler.map((x) => ({ m: x.ad ?? x.baslik ?? '', d: 2 })) : [])]),
      ...(k.ekler ?? []).map((x) => ({ m: x.baslik, d: 1 })),
    ];
    out.push(SAYFA_SONU, duz('IcindekilerBasligi', 'İçindekiler'));
    // Alan Word'de açılışta güncellenir (sayfa numaraları); önceden yazılan satırlar o zamana kadar görünür.
    out.push(`<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-1" \\l "${duzey}" \\h \\z </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r></w:p>`);
    for (const x of girdiler) out.push(duz(x.d === 1 ? 'TOC1' : 'TOC2', x.m));
    out.push('<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>');
  }
  const ayrac = g.ayrac === 'bos' ? '<w:p><w:pPr><w:pStyle w:val="Ayrac"/></w:pPr></w:p>'
    : g.ayrac === 'sus' ? `<w:p><w:pPr><w:pStyle w:val="Ayrac"/></w:pPr>${SUS_RUN}</w:p>` : duz('Ayrac', AYRAC_METNI[g.ayrac].replace(/ {3}/g, ' '));
  for (const b of k.bolumler) {
    if (b.numara) out.push(duz('BolumNumarasi', b.numara), `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:pageBreakBefore w:val="0"/><w:spacing w:before="120"/></w:pPr>${parcaXml({ metin: b.baslik })}</w:p>`);
    else out.push(duz('Heading1', b.baslik));
    if (g.sus) out.push(`<w:p><w:pPr><w:pStyle w:val="Ayrac"/></w:pPr>${SUS_RUN}</w:p>`);
    let ilk = true, bolumunIlki = true;
    b.sahneler.forEach((s, i) => {
      if (i > 0) { out.push(ayrac); ilk = true; }
      // Sahneler içindekilerde (başlığı yazılmasa da) gizli bir girdiyle yer alır.
      const tc = g.icindekiler === 'sahneler' ? `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TC "${xmlKacis((s.ad ?? s.baslik ?? '').replace(/"/g, '”'))}" \\l 2 </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>` : '';
      if (s.baslik) { out.push(`<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>${tc}${parcaXml({ metin: s.baslik })}</w:p>`); ilk = true; }
      else if (tc) out.push(`<w:p><w:pPr><w:pStyle w:val="Gizli"/></w:pPr>${tc}</w:p>`);
      for (const bl of s.bloklar as Blok[]) {
        if (bl.tur === 'baslik') { out.push(paragraf('Heading3', bl.parcalar)); ilk = true; }
        else if (bl.tur === 'alinti') { out.push(paragraf('Alinti', bl.parcalar)); ilk = true; }
        else { out.push(g.basHarf && bolumunIlki ? basHarfli(bl.parcalar) : paragraf(ilk ? 'IlkParagraf' : 'Normal', bl.parcalar)); ilk = false; bolumunIlki = false; }
      }
    });
  }
  for (const ek of k.ekler ?? []) {
    out.push(duz('Heading1', ek.baslik));
    if (ek.gorsel && gorselNo.has(ek.gorsel)) out.push(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${gorselXml(gorselNo.get(ek.gorsel)!, ek.gorsel, 16, 22)}</w:p>`);
    for (const x of ek.girdiler) out.push(paragraf('EkGirdisi', [{ metin: x.ad, kalin: true }, ...(x.aciklama ? [{ metin: ` — ${x.aciklama}` }] : [])]));
    if (ek.not) out.push(paragraf('EkGirdisi', [{ metin: ek.not, egik: true }]));
  }
  // A4, 2,5 cm kenar boşluğu; sayfa numarası altta ortada.
  const bolum = '<w:sectPr><w:footerReference w:type="default" r:id="rIdAlt"/><w:pgSz w:w="11906" w:h="16838"/>'
    + '<w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/><w:titlePg/></w:sectPr>';
  return `${XML}<w:document ${W}><w:body>${out.join('')}${bolum}</w:body></w:document>`;
}

const STILLER = `${XML}<w:styles ${W}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${YAZI_TIPI}" w:hAnsi="${YAZI_TIPI}" w:cs="${YAZI_TIPI}" w:eastAsia="${YAZI_TIPI}"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="tr-TR" w:eastAsia="tr-TR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:firstLine="425"/><w:jc w:val="both"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="IlkParagraf"><w:name w:val="İlk paragraf"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:firstLine="0"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="KitapAdi"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="4000" w:after="600"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="52"/><w:szCs w:val="52"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="IlkParagraf"/><w:qFormat/><w:pPr><w:keepNext/><w:pageBreakBefore/><w:spacing w:before="1200" w:after="600"/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="IlkParagraf"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:ind w:firstLine="0"/><w:jc w:val="left"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:i/><w:iCs/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="IlkParagraf"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:ind w:firstLine="0"/><w:jc w:val="left"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:bCs/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Alinti"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="120" w:after="120"/><w:ind w:left="567" w:right="567" w:firstLine="0"/></w:pPr><w:rPr><w:i/><w:iCs/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Ayrac"><w:name w:val="Sahne ayracı"/><w:basedOn w:val="Normal"/><w:next w:val="IlkParagraf"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="240"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="BolumNumarasi"><w:name w:val="Bölüm numarası"/><w:basedOn w:val="Normal"/><w:next w:val="Heading1"/><w:pPr><w:keepNext/><w:pageBreakBefore/><w:spacing w:before="1000" w:after="0"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:caps/><w:spacing w:val="40"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="IcindekilerBasligi"><w:name w:val="TOC Heading"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="600" w:after="400"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9060"/></w:tabs><w:ind w:firstLine="0"/><w:jc w:val="left"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC2"><w:name w:val="toc 2"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9060"/></w:tabs><w:ind w:left="425" w:firstLine="0"/><w:jc w:val="left"/></w:pPr><w:rPr><w:i/><w:iCs/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="EkGirdisi"><w:name w:val="Ek girdisi"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80"/><w:ind w:firstLine="0"/><w:jc w:val="left"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Gizli"><w:name w:val="İçindekiler işareti"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:line="20" w:lineRule="exact"/><w:ind w:firstLine="0"/></w:pPr><w:rPr><w:sz w:val="2"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
</w:styles>`;

const ALT = `${XML}<w:ftr ${W}><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;

/** Eserin .docx dosyasını oluşturan dosyalar (ZIP'lenmeye hazır). */
export function docxDosyalari(k: Kitap, zaman = new Date()): ZipDosyasi[] {
  const tarih = zaman.toISOString().replace(/\.\d+Z$/, 'Z');
  const gorseller = [k.kapak, ...(k.ekler ?? []).map((x) => x.gorsel)].filter((x): x is KitapGorseli => !!x);
  const gorselNo = new Map(gorseller.map((x, i) => [x, i + 1]));
  const uz = (x: KitapGorseli) => (x.tur === 'image/png' ? 'png' : 'jpeg');
  return [
    { ad: '[Content_Types].xml', veri: yazi(`${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Default Extension="jpeg" ContentType="image/jpeg"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`) },
    { ad: '_rels/.rels', veri: yazi(`${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`) },
    { ad: 'docProps/core.xml', veri: yazi(`${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlKacis(k.ad)}</dc:title><dc:language>tr-TR</dc:language>
<dcterms:created xsi:type="dcterms:W3CDTF">${tarih}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${tarih}</dcterms:modified>
</cp:coreProperties>`) },
    { ad: 'docProps/app.xml', veri: yazi(`${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Dünya Atlası</Application></Properties>`) },
    { ad: 'word/_rels/document.xml.rels', veri: yazi(`${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStil" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rIdAyar" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
<Relationship Id="rIdAlt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
${gorseller.map((x, i) => `<Relationship Id="rIdGorsel${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/gorsel${i + 1}.${uz(x)}"/>`).join('\n')}
</Relationships>`) },
    ...gorseller.map((x, i) => ({ ad: `word/media/gorsel${i + 1}.${uz(x)}`, veri: x.veri })),
    { ad: 'word/settings.xml', veri: yazi(`${XML}<w:settings ${W}><w:defaultTabStop w:val="709"/><w:autoHyphenation/><w:themeFontLang w:val="tr-TR"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`) },
    { ad: 'word/styles.xml', veri: yazi(STILLER) },
    { ad: 'word/footer1.xml', veri: yazi(ALT) },
    { ad: 'word/document.xml', veri: yazi(belge(k, gorselNo)) },
  ];
}
