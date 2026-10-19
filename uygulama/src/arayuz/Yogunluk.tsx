import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { YogunlukIstegi, YogunlukKaydi, YogunlukOlcutu, YogunlukSayilari, YogunlukSatiri, YogunlukSonucu } from '../veri/api';
import { turBul } from '../alan/turler';

const OLCULER: { kod: YogunlukOlcutu; ad: string }[] = [{ kod: 'olay', ad: 'Olay' }, { kod: 'sahne', ad: 'Sahne' }, { kod: 'kelime', ad: 'Kelime' }, { kod: 'kayit', ad: 'Kayıt' }];
const sayi = (az: number, cok: number) => az === cok ? String(az) : `${az}–${cok}`;
const ozet = (n: YogunlukSayilari) => `${n.olay} olay, ${n.sahne} sahne, ${n.kelime} kelime, ${n.kayit} kayıt`;
type Secim = { tur: 'dilim' | 'bolge'; kod: string; ad: string } | { tur: 'tarihsiz' | 'konumsuz' | 'zamanDisinda' | 'bolgeDisinda'; ad: string };

function SayimTablosu({ satirlar, olcu, sec, etiket }: { satirlar: YogunlukSatiri[]; olcu: YogunlukOlcutu; sec: (s: YogunlukSatiri) => void; etiket: string }) {
  const enCok = Math.max(1, ...satirlar.map((s) => s.enCok[olcu]));
  return <div class="tablo-kap"><table class="karsilastirma"><caption>{etiket} · bir sayıya dokunursanız dayandığı kayıtlar açılır</caption>
    <thead><tr><th>{etiket}</th>{OLCULER.map((o) => <th key={o.kod} scope="col">{o.ad}</th>)}<th>Açıklama</th></tr></thead>
    <tbody>{satirlar.map((s) => <tr key={s.kod} style={`background-color:rgba(65,115,165,${0.04 + 0.3 * s.enCok[olcu] / enCok})`}>
      <th scope="row"><button class="dugme sade" onClick={() => sec(s)}>{s.ad}</button></th>
      {OLCULER.map((o) => <td key={o.kod}><button class="dugme sade" aria-label={`${s.ad}: ${o.ad.toLocaleLowerCase('tr-TR')} sayısının dayanağı`} onClick={() => sec(s)}><span style={o.kod === olcu ? 'font-weight:bold' : ''}>{sayi(s.enAz[o.kod], s.enCok[o.kod])}</span></button></td>)}
      <td>{s.aciklama}</td>
    </tr>)}</tbody>
  </table></div>;
}

export function YogunlukSekmesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [girdi, setGirdi] = useState<YogunlukIstegi>({ baslangic: '0', bitis: '99', adim: 10 });
  const [olcu, setOlcu] = useState<YogunlukOlcutu>('olay');
  const [o, setO] = useState<YogunlukSonucu | null>(null);
  const [secenekler, setSecenekler] = useState<Pick<YogunlukSonucu, 'eserler' | 'turler' | 'haritalar'>>({ eserler: [], turler: [], haritalar: [] });
  const [hata, setHata] = useState<string | null>(null), [durum, setDurum] = useState('Henüz hesaplanmadı.');
  const [secim, setSecim] = useState<Secim | null>(null), [sayfa, setSayfa] = useState(0);
  const sira = useRef(0);
  const hesapla = async () => {
    const n = ++sira.current;
    setO(null); setSecim(null); setHata(null); setDurum('Hesaplanıyor…');
    try {
      const x = await istemci.iste('yogunluk', { evren, ...girdi });
      if (n !== sira.current) return;
      setO(x); setSecenekler(x); setDurum('Güncel · bu kurallara göre kesin sonuç.');
    } catch (e) { if (n === sira.current) { setHata((e as Error).message); setDurum('Sayım yapılamadı.'); } }
  };
  useEffect(() => { void hesapla(); return () => { sira.current++; }; }, [evren, surum]);
  const degis = (s: Partial<YogunlukIstegi>) => { sira.current++; setGirdi({ ...girdi, ...s }); setO(null); setSecim(null); setHata(null); setDurum('Seçimler değişti. Yenilemek için “Sayımı göster” düğmesine basın.'); };
  const sec = (s: Secim) => { setSecim(s); setSayfa(0); };
  const uygun = (k: YogunlukKaydi) => {
    if (!o || !secim) return false;
    if (secim.tur === 'dilim') { const i = o.dilimler.findIndex((d) => d.kod === secim.kod); return !!k.dilimler && i >= k.dilimler.ilk && i <= k.dilimler.son; }
    if (secim.tur === 'bolge') return k.bolgeler.some((b) => b.kod === secim.kod);
    return secim.tur === 'tarihsiz' ? k.zamanDurumu === 'tarihsiz' : secim.tur === 'konumsuz' ? k.konumDurumu === 'konumsuz' : secim.tur === 'zamanDisinda' ? k.zamanDurumu === 'disarida' : k.konumDurumu === 'disarida';
  };
  const dayanaklar = o && secim ? o.kayitlar.filter(uygun) : [];
  const enYogun = o ? Math.max(1, ...o.dilimler.map((d) => d.enCok[olcu])) : 1;
  const aciklama = (k: YogunlukKaydi) => {
    if (secim?.tur === 'dilim' && k.dilimler) return k.dilimler.kesin ? 'Bu dilimin içinde.' : `Tarihi belirsiz, şu dilimlere yayılıyor: ${o!.dilimler[k.dilimler.ilk].ad} – ${o!.dilimler[k.dilimler.son].ad}. Tarihin görünümün dışında kalan kısmı da hesaba katılır, kesin bir yer seçilmedi.`;
    if (secim?.tur === 'bolge') return k.bolgeler.find((b) => b.kod === secim.kod)?.kesin ? 'Bu bölgede kayıtlı.' : 'Bu bölgede olabilir, konumu tek bir bölgeye indirgenmedi.';
    return k.tarih?.ifade ?? 'Tarihi yazılmamış ya da takvime çevrilemiyor.';
  };
  return <section aria-label="Yoğunluk ve boşluk">
    <h2>Yoğunluk ve boşluk</h2>
    <p>Olay, sahne, kelime ve kayıt ayrı sayılır. Aynı olay altı sahnede anlatılsa da bir olaydır. Renklerin açıklığı ve koyuluğu yalnızca seçilen sayıyı gösterir, bir denge ya da önem ölçüsü değildir.</p>
    <label>Yoğunluk türü <select class="girdi" value={olcu} onChange={(e) => setOlcu(e.currentTarget.value as YogunlukOlcutu)}>{OLCULER.map((o) => <option key={o.kod} value={o.kod}>{o.ad}</option>)}</select></label>
    <form onSubmit={(e) => { e.preventDefault(); void hesapla(); }}>
      <div class="satir"><label>Başlangıç yılı <input class="girdi" value={girdi.baslangic} onInput={(e) => degis({ baslangic: e.currentTarget.value })} /></label>
        <label>Bitiş yılı <input class="girdi" value={girdi.bitis} onInput={(e) => degis({ bitis: e.currentTarget.value })} /></label>
        <label>Zaman adımı <select class="girdi" value={girdi.adim} onChange={(e) => degis({ adim: Number(e.currentTarget.value) as 1 | 10 | 100 })}><option value="1">Yıl</option><option value="10">On yıl</option><option value="100">Yüzyıl</option></select></label>
        <label>Eser <select class="girdi" value={girdi.eser ?? ''} onChange={(e) => degis({ eser: e.currentTarget.value || null })}><option value="">Bütün eserler ve kayıtlar</option>{secenekler.eserler.map((k) => <option key={k.kod} value={k.kod}>{k.ad}</option>)}</select></label>
        <label>Kayıt türü <select class="girdi" value={girdi.tur ?? ''} onChange={(e) => degis({ tur: e.currentTarget.value || null })}><option value="">Bütün türler</option>{secenekler.turler.map((t) => <option key={t} value={t}>{turBul(t).ad}</option>)}</select></label>
        <label>Harita <select class="girdi" value={girdi.harita ?? ''} onChange={(e) => degis({ harita: e.currentTarget.value || null })}><option value="">Harita seçilmedi</option>{secenekler.haritalar.map((h) => <option key={h.kod} value={h.kod}>{h.ad}</option>)}</select></label>
        <button class="dugme ana" type="submit">Sayımı göster</button>
      </div>
    </form>
    <p class="soluk">Ana takvimin yıllarını yazın. Eksi yıllar ve tanımladığınız çağ adları da kullanılabilir. Dilimler başlangıç yılından başlar, en çok 1.000 dilim gösterilir. Bir sayı aralığı “en az–en çok” anlamına gelir. Farklı dilimlerin üst sınırları toplanamaz.</p>
    <p role="status">{durum}</p>{hata && <p role="alert">{hata}</p>}
    {o && <>
      <h3>Zaman şeridi</h3>
      <div class="satir" style="flex-wrap:nowrap;overflow-x:auto;align-items:stretch" aria-label="Zaman yoğunluğu şeridi">{o.dilimler.map((d) => <button key={d.kod} class="dugme" style={`min-width:100px;background-color:rgba(65,115,165,${0.04 + 0.3 * d.enCok[olcu] / enYogun})`} onClick={() => sec({ tur: 'dilim', kod: d.kod, ad: d.ad })}><span>{d.ad}</span><br /><strong>{sayi(d.enAz[olcu], d.enCok[olcu])}</strong></button>)}</div>
      <SayimTablosu satirlar={o.dilimler} olcu={olcu} etiket="Zaman dilimi" sec={(d) => sec({ tur: 'dilim', kod: d.kod, ad: d.ad })} />
      <p>Tarih aralığı birden çok dilime yayılan kayıtlar kesin sayıya katılmaz, yalnızca üst sınıra eklenir. Aralığın yalnızca bir kısmı görünümde olsa da kesin bir yer varsayılmaz.</p>
      <p><button class="dugme sade" onClick={() => sec({ tur: 'tarihsiz', ad: 'Tarihsiz ya da takvime çevrilemeyenler' })}>Tarihsiz ya da takvime çevrilemeyenler: {ozet(o.tarihsiz)}</button></p>
      <p><button class="dugme sade" onClick={() => sec({ tur: 'zamanDisinda', ad: 'Seçilen zaman aralığının dışındakiler' })}>Seçilen zaman aralığının dışında: {ozet(o.zamanDisinda)}</button></p>
      {o.harita && <><h3>{o.harita.ad} · bölge sayımları</h3>
        <p>Harita dağılımı zaman şeridinden bağımsızdır. Seçilen eser ve türdeki kayıtların konumlarını gösterir. Tarihli çizimler ayrı gösterilir. Örtüşen bölgelerdeki sayılar toplanamaz.</p>
        {o.bolgeler.length ? <SayimTablosu satirlar={o.bolgeler} olcu={olcu} etiket="Bölge" sec={(b) => sec({ tur: 'bolge', kod: b.kod, ad: b.ad })} /> : <p>Bu haritada kayıtlı bölge çizimi yok.</p>}
        <p><button class="dugme sade" onClick={() => sec({ tur: 'konumsuz', ad: 'Konumu bilinmeyenler' })}>Konumu bilinmediği için bölgelere sayılmayanlar: {ozet(o.konumsuz)}</button></p>
        <p><button class="dugme sade" onClick={() => sec({ tur: 'bolgeDisinda', ad: 'Konumu bilinen, çizilmiş bölgelerin dışındakiler' })}>Konumu bilinen, çizilmiş bölgelerin dışındakiler: {ozet(o.bolgeDisinda)}</button></p>
      </>}
      {secim && <section aria-label="Sayımın dayanak kayıtları"><h3>{secim.ad} · dayanak kayıtları ({dayanaklar.length})</h3>
        {!dayanaklar.length && <p>Bu kapsamda sayılan kayıt yok.</p>}
        <ul>{dayanaklar.slice(sayfa * 100, (sayfa + 1) * 100).map((k) => <li key={k.kod}><a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a> · {turBul(k.tur).ad}{k.tur === 'sahne' ? ` · ${k.kelime} kelime` : ''} · {k.tarih?.ifade ?? 'tarihsiz'}<p class="soluk kucuk">{aciklama(k)}</p></li>)}</ul>
        {dayanaklar.length > 100 && <div class="satir"><button class="dugme" disabled={sayfa === 0} onClick={() => setSayfa(sayfa - 1)}>Önceki 100 kayıt</button><span>{sayfa + 1}. sayfa</span><button class="dugme" disabled={(sayfa + 1) * 100 >= dayanaklar.length} onClick={() => setSayfa(sayfa + 1)}>Sonraki 100 kayıt</button></div>}
      </section>}
      <details><summary>Bunu nereden biliyoruz?</summary><p>{o.zarf.tur} · {o.zarf.hukum} · {o.zarf.guncellik}</p><p>Kapsam: {o.zarf.kapsam}</p><ul>{o.zarf.dayanak.map((d) => <li>{d}</li>)}</ul><ul>{o.zarf.varsayimlar.map((v) => <li>{v}</li>)}</ul></details>
    </>}
  </section>;
}
