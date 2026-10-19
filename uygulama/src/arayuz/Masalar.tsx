// Çalışma masaları (§5.9) ve varsayım paketleri (§3.11). Masa kayıtları kopyalamaz, onlara bağlanır; paket kanona
// yazılmaz. Paketle yapılan hesap, hangi paketle yapıldığını söyler.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { HaritaOzeti, IddiaOzeti, Masa, MasaOzeti, MasaUyesi, Paket, PaketOzeti, VarsayimGirdisi } from '../veri/api';
import { turBul } from '../alan/turler';
import { zamanYaz } from '../alan/islem-metni';
import { KayitSec } from './KayitBolumleri';
import type { Secim } from './BaglantiSecici';
import { DenetimBolumu } from './Inceleme';
import { git } from './Uygulama';
import { onayla } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;

export function MasalarSekmesi({ istemci, evren, alt, surum }: { istemci: Istemci; evren: string; alt: string | null; surum: number }) {
  if (alt?.startsWith('p:')) return <PaketEkrani istemci={istemci} evren={evren} kod={alt.slice(2)} surum={surum} />;
  if (alt) return <MasaEkrani istemci={istemci} evren={evren} kod={alt} surum={surum} />;
  return <MasaListesi istemci={istemci} evren={evren} surum={surum} />;
}

function YeniForm({ etiket, yerTutucu, olustur }: { etiket: string; yerTutucu: string; olustur: (ad: string) => Promise<void> }) {
  const [ad, setAd] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  return (
    <form class="satir" onSubmit={async (e) => { e.preventDefault(); try { await olustur(ad); setAd(''); setHata(null); } catch (err) { setHata(hataYaz(err)); } }}>
      <input class="girdi" style="flex:1;min-width:200px" aria-label={etiket} placeholder={yerTutucu} value={ad} lang="tr" onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
      <button class="dugme ana" type="submit" disabled={!ad.trim()}>Oluştur</button>
      {hata && <span class="hata kucuk">{hata}</span>}
    </form>
  );
}

function MasaListesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [masalar, setMasalar] = useState<MasaOzeti[] | null>(null);
  const [paketler, setPaketler] = useState<PaketOzeti[]>([]);
  useEffect(() => { istemci.iste('masalar', { evren }).then(setMasalar); istemci.iste('paketler', { evren }).then(setPaketler); }, [evren, surum]);
  if (!masalar) return null;
  return (
    <div class="masalar">
      <section aria-label="Çalışma masaları">
        <h2>Çalışma masaları</h2>
        <p class="soluk kucuk">Bir konu üzerinde çalışmak için kurduğunuz alan: şehir planı, karakterler, tarih aralığı, kaynaklar, açık sorular ve sahneler bir arada durur. Kayıtlar kopyalanmaz; masa yalnızca onlara bağlanır.</p>
        <YeniForm etiket="Yeni masanın adı" yerTutucu="Yeni masa (ör. Velkar isyanı)" olustur={async (ad) => { const { kod } = await istemci.iste('masaOlustur', { evren, ad }); git(`/e/${evren}/masalar/${kod}`); }} />
        {masalar.length === 0 && <p class="soluk">Henüz masa yok.</p>}
        <ul class="masa-listesi">
          {masalar.map((m) => (
            <li key={m.kod}>
              <a href={`#/e/${evren}/masalar/${m.kod}`}><strong>{m.ad}</strong></a>
              {m.amac && <span class="soluk"> · {m.amac}</span>}
              <div class="soluk kucuk">{m.uyeSayisi} bağlı kayıt · {zamanYaz(m.duzenleme)}</div>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Varsayım paketleri">
        <h2>Varsayım paketleri</h2>
        <p class="soluk kucuk">Birlikte geçerli sayılan varsayımlar (“köprü açık”, “haberci yola çıkmadı”). Evreni kopyalamadan küçük düşünce deneyleri yapmanızı sağlar; siz istemedikçe hiçbir varsayım evrene kaydedilmez. İki seçenekten yalnızca biri doğru olabiliyorsa onları ayrı paketlerde tutun.</p>
        <YeniForm etiket="Yeni paketin adı" yerTutucu="Yeni paket (ör. Köprü açık)" olustur={async (ad) => { const { kod } = await istemci.iste('paketOlustur', { evren, ad }); git(`/e/${evren}/masalar/p:${kod}`); }} />
        <ul class="masa-listesi">
          {paketler.map((p) => (
            <li key={p.kod}>
              <a href={`#/e/${evren}/masalar/p:${p.kod}`}><strong>{p.ad}</strong></a>
              <span class="soluk kucuk"> · {p.varsayimSayisi} varsayım</span>
              {p.aciklama && <div class="soluk kucuk">{p.aciklama}</div>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Odak dışına çıkınca kaydedilen tek satırlık ya da çok satırlı alan. */
function KayanAlan({ deger, kaydet, etiket, yerTutucu, cok = false }: { deger: string; kaydet: (v: string) => Promise<void>; etiket: string; yerTutucu?: string; cok?: boolean }) {
  const [v, setV] = useState(deger);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { setV(deger); }, [deger]);
  const bitir = async () => { if (v === deger) return; try { await kaydet(v); setHata(null); } catch (err) { setHata(hataYaz(err)); } };
  return (
    <>
      {cok
        ? <textarea class="girdi masa-notlari" aria-label={etiket} placeholder={yerTutucu} value={v} lang="tr" onInput={(e) => setV((e.target as HTMLTextAreaElement).value)} onBlur={bitir} />
        : <input class="girdi" aria-label={etiket} placeholder={yerTutucu} value={v} lang="tr" onInput={(e) => setV((e.target as HTMLInputElement).value)} onBlur={bitir}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); bitir(); } }} />}
      {hata && <span class="hata kucuk">{hata}</span>}
    </>
  );
}

function MasaEkrani({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [m, setM] = useState<Masa | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [paketler, setPaketler] = useState<PaketOzeti[]>([]);
  const [haritalar, setHaritalar] = useState<HaritaOzeti[]>([]);
  const [secim, setSecim] = useState<Secim | null>(null);
  useEffect(() => {
    istemci.iste('masa', { evren, kod }).then((x) => { setM(x); setHata(null); }, (e) => setHata(hataYaz(e)));
    istemci.iste('paketler', { evren }).then(setPaketler);
    istemci.iste('haritalar', { evren }).then(setHaritalar, () => setHaritalar([]));
  }, [evren, kod, surum]);
  if (hata) return <p class="hata">{hata} <a href={`#/e/${evren}/masalar`}>Masalara dön</a></p>;
  if (!m) return null;
  const yaz = (alan: 'ad' | 'amac' | 'notlar' | 'bas' | 'bit' | 'paket') => (v: string) => istemci.iste('masaYaz', { evren, kod, alan, deger: v || null });
  const uye = (u: MasaUyesi) => ({ tur: u.tur, kod: u.kod });
  const gruplar = [...new Set(m.uyeler.map((u) => u.grup))];
  const ekle = async (u: { tur: 'kayit' | 'harita'; kod: string }) => {
    try { await istemci.iste('masaUyeleri', { evren, kod, ekle: u }); setSecim(null); setHata(null); } catch (err) { setHata(hataYaz(err)); }
  };
  return (
    <div class="masa">
      <p><a href={`#/e/${evren}/masalar`}>← Masalar</a></p>
      <h1 class="masa-adi"><KayanAlan deger={m.ad} kaydet={yaz('ad')} etiket="Masanın adı" /></h1>
      <label class="masa-amac">
        <span class="soluk kucuk">Bu masada neyi çözmeye çalışıyorsunuz?</span>
        <KayanAlan deger={m.amac} kaydet={yaz('amac')} etiket="Bu masada neyi çözmeye çalışıyorsunuz?" yerTutucu="Örn. Kuşatmanın hangi gün kırıldığını bulmak" />
      </label>
      <div class="masa-ust">
        <label><span class="soluk kucuk">Tarih aralığının başı</span><KayanAlan deger={m.bas?.ifade ?? ''} kaydet={yaz('bas')} etiket="Tarih aralığının başı" yerTutucu="412" /></label>
        <label><span class="soluk kucuk">Sonu</span><KayanAlan deger={m.bit?.ifade ?? ''} kaydet={yaz('bit')} etiket="Tarih aralığının sonu" yerTutucu="415" /></label>
        <label>
          <span class="soluk kucuk">Varsayım paketi</span>
          <select class="girdi" aria-label="Masanın varsayım paketi" value={m.paket?.kod ?? ''} onChange={(e) => yaz('paket')((e.target as HTMLSelectElement).value)}>
            <option value="">Yok (yalnızca evrende kayıtlı olanlar)</option>
            {paketler.map((p) => <option value={p.kod}>{p.ad}</option>)}
          </select>
        </label>
      </div>
      {m.paketSilinmis && <p class="uyari kucuk">Bu masa için seçilen varsayım paketi kaldırılmış; hesaplar artık varsayım olmadan yapılıyor.</p>}
      {m.paket && <p class="soluk kucuk">Seçili paket: <a href={`#/e/${evren}/masalar/p:${m.paket.kod}`}>{m.paket.ad}</a> ({m.paket.varsayimSayisi} varsayım). Bu masadaki hesaplar bu paketle yapılır.</p>}

      <section aria-label="Masadaki kayıtlar">
        <h2>Masadaki kayıtlar</h2>
        <div class="satir">
          <KayitSec istemci={istemci} evren={evren} secili={secim} sec={(s) => { if (s) ekle({ tur: 'kayit', kod: s.kod }); }} etiket="Kayıt bağla" />
          {haritalar.length > 0 && (
            <select class="girdi" style="max-width:240px" aria-label="Harita bağla" value="" onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) ekle({ tur: 'harita', kod: v }); }}>
              <option value="">Harita bağla…</option>
              {haritalar.filter((h) => !m.uyeler.some((u) => u.tur === 'harita' && u.kod === h.kod)).map((h) => <option value={h.kod}>{h.ad}</option>)}
            </select>
          )}
        </div>
        {m.uyeler.length === 0 && <p class="soluk">Henüz bağlı kayıt yok.</p>}
        {gruplar.map((g) => (
          <div key={g} class="masa-grubu">
            <h3>{g}</h3>
            <ul class="masa-uyeleri">
              {m.uyeler.filter((u) => u.grup === g).map((u) => {
                const i = m.uyeler.indexOf(u);
                return (
                  <li key={u.tur + u.kod} class="satir">
                    <a href={u.tur === 'harita' ? `#/e/${evren}/haritalar/${u.kod}` : `#/e/${evren}/k/${u.kod}`} class={u.silindi ? 'silinmis' : ''}>{u.ad}</a>
                    {u.kayitTuru && <span class="soluk kucuk">{turBul(u.kayitTuru).ad}</span>}
                    {u.silindi && <span class="rozet">kaldırılmış</span>}
                    <span class="bosluk" />
                    <button class="dugme sade kucuk" aria-label={`${u.ad}: yukarı`} disabled={i === 0} onClick={() => istemci.iste('masaUyeleri', { evren, kod, tasi: { uye: uye(u), sira: i - 1 } })}>↑</button>
                    <button class="dugme sade kucuk" aria-label={`${u.ad}: aşağı`} disabled={i === m.uyeler.length - 1} onClick={() => istemci.iste('masaUyeleri', { evren, kod, tasi: { uye: uye(u), sira: i + 1 } })}>↓</button>
                    <button class="dugme sade kucuk" aria-label={`${u.ad}: masadan çıkar`} onClick={() => istemci.iste('masaUyeleri', { evren, kod, cikar: uye(u) })}>Çıkar</button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <p class="soluk kucuk">Masadan çıkarmak kaydı silmez.</p>
      </section>

      {(m.bas || m.bit) && (
        <section aria-label="Aralıktaki olaylar">
          <h2>Bu aralıktaki olaylar</h2>
          <p class="soluk kucuk">Masadaki kayıtlara bağlı ve tarihi {m.bas?.ifade ?? '…'} – {m.bit?.ifade ?? '…'} aralığına düşen olaylar.</p>
          {m.olaylar.length === 0 && <p class="soluk">Bu aralıkta masadaki kayıtlara bağlı tarihli olay yok.</p>}
          <ul class="masa-uyeleri">
            {m.olaylar.map((o) => (
              <li key={o.kod} class="satir">
                <a href={`#/e/${evren}/k/${o.kod}`}>{o.ad}</a>
                <span class="soluk kucuk">{o.tarih?.ifade}</span>
                {o.belirsiz && <span class="rozet" title="Tarihi aralığın sınırıyla örtüşüyor">sınırda, belirsiz</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Notlar">
        <h2>Notlar</h2>
        <KayanAlan deger={m.notlar} kaydet={yaz('notlar')} etiket="Masanın notları" yerTutucu="Bu konuyla ilgili notlar" cok />
      </section>

      <DenetimBolumu istemci={istemci} evren={evren} surum={surum} paket={m.paket?.kod ?? null} />

      <p style="margin-top:24px"><button class="dugme sade kucuk" onClick={async () => { if (!(onayla('Bu masa kaldırılsın mı?'))) return; await istemci.iste('masaSil', { evren, kod }); git(`/e/${evren}/masalar`); }}>Masayı kaldır</button>
        <span class="soluk kucuk"> Bağlı kayıtlar silinmez.</span></p>
    </div>
  );
}

function PaketEkrani({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [p, setP] = useState<Paket | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('paket', { evren, kod }).then((x) => { setP(x); setHata(null); }, (e) => setHata(hataYaz(e))); }, [evren, kod, surum]);
  if (hata && !p) return <p class="hata">{hata} <a href={`#/e/${evren}/masalar`}>Masalara dön</a></p>;
  if (!p) return null;
  const yaz = (alan: 'ad' | 'aciklama') => (v: string) => istemci.iste('paketAlanYaz', { evren, kod, alan, deger: v });
  return (
    <div class="masa">
      <p><a href={`#/e/${evren}/masalar`}>← Masalar ve paketler</a></p>
      <h1 class="masa-adi"><KayanAlan deger={p.ad} kaydet={yaz('ad')} etiket="Paketin adı" /></h1>
      <label class="masa-amac"><span class="soluk kucuk">Açıklama</span><KayanAlan deger={p.aciklama} kaydet={yaz('aciklama')} etiket="Paketin açıklaması" yerTutucu="Bu paket hangi düşünce deneyi için?" /></label>
      <p class="soluk kucuk">Varsayımlar evrene kaydedilmez; yalnızca bu paketin seçildiği masalarda ve hesaplarda geçerlidir.{p.masalar.length > 0 && <> Bu paketi seçen masalar: {p.masalar.map((m, i) => <>{i > 0 && ', '}<a href={`#/e/${evren}/masalar/${m.kod}`}>{m.ad}</a></>)}.</>}</p>
      <section aria-label="Varsayımlar">
        <h2>Varsayımlar</h2>
        {p.varsayimlar.length === 0 && <p class="soluk">Henüz varsayım yok.</p>}
        <ul class="varsayimlar">
          {p.varsayimlar.map((v) => (
            <li key={v.v.kod}>
              <div class="satir">
                <strong>{v.yazi}</strong>
                {v.kayitlar.map((k) => <a class="kucuk" href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>)}
                <span class="bosluk" />
                {v.evreneYazilabilir && <button class="dugme kucuk" onClick={() => istemci.iste('varsayimiEvreneYaz', { evren, paket: kod, kod: v.v.kod }).catch((e) => setHata(hataYaz(e)))}>Evrene yaz</button>}
                <button class="dugme sade kucuk" aria-label={`“${v.yazi}” varsayımını çıkar`} onClick={() => onayla('Bu varsayım paketten çıkarılsın mı?') && istemci.iste('varsayimCikar', { evren, paket: kod, kod: v.v.kod })}>Çıkar</button>
              </div>
              <div class="soluk kucuk">{v.evrendeki && <>{v.evrendeki} · </>}Kullanan: {v.kullanan}</div>
            </li>
          ))}
        </ul>
        {hata && <p class="hata kucuk">{hata}</p>}
        <VarsayimFormu istemci={istemci} evren={evren} paket={kod} />
      </section>
      <DenetimBolumu istemci={istemci} evren={evren} surum={surum} paket={kod} />
      <p style="margin-top:24px"><button class="dugme sade kucuk" onClick={async () => { if (!(onayla('Bu paket kaldırılsın mı?'))) return; await istemci.iste('paketSil', { evren, kod }); git(`/e/${evren}/masalar`); }}>Paketi kaldır</button></p>
    </div>
  );
}

function VarsayimFormu({ istemci, evren, paket }: { istemci: Istemci; evren: string; paket: string }) {
  const [tur, setTur] = useState<VarsayimGirdisi['tur']>('olay');
  const [kayit, setKayit] = useState<Secim | null>(null);
  const [deger, setDeger] = useState(true);
  const [metin, setMetin] = useState('');
  const [iddia, setIddia] = useState('');
  const [iddialar, setIddialar] = useState<IddiaOzeti[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { if (tur === 'bilgi') istemci.iste('iddialar', { evren }).then(setIddialar); }, [tur]);
  const DEGER: Record<string, [string, string]> = { olay: ['gerçekleşti', 'gerçekleşmedi'], rota: ['açık', 'kapalı'], bilgi: ['biliyor', 'bilmiyor'] };
  const gonder = async (e: Event) => {
    e.preventDefault();
    let v: VarsayimGirdisi;
    if (tur === 'metin') v = { tur, metin };
    else if (!kayit) return;
    else if (tur === 'olay') v = { tur, olay: kayit.kod, deger };
    else if (tur === 'rota') v = { tur, rota: kayit.kod, deger };
    else v = { tur: 'bilgi', bilen: kayit.kod, iddia, deger };
    try { await istemci.iste('varsayimEkle', { evren, paket, varsayim: v }); setKayit(null); setMetin(''); setHata(null); } catch (err) { setHata(hataYaz(err)); }
  };
  return (
    <form class="kart varsayim-formu" onSubmit={gonder}>
      <div class="satir">
        <select class="girdi" style="max-width:220px" aria-label="Varsayımın türü" value={tur} onChange={(e) => { setTur((e.target as HTMLSelectElement).value as VarsayimGirdisi['tur']); setKayit(null); }}>
          <option value="olay">Bir olay gerçekleşti / gerçekleşmedi</option>
          <option value="rota">Bir rota açık / kapalı</option>
          <option value="bilgi">Biri bir şeyi biliyor / bilmiyor</option>
          <option value="metin">Serbest not</option>
        </select>
        {tur === 'metin'
          ? <input class="girdi" style="flex:1;min-width:200px" aria-label="Varsayım" placeholder="Köprü açık" value={metin} lang="tr" onInput={(e) => setMetin((e.target as HTMLInputElement).value)} />
          : <KayitSec istemci={istemci} evren={evren} secili={kayit} sec={setKayit} etiket={tur === 'olay' ? 'Olay seç' : tur === 'rota' ? 'Rota seç' : 'Bilen seç'} />}
        {tur === 'bilgi' && (
          <select class="girdi" style="max-width:260px" aria-label="Hangi iddia" value={iddia} onChange={(e) => setIddia((e.target as HTMLSelectElement).value)}>
            <option value="">İddia seç…</option>
            {iddialar.map((i) => <option value={i.kod}>{i.konu.ad}: {i.soru}</option>)}
          </select>
        )}
        {tur !== 'metin' && (
          <select class="girdi" style="max-width:160px" aria-label="Varsayılan" value={deger ? '1' : '0'} onChange={(e) => setDeger((e.target as HTMLSelectElement).value === '1')}>
            <option value="1">{DEGER[tur][0]}</option>
            <option value="0">{DEGER[tur][1]}</option>
          </select>
        )}
        <button class="dugme ana" type="submit" disabled={tur === 'metin' ? !metin.trim() : !kayit || (tur === 'bilgi' && !iddia)}>Varsayım ekle</button>
      </div>
      {tur === 'metin' && <p class="soluk kucuk">Serbest not hesaplarda kullanılmaz; program yazılan metinden anlam çıkarmaz.</p>}
      {hata && <p class="hata kucuk">{hata}</p>}
    </form>
  );
}

/** Kayıt sayfasında: kaydın bağlı olduğu çalışma masaları. */
export function KayitMasalari({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [l, setL] = useState<{ kod: string; ad: string }[]>([]);
  useEffect(() => { istemci.iste('kayitMasalari', { evren, kod }).then(setL); }, [kod, surum]);
  if (!l.length) return null;
  return <p class="soluk kucuk">Çalışma masaları: {l.map((m, i) => <>{i > 0 && ', '}<a href={`#/e/${evren}/masalar/${m.kod}`}>{m.ad}</a></>)}</p>;
}
