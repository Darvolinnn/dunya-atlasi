// Evren içindeki her ekranın kabuğu (§5.10, K24): solda sabit gezinti çubuğu. "Yaz" seçiliyken eserlerin ağacı
// (eser › bölüm › sahne) çubukta görünür; görünümlerden biri açıkken görünümlerin listesi açılır. Az kullanılan
// sayfalar "Diğer" altında katlanır.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EserYapisi, EvrenBilgisi, KisaKayit, YapiSahnesi } from '../veri/api';
import { git } from './Uygulama';
import { EsitlemeOzeti } from './Esitleme';

/** İnceleme görünümleri (§7): aynı verinin farklı çizimleri. */
export const GORUNUMLER = [['cizelge', 'Zaman çizelgesi'], ['ag', 'Ağ'], ['soy', 'Soy ağacı'], ['neden', 'Neden–sonuç'], ['durumlar', 'Durum geçmişi'],
  ['yogunluk', 'Yoğunluk ve boşluk'], ['gokyuzu', 'Gökyüzü'], ['sozluk', 'Sözlük denetimi'], ['sozlesme', 'Anlatı sözleşmesi'],
  ['kosullar', 'Sonuçtan koşullara'], ['kesif', 'Keşif soruları'], ['hatlar', 'Kurgu hatları'], ['matris', 'Bölüm × kayıt'],
  ['gun', 'Sıradan bir gün'], ['karsilastir', 'Karşılaştırmalı okuma'], ['gezinti', 'Gezintiler'], ['pano', 'Görsel panolar']] as const;
export const gorunumMu = (s: string) => GORUNUMLER.some(([g]) => g === s);

/** Ana sayfalar ve "Diğer" altındakiler; komut paleti de bu listeyi kullanır. */
export const ANA_SAYFALAR = [['yaz', 'Yaz'], ['masa', 'Masa'], ['kayitlar', 'Kayıtlar'], ['haritalar', 'Haritalar'], ['takvim', 'Takvim'], ['gorunumler', 'Görünümler'], ['inceleme', 'İnceleme']] as const;
export const DIGER_SAYFALAR = [['masalar', 'Çalışma masaları'], ['meseleler', 'Açık meseleler'], ['sablonlar', 'Şablonlar'], ['bahsedilen', 'Bahsedilen ama yazılmamış'],
  ['cop', 'Çöp kutusu'], ['gecmis', 'Geçmiş'], ['surumler', 'Sürümler'], ['yedek', 'Yedek']] as const;

let sonGorunum = 'cizelge';
const digerAnahtari = 'dunya-atlasi:diger-acik';
const oku = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yaz = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };

export function EvrenKabugu({ istemci, evren, etkin, acik = null, children }: {
  istemci: Istemci; evren: string; etkin: string; acik?: string | null; children: preact.ComponentChildren;
}) {
  const [bilgi, setBilgi] = useState<EvrenBilgisi | null>(null);
  const [surum, setSurum] = useState(0);
  const [digerAcik, setDigerAcik] = useState(() => oku(digerAnahtari) === '1' || DIGER_SAYFALAR.some(([k]) => k === etkin));
  useEffect(() => { istemci.iste('evrenBilgisi', { evren }).then(setBilgi, () => {}); }, [evren, surum]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setSurum((s) => s + 1); }), [evren]);
  if (gorunumMu(etkin)) sonGorunum = etkin;

  const sayi = (k: string) => !bilgi ? '' : k === 'kayitlar' ? bilgi.kayitSayisi : k === 'cop' ? bilgi.copSayisi
    : k === 'inceleme' ? (bilgi.catismaSayisi + bilgi.sorunSayisi || '') : '';
  const bagli = !!bilgi?.bag;
  const oge = (k: string, ad: string) => {
    const secili = k === 'gorunumler' ? gorunumMu(etkin) : etkin === k;
    const n = sayi(k);
    return (
      <li key={k}>
        <a class={secili ? 'gezinti-ogesi secili' : 'gezinti-ogesi'} aria-current={secili ? 'page' : undefined}
          href={`#/e/${evren}/${k === 'gorunumler' ? sonGorunum : k}`}>
          <span>{ad}</span>{n !== '' && <span class="gezinti-sayi">{n}</span>}
        </a>
        {k === 'yaz' && etkin === 'yaz' && <EserAgaci istemci={istemci} evren={evren} acik={acik} surum={surum} saltOkunur={bagli} />}
        {k === 'gorunumler' && gorunumMu(etkin) && (
          <ul class="gezinti-alt">
            {GORUNUMLER.map(([g, gad]) => (
              <li key={g}><a class={etkin === g ? 'gezinti-ogesi kucuk secili' : 'gezinti-ogesi kucuk'} aria-current={etkin === g ? 'page' : undefined} href={`#/e/${evren}/${g}`}>{gad}</a></li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div class="kabuk">
      <nav class="gezinti" aria-label="Evrende gezinti">
        <a class="gezinti-geri" href="#/">← Evrenler</a>
        <div class="gezinti-evren" title={bilgi?.ad}>{bilgi?.ad ?? '…'}</div>
        <ul class="gezinti-listesi">{ANA_SAYFALAR.map(([k, ad]) => oge(k, ad))}</ul>
        <details class="gezinti-diger" open={digerAcik} onToggle={(e) => { const v = (e.target as HTMLDetailsElement).open; setDigerAcik(v); yaz(digerAnahtari, v ? '1' : '0'); }}>
          <summary>Diğer</summary>
          <ul class="gezinti-listesi">{DIGER_SAYFALAR.filter(([k]) => !bagli || !['surumler', 'yedek'].includes(k)).map(([k, ad]) => oge(k, ad))}</ul>
        </details>
        <div class="gezinti-alti">
          <EsitlemeOzeti />
          <span>Komutlar: Ctrl+K</span>
        </div>
      </nav>
      <div class="kabuk-ic">{children}</div>
    </div>
  );
}

const hataYaz = (e: unknown) => (e as Error).message;

/** Gezinti çubuğunda eserler, bölümler ve sahneler; yenileri buradan eklenir. */
function EserAgaci({ istemci, evren, acik, surum, saltOkunur }: { istemci: Istemci; evren: string; acik: string | null; surum: number; saltOkunur: boolean }) {
  const [eserler, setEserler] = useState<KisaKayit[] | null>(null);
  const [yapilar, setYapilar] = useState<Record<string, EserYapisi>>({});
  const [disarida, setDisarida] = useState<YapiSahnesi[]>([]);
  const [yeni, setYeni] = useState<{ ust: string | null; tur: 'eser' | 'bolum' | 'sahne' } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => {
    istemci.iste('eserler', { evren }).then(async (l) => {
      const y: Record<string, EserYapisi> = {};
      await Promise.all(l.map(async (e) => { y[e.kod] = await istemci.iste('eserYapisi', { evren, eser: e.kod }); }));
      setYapilar(y); setEserler(l);
    }, () => setEserler([]));
    istemci.iste('yerlesmemisler', { evren }).then((l) => setDisarida(l.filter((x) => x.tur === 'sahne')), () => {});
  }, [evren, surum]);
  if (!eserler) return null;

  const ekle = async (ad: string) => {
    if (!yeni) return;
    try {
      const { kod } = yeni.tur === 'eser'
        ? await istemci.iste('kayitOlustur', { evren, ad, tur: 'eser' })
        : await istemci.iste('anlatiOlustur', { evren, ust: yeni.ust!, ad, tur: yeni.tur });
      setYeni(null); setHata(null);
      git(`/e/${evren}/yaz/${kod}`);
    } catch (e) { setHata(hataYaz(e)); }
  };
  const yeniSatir = (ust: string | null, tur: 'eser' | 'bolum' | 'sahne', etiket: string) =>
    saltOkunur ? null : yeni && yeni.ust === ust && yeni.tur === tur
      ? <YeniAd ipucu={tur === 'eser' ? 'Eserin adı' : tur === 'bolum' ? 'Bölümün adı' : 'Sahnenin adı'} ekle={ekle} vazgec={() => setYeni(null)} />
      : <button class="agac-ekle" onClick={() => { setYeni({ ust, tur }); setHata(null); }}>{etiket}</button>;
  const dal = (k: { kod: string; ad: string }, sinif: string) => (
    <a class={k.kod === acik ? `${sinif} secili` : sinif} aria-current={k.kod === acik ? 'page' : undefined} href={`#/e/${evren}/yaz/${k.kod}`}>{k.ad}</a>
  );
  const sahneler = (l: YapiSahnesi[]) => l.map((s) => <li key={s.kod}>{dal(s, 'agac-sahne')}</li>);

  return (
    <div class="eser-agaci">
      {eserler.map((e) => {
        const y = yapilar[e.kod];
        return (
          <div key={e.kod} class="agac-eser">
            {dal(e, 'agac-eser-ad')}
            {y && (
              <ul class="agac-liste">
                {sahneler(y.dogrudan)}
                {y.bolumler.map((b) => (
                  <li key={b.kod}>
                    {dal({ kod: b.kod, ad: `${b.sira}. ${b.ad}` }, 'agac-bolum')}
                    <ul class="agac-liste">
                      {sahneler(b.sahneler)}
                      <li>{yeniSatir(b.kod, 'sahne', '+ Sahne')}</li>
                    </ul>
                  </li>
                ))}
                {!y.bolumler.length && <li>{yeniSatir(e.kod, 'sahne', '+ Sahne')}</li>}
                <li>{yeniSatir(e.kod, 'bolum', '+ Bölüm')}</li>
              </ul>
            )}
          </div>
        );
      })}
      {disarida.length > 0 && (
        <details class="agac-disarida">
          <summary>Esere yerleştirilmemiş ({disarida.length})</summary>
          <ul class="agac-liste">{sahneler(disarida)}</ul>
        </details>
      )}
      {yeniSatir(null, 'eser', '+ Yeni eser')}
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}

function YeniAd({ ipucu, ekle, vazgec }: { ipucu: string; ekle: (ad: string) => Promise<void>; vazgec: () => void }) {
  const [ad, setAd] = useState('');
  const girdi = useRef<HTMLInputElement>(null);
  useEffect(() => { girdi.current?.focus(); }, []);
  return (
    <form class="agac-yeni" onSubmit={(e) => { e.preventDefault(); if (ad.trim()) void ekle(ad.trim()); }}>
      <input ref={girdi} class="girdi" lang="tr" aria-label={ipucu} placeholder={ipucu} value={ad}
        onInput={(e) => setAd((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Escape') vazgec(); }} />
    </form>
  );
}
