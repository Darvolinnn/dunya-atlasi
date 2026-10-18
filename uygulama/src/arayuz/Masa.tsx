// Masa (§7): kaldığın yer, son düzenlenenler, hızlı notlar ve bahsedilen ama yazılmamış sayfalar.
// "Bahsedilen ama yazılmamış" bir hatırlatmadır; sayı ya da uyarı rengiyle gösterilmez.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KaldigiYerBilgisi, KayitOzeti } from '../veri/api';
import { turBul } from '../alan/turler';
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
      <section class="kart masa-kaldigi" aria-label="Kaldığın yer">
        <h2>Kaldığın yer</h2>
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
        ) : <p class="soluk kucuk">Bir kaydı açıp yazmaya başlayınca burada görünür; başka cihazda kaldığın yer de eşitlemeyle gelir.</p>}
        <label class="alan">
          <span class="alan-adi">Buradan devam notu</span>
          <textarea class="girdi" rows={2} lang="tr" value={not} placeholder="Örn. Kuşatma sahnesinde Elin'in kararı kaldı"
            onInput={(e) => setNot((e.target as HTMLTextAreaElement).value)}
            onBlur={() => { if (not !== (kaldigi?.not ?? '')) calisma?.notYaz(not); }} />
        </label>
        {kaldigi?.kayit && (
          <div class="satir" style="margin-top:8px">
            <button class="dugme ana" onClick={() => calisma?.devamEt({ kayit: kaldigi.kayit, konum: kaldigi.konum, yanPanel: kaldigi.yanPanel })}>Devam et</button>
            <span class="soluk kucuk">Kayıt, imleç ve yan paneldeki kayıtlar geri gelir.</span>
          </div>
        )}
      </section>

      {ekler}

      <section class="masa-bolum" aria-label="Son düzenlenenler">
        <h2>Son düzenlenenler</h2>
        {son.length ? <KisaListe evren={evren} kayitlar={son} zamanli /> : <p class="soluk kucuk">Bu evrende henüz kayıt yok. <a href={`#/e/${evren}/kayitlar`}>Kayıtlar</a> sekmesinden ilk kaydı oluşturabilirsin.</p>}
      </section>

      <section class="masa-bolum" aria-label="Hızlı notlar">
        <div class="satir"><h2>Hızlı notlar</h2><span class="bosluk" /><button class="dugme kucuk" onClick={() => document.dispatchEvent(new Event('hizli-not-ac'))}>Yeni not</button></div>
        {notlar.length ? <KisaListe evren={evren} kayitlar={notlar} zamanli /> : <p class="soluk kucuk">Not yok. Her ekrandan “+ Not” ya da Alt+N ile yazabilirsin.</p>}
      </section>

      {bahsedilen.length > 0 && (
        <section class="masa-bolum" aria-label="Bahsedilen ama yazılmamış">
          <h2>Bahsedilen ama yazılmamış</h2>
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
            <a href={`#/e/${evren}/k/${k.kod}`}><span class="tur-rozeti kucuk-rozet" aria-hidden="true" title={tur.ad}>{tur.kisa}</span> {k.ad}</a>
            {' '}<KararRozeti karar={k.karar} />
            <span class="soluk kucuk"> {tur.ad}{zamanli ? ` · ${zamanYaz(k.duzenleme)}` : ''}</span>
          </li>
        );
      })}
    </ul>
  );
}
