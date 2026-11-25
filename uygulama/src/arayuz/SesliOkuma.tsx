// Sesli okuma (K44): kesintisiz okumada metni bilgisayarın kendi Türkçe sesiyle paragraf paragraf okur; okunan
// paragraf vurgulanır ve görünür tutulur. İnternet ya da yapay zekâ kullanılmaz: yalnız cihazda kurulu (yerel) sesler
// seçilir. Şimdilik yalnız Windows'ta: tabletin uygulama penceresi konuşma sentezini sunmuyor (DEVIR §0.31).
import { useEffect, useRef, useState } from 'preact/hooks';

const HIZLAR = [0.8, 1, 1.2, 1.5];
const HIZ_ANAHTARI = 'dunya-atlasi:sesli-okuma-hizi';

/** Bu cihazda sesli okuma sunulur mu? Android'de (tablet) şimdilik hayır. */
export const sesliOkumaVarMi = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined' && !/Android/.test(navigator.userAgent);

function turkceSes(): SpeechSynthesisVoice | null {
  const l = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('tr') && v.localService);
  return l.find((v) => v.default) ?? l[0] ?? null;
}

function okunacakParagraflar(kap: HTMLElement): HTMLElement[] {
  return [...kap.querySelectorAll<HTMLElement>('.metin-editoru > *')].filter((p) => p.textContent?.trim());
}

export function SesliOkuma({ kap }: { kap: { current: HTMLElement | null } }) {
  const [ses, setSes] = useState<SpeechSynthesisVoice | null | undefined>(undefined);
  const [durum, setDurum] = useState<'dur' | 'okuyor' | 'duraklatildi'>('dur');
  const [hiz, setHiz] = useState(() => { try { return Number(localStorage.getItem(HIZ_ANAHTARI)) || 1; } catch { return 1; } });
  const sira = useRef<{ l: HTMLElement[]; i: number; nesil: number }>({ l: [], i: 0, nesil: 0 });
  const hizRef = useRef(hiz);
  hizRef.current = hiz;

  useEffect(() => {
    // Sesler geç yüklenebilir; liste gelince yeniden bakılır.
    const bak = () => setSes(turkceSes());
    bak();
    speechSynthesis.addEventListener('voiceschanged', bak);
    return () => { speechSynthesis.removeEventListener('voiceschanged', bak); durdur(); };
  }, []);

  const vurgula = (el: HTMLElement | null) => {
    kap.current?.querySelectorAll('.okunan-paragraf').forEach((x) => x.classList.remove('okunan-paragraf'));
    if (el) { el.classList.add('okunan-paragraf'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  };
  const oku = (nesil: number) => {
    const s = sira.current;
    if (nesil !== s.nesil) return;
    const el = s.l[s.i];
    if (!el) { vurgula(null); setDurum('dur'); return; }
    vurgula(el);
    const u = new SpeechSynthesisUtterance(el.textContent ?? '');
    u.lang = 'tr-TR';
    try { if (ses) u.voice = ses; } catch { /* ses nesnesi geçersizse dil ayarı yeter */ }
    u.rate = hizRef.current;
    u.onend = () => { if (nesil === s.nesil) { s.i++; oku(nesil); } };
    u.onerror = () => { if (nesil === s.nesil) { vurgula(null); setDurum('dur'); } };
    speechSynthesis.speak(u);
  };
  const basla = (baslangic?: HTMLElement) => {
    if (!kap.current) return;
    speechSynthesis.cancel();
    const l = okunacakParagraflar(kap.current);
    // Tıklanan paragraftan, yoksa ekranda görünen ilk paragraftan başlanır.
    let i = baslangic ? l.indexOf(baslangic) : l.findIndex((p) => p.getBoundingClientRect().bottom > 80);
    if (i < 0) i = 0;
    const nesil = sira.current.nesil + 1;
    sira.current = { l, i, nesil };
    setDurum('okuyor');
    oku(nesil);
  };
  function durdur() { sira.current.nesil++; speechSynthesis.cancel(); vurgula(null); setDurum('dur'); }
  const duraklat = () => {
    if (durum === 'okuyor') { speechSynthesis.pause(); setDurum('duraklatildi'); }
    else if (durum === 'duraklatildi') { speechSynthesis.resume(); setDurum('okuyor'); }
  };
  const hizDegis = (h: number) => {
    setHiz(h);
    try { localStorage.setItem(HIZ_ANAHTARI, String(h)); } catch { /* yok */ }
    // Hız okunan cümleye uygulanamaz; okuma sürüyorsa aynı paragraftan yeni hızla yeniden başlar.
    if (durum !== 'dur') { const el = sira.current.l[sira.current.i]; hizRef.current = h; basla(el); }
  };
  // Okurken bir paragrafa tıklamak okumayı oradan sürdürür.
  useEffect(() => {
    const el = kap.current;
    if (!el || durum === 'dur') return;
    const tik = (e: MouseEvent) => {
      const p = (e.target as HTMLElement).closest<HTMLElement>('.metin-editoru > *');
      if (p && p.textContent?.trim()) basla(p);
    };
    el.addEventListener('click', tik);
    return () => el.removeEventListener('click', tik);
  }, [durum, kap.current]);

  if (ses === undefined) return null;
  return (
    <div class="sesli-okuma satir" role="group" aria-label="Sesli okuma">
      {durum === 'dur'
        ? <button class="dugme kucuk" disabled={!ses} onClick={() => basla()}>▶ Dinle</button>
        : <>
          <button class="dugme kucuk" onClick={duraklat}>{durum === 'okuyor' ? '❚❚ Duraklat' : '▶ Sürdür'}</button>
          <button class="dugme kucuk" onClick={durdur}>■ Durdur</button>
        </>}
      <label class="kucuk soluk">Hız{' '}
        <select class="girdi kucuk-secim" value={hiz} onChange={(e) => hizDegis(Number(e.currentTarget.value))}>
          {HIZLAR.map((h) => <option key={h} value={h}>{h.toLocaleString('tr-TR')}×</option>)}
        </select>
      </label>
      {!ses && <span class="soluk kucuk">Bu bilgisayarda Türkçe ses yok. Windows Ayarlar › Saat ve dil › Konuşma bölümünden Türkçe ses ekleyebilirsiniz.</span>}
      {durum !== 'dur' && <span class="soluk kucuk">Bir paragrafa tıklayınca okuma oradan sürer.</span>}
    </div>
  );
}
