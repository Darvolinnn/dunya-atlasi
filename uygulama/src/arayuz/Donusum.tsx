// F25: eski ve devam kayıtları bağımsızdır; bu bölüm yalnızca tarihli beyanı gösterir.
import { useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { Catisma, DonusumBicimi, DonusumDevirTuru, DonusumGirdisi, DonusumOkumasi, DonusumSecenekleri, DonusumYeniKaydi } from '../veri/api';
import { yeniKod } from '../alan/kod';
import { TURLER } from '../alan/turler';
import { useYukle } from './Anlati';

const BICIMLER: Record<DonusumBicimi, string> = { birlesme: 'Birleşme', bolunme: 'Bölünme', donusum: 'Dönüşüm' };
const DEVIRLER: Record<DonusumDevirTuru, string> = { uyeler: 'Üyeler', esya: 'Eşya', haklar: 'Haklar', ad: 'Adı', adlandirilan: 'Adlandırılan devir', iliski: 'Kayıtlı ilişki' };
const FIILLER = { birlesme: 'birleşti', bolunme: 'bölündü', donusum: 'dönüştü' };
const bos = (kod: string): DonusumGirdisi => ({ bicim: 'donusum', kaynaklar: [kod], hedefler: [], tarih: '', olay: null, devirler: [], not: '' });

export function DonusumBolumu({ istemci, evren, kod, saltOkunur }: { istemci: Istemci; evren: string; kod: string; saltOkunur?: boolean }) {
  const [liste, yenile] = useYukle(istemci, evren, () => istemci.iste('donusumListesi', { evren, kayit: kod }), [evren, kod]);
  // Çatışma listesi yalnızca çatışmalı bir dönüşüm varsa okunur; her kayıt sayfasında bütün evren taranmaz.
  const catismaVar = !!liste?.some((d) => d.catismali);
  const [catismalar] = useYukle(istemci, evren, () => catismaVar ? istemci.iste('catismalar', { evren }) : Promise.resolve([]), [evren, kod, catismaVar]);
  const [form, setForm] = useState<DonusumOkumasi | 'yeni' | null>(null);
  const [hata, setHata] = useState('');
  const [bekle, setBekle] = useState(false);
  const calistir = async (is: () => Promise<unknown>) => {
    if (bekle) return;
    setBekle(true); setHata('');
    try { await is(); yenile(); } catch (e) { setHata((e as Error).message); } finally { setBekle(false); }
  };
  const bag = (k: { kod: string; ad: string }) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
  const ad = (d: DonusumOkumasi, k: string) => [...d.kaynaklar, ...d.hedefler].find((x) => x.kod === k) ?? { kod: k, ad: 'Kayıt' };
  // Çoğu kayıtta dönüşüm yoktur: yalnızca ayrı bir düğme görünür (§9.5).
  if (liste?.length === 0 && !form) return saltOkunur ? null : <div class="satir kucuk"><button class="dugme sade kucuk" onClick={() => setForm('yeni')}>Evren içi birleşme, bölünme ya da dönüşüm yaz…</button></div>;
  return <section class="bolum" aria-label="Evren içi dönüşüm">
    <h2>Evren içi birleşme, bölünme ve dönüşüm</h2>
    <p class="soluk kucuk">Eski kayıtlar ve geçmişleri korunur. Devirler sizin beyanınızdır; ilişkiler kendiliğinden taşınmaz. Olay bağlantısı, buraya yazılan tarihi değiştirmez.</p>
    {hata && <p role="alert" class="hata">{hata}</p>}
    {!liste && <p>Geçmiş okunuyor…</p>}
    {liste?.length === 0 && <p class="soluk">Henüz evren içi dönüşüm yazılmadı.</p>}
    {liste?.map((d) => <article class="kart" key={d.kod}>
      <p><strong>{d.tanim.tarih.ifade} tarihinde {FIILLER[d.tanim.bicim]}</strong>{d.geriAlindi && ' — geri alındı'}{d.catismali && ' — farklı yazımlar inceleme bekliyor'}</p>
      <p>Önceki: {d.kaynaklar.map((k, i) => <span key={k.kod}>{i > 0 && ', '}{bag(k)}</span>)} → Devamı: {d.hedefler.map((k, i) => <span key={k.kod}>{i > 0 && ', '}{bag(k)}</span>)}</p>
      {d.olay && <p>Bağlı olay: {bag(d.olay)}</p>}
      {d.tanim.devirler.length === 0 ? <p class="soluk">Devir seçilmedi.</p> : <ul>{d.tanim.devirler.map((v, i) => <li key={i}>{bag(ad(d, v.kaynak))} → {bag(ad(d, v.hedef))}: {DEVIRLER[v.tur]}{v.aciklama && ` — ${v.aciklama}`}</li>)}</ul>}
      {d.tanim.not && <p>{d.tanim.not}</p>}
      {!saltOkunur && <p><button class="dugme kucuk" disabled={bekle} onClick={() => { setHata(''); setForm(d); }}>Dönüşümü düzenle</button>{!d.geriAlindi && <button class="dugme kucuk" disabled={bekle} onClick={() => void calistir(() => istemci.iste('donusumGeriAl', { evren, kod: d.kod }))}>Dönüşümü geri al</button>}</p>}
      {catismalar?.filter((c): c is Extract<Catisma, { tur: 'alan' }> => c.tur === 'alan' && c.nesne === d.kod && c.alan === 'donusum_degeri').map((c) => <div key={c.nesne} role="region" aria-label="Dönüşümün farklı yazımları">
        <p>İki cihazda farklı yazılmış. Kalacak yazımı seçin:</p>
        <ul>{c.degerler.map((v) => <li key={v.islem}><p>{v.yazi} <small>({v.kurulum})</small></p>{!saltOkunur && <button class="dugme kucuk" disabled={bekle} onClick={() => void calistir(() => istemci.iste('alanCatismasiCoz', { evren, nesne: d.kod, alan: c.alan, islem: v.islem }))}>Bu yazım kalsın</button>}</li>)}</ul>
      </div>)}
    </article>)}
    {!saltOkunur && !form && <button class="dugme" onClick={() => setForm('yeni')}>Evren içi dönüşüm yaz</button>}
    {!saltOkunur && form && <DonusumFormu key={`${kod}:${form === 'yeni' ? 'yeni' : form.kod}`} istemci={istemci} evren={evren} kayit={kod} onceki={form === 'yeni' ? null : form} kapat={() => setForm(null)} kaydedildi={() => { setForm(null); yenile(); }} />}
  </section>;
}

function DonusumFormu({ istemci, evren, kayit, onceki, kapat, kaydedildi }: { istemci: Istemci; evren: string; kayit: string; onceki: DonusumOkumasi | null; kapat: () => void; kaydedildi: () => void }) {
  const [t, setT] = useState<DonusumGirdisi>(() => onceki ? { ...onceki.tanim, tarih: onceki.tanim.tarih.ifade } : bos(kayit));
  const [yeniKayitlar, setYeniKayitlar] = useState<DonusumYeniKaydi[]>([]);
  const [s] = useYukle<DonusumSecenekleri>(istemci, evren, () => istemci.iste('donusumSecenekleri', { evren }), [evren]);
  const [yeniAd, setYeniAd] = useState('');
  const [yeniTur, setYeniTur] = useState('topluluk');
  const [hata, setHata] = useState('');
  const [bekle, setBekle] = useState(false);
  const guncelle = (d: Partial<DonusumGirdisi>) => setT((t) => ({ ...t, ...d }));
  const kayitlar = [...(s?.kayitlar ?? []), ...yeniKayitlar];
  const ad = (k: string) => kayitlar.find((x) => x.kod === k)?.ad ?? 'Silinmiş ya da bulunamayan kayıt';
  const cikar = (alan: 'kaynaklar' | 'hedefler', k: string) => {
    guncelle({ [alan]: t[alan].filter((x) => x !== k), devirler: t.devirler.filter((d) => d.kaynak !== k && d.hedef !== k) });
    setYeniKayitlar((l) => l.filter((x) => x.kod !== k));
  };
  const secim = (alan: 'kaynaklar' | 'hedefler', baslik: string) => <fieldset><legend>{baslik}</legend>
    <ul>{t[alan].map((k) => <li key={k}>{ad(k)} <button type="button" class="dugme kucuk" onClick={() => cikar(alan, k)}>Seçimi kaldır</button></li>)}</ul>
    <label>{baslik} ekle <select value="" onChange={(e) => { const k = e.currentTarget.value; if (k) guncelle({ [alan]: [...t[alan], k] }); }}>
      <option value="">Kayıt seçin</option>{(s?.kayitlar ?? []).filter((k) => !t.kaynaklar.includes(k.kod) && !t.hedefler.includes(k.kod)).map((k) => <option key={k.kod} value={k.kod}>{k.ad}</option>)}
    </select></label>
  </fieldset>;
  return <form aria-label="Evren içi dönüşüm formu" onSubmit={async (e) => {
    e.preventDefault(); if (bekle) return; setBekle(true); setHata('');
    try { await istemci.iste('donusumYaz', { evren, kod: onceki?.kod, tanim: t, yeniKayitlar }); kaydedildi(); }
    catch (e) { setHata((e as Error).message); } finally { setBekle(false); }
  }}>
    <fieldset disabled={bekle}>
      <legend>{onceki ? 'Dönüşümü düzenle' : 'Yeni dönüşüm'}</legend>
      {onceki?.geriAlindi && <p>Kaydedince geri alınmış dönüşüm yeniden geçerli olur.</p>}
      <label>Biçim <select value={t.bicim} onChange={(e) => guncelle({ bicim: e.currentTarget.value as DonusumBicimi })}>{Object.entries(BICIMLER).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}</select></label>
      <p class="soluk kucuk">Birleşme: en az iki önceki, bir devam. Bölünme: bir önceki, en az iki devam. Dönüşüm: bir önceki, bir devam.</p>
      {secim('kaynaklar', 'Önceki kayıt')}{secim('hedefler', 'Devam kaydı')}
      <fieldset><legend>Yeni devam kaydı oluştur</legend>
        <label>Devam kaydının adı <input value={yeniAd} maxLength={200} onInput={(e) => setYeniAd(e.currentTarget.value)} /></label>
        <label>Devam kaydının türü <select value={yeniTur} onChange={(e) => setYeniTur(e.currentTarget.value)}>{TURLER.map((x) => <option value={x.kod} key={x.kod}>{x.ad}</option>)}</select></label>
        <button type="button" class="dugme kucuk" disabled={!yeniAd.trim()} onClick={() => {
          const kod = yeniKod(); setYeniKayitlar((l) => [...l, { kod, ad: yeniAd.trim(), tur: yeniTur }]); guncelle({ hedefler: [...t.hedefler, kod] }); setYeniAd('');
        }}>Yeni devam kaydını seç</button>
        <p class="soluk kucuk">Dönüşüm kaydedilirken birlikte oluşturulur. Dönüşümü geri aldığınızda bu kayıt korunur.</p>
      </fieldset>
      <label>Dönüşüm tarihi <input required value={t.tarih} maxLength={200} placeholder="450 veya yaklaşık 450" onInput={(e) => guncelle({ tarih: e.currentTarget.value })} /></label>
      <label>Bağlı olay <select value={t.olay ?? ''} onChange={(e) => guncelle({ olay: e.currentTarget.value || null })}><option value="">Olay bağlantısı yok</option>{s?.kayitlar.filter((k) => k.tur === 'olay').map((k) => <option key={k.kod} value={k.kod}>{k.ad}</option>)}</select></label>
      <h3>Devredilenler</h3>
      <p class="soluk kucuk">Yalnızca eklediğiniz devirler saklanır. Hiç devir seçmeden de kaydedebilirsiniz.</p>
      {t.devirler.map((d, i) => {
        const duzelt = (v: Partial<typeof d>) => guncelle({ devirler: t.devirler.map((x, j) => i === j ? { ...x, ...v } : x) });
        return <fieldset key={i}><legend>Devir {i + 1}</legend>
          <label>Devrin önceki kaydı <select value={d.kaynak} onChange={(e) => duzelt({ kaynak: e.currentTarget.value, iliski: null })}><option value="">Seçin</option>{t.kaynaklar.map((k) => <option key={k} value={k}>{ad(k)}</option>)}</select></label>
          <label>Devrin devam kaydı <select value={d.hedef} onChange={(e) => duzelt({ hedef: e.currentTarget.value })}><option value="">Seçin</option>{t.hedefler.map((k) => <option key={k} value={k}>{ad(k)}</option>)}</select></label>
          <label>Devredilen <select value={d.tur} onChange={(e) => duzelt({ tur: e.currentTarget.value as DonusumDevirTuru, iliski: null, aciklama: '' })}>{Object.entries(DEVIRLER).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}</select></label>
          {d.tur === 'iliski' ? <label>Devredilen ilişki <select value={d.iliski ?? ''} onChange={(e) => duzelt({ iliski: e.currentTarget.value || null })}><option value="">İlişki seçin</option>{s?.iliskiler.filter((x) => x.a === d.kaynak || x.b === d.kaynak).map((x) => <option key={x.kod} value={x.kod}>{x.ad}</option>)}</select></label>
            : <label>{d.tur === 'adlandirilan' ? 'Devredilenin adı' : 'Devir açıklaması'} <input required={d.tur === 'adlandirilan'} maxLength={300} value={d.aciklama} onInput={(e) => duzelt({ aciklama: e.currentTarget.value })} /></label>}
          <button type="button" class="dugme kucuk" onClick={() => guncelle({ devirler: t.devirler.filter((_, j) => j !== i) })}>Devri kaldır</button>
        </fieldset>;
      })}
      <button type="button" class="dugme kucuk" onClick={() => guncelle({ devirler: [...t.devirler, { kaynak: t.kaynaklar[0] ?? '', hedef: t.hedefler[0] ?? '', tur: 'uyeler', aciklama: '', iliski: null }] })}>Devir ekle</button>
      <label>Dönüşüm notu <textarea value={t.not} maxLength={1000} onInput={(e) => guncelle({ not: e.currentTarget.value })} /></label>
      {hata && <p role="alert" class="hata">{hata}</p>}
      <p><button class="dugme" type="submit">Dönüşümü kaydet</button> <button class="dugme" type="button" onClick={kapat}>Vazgeç</button></p>
    </fieldset>
  </form>;
}
