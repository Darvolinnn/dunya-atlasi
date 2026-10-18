// İnceleme bekleyen çatışmalar (§10.3, §10.6): iki cihazda birbirini görmeden yapılmış değişiklikler.
// Program bunlardan birini gizlice seçmez; yazar seçer ya da inceledim der.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { Catisma, Spans } from '../veri/api';
import { zamanYaz } from '../alan/islem-metni';
import { KARARLAR, turBul } from '../alan/turler';
import { MetinGorunumu } from './MetinEditoru';

const ALAN_ADLARI: Record<string, string> = {
  ad: 'Ad', ozet: 'Kısa özet', okunus: 'Okunuş', tur: 'Tür', karar: 'Karar durumu', tarih: 'Evren tarihi',
  baslangic: 'Başlangıç', bitis: 'Bitiş', aciklama: 'Açıklama', rol: 'Rol',
};
const alanAdi = (a: string) => a.startsWith('karar:') ? `${ALAN_ADLARI[a.slice(6)] ?? a.slice(6)} (karar durumu)` : ALAN_ADLARI[a] ?? a;

function degerYazisi(alan: string, d: unknown): string {
  if (d === null || d === undefined || d === '') return '(boş)';
  if (typeof d === 'object' && d && 'ifade' in d) return String((d as { ifade: string }).ifade);
  if (alan === 'tur') return turBul(String(d)).ad;
  if (alan === 'karar' || alan.startsWith('karar:')) return KARARLAR.find((k) => k.kod === d)?.ad ?? String(d);
  if (alan === 'rol') return String(d);
  return String(d);
}

/** Bir evrenin (ya da bir kaydın) çatışmaları. Hiç yoksa hiçbir şey göstermez. */
export function CatismaListesi({ istemci, evren, kod, surum, baslikGoster = true }: { istemci: Istemci; evren: string; kod?: string; surum: number; baslikGoster?: boolean }) {
  const [liste, setListe] = useState<Catisma[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('catismalar', { evren, kod }).then(setListe, (e) => setHata(e.message)); }, [evren, kod, surum]);
  if (hata) return <p class="hata">{hata}</p>;
  if (!liste) return null;
  if (!liste.length) return kod ? null : <p class="soluk">İnceleme bekleyen bir şey yok. İki cihazda yapılan değişikliklerin hepsi kendiliğinden birleşti.</p>;
  const calistir = (p: Promise<unknown>) => p.catch((e) => setHata((e as Error).message));
  return (
    <div class="catismalar" role="region" aria-label="İnceleme bekleyenler">
      {baslikGoster && kod && <p><strong>İki cihazda birbirinden habersiz yapılmış {liste.length === 1 ? 'bir değişiklik' : `${liste.length} değişiklik`} inceleme bekliyor.</strong></p>}
      {liste.map((c) => (
        <div class="kart catisma" key={c.tur + (c.tur === 'alan' ? c.nesne + c.alan : c.kayit)}>
          {!kod && (c.kayit
            ? <a class="kucuk" href={`#/e/${evren}/k/${c.kayit}`}>{c.baslik}</a>
            : <span class="kucuk">{c.baslik}</span>)}
          {c.tur === 'alan' && (
            <>
              <p><strong>{alanAdi(c.alan)}</strong>{c.nesneTuru === 'iliski' && kod ? ` (${c.baslik})` : ''}: iki cihazda farklı yazılmış. Hangisi kalsın?</p>
              <ul class="catisma-degerleri">
                {c.degerler.map((d) => (
                  <li key={d.islem}>
                    <span class="deger">{degerYazisi(c.alan, d.deger)}</span>
                    <span class="soluk kucuk">{d.kurulum} · {zamanYaz(d.zaman)}</span>
                    <button class="dugme kucuk" onClick={() => calistir(istemci.iste('alanCatismasiCoz', { evren, nesne: c.nesne, alan: c.alan, islem: d.islem }))}>Bunu kullan</button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {c.tur === 'silme' && (
            <>
              <p>Bu kayıt silinmişti, ama {c.kurulumlar.join(', ')} silindiğini bilmeden {c.duzenlemeSayisi} değişiklik yapmış. Değişiklikler kaybolmadı; kayıtta duruyor.</p>
              <div class="satir">
                <button class="dugme ana" onClick={() => calistir(istemci.iste('silmeCatismasiCoz', { evren, kayit: c.kayit, geriYukle: true }))}>Kaydı geri getir</button>
                <button class="dugme" onClick={() => calistir(istemci.iste('silmeCatismasiCoz', { evren, kayit: c.kayit, geriYukle: false }))}>Silinmiş kalsın</button>
              </div>
              <p class="soluk kucuk">Silinmiş kalırsa kayıt, yazılanlarla birlikte çöp kutusunda durur.</p>
            </>
          )}
          {c.tur === 'metin' && <MetinCatismasi istemci={istemci} evren={evren} c={c} coz={() => calistir(istemci.iste('metinCatismasiCoz', { evren, kayit: c.kayit, alan: c.alan }))} />}
        </div>
      ))}
    </div>
  );
}

function MetinCatismasi({ istemci, evren, c, coz }: { istemci: Istemci; evren: string; c: Extract<Catisma, { tur: 'metin' }>; coz: () => void }) {
  const [acik, setAcik] = useState(false);
  const [surumler, setSurumler] = useState<Spans[] | null>(null);
  useEffect(() => {
    if (!acik || surumler) return;
    Promise.all([c.temel, c.a.basliklar, c.b.basliklar].map((basliklar) => istemci.iste('metinSurumu', { evren, kayit: c.kayit, alan: c.alan, basliklar })))
      .then((r) => setSurumler(r.map((x) => x.spans)));
  }, [acik]);
  return (
    <>
      <p>Metnin aynı bölümü iki cihazda birbirinden habersiz değiştirildi. İkisi de metinde duruyor; okuyup gerekirse düzeltin.</p>
      <div class="satir">
        <button class="dugme" aria-expanded={acik} onClick={() => setAcik(!acik)}>{acik ? 'Sürümleri gizle' : 'Üç sürümü göster'}</button>
        <button class="dugme ana" onClick={coz}>İnceledim</button>
      </div>
      {acik && surumler && (
        <div class="uc-surum">
          <div><h4>Ortak başlangıç</h4><MetinGorunumu spans={surumler[0]} /></div>
          <div><h4>{c.a.kurulum} · {zamanYaz(c.a.zaman)}</h4><MetinGorunumu spans={surumler[1]} /></div>
          <div><h4>{c.b.kurulum} · {zamanYaz(c.b.zaman)}</h4><MetinGorunumu spans={surumler[2]} /></div>
        </div>
      )}
    </>
  );
}
