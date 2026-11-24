// Büyük harita katmanının döşemeyle gösterimi (§8.1, K38). Altta görselin tek parçalık kaba hâli durur; üstte o anki
// yakınlığa yeten seviyenin yalnız ekranda (ve hemen çevresinde) kalan parçaları çözülür. Ekrandan uzaklaşan parça
// bırakılır. Parçalar çalışanda üretilir ve bu açılışta sıkıştırılmış olarak saklanır.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import { gorselAdresi } from './gorsel';
import { dosemeSeviyesi, enKabaSeviye, seviyeDosemeleri, type Doseme } from './doseme';

const EN_COK_PARCA = 400;

class DosemeKaynagi {
  private calisan = new Worker(new URL('./doseme-calisani.ts', import.meta.url), { type: 'module' });
  private sira = 0;
  private bekleyen = new Map<number, (u: string | null) => void>();
  private adresler = new Map<string, Promise<string | null>>();
  constructor(veri: Blob) {
    this.calisan.onmessage = (e: MessageEvent<{ no: number; blob?: Blob }>) => {
      const c = this.bekleyen.get(e.data.no);
      this.bekleyen.delete(e.data.no);
      c?.(e.data.blob ? URL.createObjectURL(e.data.blob) : null);
    };
    this.calisan.postMessage({ tur: 'ac', veri });
  }
  parca(d: Doseme): Promise<string | null> {
    let p = this.adresler.get(d.anahtar);
    if (p) { this.adresler.delete(d.anahtar); this.adresler.set(d.anahtar, p); return p; } // en son kullanılan sona
    const no = ++this.sira;
    p = new Promise((c) => this.bekleyen.set(no, c));
    this.calisan.postMessage({ tur: 'doseme', no, sx: d.sx, sy: d.sy, sg: d.sg, sy2: d.sy2, g: d.g, y: d.y });
    this.adresler.set(d.anahtar, p);
    while (this.adresler.size > EN_COK_PARCA) {
      const [a, eski] = this.adresler.entries().next().value!;
      this.adresler.delete(a);
      void eski.then((u) => { if (u) URL.revokeObjectURL(u); });
    }
    return p;
  }
  kapat() {
    this.calisan.terminate();
    for (const c of this.bekleyen.values()) c(null);
    for (const p of this.adresler.values()) void p.then((u) => { if (u) URL.revokeObjectURL(u); });
    this.adresler.clear();
  }
}

/** `olcek`: katmanın bir görsel pikselinin ekrandaki CSS pikseli. */
export function DosemeliGorsel({ istemci, evren, ad, en, boy, olcek, alt }: {
  istemci: Istemci; evren: string; ad: string; en: number; boy: number; olcek: number; alt: string;
}) {
  const [kaynak, setKaynak] = useState<DosemeKaynagi | null>(null);
  const [kaba, setKaba] = useState<string | null>(null);
  const [durum, setDurum] = useState<string | null>(null);
  const kap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let iptal = false, k: DosemeKaynagi | null = null;
    gorselAdresi(istemci, evren, ad, false).then(async (g) => {
      if (iptal) return;
      if (!g.url) { setDurum(g.durum); return; }
      const veri = await (await fetch(g.url)).blob();
      if (iptal) return;
      k = new DosemeKaynagi(veri);
      setKaynak(k);
      const [tek] = seviyeDosemeleri(en, boy, enKabaSeviye(en, boy));
      setKaba(await k.parca(tek));
    }).catch(() => { if (!iptal) setDurum('yok'); });
    return () => { iptal = true; k?.kapat(); setKaynak(null); setKaba(null); };
  }, [ad, en, boy]);

  const seviye = dosemeSeviyesi(olcek, globalThis.devicePixelRatio || 1, en, boy);
  const parcalar = useMemo(() => (seviye === enKabaSeviye(en, boy) ? [] : seviyeDosemeleri(en, boy, seviye)), [seviye, en, boy]);

  // Görünen parçalar çözülür; uzaklaşanlar bırakılır. Kök haritanın kaydırılan tuvalidir.
  useEffect(() => {
    const el = kap.current;
    if (!el || !kaynak || !parcalar.length) return;
    const kok = el.closest('.harita-tuval');
    const io = new IntersectionObserver((girdiler) => {
      for (const g of girdiler) {
        const img = g.target as HTMLImageElement;
        if (!g.isIntersecting) { img.removeAttribute('src'); continue; }
        const d = parcalar[Number(img.dataset.no)];
        void kaynak.parca(d).then((u) => { if (u && img.isConnected && img.dataset.seviye === String(seviye)) img.src = u; });
      }
    }, { root: kok, rootMargin: '256px' });
    el.querySelectorAll('img.doseme-parca').forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, [kaynak, parcalar]);

  if (durum) return <span class="gorsel-yer bos" title={durum === 'indirilmemis' ? 'Bu cihaza henüz indirilmedi' : 'Görsel bulunamadı'}>{durum === 'indirilmemis' ? 'İndirilmedi' : 'Yok'}</span>;
  return (
    <div class="doseme" ref={kap} style={{ aspectRatio: `${en} / ${boy}` }} role="img" aria-label={alt} data-seviye={seviye}>
      {kaba && <img class="doseme-kaba" src={kaba} alt="" />}
      {parcalar.map((d, i) => (
        <img key={d.anahtar} class="doseme-parca" data-no={i} data-seviye={seviye} alt=""
          style={{ left: `${d.sol}%`, top: `${d.ust}%`, width: `${d.gen}%`, height: `${d.yuk}%` }} />
      ))}
    </div>
  );
}
