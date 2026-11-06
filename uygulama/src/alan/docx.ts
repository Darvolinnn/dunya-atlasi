// Eserin Word (.docx) çıktısı (§10.11): Office Open XML dosyaları elle yazılır, ZIP'lenir; ağ ya da ek program
// gerekmez. Bölümler yeni sayfada başlar ve Word'ün gezinti bölmesinde görünür (Başlık 1); sahneler ayraçla ayrılır;
// sayfa altında sayfa numarası vardır. Metin UTF-8'dir, dil Türkçe işaretlenir (yazım denetimi ve tireleme için).
import { xmlKacis } from './cikti';
import type { Blok, Kitap, Parca } from './kitap';
import type { ZipDosyasi } from './zip';

const yazi = (s: string) => new TextEncoder().encode(s);
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const YAZI_TIPI = 'Georgia';

/** Bir parça: satır sonu ve sekme Word'ün kendi öğelerine çevrilir. */
function parcaXml(p: Parca): string {
  const ozellik = (p.kalin ? '<w:b/><w:bCs/>' : '') + (p.egik ? '<w:i/><w:iCs/>' : '');
  const rPr = ozellik ? `<w:rPr>${ozellik}</w:rPr>` : '';
  const ic = p.metin.split('\n').map((satir) => satir.split('\t').map((t) => t ? `<w:t xml:space="preserve">${xmlKacis(t)}</w:t>` : '').join('<w:tab/>')).join('<w:br/>');
  return `<w:r>${rPr}${ic}</w:r>`;
}
const paragraf = (stil: string, parcalar: Parca[]) => `<w:p><w:pPr><w:pStyle w:val="${stil}"/></w:pPr>${parcalar.map(parcaXml).join('')}</w:p>`;
const duz = (stil: string, metin: string) => paragraf(stil, [{ metin }]);

function belge(k: Kitap): string {
  const g: string[] = [duz('KitapAdi', k.ad)];
  for (const b of k.bolumler) {
    g.push(duz('Heading1', b.baslik));
    let ilk = true;
    b.sahneler.forEach((s, i) => {
      if (i > 0) { g.push(duz('Ayrac', '* * *')); ilk = true; }
      if (s.baslik) { g.push(duz('Heading2', s.baslik)); ilk = true; }
      for (const bl of s.bloklar as Blok[]) {
        if (bl.tur === 'baslik') { g.push(paragraf('Heading3', bl.parcalar)); ilk = true; }
        else if (bl.tur === 'alinti') { g.push(paragraf('Alinti', bl.parcalar)); ilk = true; }
        else { g.push(paragraf(ilk ? 'IlkParagraf' : 'Normal', bl.parcalar)); ilk = false; }
      }
    });
  }
  // A4, 2,5 cm kenar boşluğu; sayfa numarası altta ortada.
  const bolum = '<w:sectPr><w:footerReference w:type="default" r:id="rIdAlt"/><w:pgSz w:w="11906" w:h="16838"/>'
    + '<w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/><w:titlePg/></w:sectPr>';
  return `${XML}<w:document ${W}><w:body>${g.join('')}${bolum}</w:body></w:document>`;
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
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
</w:styles>`;

const ALT = `${XML}<w:ftr ${W}><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;

/** Eserin .docx dosyasını oluşturan dosyalar (ZIP'lenmeye hazır). */
export function docxDosyalari(k: Kitap, zaman = new Date()): ZipDosyasi[] {
  const tarih = zaman.toISOString().replace(/\.\d+Z$/, 'Z');
  return [
    { ad: '[Content_Types].xml', veri: yazi(`${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
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
</Relationships>`) },
    { ad: 'word/settings.xml', veri: yazi(`${XML}<w:settings ${W}><w:defaultTabStop w:val="709"/><w:autoHyphenation/><w:themeFontLang w:val="tr-TR"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`) },
    { ad: 'word/styles.xml', veri: yazi(STILLER) },
    { ad: 'word/footer1.xml', veri: yazi(ALT) },
    { ad: 'word/document.xml', veri: yazi(belge(k)) },
  ];
}
