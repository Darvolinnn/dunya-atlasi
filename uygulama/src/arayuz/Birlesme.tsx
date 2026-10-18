// Editoryal birleştirme (§9.5): yanlışlıkla iki kez açılmış kaydı tek kayıtta toplamak. Önizlemeyle yapılır,
// çelişen alanlarda yazar seçer; eski kayıt silinmez, yenisine yönlendirir ve birleştirme geri alınabilir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { BirlesmeOnizlemesi, Kayit } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import { git } from './Uygulama';

const hataYaz = (e: unknown) => (e as Error).message;

/** Kayıt sayfasının üstünde: bu kayıt birleştirildiyse ya da buna birleştirilmiş kayıtlar varsa. */
export function BirlesmeBilgisi({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const [hata, setHata] = useState<string | null>(null);
  if (kayit.birlesti) {
    return (
      <div class="uyari satir" style="margin-bottom:16px" role="status">
        <span style="flex:1">Bu kayıt <a href={`#/e/${evren}/k/${kayit.birlesti.kod}`}>{kayit.birlesti.ad}</a> ile birleştirildi. Metni ve geçmişi burada okunur kalır; bu kayda giden bağlantılar {kayit.birlesti.ad} kaydına varır.</span>
        <a class="dugme ana" href={`#/e/${evren}/k/${kayit.birlesti.kod}`}>{kayit.birlesti.ad} kaydına git</a>
        <button class="dugme" onClick={() => istemci.iste('birlesmeyiGeriAl', { evren, kod: kayit.kod }).then(() => setHata(null), (e) => setHata(hataYaz(e)))}>Birleştirmeyi geri al</button>
        {hata && <span class="hata kucuk">{hata}</span>}
      </div>
    );
  }
  if (!kayit.birlesenler.length) return null;
  return (
    <p class="soluk kucuk">Bu kayda birleştirilenler: {kayit.birlesenler.map((b, i) => <>{i > 0 && ', '}<a href={`#/e/${evren}/k/${b.kod}`}>{b.ad}</a></>)}</p>
  );
}

export function BirlestirDugmesi({ istemci, evren, kayit, onceKaydet }: { istemci: Istemci; evren: string; kayit: Kayit; onceKaydet: () => Promise<unknown> }) {
  const [acik, setAcik] = useState(false);
  if (!acik) return <button class="dugme" onClick={() => setAcik(true)}>Başka bir kayıtla birleştir</button>;
  return <BirlesmePaneli istemci={istemci} evren={evren} kayit={kayit} onceKaydet={onceKaydet} kapat={() => setAcik(false)} />;
}

function BirlesmePaneli({ istemci, evren, kayit, onceKaydet, kapat }: { istemci: Istemci; evren: string; kayit: Kayit; onceKaydet: () => Promise<unknown>; kapat: () => void }) {
  const [diger, setDiger] = useState<{ kod: string; ad: string } | null>(null);
  const [buKalsin, setBuKalsin] = useState(true);
  const [o, setO] = useState<BirlesmeOnizlemesi | null>(null);
  const [secimler, setSecimler] = useState<Record<string, 'kaynak' | 'hedef'>>({});
  const [hata, setHata] = useState<string | null>(null);
  const kaynak = diger ? (buKalsin ? diger.kod : kayit.kod) : null;
  const hedef = diger ? (buKalsin ? kayit.kod : diger.kod) : null;
  useEffect(() => {
    setO(null); setSecimler({});
    if (!kaynak || !hedef) return;
    istemci.iste('birlesmeOnizle', { evren, kaynak, hedef }).then((x) => { setO(x); setHata(null); }, (e) => setHata(hataYaz(e)));
  }, [kaynak, hedef]);
  const birlestir = async () => {
    if (!o) return;
    try {
      await onceKaydet();
      await istemci.iste('birlestir', { evren, kaynak: o.kaynak.kod, hedef: o.hedef.kod, secimler });
      kapat();
      git(`/e/${evren}/k/${o.hedef.kod}`);
    } catch (e) { setHata(hataYaz(e)); }
  };
  const tasinan = o ? ([[o.iliskiler, 'ilişki'], [o.durumlar, 'durum kaydı'], [o.isaretler, 'harita işareti'], [o.haritalar, 'harita'],
    [o.degisimler, 'değişim'], [o.gorseller, 'görsel']] as [number, string][]).filter(([n]) => n > 0) : [];
  const celisen = o?.alanlar.filter((a) => a.celiski) ?? [];
  const dolan = o?.alanlar.filter((a) => !a.celiski) ?? [];

  return (
    <section class="kart birlesme" aria-label="Kayıtları birleştir">
      <h2>Kayıtları birleştir</h2>
      <p class="soluk kucuk">Aynı şey için yanlışlıkla iki kayıt açıldıysa burada tek kayıtta toplanır. Evrende iki şeyin birleşmesi (iki loncanın birleşmesi gibi) bu değildir; o bir olaydır.</p>
      <div class="satir">
        <span>“{kayit.ad}” ile birleşecek kayıt:</span>
        <KayitSec istemci={istemci} evren={evren} secili={diger} sec={(s) => setDiger(s && s.kod !== kayit.kod ? s : null)} />
      </div>
      {diger && (
        <fieldset class="satir birlesme-yon">
          <legend class="alan-adi">Hangisi kalsın?</legend>
          <label class="satir"><input type="radio" name="kalan" checked={buKalsin} onChange={() => setBuKalsin(true)} /> {kayit.ad}</label>
          <label class="satir"><input type="radio" name="kalan" checked={!buKalsin} onChange={() => setBuKalsin(false)} /> {diger.ad}</label>
        </fieldset>
      )}
      {o && (
        <div class="birlesme-onizleme">
          <p><strong>“{o.kaynak.ad}”, “{o.hedef.ad}” kaydına katılacak.</strong> “{o.kaynak.ad}” silinmez; ona giden bağlantılar “{o.hedef.ad}” kaydına varır.</p>
          <ul>
            {o.adlar.length > 0 && <li>Lakap olarak kalacak adlar: {o.adlar.join(', ')}</li>}
            {tasinan.length > 0 && <li>Taşınacaklar: {tasinan.map(([n, ad]) => `${n} ${ad}`).join(', ')}</li>}
            {o.baglantilar > 0 && <li>{o.baglantilar} metindeki bağlantı “{o.hedef.ad}” kaydına varacak; metinlerdeki yazılış değişmez.</li>}
            {o.aradakiIliskiler > 0 && <li>İki kayıt arasındaki {o.aradakiIliskiler} ilişki kaldırılacak (kayıt kendisiyle ilişkili olamaz).</li>}
            {dolan.length > 0 && <li>“{o.hedef.ad}” kaydında boş olan ve doldurulacak alanlar: {dolan.map((a) => `${a.etiket} (${a.kaynak})`).join(', ')}</li>}
            {o.metinVar && <li>“{o.kaynak.ad}” kaydının metni kendi sayfasında okunur kalır; istediğin kısmı taşıyabilirsin.</li>}
          </ul>
          {celisen.length > 0 && (
            <>
              <h3>Farklı değerler</h3>
              <p class="soluk kucuk">İki kayıtta farklı yazılmış alanlar. Hangisinin kalacağını seç.</p>
              <table class="birlesme-tablosu">
                <tbody>
                  {celisen.map((a) => (
                    <tr key={a.alan}>
                      <th scope="row">{a.etiket}</th>
                      <td><label class="satir"><input type="radio" name={`s-${a.alan}`} checked={secimler[a.alan] !== 'kaynak'} onChange={() => setSecimler({ ...secimler, [a.alan]: 'hedef' })} /> {a.hedef}</label></td>
                      <td><label class="satir"><input type="radio" name={`s-${a.alan}`} checked={secimler[a.alan] === 'kaynak'} onChange={() => setSecimler({ ...secimler, [a.alan]: 'kaynak' })} /> {a.kaynak}</label></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p class="soluk kucuk">Birleştirme, “{o.kaynak.ad}” kaydının sayfasındaki “Birleştirmeyi geri al” ile bir bütün olarak geri alınır.</p>
        </div>
      )}
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button class="dugme ana" disabled={!o} onClick={birlestir}>Birleştir</button>
        <button class="dugme sade" onClick={kapat}>Vazgeç</button>
      </div>
    </section>
  );
}
