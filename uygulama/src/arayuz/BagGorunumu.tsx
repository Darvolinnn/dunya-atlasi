// Bağlantı görünümü (K37): "Diğer > Görünüm" sayfası ve seçimin ekrana uygulanması. Seçim evrene yazılır; yazma
// ekranında ve kayıt sayfalarındaki metinde geçerlidir, PDF ve Word çıktısını değiştirmez.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import { BAG_RENKLERI, VARSAYILAN_BAG, bagIsaretleri, type BagGorunumu } from '../alan/bag-gorunumu';
import { grupSinifi } from '../alan/turler';

const STIL_KIMLIGI = 'bag-turleri';

/** Seçimi sayfanın köküne işler; "türüne göre" seçiliyse kayıtların tür grubuna göre boyayan kuralları yazar. */
export function useBagGorunumuUygula(istemci: Istemci, evren: string, g: BagGorunumu | null | undefined, surum: number) {
  useEffect(() => {
    const kok = document.documentElement;
    for (const [k, v] of Object.entries(bagIsaretleri(g ?? VARSAYILAN_BAG))) {
      const ad = k.replace(/^data-/, '').replace(/-([a-z])/g, (_x, h: string) => h.toUpperCase());
      if (g) kok.dataset[ad] = v; else delete kok.dataset[ad];
    }
  }, [g?.renk, g?.zemin, g?.kalin, g?.alti, !!g]);
  const tur = g?.renk === 'tur';
  useEffect(() => {
    if (!tur) { document.getElementById(STIL_KIMLIGI)?.remove(); return; }
    let iptal = false;
    istemci.iste('adDizini', { evren }).then((d) => {
      if (iptal) return;
      const gruplar = new Map<string, string[]>();
      for (const a of d.adlar) { const s = grupSinifi(a.tur).slice(3); gruplar.set(s, [...(gruplar.get(s) ?? []), a.kod]); }
      let el = document.getElementById(STIL_KIMLIGI) as HTMLStyleElement | null;
      if (!el) { el = document.createElement('style'); el.id = STIL_KIMLIGI; document.head.appendChild(el); }
      el.textContent = [...gruplar].map(([s, kodlar]) =>
        `:root[data-bag-renk="tur"] .metin-editoru a.bag:is(${kodlar.map((k) => `[data-kayit="${CSS.escape(k)}"]`).join(',')}){--bag-renk:var(--tg-${s}-y)}`).join('\n');
    }, () => {});
    return () => { iptal = true; };
  }, [tur, evren, surum]);
}

const ORNEK: [string, string | null][] = [['Arel Devran', 'insan'], [', ', null], ['Talia Vey', 'insan'], ['’in haritasını ', null], ['Kül Geçidi', 'yer'], ['’nin ağzında yeniden açtı.', null]];

function Onizleme({ g, koyu }: { g: BagGorunumu; koyu: boolean }) {
  return (
    <div class={`bag-onizleme ${koyu ? 'koyu' : 'acik'}`} {...bagIsaretleri(g)}>
      <p class="soluk kucuk">{koyu ? 'Koyu tema' : 'Açık tema'}</p>
      <p class="bag-onizleme-metni">{ORNEK.map(([m, tg]) => tg ? <a class={`bag tg-${tg}`}>{m}</a> : m)}</p>
    </div>
  );
}

export function GorunumSayfasi({ istemci, evren, kayitli, saltOkunur }: { istemci: Istemci; evren: string; kayitli: BagGorunumu | null; saltOkunur: boolean }) {
  const [g, setG] = useState<BagGorunumu>(kayitli ?? VARSAYILAN_BAG);
  const [durum, setDurum] = useState('');
  useEffect(() => { setG(kayitli ?? VARSAYILAN_BAG); }, [JSON.stringify(kayitli)]);
  const yaz = (gorunum: BagGorunumu | null, mesaj: string) => {
    istemci.iste('bagGorunumuYaz', { evren, gorunum }).then(() => setDurum(mesaj), (e: Error) => setDurum(e.message));
  };
  const degisti = JSON.stringify(g) !== JSON.stringify(kayitli ?? VARSAYILAN_BAG);
  const sec = (x: Partial<BagGorunumu>) => { setG({ ...g, ...x }); setDurum(''); };
  return (
    <div class="gorunum-sayfasi">
      <h2 class="ust-etiket">Bağlantı rengi</h2>
      <div class="renk-secici" role="radiogroup" aria-label="Bağlantı rengi">
        {BAG_RENKLERI.map((r) => (
          <button key={r.kod} type="button" role="radio" aria-checked={g.renk === r.kod} title={r.ad} aria-label={r.ad}
            class={`renk-yuvarlak renk-${r.kod}`} onClick={() => sec({ renk: r.kod })} />
        ))}
        <span class="soluk kucuk">{BAG_RENKLERI.find((r) => r.kod === g.renk)?.ad}</span>
      </div>
      <h2 class="ust-etiket">Biçim</h2>
      <div class="satir sarmal bicim-secici">
        <label class="secim"><input type="checkbox" checked={g.zemin} onChange={(e) => sec({ zemin: (e.target as HTMLInputElement).checked })} /> Vurgulu zemin</label>
        <label class="secim"><input type="checkbox" checked={g.kalin} onChange={(e) => sec({ kalin: (e.target as HTMLInputElement).checked })} /> Kalın</label>
        <label class="secim"><input type="checkbox" checked={g.alti} onChange={(e) => sec({ alti: (e.target as HTMLInputElement).checked })} /> Altı çizili</label>
      </div>
      <h2 class="ust-etiket">Önizleme</h2>
      <div class="bag-onizlemeleri"><Onizleme g={g} koyu={false} /><Onizleme g={g} koyu /></div>
      <div class="satir">
        <button class="dugme ana" disabled={saltOkunur || !degisti} onClick={() => yaz(g, 'Kaydedildi.')}>Kaydet</button>
        <button class="dugme" disabled={saltOkunur || (!kayitli && !degisti)} onClick={() => { setG(VARSAYILAN_BAG); yaz(null, 'Varsayılana dönüldü.'); }}>Varsayılana dön</button>
        {durum && <span class="soluk kucuk" role="status">{durum}</span>}
      </div>
      <p class="soluk kucuk">Yazma ekranında ve kayıt sayfalarında geçerlidir; bütün cihazlarınızda aynı görünür. PDF ve Word çıktısını değiştirmez.{g.renk === 'tur' && ' Türüne göre renkler kayıt türlerinin grup renkleridir (kişiler, yerler, kültür…).'}</p>
    </div>
  );
}
