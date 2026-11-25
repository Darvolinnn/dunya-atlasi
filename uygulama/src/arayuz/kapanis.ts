import { useEffect, useRef, useState } from 'preact/hooks';
import { hareketAzMi, hareketDegerleri } from './tema';

/**
 * Pencerenin yumuşak kapanışı (K32): perde 120 ms'de solar, içindeki pencere hafifçe aşağı iner, sonra kapanır.
 * Yalnız vazgeçme yollarında (Esc, perdeye tıklama, Kapat düğmesi) kullanılır; bir komut çalıştıran kapanış
 * beklemeden kapanır. "Animasyonları azalt" açıksa ya da tarayıcı desteklemiyorsa hemen kapanır.
 * Dönen işlev her çizimde aynıdır; boş bağımlılıklı olay dinleyicilerinde güvenle kullanılır.
 */
export function useYumusakKapanis(kapat: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const son = useRef(kapat);
  son.current = kapat;
  const kapaniyor = useRef(false);
  const vazgec = useRef(() => {
    if (kapaniyor.current) return;
    const el = ref.current;
    if (!el?.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { son.current(); return; }
    kapaniyor.current = true;
    el.style.pointerEvents = 'none';
    const secenek = { duration: 120, easing: 'ease-in', fill: 'forwards' as const };
    const ic = el.querySelector<HTMLElement>(':scope > .perde-ic, :scope > .palet');
    ic?.animate([{ transform: 'none' }, { transform: 'translateY(4px) scale(0.99)' }], secenek);
    const a = el.animate([{ opacity: 1 }, { opacity: 0 }], secenek);
    let bitti = false;
    const bitir = () => { if (!bitti) { bitti = true; son.current(); } };
    a.onfinish = bitir; a.oncancel = bitir;
    setTimeout(bitir, 400); // Sekme arka plandayken animasyon durabilir; pencere yine kapanır.
  }).current;
  return [ref, vazgec] as const;
}

/**
 * Kenardan gelen panellerin kapanışı (K41): yan panel, sayfa rehberi, harita ve takvim çekmecesi, hızlı not
 * ekrandan kalkınca yerine bir kopyası ("hayalet") konur ve geldiği yöne doğru kayarak solar, sonra silinir.
 * Bileşenlere dokunmadan bütün kapanış yollarında (düğme, Esc, sayfa içi değişiklik) çalışır. Kopya tıklanmaz,
 * okunmaz (inert, aria-hidden). "Animasyonları azalt" açıksa hiç oynamaz.
 */
const HAYALET_YONU: [string, string][] = [
  ['.yan-panel, .rehber-paneli, .harita-cekmece, .takvim-cekmece', 'translateX(var(--hz-panel-mesafe))'],
  ['.hizli-not', 'translateY(var(--hz-mesafe))'],
];
const HAYALET_SECICI = HAYALET_YONU.map(([s]) => s).join(', ');

function hayaletOynat(d: HTMLElement, ust: Node, sonraki: Node | null) {
  const h = d.cloneNode(true) as HTMLElement;
  // Yazılmış ama kaydedilmemiş değerler kopyada da görünsün (hızlı not).
  const asil = d.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  h.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((e, i) => { if (asil[i]) e.value = asil[i].value; });
  h.classList.add('cikis-hayaleti');
  h.setAttribute('aria-hidden', 'true');
  h.inert = true;
  h.removeAttribute('id');
  h.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
  ust.insertBefore(h, sonraki && sonraki.parentNode === ust ? sonraki : null);
  const yon = HAYALET_YONU.find(([s]) => d.matches(s))?.[1] ?? 'none';
  const { sure } = hareketDegerleriKisa();
  const sil = () => h.remove();
  if (!h.animate) { sil(); return; }
  const a = h.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: yon }], { duration: sure, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
  a.onfinish = sil; a.oncancel = sil;
  setTimeout(sil, sure + 400);
}

/** Kapanışlar açılıştan biraz kısadır (açılış süresinin dörtte üçü). */
function hareketDegerleriKisa() {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hz-sure'));
  return { sure: Math.round((Number.isFinite(v) ? v : 200) * 0.75) };
}

let kuruldu = false;
export function cikisHayaletleriniKur() {
  if (kuruldu || typeof MutationObserver === 'undefined') return;
  kuruldu = true;
  new MutationObserver((kayitlar) => {
    if (hareketAzMi()) return;
    for (const k of kayitlar) {
      if (!k.removedNodes.length || !(k.target as Node).isConnected) continue;
      for (const d of k.removedNodes) {
        if (d instanceof HTMLElement && !d.classList.contains('cikis-hayaleti') && !d.dataset.suruklendi && d.matches(HAYALET_SECICI)) hayaletOynat(d, k.target, k.nextSibling);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
  sekmeCizgisiniKur();
}

/**
 * Sekmelerin altın çizgisi (K41): seçili sekme değişince çizgi eski sekmeden yenisine kayar. Bütün `.sekmeler`
 * listelerinde, sekmenin `aria-selected` değişimini izleyerek çalışır; bileşenler bir şey yapmaz.
 */
function sekmeCizgisiniKur() {
  new MutationObserver((kayitlar) => {
    if (hareketAzMi()) return;
    let eski: HTMLElement | null = null;
    let yeni: HTMLElement | null = null;
    for (const k of kayitlar) {
      const t = k.target as HTMLElement;
      if (!t.classList?.contains('sekme') || !t.parentElement?.classList.contains('sekmeler')) continue;
      if (k.oldValue === 'true' && t.getAttribute('aria-selected') !== 'true') eski = t;
      else if (t.getAttribute('aria-selected') === 'true') yeni = t;
    }
    if (!eski || !yeni || eski.parentElement !== yeni.parentElement || !eski.isConnected) return;
    cizgiKaydir(yeni.parentElement!, eski, yeni);
  }).observe(document.body, { attributes: true, attributeFilter: ['aria-selected'], attributeOldValue: true, subtree: true });
}

function cizgiKaydir(liste: HTMLElement, eski: HTMLElement, yeni: HTMLElement) {
  liste.querySelector(':scope > .sekme-cizgisi')?.remove();
  const lr = liste.getBoundingClientRect();
  const er = eski.getBoundingClientRect();
  const yr = yeni.getBoundingClientRect();
  if (!yr.width || !er.width) return;
  const c = document.createElement('span');
  c.className = 'sekme-cizgisi';
  c.setAttribute('aria-hidden', 'true');
  const sol = yr.left - lr.left + liste.scrollLeft;
  c.style.left = `${sol}px`;
  c.style.width = `${yr.width}px`;
  c.style.top = `${yr.bottom - lr.top + liste.scrollTop - 2}px`;
  liste.appendChild(c);
  yeni.classList.add('cizgi-geliyor');
  const { sure, egri } = hareketDegerleri();
  const a = c.animate([{ transform: `translateX(${er.left - yr.left}px) scaleX(${er.width / yr.width})` }, { transform: 'none' }],
    { duration: sure, easing: egri });
  const bitir = () => { c.remove(); yeni.classList.remove('cizgi-geliyor'); };
  a.onfinish = bitir; a.oncancel = bitir;
  setTimeout(bitir, sure + 400);
}

/**
 * Basamaklı belirme (K41): liste ilk açıldığında öğeler 18 ms arayla yerine oturur (stil.css `.basamakli`).
 * Yalnız ilk açılışta; ardından süzme ya da yenileme gibi değişikliklerde öğeler beklemeden gelir.
 * `hazir` false iken (veri gelmeden) sayaç başlamaz.
 */
export function useBasamakli(hazir = true) {
  const [acik, setAcik] = useState(true);
  useEffect(() => {
    if (!hazir) return;
    const t = setTimeout(() => setAcik(false), 900);
    return () => clearTimeout(t);
  }, [hazir]);
  return acik ? ' basamakli' : '';
}
