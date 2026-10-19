// Hızlı not (§5.8, T1): her ekrandan tek dokunuşla açılır, form göstermez, kaydedildiğini açıkça söyler.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EvrenOzeti } from '../veri/api';

export function HizliNot({ istemci, evren }: { istemci: Istemci; evren: string | null }) {
  const [acik, setAcik] = useState(false);
  const [metin, setMetin] = useState('');
  const [hedef, setHedef] = useState<EvrenOzeti | null>(null);
  const [son, setSon] = useState<{ kod: string; ad: string; evren: string } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const alan = useRef<HTMLTextAreaElement>(null);

  // Not açık evrene yazılır; evren seçili değilse en son açılan evrene.
  useEffect(() => {
    istemci.iste('evrenler').then((l) => {
      const e = evren ? l.find((x) => x.kod === evren) : [...l].sort((a, b) => (b.sonAcilis ?? b.olusturma) - (a.sonAcilis ?? a.olusturma))[0];
      setHedef(e ?? null);
    });
  }, [evren, acik]);
  useEffect(() => {
    const tus = (e: KeyboardEvent) => { if (e.altKey && !e.ctrlKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); setAcik(true); } };
    const ac = () => setAcik(true);
    addEventListener('keydown', tus);
    document.addEventListener('hizli-not-ac', ac);
    return () => { removeEventListener('keydown', tus); document.removeEventListener('hizli-not-ac', ac); };
  }, []);
  useEffect(() => { if (acik) setTimeout(() => alan.current?.focus()); }, [acik]);

  if (!hedef) return null;
  const kaydet = async () => {
    if (!metin.trim()) return;
    try {
      const r = await istemci.iste('hizliNot', { evren: hedef.kod, metin });
      setSon({ ...r, evren: hedef.kod }); setMetin(''); setHata(null);
      alan.current?.focus();
    } catch (e) { setHata((e as Error).message); }
  };

  if (!acik) return <button class="hizli-not-dugmesi dugme ana" onClick={() => setAcik(true)} title="Hızlı not (Alt+N)">+ Not</button>;
  return (
    <div class="hizli-not kart" role="dialog" aria-label="Hızlı not">
      <div class="satir">
        <strong>Hızlı not</strong>
        <span class="soluk kucuk">· {hedef.ad}</span>
        <span class="bosluk" />
        <button class="dugme sade kucuk" onClick={() => { setAcik(false); setSon(null); }}>Kapat</button>
      </div>
      <textarea ref={alan} class="girdi" rows={4} lang="tr" placeholder="Aklınıza geleni yazın. İlk satır notun adı olur." value={metin}
        onInput={(e) => { setMetin((e.target as HTMLTextAreaElement).value); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void kaydet(); }
          if (e.key === 'Escape') { e.preventDefault(); setAcik(false); }
        }} />
      <div class="satir">
        <button class="dugme ana" onClick={kaydet} disabled={!metin.trim()}>Kaydet</button>
        <span class="soluk kucuk">Ctrl+Enter</span>
        <span class="bosluk" />
        {son && <span class="basari kucuk" role="status">Kaydedildi: <a href={`#/e/${son.evren}/k/${son.kod}`} onClick={() => setAcik(false)}>{son.ad}</a></span>}
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}
