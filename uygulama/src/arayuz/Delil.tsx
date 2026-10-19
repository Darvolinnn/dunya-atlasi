// F08 delil geçmişi ve soruşturma masası (§3.9): belgenin gerçek ve görünen yazarı, belge ailesi, elden ele
// geçişi ve hangi sorulara delil olduğu. Hüküm verilmez; yazarın kayıtları yan yana konur.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { DelilGecmisi, DelilTanimi, KisaKayit } from '../veri/api';
import { DELIL_AILE_TURLERI } from '../alan/delil';
import { KayitSec } from './KayitBolumleri';
import { useYukle } from './Anlati';

const hataYaz = (e: unknown) => (e as Error).message;
const aileAdi = (k: string | null) => DELIL_AILE_TURLERI.find((x) => x.kod === k)?.ad ?? 'Ana belge';
type Secim = { kod: string; ad: string };
type Elde = { kisi: Secim | null; tarih: string; nasil: string };

export function DelilBolumu({ istemci, evren, kod, saltOkunur }: { istemci: Istemci; evren: string; kod: string; saltOkunur?: boolean }) {
  const [d] = useYukle<DelilGecmisi>(istemci, evren, () => istemci.iste('delilGecmisi', { evren, kod }), [kod]);
  const [duzenle, setDuzenle] = useState(false);
  if (!d) return null;
  const bag = (k: KisaKayit) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
  return (
    <section class="surecler delil" aria-label="Delil geçmişi">
      <div class="satir"><h2>Delil geçmişi</h2><span class="bosluk" />
        {!saltOkunur && <button class="dugme sade kucuk" aria-expanded={duzenle} onClick={() => setDuzenle(!duzenle)}>{duzenle ? 'Kapat' : 'Düzenle'}</button>}</div>
      <p class="kucuk">
        Görünen yazar: {d.gorunenYazar ? bag(d.gorunenYazar) : <span class="soluk">belgenin sunumunda yazılmamış</span>} · Gerçek yazar: {d.gercekYazar ? bag(d.gercekYazar) : <span class="soluk">yazılmamış</span>}
        {d.yazarDurumu === 'farklı' && <span class="rozet uyari"> Görünen ile gerçek yazar farklı</span>}
      </p>
      {d.aile.uyeler.length > 1 && (
        <div class="kucuk"><strong>Belge ailesi</strong>
          <ul>{d.aile.uyeler.map((u) => <li key={u.kayit.kod}>{u.bu ? <strong>{u.kayit.ad}</strong> : bag(u.kayit)} <span class="soluk">· {aileAdi(u.tur)}{u.ana ? ` (${u.ana.ad})` : ''}</span></li>)}</ul>
        </div>
      )}
      {d.elde.length > 0 && (
        <div class="kucuk"><strong>Kimde</strong>
          <ol>{d.elde.map((x, i) => <li key={i}>{x.tarih ? `${x.tarih}: ` : ''}{bag(x.kisi)}{x.nasil ? <span class="soluk"> · {x.nasil}</span> : null}</li>)}</ol>
        </div>
      )}
      {d.deliller.length > 0 && (
        <div class="kucuk"><strong>Delil olduğu sorular</strong>
          <ul>{d.deliller.map((x) => (
            <li key={x.anlatim}>{bag(x.konu)}: “{x.soru}” · {x.destek ? `destekler: “${x.destek}”` : ''}{x.destek && x.itiraz.length ? '; ' : ''}{x.itiraz.length ? `itiraz eder: ${x.itiraz.map((t) => `“${t}”`).join(', ')}` : ''}
              {x.belge.kod !== d.belge.kod && <span class="soluk"> ({x.belge.ad} üzerinden)</span>}</li>
          ))}</ul>
        </div>
      )}
      {d.okuyanlar.length > 0 && <p class="kucuk">Okuyanlar: {d.okuyanlar.map((o, i) => <>{i ? ', ' : ''}{bag(o.kisi)}{o.belge.kod !== d.belge.kod ? ` (${o.belge.ad})` : ''}</>)}</p>}
      {!d.deliller.length && <p class="soluk kucuk">Bu belge henüz hiçbir sorunun dosyasında anlatım olarak geçmiyor. Delil olarak kullanmak için bir sorunun “İddia dosyası” bölümünde kaynağı bu belge olan bir anlatım ekleyin.</p>}
      {d.notlar.map((n) => <p class="soluk kucuk">{n}</p>)}
      {duzenle && <DelilFormu istemci={istemci} evren={evren} d={d} kapat={() => setDuzenle(false)} />}
    </section>
  );
}

function DelilFormu({ istemci, evren, d, kapat }: { istemci: Istemci; evren: string; d: DelilGecmisi; kapat: () => void }) {
  const [gercek, setGercek] = useState<Secim | null>(d.gercekYazar);
  const anaBelge = d.aile.uyeler.find((u) => u.bu)?.ana ?? null;
  const [ana, setAna] = useState<Secim | null>(anaBelge);
  const [aileTur, setAileTur] = useState<NonNullable<DelilTanimi['aile']>['tur']>(d.tanim.aile?.tur ?? 'kopya');
  const [elde, setElde] = useState<Elde[]>(d.elde.map((x) => ({ kisi: x.kisi, tarih: x.tarih, nasil: x.nasil })));
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => setHata(null), [d.belge.kod]);
  const kaydet = (e: Event) => {
    e.preventDefault();
    const tanim: DelilTanimi = { gercekYazar: gercek?.kod ?? null, aile: ana ? { ana: ana.kod, tur: aileTur } : null,
      elde: elde.filter((x) => x.kisi).map((x) => ({ kisi: x.kisi!.kod, tarih: x.tarih, nasil: x.nasil })) };
    istemci.iste('delilYaz', { evren, kod: d.belge.kod, tanim }).then(kapat, (x) => setHata(hataYaz(x)));
  };
  const degis = (i: number, f: (x: Elde) => Elde) => setElde(elde.map((x, j) => (j === i ? f(x) : x)));
  return (
    <form class="kart delil-formu" onSubmit={kaydet}>
      <div class="alan"><span class="alan-adi">Gerçekte kim yazdı?</span>
        <span class="satir"><KayitSec istemci={istemci} evren={evren} secili={gercek} etiket="Gerçek yazarı seç" sec={setGercek} />
          {gercek && <button type="button" class="dugme sade kucuk" aria-label="Gerçek yazarı kaldır" onClick={() => setGercek(null)}>×</button>}</span>
        <span class="soluk kucuk">Görünen yazar “Belgenin sunumu” bölümündeki yazandır.</span></div>
      <div class="alan"><span class="alan-adi">Başka bir belgenin kopyası, tercümesi ya da sansürlü sürümü mü?</span>
        <span class="satir">
          <KayitSec istemci={istemci} evren={evren} secili={ana} etiket="Ana belgeyi seç" sec={setAna} />
          {ana && <>
            <select class="girdi" aria-label="Ana belgeyle bağı" value={aileTur} onChange={(e) => setAileTur((e.target as HTMLSelectElement).value as typeof aileTur)}>
              {DELIL_AILE_TURLERI.map((x) => <option value={x.kod}>{x.ad}</option>)}
            </select>
            <button type="button" class="dugme sade kucuk" aria-label="Ana belgeyi kaldır" onClick={() => setAna(null)}>×</button>
          </>}
        </span></div>
      <div class="alan"><span class="alan-adi">Kimde? (elden ele geçiş)</span>
        {elde.map((x, i) => (
          <div class="satir" key={i}>
            <KayitSec istemci={istemci} evren={evren} secili={x.kisi} etiket="Kişi seç" sec={(s) => degis(i, (y) => ({ ...y, kisi: s }))} />
            <input class="girdi" style="width:140px" lang="tr" aria-label={`${i + 1}. el değiştirmenin tarihi`} placeholder="Tarih (ör. 431)" value={x.tarih} onInput={(e) => degis(i, (y) => ({ ...y, tarih: (e.target as HTMLInputElement).value }))} />
            <input class="girdi" style="flex:1;min-width:140px" lang="tr" maxLength={120} aria-label={`${i + 1}. el değiştirme nasıl oldu`} placeholder="Nasıl geçti? (ör. çalındı)" value={x.nasil} onInput={(e) => degis(i, (y) => ({ ...y, nasil: (e.target as HTMLInputElement).value }))} />
            <button type="button" class="dugme sade kucuk" aria-label="El değiştirmeyi çıkar" onClick={() => setElde(elde.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <button type="button" class="dugme sade kucuk" onClick={() => setElde([...elde, { kisi: null, tarih: '', nasil: '' }])}>El değiştirme ekle</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button class="dugme ana kucuk" type="submit">Kaydet</button>
        <button class="dugme sade kucuk" type="button" onClick={kapat}>Vazgeç</button>
      </div>
    </form>
  );
}
