// Masa (§7): kaldığın yer, son düzenlenenler, hızlı notlar ve bahsedilen ama yazılmamış sayfalar.
// "Bahsedilen ama yazılmamış" bir hatırlatmadır; sayı ya da uyarı rengiyle gösterilmez.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KaldigiYerBilgisi, KayitOzeti, KisaKayit, SimdiOnerisi, SonCalisma } from '../veri/api';
import { goreceZaman } from './Esitleme';
import { turBul, grupSinifi } from '../alan/turler';
import { zamanYaz } from '../alan/islem-metni';
import { useCalisma } from './Calisma';
import { KararRozeti } from './ortak';

export function Masa({ istemci, evren, surum, ekler }: { istemci: Istemci; evren: string; surum: number; ekler?: preact.ComponentChildren }) {
  const calisma = useCalisma();
  const [kaldigi, setKaldigi] = useState<KaldigiYerBilgisi | null | undefined>(undefined);
  const [kayitlar, setKayitlar] = useState<KayitOzeti[] | null>(null);
  const [bahsedilen, setBahsedilen] = useState<KayitOzeti[]>([]);
  const [not, setNot] = useState('');
  useEffect(() => { istemci.iste('kaldigiYer', { evren }).then((k) => { setKaldigi(k); setNot(k?.not ?? ''); }); }, [evren, surum]);
  useEffect(() => { istemci.iste('kayitlar', { evren }).then(setKayitlar); istemci.iste('bahsedilenler', { evren }).then(setBahsedilen); }, [evren, surum]);
  if (kayitlar === null || kaldigi === undefined) return null;

  const notlar = kayitlar.filter((k) => k.tur === 'not').slice(0, 5);
  const son = kayitlar.slice(0, 8);
  return (
    <div class="masa">
      <section class="kart masa-kaldigi" aria-label="Kaldığınız yer">
        <h2>Kaldığınız yer</h2>
        {kaldigi?.kayit ? (
          <>
            <p style="margin:6px 0">
              <a href={`#/e/${evren}/k/${kaldigi.kayit}`}><strong>{kaldigi.kayitAdi}</strong></a>
              <span class="soluk kucuk"> · {turBul(kaldigi.kayitTuru ?? '').ad} · {zamanYaz(kaldigi.zaman)}{kaldigi.cihaz ? ` · ${kaldigi.cihaz} cihazında` : ''}</span>
            </p>
            {kaldigi.yanPanelKayitlari.length > 0 && (
              <p class="soluk kucuk" style="margin:0 0 6px">Yan panelde: {kaldigi.yanPanelKayitlari.map((k) => k.ad).join(', ')}</p>
            )}
          </>
        ) : <p class="soluk kucuk">Bir kaydı açıp yazmaya başladığınızda burada görünür. Başka bir cihazda kaldığınız yer de eşitlemeyle buraya gelir.</p>}
        <SonCalismaOzeti istemci={istemci} evren={evren} surum={surum} />
        <label class="alan">
          <span class="alan-adi">Devam notu</span>
          <textarea class="girdi" rows={2} lang="tr" value={not} placeholder="Örn. Kuşatma sahnesinde Elin'in kararı kaldı"
            onInput={(e) => setNot((e.target as HTMLTextAreaElement).value)}
            onBlur={() => { if (not !== (kaldigi?.not ?? '')) calisma?.notYaz(not); }} />
        </label>
        {kaldigi?.kayit && (
          <div class="satir" style="margin-top:8px">
            <button class="dugme ana" onClick={() => calisma?.devamEt({ kayit: kaldigi.kayit, konum: kaldigi.konum, yanPanel: kaldigi.yanPanel, tur: kaldigi.kayitTuru })}>Devam et</button>
            <span class="soluk kucuk">Kayıt, imlecin yeri ve yan paneldeki kayıtlar geri gelir.</span>
          </div>
        )}
      </section>

      <SimdiKarti istemci={istemci} evren={evren} surum={surum} />

      {ekler}

      <section class="masa-bolum" aria-label="Son düzenlenenler">
        <h2>Son düzenlenenler</h2>
        {son.length ? <KisaListe evren={evren} kayitlar={son} zamanli /> : <p class="soluk kucuk">Bu evrende henüz kayıt yok. <a href={`#/e/${evren}/kayitlar`}>Kayıtlar</a> sayfasından ilk kaydı oluşturabilirsiniz.</p>}
      </section>

      <section class="masa-bolum" aria-label="Hızlı notlar">
        <div class="satir"><h2>Hızlı notlar</h2><span class="bosluk" /><button class="dugme kucuk" onClick={() => document.dispatchEvent(new Event('hizli-not-ac'))}>Yeni not</button></div>
        {notlar.length ? <KisaListe evren={evren} kayitlar={notlar} zamanli /> : <p class="soluk kucuk">Henüz not yok. Her ekrandan “+ Not” düğmesiyle ya da Alt+N ile not yazabilirsiniz.</p>}
      </section>

      {bahsedilen.length > 0 && (
        <section class="masa-bolum" aria-label="Eksik kayıtlar">
          <h2>Eksik kayıtlar</h2>
          <p class="kucuk">
            {bahsedilen.slice(0, 12).map((k, i) => <>{i > 0 && ', '}<a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a></>)}
            {bahsedilen.length > 12 && <> · <a href={`#/e/${evren}/bahsedilen`}>hepsi</a></>}
          </p>
        </section>
      )}
    </div>
  );
}

export function KisaListe({ evren, kayitlar, zamanli }: { evren: string; kayitlar: KayitOzeti[]; zamanli?: boolean }) {
  return (
    <ul class="kisa-liste">
      {kayitlar.map((k) => {
        const tur = turBul(k.tur);
        return (
          <li key={k.kod}>
            <a href={`#/e/${evren}/k/${k.kod}`}><span class={`tur-rozeti kucuk-rozet ${grupSinifi(tur)}`} aria-hidden="true" title={tur.ad}>{tur.kisa}</span> {k.ad}</a>
            {' '}<KararRozeti karar={k.karar} />
            <span class="soluk kucuk"> {tur.ad}{zamanli ? ` · ${zamanYaz(k.duzenleme)}` : ''}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** "Şimdi" (K27, Model §5): şu an çalışılan eser ya da seri ve kayıtlı veriye dayanan en çok üç küçük iş. Her
 *  önerinin gerekçesi yazar; serbest metinden çıkarım yapılmaz. Öneri yoksa yalnız seçim kutusu görünür. */
function SimdiKarti({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [etkin, setEtkin] = useState<KisaKayit | null | undefined>(undefined);
  const [secenekler, setSecenekler] = useState<KisaKayit[]>([]);
  const [l, setL] = useState<SimdiOnerisi[]>([]);
  useEffect(() => {
    istemci.iste('etkinCalisma', { evren }).then(setEtkin, () => setEtkin(null));
    istemci.iste('simdi', { evren }).then(setL, () => setL([]));
    istemci.iste('seriler', { evren }).then((r) => setSecenekler([
      ...r.seriler.map((x) => ({ kod: x.kod, ad: x.ad, tur: 'seri' })),
      ...[...r.seriler.flatMap((x) => x.eserler), ...r.serisiz].map((x) => ({ kod: x.kod, ad: x.ad, tur: 'eser' })),
    ]), () => {});
  }, [evren, surum]);
  if (etkin === undefined) return null;
  if (!secenekler.length && !l.length) return null;
  const adres = (o: SimdiOnerisi) => o.tur === 'sahne' ? `#/e/${evren}/yaz/${o.kayit.kod}` : `#/e/${evren}/k/${o.kayit.kod}`;
  return (
    <section class="kart masa-simdi" aria-label="Şimdi">
      <div class="satir">
        <h2>Şimdi</h2><span class="bosluk" />
        {secenekler.length > 0 && <label class="satir kucuk">
          <span class="soluk">Çalışıyorum:</span>
          <select class="girdi kucuk-secim" aria-label="Şu an çalıştığım eser ya da seri" value={etkin?.kod ?? ''}
            onChange={(e) => { const v = (e.target as HTMLSelectElement).value; istemci.iste('etkinCalismaYaz', { evren, kod: v || null }); }}>
            <option value="">Bütün evren</option>
            {secenekler.map((x) => <option value={x.kod}>{x.tur === 'seri' ? `Seri: ${x.ad}` : x.ad}</option>)}
          </select>
        </label>}
      </div>
      {l.length ? (
        <ul class="simdi-listesi">
          {l.map((o) => <li key={o.tur + o.kayit.kod}><a href={adres(o)}>{o.baslik}</a><span class="soluk kucuk"> · {o.gerekce}</span></li>)}
        </ul>
      ) : <p class="soluk kucuk">Önerilecek bir şey yok: önemli işaretli bir mesele, sonraya bırakılmış bir soru ya da bir sahne olunca burada görünür.</p>}
    </section>
  );
}

const YAZMA_TURLERI = new Set(['eser', 'bolum', 'sahne']);
const saatYazisi = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
function sureYazisi(ms: number) {
  const dk = Math.round(ms / 60000);
  if (dk < 1) return null;
  const s = Math.floor(dk / 60), d = dk % 60;
  return s ? `${s} saat${d ? ` ${d} dakika` : ''}` : `${d} dakika`;
}

/** Son çalışmanın özeti (K28 T7): evreni yeniden açınca nerede kalındığını hatırlatır; "Kaldığınız yer" kartında durur. Yalnızca işlem günlüğünden derlenir. */
function SonCalismaOzeti({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [o, setO] = useState<SonCalisma | null>(null);
  useEffect(() => { istemci.iste('sonCalisma', { evren }).then(setO, () => setO(null)); }, [evren, surum]);
  if (!o || !(o.yazilan.length || o.olusturulan.length || o.degistirilen.length || o.silinen)) return null;
  const adres = (k: KisaKayit) => `#/e/${evren}/${YAZMA_TURLERI.has(k.tur) ? 'yaz' : 'k'}/${k.kod}`;
  const liste = (l: KisaKayit[]) => {
    const ilk = l.slice(0, 6);
    return <>{ilk.map((k, n) => <span key={k.kod}>{n ? ', ' : ''}<a href={adres(k)}>{k.ad}</a></span>)}{l.length > ilk.length && ` ve ${l.length - ilk.length} kayıt daha`}</>;
  };
  const sure = sureYazisi(o.son - o.bas);
  const ayniGun = new Date(o.bas).toDateString() === new Date(o.son).toDateString();
  return (
    <section class="son-calisma" aria-label="Son çalışmanız">
      <h3>Son çalışmanızda: {goreceZaman(o.bas)}{ayniGun && o.son - o.bas >= 60000 ? `–${saatYazisi(o.son)}` : ''}{sure && <span class="soluk kucuk"> ({sure})</span>}</h3>
      <ul>
        {o.yazilan.length > 0 && <li>Metnini yazdığınız: {liste(o.yazilan)}</li>}
        {o.olusturulan.length > 0 && <li>Yeni kayıtlar: {liste(o.olusturulan)}</li>}
        {o.degistirilen.length > 0 && <li>Bilgilerini değiştirdiğiniz: {liste(o.degistirilen)}</li>}
        {o.silinen > 0 && <li>Çöp kutusuna taşınan: {o.silinen} kayıt</li>}
        <li class="soluk kucuk">Toplam {o.degisiklikSayisi} değişiklik · <a href={`#/e/${evren}/gecmis`}>Değişiklik geçmişi</a></li>
      </ul>
    </section>
  );
}
