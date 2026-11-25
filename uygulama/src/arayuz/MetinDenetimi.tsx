// Metin denetimi (K44, §5.12): eserin ya da bölümün metninde kurala dayalı üç tarama. Program anlam çıkarmaz (K1);
// bulgular öneridir, metne dokunulmaz. Gruplar katlı gelir ki uzun liste sayfayı aşağı itmesin.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EserYapisi, KisaKayit, MetinBulgusu, MetinDenetimiSonucu } from '../veri/api';

const GRUPLAR: [MetinBulgusu['tur'], string, string][] = [
  ['ek', 'Özel adların ekleri', 'Kayıtlı adlara kesmeyle gelen ekler, adın okunuşuna göre. Okunuş girilmemiş ve yazımdan kestirilemiyorsa yalnız aynı ekin farklı yazılışları gösterilir.'],
  ['dizgi', 'Dizgi', 'Çift boşluk, noktalamadan önce boşluk, kapanmamış tırnak, ara sözde kısa çizgi; metin boyunca karışık kullanılan konuşma çizgisi, tırnak ve üç nokta.'],
  ['tekrar', 'Yakın tekrar', 'Aynı harflerle başlayan sözcükler (ansızın, bakışı, bakışları) kısa bir aralıkta üç ya da daha çok kez. Kayıt adları ve sık sözcükler sayılmaz.'],
];
const PENCERELER = [50, 100, 200];
const sayiYaz = (n: number) => n.toLocaleString('tr-TR');

export function MetinDenetimiSekmesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [eserler, setEserler] = useState<KisaKayit[] | null>(null);
  const [eser, setEser] = useState('');
  const [yapi, setYapi] = useState<EserYapisi | null>(null);
  const [bolum, setBolum] = useState('');
  const [pencere, setPencere] = useState(100);
  const [sonuc, setSonuc] = useState<{ veri: MetinDenetimiSonucu; surum: number; kapsam: string } | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');
  useEffect(() => {
    istemci.iste('eserler', { evren }).then((l) => { setEserler(l); setEser((s) => (s && l.some((x) => x.kod === s) ? s : l[0]?.kod ?? '')); }, () => setEserler([]));
  }, [evren, surum]);
  useEffect(() => { setBolum(''); setYapi(null); if (eser) istemci.iste('eserYapisi', { evren, eser }).then(setYapi, () => {}); }, [evren, eser]);
  const kapsam = bolum || eser;
  const denetle = async () => {
    setMesgul(true); setHata('');
    try { setSonuc({ veri: await istemci.iste('metinDenetimi', { evren, kapsam, pencere }), surum, kapsam }); }
    catch (x) { setHata((x as Error).message); setSonuc(null); }
    finally { setMesgul(false); }
  };

  if (eserler && !eserler.length) return <p class="soluk">Denetlenecek bir eser yok. Önce Yaz sayfasında bir eser ve sahne yazın.</p>;
  const v = sonuc?.veri;
  return (
    <section class="metin-denetimi" aria-label="Metin denetimi">
      <p class="soluk">Program yalnız harflere, işaretlere ve kayıtlı adlarınıza bakar; cümlenin anlamını çıkarmaz. Her bulgu bir öneridir, metne dokunulmaz.</p>
      <div class="satir denetim-secimi">
        <label class="kucuk">Eser{' '}
          <select class="girdi" value={eser} onChange={(e) => { setEser(e.currentTarget.value); setSonuc(null); }}>
            {(eserler ?? []).map((x) => <option key={x.kod} value={x.kod}>{x.ad}</option>)}
          </select>
        </label>
        {!!yapi?.bolumler.length && (
          <label class="kucuk">Bölüm{' '}
            <select class="girdi" value={bolum} onChange={(e) => { setBolum(e.currentTarget.value); setSonuc(null); }}>
              <option value="">Bütün eser</option>
              {yapi.bolumler.map((b) => <option key={b.kod} value={b.kod}>{b.ad}</option>)}
            </select>
          </label>
        )}
        <label class="kucuk">Tekrar aralığı{' '}
          <select class="girdi" value={pencere} onChange={(e) => { setPencere(Number(e.currentTarget.value)); setSonuc(null); }}>
            {PENCERELER.map((p) => <option key={p} value={p}>{p} kelime</option>)}
          </select>
        </label>
        <button class="dugme ana" disabled={!kapsam || mesgul} onClick={denetle}>{mesgul ? 'Denetleniyor…' : 'Denetle'}</button>
      </div>
      {hata && <p class="hata" role="alert">{hata}</p>}
      {v && (
        <>
          <p class="kucuk" role="status">
            {sayiYaz(v.sahne)} sahne, {sayiYaz(v.kelime)} kelime tarandı · {v.bulgular.length ? `${sayiYaz(v.bulgular.length)} bulgu` : 'bulgu yok'}
            {v.kesildi && ' (ilk 1.500 bulgu gösteriliyor)'}
            {sonuc.surum !== surum && <span class="soluk"> · metin değişti, yeniden denetleyin</span>}
          </p>
          {GRUPLAR.map(([tur, ad, aciklama]) => {
            const l = v.bulgular.filter((b) => b.tur === tur);
            return (
              <details key={`${sonuc.kapsam}-${tur}`} class="katlanir denetim-grubu">
                <summary><strong>{ad}</strong> <span class="soluk kucuk">· {l.length ? sayiYaz(l.length) : 'yok'}</span></summary>
                <p class="soluk kucuk">{aciklama}</p>
                {l.length > 0 && <BulguListesi evren={evren} l={l} />}
              </details>
            );
          })}
        </>
      )}
    </section>
  );
}

function BulguListesi({ evren, l }: { evren: string; l: MetinBulgusu[] }) {
  const sahneler = [...new Map(l.map((b) => [b.sahne.kod, b.sahne])).values()];
  return (
    <div class="bul-sonuclari">
      {sahneler.map((s) => (
        <section key={s.kod}>
          <h3><a href={`#/e/${evren}/yaz/${s.kod}`}>{s.ad}</a></h3>
          {l.filter((b) => b.sahne.kod === s.kod).map((b, i) => (
            <div key={i} class="bul-eslesme denetim-bulgusu">
              <span>{b.once}<mark>{b.isaretli.replace(/ /g, ' ') || ' '}</mark>{b.sonra}</span>
              <span class="soluk kucuk">{b.mesaj}{b.kayit && <> · <a href={`#/e/${evren}/k/${b.kayit}`}>Kaydı aç</a></>}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
