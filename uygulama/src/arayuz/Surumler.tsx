// Adlandırılmış evren sürümleri ve iki hâl arasındaki fark (§9.7).
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AktarimBirimi, DalFarki, EvrenBilgisi, EvrenDali, EvrenFarki, EvrenSurumu, Yayim, YayimCelismesi } from '../veri/api';
import { zamanYaz } from '../alan/islem-metni';
import { turBul } from '../alan/turler';
import { git } from './Uygulama';
import { KayitSec } from './KayitBolumleri';
import type { Secim } from './BaglantiSecici';

const hataYaz = (e: unknown) => (e as Error).message;

/** Sabit sürümde ya da deneme kopyasında olunduğunu her sayfada söyleyen şerit. */
export function BagSeridi({ bag }: { bag: EvrenBilgisi['bag'] }) {
  if (!bag) return null;
  return (
    <div class={`bag-seridi ${bag.tur}`} role="note">
      {bag.tur === 'surum'
        ? <>“{bag.evrenAdi}” evreninin <strong>“{bag.ad}”</strong> sürümüne bakıyorsunuz. Bu sürüm sabittir, burada değişiklik yapılamaz.</>
        : <>“{bag.evrenAdi}” evreninin <strong>“{bag.ad}”</strong> deneme kopyasındasınız. Buradaki değişiklikler ana evreni etkilemez.</>}
      {' '}<a href={`#/e/${bag.evren}/surumler`}>Ana evrene dön</a>
    </div>
  );
}

export function SurumlerSekmesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [liste, setListe] = useState<EvrenSurumu[] | null>(null);
  const [ad, setAd] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [fark, setFark] = useState<{ kod: string; f: EvrenFarki } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('surumler', { evren }).then(setListe, (e) => setHata(hataYaz(e))); }, [evren, surum]);
  const karsilastir = (kod: string) => istemci.iste('surumFarki', { evren, surum: kod }).then((f) => { setFark({ kod, f }); setHata(null); }, (e) => setHata(hataYaz(e)));
  return (
    <section aria-label="Sürümler">
      <h2>Adlandırılmış sürümler</h2>
      <p class="soluk kucuk">Evrenin bugünkü hâlini bir adla saklayın (“Birinci kitabın yayımlanan hâli”). Böylece yeni fikirler üzerinde çalışırken o eserin dayandığı bilgi bozulmaz. Sürümü istediğiniz zaman değiştirmeden açabilir, bugünkü hâliyle karşılaştırabilirsiniz.</p>
      <form class="satir" onSubmit={(e) => {
        e.preventDefault();
        istemci.iste('surumOlustur', { evren, ad, aciklama }).then(() => { setAd(''); setAciklama(''); setHata(null); }, (x) => setHata(hataYaz(x)));
      }}>
        <input class="girdi" lang="tr" aria-label="Sürümün adı" placeholder="Birinci kitabın yayımlanan hâli" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
        <input class="girdi" style="flex:1;min-width:200px" lang="tr" aria-label="Sürümün açıklaması" placeholder="Açıklama (isteğe bağlı)" value={aciklama} onInput={(e) => setAciklama((e.target as HTMLInputElement).value)} />
        <button class="dugme ana kucuk" type="submit" disabled={!ad.trim()}>Bu hâli adlandır</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
      {liste && !liste.length && <p class="soluk kucuk">Henüz adlandırılmış sürüm yok.</p>}
      {liste && liste.length > 0 && (
        <ul class="surum-listesi">
          {liste.map((s) => (
            <li key={s.kod}>
              <div class="satir">
                <strong>{s.ad}</strong>
                <span class="soluk kucuk">{zamanYaz(s.olusturma)} · {s.islemSayisi} değişiklik</span>
                <span class="bosluk" />
                <a class="dugme kucuk" href={`#/e/${s.kod}/masa`}>Aç</a>
                <button class="dugme kucuk" onClick={() => (fark?.kod === s.kod ? setFark(null) : karsilastir(s.kod))}>{fark?.kod === s.kod ? 'Farkı kapat' : 'Bugünle karşılaştır'}</button>
                <button class="dugme sade kucuk" onClick={() => { if (confirm(`“${s.ad}” sürümü listeden kaldırılsın mı? Evrenin kendisi değişmez.`)) istemci.iste('surumSil', { evren, kod: s.kod }).catch((e) => setHata(hataYaz(e))); }}>Kaldır</button>
              </div>
              {s.aciklama && <div class="soluk kucuk">{s.aciklama}</div>}
              {fark?.kod === s.kod && <FarkGorunumu evren={evren} f={fark.f} once={`“${s.ad}”`} sonra="bugün" />}
            </li>
          ))}
        </ul>
      )}
      <DallarBolumu istemci={istemci} evren={evren} surum={surum} />
    </section>
  );
}

const DURUM = { yeni: 'Yeni', silindi: 'Silinmiş', degisti: 'Değişmiş' } as const;

/** Kayıt ve ilişki farkları; yalnızca olanlar, olanlar ayrı renklerle. */
export function FarkGorunumu({ evren, f, once, sonra }: { evren: string; f: EvrenFarki; once: string; sonra: string }) {
  if (!f.kayitlar.length && !f.iliskiler.length) return <p class="soluk kucuk">{once} ile {sonra} arasında kayıtlarda ve ilişkilerde fark yok.</p>;
  return (
    <div class="fark">
      <p class="soluk kucuk">{once} → {sonra}: {f.kayitlar.length} kayıt, {f.iliskiler.length} ilişki farklı.</p>
      {f.kayitlar.length > 0 && (
        <ul class="fark-listesi">
          {f.kayitlar.map((k) => (
            <li key={k.kod} class={`fark-${k.durum}`}>
              <span class="rozet">{DURUM[k.durum]}</span> <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a> <span class="soluk kucuk">{turBul(k.tur).ad}</span>
              {k.alanlar.length > 0 && (
                <ul class="kucuk">{k.alanlar.map((a) => (
                  <li>{a.etiket}: {a.once === null ? <span class="soluk">yok</span> : <del>{a.once}</del>} → {a.sonra === null ? <span class="soluk">yok</span> : <ins>{a.sonra}</ins>}</li>
                ))}</ul>
              )}
            </li>
          ))}
        </ul>
      )}
      {f.iliskiler.length > 0 && (
        <>
          <h3>İlişkiler</h3>
          <ul class="fark-listesi">
            {f.iliskiler.map((i) => (
              <li key={i.kod} class={`fark-${i.durum}`}>
                <span class="rozet">{DURUM[i.durum]}</span> {i.a.ad} · {i.tur}: {i.b.ad}
                {i.ayrinti.length > 0 && <span class="soluk kucuk"> ({i.ayrinti.join('; ')})</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------- Deneme kopyaları ----------
function DallarBolumu({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [liste, setListe] = useState<EvrenDali[] | null>(null);
  const [ad, setAd] = useState('');
  const [acik, setAcik] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('dallar', { evren }).then(setListe, (e) => setHata(hataYaz(e))); }, [evren, surum]);
  return (
    <>
      <h2>Deneme kopyaları</h2>
      <p class="soluk kucuk">Köklü bir değişikliği denemek için evrenin bir deneme kopyasını açın (“Kral yaşasaydı”). Deneme kopyasında ne yaparsanız yapın ana evren değişmez. Beğendiğiniz değişiklikleri kayıt kayıt seçip ana evrene taşıyabilirsiniz. Küçük düşünce deneyleri için konu dosyalarındaki varsayım paketleri yeterlidir. Deneme kopyasındaki değişiklikler yalnızca bu cihazda tutulur, Drive ile eşitlenmez.</p>
      <form class="satir" onSubmit={(e) => {
        e.preventDefault();
        istemci.iste('dalOlustur', { evren, ad }).then((x) => { setAd(''); setHata(null); git(`/e/${x.kod}/masa`); }, (x) => setHata(hataYaz(x)));
      }}>
        <input class="girdi" lang="tr" aria-label="Deneme kopyasının adı" placeholder="Kral yaşasaydı" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
        <button class="dugme kucuk" type="submit" disabled={!ad.trim()}>Deneme kopyası aç</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
      {liste && !liste.length && <p class="soluk kucuk">Henüz deneme kopyası yok.</p>}
      {liste && liste.length > 0 && (
        <ul class="surum-listesi">
          {liste.map((d) => (
            <li key={d.kod}>
              <div class="satir">
                <strong>{d.ad}</strong>
                <span class="soluk kucuk">{zamanYaz(d.olusturma)} tarihinde açıldı</span>
                <span class="bosluk" />
                <a class="dugme kucuk" href={`#/e/${d.kod}/masa`}>Aç</a>
                <button class="dugme kucuk" onClick={() => setAcik(acik === d.kod ? null : d.kod)}>{acik === d.kod ? 'Kapat' : 'Karşılaştır ve taşı'}</button>
                <button class="dugme sade kucuk" onClick={() => { if (confirm(`“${d.ad}” deneme kopyası listeden kaldırılsın mı? Ana evren değişmez.`)) istemci.iste('dalSil', { evren, kod: d.kod }).catch((e) => setHata(hataYaz(e))); }}>Kaldır</button>
              </div>
              {acik === d.kod && <AktarimEkrani istemci={istemci} evren={evren} dal={d} surum={surum} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type Karar = { tur: 'al' } | { tur: 'esle'; hedef: Secim | null } | { tur: 'acik' };

function AktarimEkrani({ istemci, evren, dal, surum }: { istemci: Istemci; evren: string; dal: EvrenDali; surum: number }) {
  const [f, setF] = useState<DalFarki | null>(null);
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [kararlar, setKararlar] = useState<Record<string, Karar>>({});
  const [sonuc, setSonuc] = useState<{ aktarilan: number; birakilan: string[] } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('dalFarki', { evren, dal: dal.kod }).then(setF, (e) => setHata(hataYaz(e))); }, [dal.kod, surum]);
  if (!f) return hata ? <p class="hata kucuk">{hata}</p> : <p class="soluk kucuk">Karşılaştırılıyor…</p>;
  const birimVar = (kod: string) => f.birimler.some((b) => b.anahtar === `kayit:${kod}` && !b.ayni);
  const karar = (kod: string): Karar => kararlar[kod] ?? (birimVar(kod) ? { tur: 'al' } : { tur: 'acik' });
  const secilenler = f.birimler.filter((b) => secili.has(b.anahtar));
  const gereken = new Map(secilenler.flatMap((b) => b.gerekenler).map((g) => [g.kod, g]));
  const tasi = () => {
    const birimler = new Set(secili);
    const eslemeler: Record<string, string> = {};
    for (const [kod] of gereken) {
      const k = karar(kod);
      if (k.tur === 'al' && birimVar(kod)) birimler.add(`kayit:${kod}`);
      else if (k.tur === 'esle' && k.hedef) eslemeler[kod] = k.hedef.kod;
      else eslemeler[kod] = 'acik';
    }
    if (!confirm(`Seçilen ${birimler.size} öğe ana evrene taşınsın mı? Bunlar ana evrende yeni değişiklikler olarak yazılır ve geçmişten geri alınabilir.`)) return;
    istemci.iste('dalAktar', { evren, dal: dal.kod, birimler: [...birimler], eslemeler })
      .then((r) => { setSonuc(r); setSecili(new Set()); setHata(null); istemci.iste('dalFarki', { evren, dal: dal.kod }).then(setF); }, (e) => setHata(hataYaz(e)));
  };
  const birim = (b: AktarimBirimi) => (
    <li key={b.anahtar} class={`fark-${b.durum}${b.ayni ? ' aktarildi' : ''}`}>
      <label class="satir">
        <input type="checkbox" disabled={b.ayni} checked={secili.has(b.anahtar)} onChange={(e) => {
          const s = new Set(secili); if ((e.target as HTMLInputElement).checked) s.add(b.anahtar); else s.delete(b.anahtar); setSecili(s);
        }} />
        <span class="rozet">{DURUM[b.durum]}</span>
        {b.tur === 'kayit' ? <a href={`#/e/${dal.kod}/k/${b.anahtar.slice(6)}`}>{b.baslik}</a> : <span>{b.baslik}</span>}
        {b.kayitTuru && <span class="soluk kucuk">{turBul(b.kayitTuru).ad}</span>}
        {b.ayni && <span class="soluk kucuk">· ana evrende aynı</span>}
      </label>
      {b.ozet.length > 0 && <ul class="kucuk">{b.ozet.map((x) => <li>{x}</li>)}</ul>}
      {b.celisen.length > 0 && !b.ayni && <p class="kucuk uyari-yazisi">Deneme kopyası açıldıktan sonra ana evrende de değişti: {b.celisen.join(', ')}. Taşırsanız deneme kopyasındaki değer yazılır.</p>}
    </li>
  );
  return (
    <div class="aktarim">
      {sonuc && (
        <div class="kucuk">
          <p>{sonuc.aktarilan ? `${sonuc.aktarilan} değişiklik ana evrene yazıldı.` : 'Ana evrene bir şey yazılmadı.'}</p>
          {sonuc.birakilan.length > 0 && <ul class="uyari-yazisi">{sonuc.birakilan.map((x) => <li>{x}</li>)}</ul>}
        </div>
      )}
      {!f.birimler.length ? <p class="soluk kucuk">Deneme kopyasında henüz bir değişiklik yapılmamış.</p> : (
        <>
          <h3>Deneme kopyasında değişenler</h3>
          <ul class="fark-listesi">{f.birimler.map(birim)}</ul>
          {gereken.size > 0 && (
            <div class="aktarim-gerekenler">
              <h3>Seçilenlerin gerektirdiği kayıtlar</h3>
              <ul class="kucuk">
                {[...gereken.values()].map((g) => {
                  const k = karar(g.kod);
                  return (
                    <li key={g.kod} class="satir">
                      <span>{g.ad} <span class="soluk">({g.neden === 'dalda_yeni' ? 'yalnızca deneme kopyasında var' : 'ana evrende silinmiş'})</span></span>
                      <select class="girdi kucuk-secim" aria-label={`${g.ad} için ne yapılsın`} value={k.tur} onChange={(e) => {
                        const v = (e.target as HTMLSelectElement).value as Karar['tur'];
                        setKararlar({ ...kararlar, [g.kod]: v === 'esle' ? { tur: 'esle', hedef: null } : { tur: v } as Karar });
                      }}>
                        {birimVar(g.kod) && <option value="al">Birlikte taşı</option>}
                        <option value="esle">Ana evrendeki bir kayda eşle</option>
                        <option value="acik">Açık bırak (bağlı değişiklik taşınmaz)</option>
                      </select>
                      {k.tur === 'esle' && <KayitSec istemci={istemci} evren={evren} secili={k.hedef} sec={(s) => setKararlar({ ...kararlar, [g.kod]: { tur: 'esle', hedef: s } })} etiket="Ana evrende seç" />}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div class="satir">
            <button class="dugme ana kucuk" disabled={!secili.size} onClick={tasi}>Seçilenleri ana evrene taşı ({secili.size})</button>
            <button class="dugme sade kucuk" onClick={() => setSecili(new Set(f.birimler.filter((b) => !b.ayni).map((b) => b.anahtar)))}>Hepsini seç</button>
          </div>
        </>
      )}
      <details>
        <summary class="kucuk">Deneme kopyası açıldıktan sonra ana evrende değişenler ({f.anada.kayitlar.length + f.anada.iliskiler.length})</summary>
        <FarkGorunumu evren={evren} f={f.anada} once="deneme kopyasının açıldığı an" sonra="ana evren bugün" />
      </details>
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}

// ---------- Yayımlanmış eser kilidi (F18) ----------
const YAYIM_KARARLARI = [
  { kod: 'gecmisi_duzelt', ad: 'Geçmişi düzelt', aciklama: 'Evrende doğrusu bu, eser bu konuda eskide kaldı.' },
  { kod: 'yeni_olay', ad: 'Yeni olay', aciklama: 'Eserden sonra olan bir şey. Tarihini eserin sonrasına koyun.' },
  { kod: 'alternatif', ad: 'Alternatif devamlılık', aciklama: 'Başka bir devamlılığa ait. Ana çizgi eserdeki gibi kalır.' },
  { kod: 'baski', ad: 'Baskı düzeltmesi', aciklama: 'Eser sonraki baskıda düzeltilecek.' },
];

function YayimCelismeleri({ istemci, evren, yayim, surum }: { istemci: Istemci; evren: string; yayim: Yayim; surum: number }) {
  const [liste, setListe] = useState<YayimCelismesi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('yayimCelismeleri', { evren, yayim: yayim.kod }).then(setListe, (e) => setHata(hataYaz(e))); }, [yayim.kod, surum]);
  if (!liste) return hata ? <p class="hata kucuk">{hata}</p> : null;
  if (!liste.length) return <p class="soluk kucuk">Eserin okura sunduğu bilgiyle çelişebilecek bir değişiklik yok.</p>;
  return (
    <>
      <ul class="fark-listesi">
        {liste.map((c) => (
          <li key={c.anahtar} class={c.karar ? 'aktarildi' : 'fark-degisti'}>
            <a href={`#/e/${evren}/k/${c.kayit.kod}`}>{c.kayit.ad}</a> · {c.baslik}: {c.once === null ? <span class="soluk">yoktu</span> : <del>{c.once}</del>} → {c.sonra === null ? <span class="soluk">yok</span> : <ins>{c.sonra}</ins>}
            <div class="satir">
              <select class="girdi kucuk-secim" aria-label={`${c.kayit.ad} ${c.baslik} için karar`} value={c.karar ?? ''}
                onChange={(e) => { const v = (e.target as HTMLSelectElement).value; istemci.iste('yayimKarari', { evren, yayim: yayim.kod, anahtar: c.anahtar, karar: v || null }).catch((x) => setHata(hataYaz(x))); }}>
                <option value="">Karar verilmedi</option>
                {YAYIM_KARARLARI.map((k) => <option value={k.kod}>{k.ad}</option>)}
              </select>
              {c.karar && <span class="soluk kucuk">{YAYIM_KARARLARI.find((k) => k.kod === c.karar)?.aciklama}</span>}
            </div>
          </li>
        ))}
      </ul>
      {hata && <p class="hata kucuk">{hata}</p>}
    </>
  );
}

/** Eser sayfasında: yayımla, yayımlar ve çelişmeler. */
export function YayimBolumu({ istemci, evren, kod, surum, saltOkunur }: { istemci: Istemci; evren: string; kod: string; surum: number; saltOkunur: boolean }) {
  const [liste, setListe] = useState<Yayim[] | null>(null);
  const [baski, setBaski] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { if (!saltOkunur) istemci.iste('yayimlar', { evren, eser: kod }).then(setListe, () => {}); }, [kod, surum, saltOkunur]);
  if (saltOkunur || !liste) return null;
  return (
    <section class="surecler" aria-label="Yayımlar">
      <h2>Yayımlar</h2>
      <p class="soluk kucuk">Yayımlanan eserin dayandığı bilgi adlandırılmış bir sürüm olarak saklanır. Eserin okura sunduğu bir bilgi sonradan değişirse program bunu engellemez, size sorar. Eserin zamanından sonra başlayan değişiklikler ve kesinleşmemiş bilgiler için soru sorulmaz.</p>
      <form class="satir" onSubmit={(e) => { e.preventDefault(); istemci.iste('yayimla', { evren, eser: kod, baski }).then(() => { setBaski(''); setHata(null); }, (x) => setHata(hataYaz(x))); }}>
        <input class="girdi" lang="tr" aria-label="Baskının adı" placeholder="1. baskı" value={baski} onInput={(e) => setBaski((e.target as HTMLInputElement).value)} />
        <button class="dugme kucuk" type="submit" disabled={!baski.trim()}>Yayımlandı olarak işaretle</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
      {liste.map((y) => (
        <div key={y.kod} class="yayim">
          <div class="satir">
            <strong>{y.baski}</strong> <span class="soluk kucuk">{zamanYaz(y.olusturma)} · {y.acik ? `${y.acik} soru bekliyor` : 'soru yok'}</span>
            <span class="bosluk" />
            <a class="dugme kucuk" href={`#/e/${y.surum.kod}/k/${kod}`}>Yayımlanan hâli aç</a>
            <button class="dugme sade kucuk" onClick={() => { if (confirm(`“${y.baski}” yayımı kaldırılsın mı? Saklanan sürüm silinmez.`)) istemci.iste('yayimSil', { evren, kod: y.kod }).catch((e) => setHata(hataYaz(e))); }}>Kaldır</button>
          </div>
          <YayimCelismeleri istemci={istemci} evren={evren} yayim={y} surum={surum} />
        </div>
      ))}
    </section>
  );
}

/** İnceleme kuyruğunda: yanıt bekleyen yayım çelişmeleri. */
export function YayimIncelemesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [liste, setListe] = useState<Yayim[] | null>(null);
  useEffect(() => { istemci.iste('yayimlar', { evren }).then(setListe, () => setListe([])); }, [evren, surum]);
  if (!liste || !liste.some((y) => y.acik)) return null;
  return (
    <section aria-label="Yayımlanmış eserle çelişebilecek değişiklikler">
      <h2>Yayımlanmış eserle çelişebilecek değişiklikler</h2>
      {liste.filter((y) => y.acik).map((y) => (
        <div key={y.kod} class="yayim">
          <h3><a href={`#/e/${evren}/k/${y.eser.kod}`}>{y.eser.ad}</a> · {y.baski}</h3>
          <YayimCelismeleri istemci={istemci} evren={evren} yayim={y} surum={surum} />
        </div>
      ))}
    </section>
  );
}
