// Serbest metin editörü (ProseMirror). Metin çalışana parça listesi olarak gider; çalışan bunu Automerge
// belgesine tek değişiklik olarak yazar (TK2). Otomatik kaydetme: yazmaya ara verilince ya da en geç
// birkaç saniyede bir; sekme gizlenince hemen.
import { useEffect, useRef, useState } from 'preact/hooks';
import { EditorState, type Command } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, setBlockType, wrapIn, lift } from 'prosemirror-commands';
import type { Node as PmNode } from 'prosemirror-model';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { metinSemasi } from '../alan/metin-sema';
import { saatYaz } from '../alan/islem-metni';
import type { Istemci } from '../veri/istemci';
import type { Spans } from '../veri/api';

const sema = metinSemasi.schema;
const ARA = 1200;        // yazmaya bu kadar ara verilince kaydedilir
const EN_GEC = 8000;     // sürekli yazarken bile en geç bu aralıkla kaydedilir

export const belgeYap = (spans: Spans): PmNode => pmDocFromSpans(metinSemasi, spans as never);

const KISAYOLLAR: Record<string, Command> = {
  'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo,
  'Mod-b': toggleMark(sema.marks.strong), 'Mod-i': toggleMark(sema.marks.em),
};

type Durum = { tur: 'kayitli'; zaman: number | null } | { tur: 'bekliyor' } | { tur: 'kaydediliyor' } | { tur: 'hata'; mesaj: string };

export interface EditorDenetimi { kaydet(): Promise<void> }

export function MetinEditoru({ istemci, evren, kayit, alan = 'govde', denetim }: {
  istemci: Istemci; evren: string; kayit: string; alan?: string; denetim?: { current: EditorDenetimi | null };
}) {
  const kap = useRef<HTMLDivElement>(null);
  const [durum, setDurum] = useState<Durum>({ tur: 'kayitli', zaman: null });
  const [hazir, setHazir] = useState(false);
  const [aracDurumu, setAracDurumu] = useState(0);
  const gorunum = useRef<EditorView | null>(null);

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

    istemci.iste('metinAc', { evren, kayit, alan }).then((m) => {
      if (iptal || !kap.current) return;
      temel = m.basliklar;
      const state = EditorState.create({
        doc: belgeYap(m.spans),
        plugins: [history(), keymap(KISAYOLLAR), keymap(baseKeymap)],
      });
      gorunum.current = new EditorView(kap.current, {
        state,
        attributes: { class: 'metin-editoru', spellcheck: 'true', lang: 'tr', 'aria-label': 'Metin', role: 'textbox', 'aria-multiline': 'true' },
        dispatchTransaction(tr) {
          const v = gorunum.current!;
          v.updateState(v.state.apply(tr));
          setAracDurumu((n) => n + 1);
          if (tr.docChanged) planla();
        },
      });
      setHazir(true);
    }, (e) => setDurum({ tur: 'hata', mesaj: (e as Error).message }));

    const gizlenince = () => { if (document.visibilityState === 'hidden') void kaydet(); };
    const ayrilirken = (e: BeforeUnloadEvent) => { if (kirli || suren) { void kaydet(); e.preventDefault(); } };
    document.addEventListener('visibilitychange', gizlenince);
    addEventListener('beforeunload', ayrilirken);
    return () => {
      iptal = true;
      document.removeEventListener('visibilitychange', gizlenince);
      removeEventListener('beforeunload', ayrilirken);
      void kaydet();
      gorunum.current?.destroy();
      gorunum.current = null;
      if (denetim) denetim.current = null;
    };
  }, [evren, kayit, alan]);

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

  return (
    <div class="editor-kabi">
      <div class="arac-cubugu" role="toolbar" aria-label="Biçim">
        <button type="button" class="arac" aria-pressed={markAcik('strong')} title="Kalın (Ctrl+B)" onMouseDown={(e) => e.preventDefault()} onClick={() => uygula(toggleMark(sema.marks.strong))}><b>K</b></button>
        <button type="button" class="arac" aria-pressed={markAcik('em')} title="İtalik (Ctrl+I)" onMouseDown={(e) => e.preventDefault()} onClick={() => uygula(toggleMark(sema.marks.em))}><i>İ</i></button>
        <span class="ayrac" />
        <button type="button" class="arac" aria-pressed={baslikMi(2)} onMouseDown={(e) => e.preventDefault()} onClick={() => uygula(baslikMi(2) ? setBlockType(sema.nodes.paragraph) : setBlockType(sema.nodes.heading, { level: 2 }))}>Başlık</button>
        <button type="button" class="arac" aria-pressed={baslikMi(3)} onMouseDown={(e) => e.preventDefault()} onClick={() => uygula(baslikMi(3) ? setBlockType(sema.nodes.paragraph) : setBlockType(sema.nodes.heading, { level: 3 }))}>Alt başlık</button>
        <button type="button" class="arac" onMouseDown={(e) => e.preventDefault()} onClick={() => uygula((s, d) => wrapIn(sema.nodes.blockquote)(s, d) || lift(s, d))}>Alıntı</button>
        <span class="bosluk" />
        <span class="kayit-durumu soluk kucuk" aria-live="polite">{durumYazisi(durum)}</span>
      </div>
      <p class="soluk" style={{ padding: '0 20px', display: hazir || durum.tur === 'hata' ? 'none' : '' }}>Metin açılıyor…</p>
      <div ref={kap} />
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
