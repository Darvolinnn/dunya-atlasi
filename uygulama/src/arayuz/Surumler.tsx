// Adlandırılmış evren sürümleri ve iki hâl arasındaki fark (§9.7).
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AktarimBirimi, DalFarki, EvrenBilgisi, EvrenDali, EvrenFarki, EvrenSurumu } from '../veri/api';
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
        ? <>“{bag.evrenAdi}” evreninin <strong>“{bag.ad}”</strong> sürümüne bakıyorsunuz. Bu sürüm sabittir; burada değişiklik yapılamaz.</>
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
      <p class="soluk kucuk">Evrenin bugünkü hâlini bir adla saklar (“Birinci kitabın yayımlanan hâli”). Yeni fikirler üzerinde çalışırken o eserin dayandığı bilgi bozulmaz; sürümü her zaman salt okunur açıp bugünle karşılaştırabilirsiniz.</p>
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
                <button class="dugme sade kucuk" onClick={() => { if (confirm(`“${s.ad}” sürümü listeden kaldırılsın mı? Evrene dokunulmaz.`)) istemci.iste('surumSil', { evren, kod: s.kod }).catch((e) => setHata(hataYaz(e))); }}>Kaldır</button>
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
      <p class="soluk kucuk">Radikal bir değişikliği denemek için evrenin bir dalı açılır (“kral yaşasaydı”). Dalda ne yaparsanız ana evren değişmez; beğendiğiniz değişiklikleri kayıt kayıt seçip ana evrene taşırsınız. Küçük düşünce deneyleri için çalışma masalarındaki varsayım paketleri yeterlidir. Deneme kopyasındaki değişiklikler yalnızca bu cihazda tutulur; Drive ile eşitlenmez.</p>
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
                <button class="dugme sade kucuk" onClick={() => { if (confirm(`“${d.ad}” deneme kopyası listeden kaldırılsın mı? Ana evrene dokunulmaz.`)) istemci.iste('dalSil', { evren, kod: d.kod }).catch((e) => setHata(hataYaz(e))); }}>Kaldır</button>
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
    if (!confirm(`${birimler.size} birim ana evrene taşınsın mı? Ana evrende yeni değişiklikler olarak yazılır; geçmişten geri alınabilir.`)) return;
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
      {b.celisen.length > 0 && !b.ayni && <p class="kucuk uyari-yazisi">Dal açıldıktan sonra ana evrende de değişti: {b.celisen.join(', ')}. Taşırsanız dalın değeri yazılır.</p>}
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
      {!f.birimler.length ? <p class="soluk kucuk">Dalda henüz bir değişiklik yapılmamış.</p> : (
        <>
          <h3>Dalda değişenler</h3>
          <ul class="fark-listesi">{f.birimler.map(birim)}</ul>
          {gereken.size > 0 && (
            <div class="aktarim-gerekenler">
              <h3>Seçilenlerin gerektirdiği kayıtlar</h3>
              <ul class="kucuk">
                {[...gereken.values()].map((g) => {
                  const k = karar(g.kod);
                  return (
                    <li key={g.kod} class="satir">
                      <span>{g.ad} <span class="soluk">({g.neden === 'dalda_yeni' ? 'yalnızca dalda var' : 'ana evrende silinmiş'})</span></span>
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
        <summary class="kucuk">Dal açıldıktan sonra ana evrende değişenler ({f.anada.kayitlar.length + f.anada.iliskiler.length})</summary>
        <FarkGorunumu evren={evren} f={f.anada} once="dalın açıldığı an" sonra="ana evren bugün" />
      </details>
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}
