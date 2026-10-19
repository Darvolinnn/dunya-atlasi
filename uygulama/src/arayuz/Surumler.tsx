// Adlandırılmış evren sürümleri ve iki hâl arasındaki fark (§9.7).
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EvrenBilgisi, EvrenFarki, EvrenSurumu } from '../veri/api';
import { zamanYaz } from '../alan/islem-metni';
import { turBul } from '../alan/turler';

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

export function SurumlerSekmesi({ istemci, evren, surum, ekler }: { istemci: Istemci; evren: string; surum: number; ekler?: preact.ComponentChildren }) {
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
      {ekler}
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
