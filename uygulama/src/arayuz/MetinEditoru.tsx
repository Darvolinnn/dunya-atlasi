// Serbest metin editörü (ProseMirror). Metin çalışana parça listesi olarak gider; çalışan bunu Automerge
// belgesine tek değişiklik olarak yazar (TK2). Otomatik kaydetme: yazmaya ara verilince ya da en geç
// birkaç saniyede bir; sekme gizlenince hemen.
import { useEffect, useRef, useState } from 'preact/hooks';
import { EditorState, TextSelection, type Command, type Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, setBlockType, wrapIn, lift } from 'prosemirror-commands';
import type { Node as PmNode } from 'prosemirror-model';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { metinSemasi, isaretKodlari } from '../alan/metin-sema';
import { saatYaz } from '../alan/islem-metni';
import type { Istemci } from '../veri/istemci';
import type { BaglamParcasi, BaglamParcasiTanimi, IsaretAlani, KisaKayit, Spans } from '../veri/api';
import { BaglantiSecici, type Secim, type SeciciTutamagi } from './BaglantiSecici';
import { katla } from '../alan/turkce';
import { bagAraligi, baglantiEklentisi, bagTuru, type SeciciIstegi } from './baglanti-eklentisi';
import { git } from './Uygulama';
import { useCalisma } from './Calisma';
import { TurSecici } from './ortak';
import { BaglamParcasiFormu, parcaYazisi } from './BaglamParcasi';

const sema = metinSemasi.schema;
const ARA = 1200;        // yazmaya bu kadar ara verilince kaydedilir
const EN_GEC = 8000;     // sürekli yazarken bile en geç bu aralıkla kaydedilir

export const belgeYap = (spans: Spans): PmNode => pmDocFromSpans(metinSemasi, spans as never);
const isaretTuru = sema.marks.isaret;

/** Aralıktaki metne bir işaret kodu ekler ya da çıkarır; parçadaki öteki işaretler korunur (üst üste gelebilirler). */
function isaretKodu(tr: Transaction, from: number, to: number, kod: string, ekle: boolean): Transaction {
  const parcalar: [number, number, string][] = [];
  tr.doc.nodesBetween(from, to, (n, pos) => {
    if (!n.isText) return;
    const k = new Set(isaretKodlari(isaretTuru.isInSet(n.marks)?.attrs.kodlar));
    if (ekle) k.add(kod); else if (!k.delete(kod)) return;
    parcalar.push([Math.max(from, pos), Math.min(to, pos + n.nodeSize), [...k].sort().join(' ')]);
  });
  for (const [a, b, k] of parcalar) tr = k ? tr.addMark(a, b, isaretTuru.create({ kodlar: k })) : tr.removeMark(a, b, isaretTuru);
  return tr;
}
/** İmlecin bulunduğu yerdeki işaret kodları. */
function imlectekiIsaretler(state: EditorState): string[] {
  const { $from, empty, from, to } = state.selection;
  const kodlar = new Set<string>();
  if (empty) { for (const m of [...$from.marks(), ...($from.nodeAfter?.marks ?? [])]) if (m.type === isaretTuru) isaretKodlari(m.attrs.kodlar).forEach((k) => kodlar.add(k)); }
  else state.doc.nodesBetween(from, to, (n) => { if (n.isText) isaretKodlari(isaretTuru.isInSet(n.marks)?.attrs.kodlar).forEach((k) => kodlar.add(k)); });
  return [...kodlar].sort();
}
type IsaretOzeti = { kod: string; hedef: KisaKayit | null; hedefAlanAdi: string | null; iddia: string; kritik: boolean };
type IsaretFormu = { from: number; to: number; belge: PmNode; hedef: Secim | null; alanlar: IsaretAlani[]; hedefAlan: string; iddia: string; kritik: boolean; hata: string | null };

const KISAYOLLAR: Record<string, Command> = {
  'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo,
  'Mod-b': toggleMark(sema.marks.strong), 'Mod-i': toggleMark(sema.marks.em),
};

type Durum = { tur: 'kayitli'; zaman: number | null } | { tur: 'bekliyor' } | { tur: 'kaydediliyor' } | { tur: 'hata'; mesaj: string };

export interface EditorDenetimi { kaydet(): Promise<void> }

export function MetinEditoru({ istemci, evren, kayit, alan = 'govde', denetim, baslangic, saltOkunur = false, baglamParcalari = false, parcaDegisti }: {
  istemci: Istemci; evren: string; kayit: string; alan?: string; denetim?: { current: EditorDenetimi | null };
  /** Sahne metni: seçili parçaya ayrı bağlam verilebilir (F29). */
  baglamParcalari?: boolean;
  /** İmlecin bulunduğu bağlam parçası değişince. */
  parcaDegisti?: (kod: string | null) => void;
  /** Sabit sürümde metin değiştirilemez. */
  saltOkunur?: boolean;
  /** Kaldığın yere dönülüyorsa imlecin konumu. */
  baslangic?: number | null;
}) {
  const calisma = useCalisma();
  const calismaRef = useRef(calisma);
  calismaRef.current = calisma;
  const kap = useRef<HTMLDivElement>(null);
  const [durum, setDurum] = useState<Durum>({ tur: 'kayitli', zaman: null });
  const [hazir, setHazir] = useState(false);
  const [aracDurumu, setAracDurumu] = useState(0);
  const gorunum = useRef<EditorView | null>(null);
  type AcikSecici = SeciciIstegi & { konum: { left: number; top: number }; canli?: boolean };
  const [secici, setSeciciDurumu] = useState<AcikSecici | null>(null);
  const seciciRef = useRef<AcikSecici | null>(null);
  const saltRef = useRef(saltOkunur);
  useEffect(() => { saltRef.current = saltOkunur; const v = gorunum.current; if (v) v.updateState(v.state); }, [saltOkunur]);
  const tutamak = useRef<SeciciTutamagi | null>(null);
  const setSecici = (x: AcikSecici | null) => { seciciRef.current = x; setSeciciDurumu(x); };
  /** Bölme (§9.5): seçili parça yeni kayda dönüşür, yerinde ona bağlantı kalır. */
  const [ayirma, setAyirma] = useState<{ from: number; to: number; belge: PmNode; ad: string; tur: string; hata: string | null } | null>(null);
  /** Metin işaretleme (§5.7). */
  const [isaretFormu, setIsaretFormu] = useState<IsaretFormu | null>(null);
  const [isaretOzet, setIsaretOzet] = useState<{ anahtar: string; liste: IsaretOzeti[] }>({ anahtar: '', liste: [] });
  const [hedefSecici, setHedefSecici] = useState<{ left: number; top: number } | null>(null);
  /** Sahne içinde bağlam parçaları (F29). */
  const [parcalar, setParcalar] = useState<BaglamParcasi[]>([]);
  const [parcaFormu, setParcaFormu] = useState<{ from: number; to: number; belge: PmNode; onceki: BaglamParcasi | null } | null>(null);
  useEffect(() => {
    if (!baglamParcalari) return;
    let iptal = false;
    const oku = () => istemci.iste('baglamParcalari', { evren, kayit }).then((l) => { if (!iptal) setParcalar(l); }, () => {});
    oku();
    const birak = istemci.dinle((d) => { if (d.evren === evren) oku(); });
    return () => { iptal = true; birak(); };
  }, [baglamParcalari, evren, kayit]);

  const konumu = (pos: number) => {
    const k = gorunum.current!.coordsAtPos(pos);
    return { left: k.left, top: k.bottom + 6 };
  };
  const seciciAc = (i: SeciciIstegi) => { if (gorunum.current) setSecici({ ...i, konum: konumu(i.from) }); };
  /** "[[" yazıldı: kutu açılır, arama metni editörde yazıldıkça güncellenir. */
  const satirIciBasla = (bas: number) => {
    if (!gorunum.current) return;
    setSecici({ from: bas, to: bas + 2, sorgu: '', gorunen: null, isaretle: false, satirIci: true, canli: true, konum: konumu(bas) });
  };
  /** Her değişiklikte satır içi kutunun aralığını ve arama metnini günceller; imleç dışarı çıkınca kapatır. */
  const seciciIzle = (tr: Transaction, state: EditorState) => {
    const s = seciciRef.current;
    if (!s || !s.satirIci) return;
    if (!s.canli) { if (tr.docChanged || tr.selectionSet) setSecici(null); return; }
    const bas = tr.mapping.map(s.from, -1);
    const { from, empty } = state.selection;
    const $b = state.doc.resolve(Math.min(bas, state.doc.content.size));
    if (!empty || from < bas + 2 || from > $b.end() || state.doc.textBetween(bas, Math.min(bas + 2, $b.end())) !== '[[') { setSecici(null); return; }
    const sorgu = state.doc.textBetween(bas + 2, from);
    if (/[[\]]/.test(sorgu) || sorgu.length > 80) { setSecici(null); return; }
    if (sorgu !== s.sorgu || bas !== s.from || from !== s.to) setSecici({ ...s, from: bas, to: from, sorgu });
  };

  const baglantiKur = (i: AcikSecici, s: Secim) => {
    const v = gorunum.current;
    if (!v) return;
    const isaret = bagTuru.create({ hedef: s.kod });
    let tr = v.state.tr;
    if (i.isaretle) tr = tr.addMark(i.from, i.to, isaret);
    else {
      // "[[velk" yazılıp Velkar seçildiyse kaydın adı yazılır; çekimli ya da başka biçimde yazıldıysa yazılan korunur.
      const yazilan = (i.gorunen ?? i.sorgu).trim();
      const kisaltma = !yazilan || (katla(s.ad).startsWith(katla(yazilan)) && katla(s.ad) !== katla(yazilan));
      const gorunen = i.canli && kisaltma ? s.ad : (yazilan || s.ad);
      const once = v.state.doc.resolve(i.from).marks().filter((m) => m.type !== bagTuru);
      tr = tr.replaceWith(i.from, i.to, sema.text(gorunen, [...once, isaret]));
    }
    setSecici(null);
    v.dispatch(tr.removeStoredMark(bagTuru));
    v.focus();
  };

  const seciciKapat = () => {
    setSecici(null);
    gorunum.current?.focus();
  };

  useEffect(() => {
    let iptal = false;
    let temel: string[] = [];
    let kirli = false;
    let ilkKirlilik = 0;
    let zamanlayici: ReturnType<typeof setTimeout> | null = null;
    let suren: Promise<void> | null = null;

    const kaydet = async (): Promise<void> => {
      if (zamanlayici) { clearTimeout(zamanlayici); zamanlayici = null; }
      if (suren) { await suren; if (!kirli) return; }
      if (!kirli || !gorunum.current) return;
      kirli = false;
      const spans = pmNodeToSpans(metinSemasi, gorunum.current.state.doc) as Spans;
      setDurum({ tur: 'kaydediliyor' });
      suren = (async () => {
        try {
          const r = await istemci.iste('metinKaydet', { evren, kayit, alan, spans, temel });
          temel = r.basliklar;
          // Bu arada başka cihazdan gelen değişiklikle birleşti: editör birleşmiş metni gösterir.
          if (r.birlesti && r.spans && !kirli) icerigiDegistir(r.spans);
          if (!kirli) setDurum({ tur: 'kayitli', zaman: Date.now() });
        } catch (e) {
          kirli = true;
          setDurum({ tur: 'hata', mesaj: (e as Error).message });
        } finally { suren = null; }
      })();
      await suren;
    };

    const planla = () => {
      const simdi = Date.now();
      if (!kirli) ilkKirlilik = simdi;
      kirli = true;
      setDurum({ tur: 'bekliyor' });
      if (zamanlayici) clearTimeout(zamanlayici);
      const bekle = Math.min(ARA, Math.max(0, ilkKirlilik + EN_GEC - simdi));
      zamanlayici = setTimeout(() => { void kaydet(); }, bekle);
    };

    if (denetim) denetim.current = { kaydet };

    /** Editördeki belgeyi kaydedilmiş metinle değiştirir (yazılmamış bir şey yokken). İmleç yaklaşık yerinde kalır. */
    const icerigiDegistir = (spans: Spans) => {
      const v = gorunum.current;
      if (!v) return;
      const yeni = belgeYap(spans);
      if (yeni.eq(v.state.doc)) return;
      const secim = v.state.selection.from;
      const tr = v.state.tr.replaceWith(0, v.state.doc.content.size, yeni.content).setMeta('disaridan', true).setMeta('addToHistory', false);
      try { tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(secim, tr.doc.content.size)))); } catch { /* imleç başta kalır */ }
      v.dispatch(tr);
    };

    // Başka cihazdan bu metne değişiklik gelirse: yazılmamış bir şey yoksa editör hemen güncellenir; varsa
    // bir sonraki kaydetmede iki değişiklik birleştirilir.
    const birakDinle = istemci.dinle((d) => {
      if (!d.uzaktan || d.evren !== evren || !d.kayitlar.includes(kayit)) return;
      if (kirli || suren || !gorunum.current) return;
      void istemci.iste('metinAc', { evren, kayit, alan }).then((m) => {
        if (iptal || kirli || suren) return;
        temel = m.basliklar;
        icerigiDegistir(m.spans);
      });
    });

    istemci.iste('metinAc', { evren, kayit, alan }).then((m) => {
      if (iptal || !kap.current) return;
      temel = m.basliklar;
      const state = EditorState.create({
        doc: belgeYap(m.spans),
        plugins: [
          baglantiEklentisi({
            ac: (i) => seciciAc({ ...i, satirIci: true }),
            satirIciBasla: (b) => satirIciBasla(b),
            paletAc: () => { calismaRef.current?.paletAc({ bagla }); },
            yeniKayit: async (ad, tur, ozet) => (await istemci.iste('kayitOlustur', { evren, ad, tur, ozet, karar: 'fikir' })).kod,
          }),
          history(), keymap({ ...KISAYOLLAR, 'Mod-k': () => { if (calismaRef.current) calismaRef.current.paletAc({ bagla }); else bagla(); return true; } }), keymap(baseKeymap),
        ],
      });
      gorunum.current = new EditorView(kap.current, {
        state,
        editable: () => !saltRef.current,
        attributes: { class: 'metin-editoru', spellcheck: 'true', lang: 'tr', 'aria-label': 'Metin', role: 'textbox', 'aria-multiline': 'true' },
        handleKeyDown(_v, e) {
          // Satır içi bağlantı kutusu açıkken ok tuşları, Enter ve Esc kutuya gider.
          if (seciciRef.current?.satirIci && tutamak.current) return tutamak.current.tus(e);
          return false;
        },
        handleClick(v, pos, e) {
          // Ctrl (Mac'te Cmd) ile tıklanan bağlantı kaydı açar.
          if (!(e.ctrlKey || e.metaKey)) return false;
          const m = v.state.doc.resolve(pos).marks().find((x) => x.type === bagTuru)
            ?? v.state.doc.resolve(pos).nodeAfter?.marks.find((x) => x.type === bagTuru);
          if (!m) return false;
          git(`/e/${evren}/k/${m.attrs.hedef}`);
          return true;
        },
        dispatchTransaction(tr) {
          const v = gorunum.current!;
          v.updateState(v.state.apply(tr));
          seciciIzle(tr, v.state);
          setAracDurumu((n) => n + 1);
          if (tr.docChanged && !tr.getMeta('disaridan')) planla();
          if ((tr.selectionSet || tr.docChanged) && !tr.getMeta('disaridan') && alan === 'govde') calismaRef.current?.konumBildir(kayit, v.state.selection.head);
        },
      });
      if (baslangic != null) {
        const v = gorunum.current;
        try {
          v.dispatch(v.state.tr.setSelection(TextSelection.near(v.state.doc.resolve(Math.min(baslangic, v.state.doc.content.size)))).scrollIntoView());
          v.focus();
        } catch { /* metin değişmiş: başta kalır */ }
      }
      setHazir(true);
    }, (e) => setDurum({ tur: 'hata', mesaj: (e as Error).message }));

    const gizlenince = () => { if (document.visibilityState === 'hidden') void kaydet(); };
    const ayrilirken = (e: BeforeUnloadEvent) => { if (kirli || suren) { void kaydet(); e.preventDefault(); } };
    document.addEventListener('visibilitychange', gizlenince);
    addEventListener('beforeunload', ayrilirken);
    return () => {
      iptal = true;
      birakDinle();
      document.removeEventListener('visibilitychange', gizlenince);
      removeEventListener('beforeunload', ayrilirken);
      void kaydet();
      gorunum.current?.destroy();
      gorunum.current = null;
      if (denetim) denetim.current = null;
    };
  }, [evren, kayit, alan]);

  /** Bağla düğmesi: seçili metin bağlanır; seçim yoksa seçim kutusundan kaydın adı yazılır. */
  function bagla() {
    const v = gorunum.current;
    if (!v) return;
    const { from, to, empty } = v.state.selection;
    if (empty) seciciAc({ from, to, sorgu: '', gorunen: null, isaretle: false });
    else seciciAc({ from, to, sorgu: v.state.doc.textBetween(from, to, ' '), gorunen: null, isaretle: true });
  }

  function ayirmaAc() {
    const v = gorunum.current;
    if (!v || v.state.selection.empty) return;
    const { from, to } = v.state.selection;
    const ad = v.state.doc.textBetween(from, to, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 5).join(' ').replace(/[.,;:!?]+$/, '');
    setAyirma({ from, to, belge: v.state.doc, ad, tur: 'diger', hata: null });
  }
  async function ayir(e: Event) {
    e.preventDefault();
    const v = gorunum.current;
    if (!v || !ayirma || !ayirma.ad.trim()) return;
    if (v.state.doc !== ayirma.belge) { setAyirma({ ...ayirma, hata: 'Metin bu arada değişti; parçayı yeniden seç.' }); return; }
    const dilim = v.state.doc.slice(ayirma.from, ayirma.to);
    const ilk = dilim.content.firstChild;
    const belge = ilk && ilk.isBlock ? sema.node('doc', null, dilim.content) : sema.node('doc', null, [sema.node('paragraph', null, dilim.content)]);
    try {
      const ad = ayirma.ad.replace(/\s+/g, ' ').trim();
      const { kod } = await istemci.iste('parcadanKayit', { evren, kaynak: kayit, ad, tur: ayirma.tur, spans: pmNodeToSpans(metinSemasi, belge) as Spans });
      const g = gorunum.current;
      if (g && g.state.doc === ayirma.belge) g.dispatch(g.state.tr.replaceWith(ayirma.from, ayirma.to, sema.text(ad, [bagTuru.create({ hedef: kod })])));
      setAyirma(null);
      g?.focus();
    } catch (x) { setAyirma({ ...ayirma, hata: (x as Error).message }); }
  }

  function isaretFormuAc() {
    const v = gorunum.current;
    if (!v || v.state.selection.empty) return;
    const { from, to } = v.state.selection;
    setIsaretFormu({ from, to, belge: v.state.doc, hedef: null, alanlar: [], hedefAlan: '', iddia: '', kritik: false, hata: null });
  }
  function hedefSec(s: Secim) {
    setHedefSecici(null);
    setIsaretFormu((f) => f && { ...f, hedef: s, alanlar: [], hedefAlan: '' });
    istemci.iste('isaretAlanlari', { evren, hedef: s.kod }).then((alanlar) => setIsaretFormu((f) => f && f.hedef?.kod === s.kod ? { ...f, alanlar } : f), () => {});
  }
  async function isaretle(e: Event) {
    e.preventDefault();
    const v = gorunum.current, f = isaretFormu;
    if (!v || !f) return;
    if (v.state.doc !== f.belge) { setIsaretFormu({ ...f, hata: 'Metin bu arada değişti; cümleyi yeniden seçin.' }); return; }
    try {
      const { kod: ik } = await istemci.iste('metinIsaretiOlustur', { evren, kayit, alan, hedef: f.hedef?.kod ?? null, hedefAlan: f.hedefAlan || null, iddia: f.iddia, kritik: f.kritik });
      const g = gorunum.current;
      if (g) g.dispatch(isaretKodu(g.state.tr, f.from, f.to, ik, true));
      setIsaretFormu(null);
      setIsaretOzet({ anahtar: '', liste: [] });
      g?.focus();
    } catch (x) { setIsaretFormu({ ...f, hata: (x as Error).message }); }
  }
  function parcaFormuAc(onceki: BaglamParcasi | null) {
    const v = gorunum.current;
    if (!v) return;
    const { from, to } = v.state.selection;
    setParcaFormu({ from, to, belge: v.state.doc, onceki });
  }
  async function parcaKaydet(t: BaglamParcasiTanimi) {
    const f = parcaFormu;
    if (!f) return;
    if (f.onceki) { await istemci.iste('baglamParcasiYaz', { evren, kod: f.onceki.kod, tanim: t }); setParcaFormu(null); return; }
    const v = gorunum.current;
    if (!v || v.state.doc !== f.belge) throw new Error('Metin bu arada değişti; parçayı yeniden seçin.');
    const { kod } = await istemci.iste('baglamParcasiOlustur', { evren, kayit, alan, tanim: t });
    const g = gorunum.current;
    if (g) g.dispatch(isaretKodu(g.state.tr, f.from, f.to, kod, true));
    setParcaFormu(null);
    g?.focus();
  }
  /** Parçanın bağlamını kaldırır; metin olduğu gibi kalır. */
  async function parcaKaldir(kod: string) {
    try { await istemci.iste('baglamParcasiSil', { evren, kod }); } catch { /* yalnızca metinden kaldırılır */ }
    const g = gorunum.current;
    if (g) g.dispatch(isaretKodu(g.state.tr, 0, g.state.doc.content.size, kod, false));
    g?.focus();
  }
  /** İşareti metinden ve kaydıyla birlikte kaldırır. Bağlı evren bilgisi silinmez. */
  async function isaretKaldir(ik: string) {
    const v = gorunum.current;
    if (!v) return;
    try { await istemci.iste('metinIsaretiSil', { evren, kod: ik }); } catch { /* yalnızca metinden kaldırılır */ }
    const g = gorunum.current;
    if (g) g.dispatch(isaretKodu(g.state.tr, 0, g.state.doc.content.size, ik, false));
    setIsaretOzet({ anahtar: '', liste: [] });
    g?.focus();
  }

  const uygula = (komut: Command) => {
    const v = gorunum.current;
    if (!v) return;
    komut(v.state, v.dispatch);
    v.focus();
  };
  void aracDurumu; // araç çubuğu seçime göre yeniden çizilsin
  const v = gorunum.current;
  const markAcik = (ad: 'strong' | 'em') => {
    if (!v) return false;
    const { from, $from, to, empty } = v.state.selection;
    const m = sema.marks[ad];
    return empty ? !!m.isInSet(v.state.storedMarks || $from.marks()) : v.state.doc.rangeHasMark(from, to, m);
  };
  const blokTuru = v ? v.state.selection.$from.parent : null;
  const baslikMi = (s: number) => blokTuru?.type === sema.nodes.heading && blokTuru.attrs.level === s;
  const bag = v ? bagAraligi(v.state) : null;
  const imlecIsaretleri = v ? imlectekiIsaretler(v.state) : [];
  const isaretAnahtari = imlecIsaretleri.join(' ');
  useEffect(() => {
    if (!isaretAnahtari) return;
    if (isaretAnahtari === isaretOzet.anahtar) return;
    let iptal = false;
    istemci.iste('isaretOzetleri', { evren, kodlar: isaretAnahtari.split(' ') }).then((liste) => { if (!iptal) setIsaretOzet({ anahtar: isaretAnahtari, liste }); }, () => {});
    return () => { iptal = true; };
  }, [isaretAnahtari, isaretOzet.anahtar]);
  const gorunenIsaretler = isaretAnahtari && isaretOzet.anahtar === isaretAnahtari ? isaretOzet.liste : [];
  // İç içe parçalarda en içteki (en son açılan) geçerlidir.
  const imlecParcasi = [...parcalar].reverse().find((p) => imlecIsaretleri.includes(p.kod)) ?? null;
  const imlecParcaKodu = imlecParcasi?.kod ?? null;
  useEffect(() => { parcaDegisti?.(imlecParcaKodu); }, [imlecParcaKodu]);

  return (
    <div class="editor-kabi">
      <div class="arac-cubugu" role="toolbar" aria-label="Biçim">
        <button type="button" class="arac" aria-pressed={markAcik('strong')} title="Kalın (Ctrl+B)" onMouseDown={(e) => e.preventDefault()} onClick={() => uygula(toggleMark(sema.marks.strong))}><b>K</b></button>
        <button type="button" class="arac" aria-pressed={markAcik('em')} title="İtalik (Ctrl+I)" onMouseDown={(e) => e.preventDefault()} onClick={() => uygula(toggleMark(sema.marks.em))}><i>İ</i></button>
        <span class="ayrac" />
        <button type="button" class="arac" aria-pressed={baslikMi(2)} onMouseDown={(e) => e.preventDefault()} onClick={() => uygula(baslikMi(2) ? setBlockType(sema.nodes.paragraph) : setBlockType(sema.nodes.heading, { level: 2 }))}>Başlık</button>
        <button type="button" class="arac" aria-pressed={baslikMi(3)} onMouseDown={(e) => e.preventDefault()} onClick={() => uygula(baslikMi(3) ? setBlockType(sema.nodes.paragraph) : setBlockType(sema.nodes.heading, { level: 3 }))}>Alt başlık</button>
        <button type="button" class="arac" onMouseDown={(e) => e.preventDefault()} onClick={() => uygula((s, d) => wrapIn(sema.nodes.blockquote)(s, d) || lift(s, d))}>Alıntı</button>
        <span class="ayrac" />
        <button type="button" class="arac bagla" title="Bir kayda bağla (Ctrl+K ya da [[ )" onMouseDown={(e) => e.preventDefault()} onClick={bagla}>Bağla</button>
        {bag && v && <>
          <a class="arac" href={`#/e/${evren}/k/${bag.hedef}`}>“{v.state.doc.textBetween(bag.from, bag.to)}” kaydını aç</a>
          {calisma && <button type="button" class="arac" onMouseDown={(e) => e.preventDefault()} onClick={() => {
            const r = v.coordsAtPos(bag.from), r2 = v.coordsAtPos(bag.to);
            calisma.ozetAc(bag.hedef, new DOMRect(r.left, r.top, Math.max(1, r2.right - r.left), r.bottom - r.top));
          }}>Özet</button>}
          {calisma && <button type="button" class="arac" onMouseDown={(e) => e.preventDefault()} onClick={() => calisma.yanPanelAc(bag.hedef)}>Yan panelde aç</button>}
          <button type="button" class="arac" onMouseDown={(e) => e.preventDefault()} onClick={() => uygula((s, d) => { d?.(s.tr.removeMark(bag.from, bag.to, bagTuru)); return true; })}>Bağlantıyı kaldır</button>
        </>}
        {v && !v.state.selection.empty && alan === 'govde' && <button type="button" class="arac" title="Seçili parçayı yeni bir kayda dönüştür; yerinde ona bağlantı kalır" onMouseDown={(e) => e.preventDefault()} onClick={ayirmaAc}>Yeni kayda ayır</button>}
        {v && !v.state.selection.empty && !saltOkunur && <button type="button" class="arac" title="Seçili cümleyi bir kayda, bir değere ya da bir soruya bağla" onMouseDown={(e) => e.preventDefault()} onClick={isaretFormuAc}>İşaretle</button>}
        {v && baglamParcalari && !v.state.selection.empty && !saltOkunur && <button type="button" class="arac" title="Seçili parçaya kendi tarihini, yerini ve bakış açısını ver" onMouseDown={(e) => e.preventDefault()} onClick={() => parcaFormuAc(null)}>Bağlam ver</button>}
        <span class="bosluk" />
        <span class="kayit-durumu soluk kucuk" aria-live="polite">{durumYazisi(durum)}</span>
      </div>
      {gorunenIsaretler.length > 0 && (
        <div class="isaret-seridi kucuk" aria-label="İşaretli cümle">
          {gorunenIsaretler.map((x) => (
            <span key={x.kod} class="satir">
              <span>{x.kritik && <strong>Kritik · </strong>}İşaretli: {x.hedef ? <a href={`#/e/${evren}/k/${x.hedef.kod}`}>{x.hedef.ad}</a> : 'bağsız'}{x.hedefAlanAdi && ` · ${x.hedefAlanAdi}`}{x.iddia && ` · “${x.iddia}”`}</span>
              {!saltOkunur && <button type="button" class="dugme sade kucuk" onMouseDown={(e) => e.preventDefault()} onClick={() => isaretKaldir(x.kod)}>İşareti kaldır</button>}
            </span>
          ))}
        </div>
      )}
      {imlecParcasi && !parcaFormu && (
        <div class="isaret-seridi kucuk" aria-label="Parçanın bağlamı">
          <span class="satir">
            <span>Bu parçanın kendi bağlamı var: {parcaYazisi(imlecParcasi)}</span>
            {!saltOkunur && <button type="button" class="dugme sade kucuk" onMouseDown={(e) => e.preventDefault()} onClick={() => parcaFormuAc(imlecParcasi)}>Düzenle</button>}
            {!saltOkunur && <button type="button" class="dugme sade kucuk" onMouseDown={(e) => e.preventDefault()} onClick={() => parcaKaldir(imlecParcasi.kod)}>Bağlamı kaldır</button>}
          </span>
        </div>
      )}
      {parcaFormu && (
        <BaglamParcasiFormu istemci={istemci} evren={evren} onceki={parcaFormu.onceki}
          metin={parcaFormu.onceki ? parcaFormu.onceki.metin.join(' ') : parcaFormu.belge.textBetween(parcaFormu.from, parcaFormu.to, ' ')}
          kaydet={parcaKaydet} vazgec={() => setParcaFormu(null)} />
      )}
      {isaretFormu && (
        <form class="kart ayirma" onSubmit={isaretle} aria-label="Cümleyi işaretle">
          <p class="kucuk" style="margin:0 0 6px">“{isaretFormu.belge.textBetween(isaretFormu.from, isaretFormu.to, ' ').slice(0, 120)}” işaretlenecek. Metin değişmez; yalnızca bağ kurulur.</p>
          <div class="satir">
            <span class="kucuk">Bağlı olduğu kayıt:</span>
            <button type="button" class="dugme kucuk" onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setHedefSecici({ left: r.left, top: r.bottom + 4 }); }}>{isaretFormu.hedef?.ad ?? 'Kayıt seç'}</button>
            {isaretFormu.hedef && (
              <label class="kucuk">Hangi bilgisi{' '}
                <select class="girdi kucuk-secim" value={isaretFormu.hedefAlan} onChange={(e) => setIsaretFormu({ ...isaretFormu, hedefAlan: (e.target as HTMLSelectElement).value })}>
                  <option value="">Belirtmeden (kaydın kendisi)</option>
                  {[...new Set(isaretFormu.alanlar.map((a) => a.grup))].map((g) => (
                    <optgroup key={g} label={g}>{isaretFormu.alanlar.filter((a) => a.grup === g).map((a) => <option key={a.kod} value={a.kod}>{a.ad}</option>)}</optgroup>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div class="satir">
            <input class="girdi" style="flex:1;min-width:200px" lang="tr" maxLength={300} aria-label="İddia" placeholder="Cümlenin söylediği, kısaca (isteğe bağlı)" value={isaretFormu.iddia}
              onInput={(e) => setIsaretFormu({ ...isaretFormu, iddia: (e.target as HTMLInputElement).value })} />
            <label class="kucuk" title="Kritik işaretli cümle değişince program kısaca sorar"><input type="checkbox" checked={isaretFormu.kritik} onChange={(e) => setIsaretFormu({ ...isaretFormu, kritik: (e.target as HTMLInputElement).checked })} /> Kritik</label>
            <button class="dugme ana kucuk">İşaretle</button>
            <button type="button" class="dugme sade kucuk" onClick={() => setIsaretFormu(null)}>Vazgeç</button>
          </div>
          {isaretFormu.hata && <p class="hata kucuk">{isaretFormu.hata}</p>}
        </form>
      )}
      {hedefSecici && <BaglantiSecici istemci={istemci} evren={evren} sorgu="" konum={hedefSecici} sec={(s) => hedefSec({ kod: s.kod, ad: s.ad })} kapat={() => setHedefSecici(null)} />}
      {ayirma && (
        <form class="kart ayirma satir" onSubmit={ayir} aria-label="Yeni kayda ayır">
          <span class="kucuk">Seçili parça yeni kayda taşınacak; burada yerine ona bağlantı kalacak.</span>
          <input class="girdi" style="flex:1;min-width:180px" lang="tr" aria-label="Yeni kaydın adı" value={ayirma.ad} autoFocus
            onInput={(e) => setAyirma({ ...ayirma, ad: (e.target as HTMLInputElement).value })} />
          <span style="min-width:180px"><TurSecici deger={ayirma.tur} etiket="Yeni kaydın türü" onDegis={(t) => setAyirma({ ...ayirma, tur: t })} /></span>
          <button class="dugme ana kucuk" disabled={!ayirma.ad.trim()}>Ayır</button>
          <button type="button" class="dugme sade kucuk" onClick={() => setAyirma(null)}>Vazgeç</button>
          {ayirma.hata && <span class="hata kucuk">{ayirma.hata}</span>}
        </form>
      )}
      <p class="soluk" style={{ padding: '0 20px', display: hazir || durum.tur === 'hata' ? 'none' : '' }}>Metin açılıyor…</p>
      <div ref={kap} />
      {secici && <BaglantiSecici key={`${secici.from}-${secici.canli ? '' : secici.sorgu}`} istemci={istemci} evren={evren} sorgu={secici.sorgu} konum={secici.konum}
        satirIci={secici.satirIci} tutamak={tutamak} kendiligindenTek={secici.kendiligindenBagla}
        sec={(s) => baglantiKur(seciciRef.current ?? secici, s)} kapat={seciciKapat} />}
    </div>
  );
}

function durumYazisi(d: Durum): string {
  switch (d.tur) {
    case 'kayitli': return d.zaman ? `Kaydedildi · ${saatYaz(d.zaman)}` : 'Kaydedildi';
    case 'bekliyor': return 'Yazıyorsunuz…';
    case 'kaydediliyor': return 'Kaydediliyor…';
    case 'hata': return `Kaydedilemedi: ${d.mesaj}`;
  }
}

/** Metnin değiştirilemeyen görünümü (eski sürümleri göstermek için). */
export function MetinGorunumu({ spans }: { spans: Spans }) {
  const kap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!kap.current) return;
    const v = new EditorView(kap.current, {
      state: EditorState.create({ doc: belgeYap(spans) }),
      editable: () => false,
      attributes: { class: 'metin-editoru salt-okunur', lang: 'tr' },
    });
    return () => v.destroy();
  }, [spans]);
  return <div ref={kap} />;
}
