// Dosyaya yedek, yedekten geri yükleme ve dışarıdan içe aktarma ekranları (§10.11).
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { DonemselYedekDurumu, DriveYedegi, IceAktarimRaporu, YedekBilgisi, YerelYedekDurumu } from '../veri/api';
import { kabuk, yedekKlasorunuAc } from '../veri/kabuk';
import { useEsitleme } from './Esitleme';
import { zamanYaz } from '../alan/islem-metni';
import { turBul } from '../alan/turler';
import { git } from './Uygulama';

type IceDosya = { yol: string; metin?: string; veri?: Uint8Array; tur?: string };

const METIN = /\.(md|markdown|txt|json)$/i;
const GORSEL = /\.(jpe?g|png|webp|gif|avif)$/i;
const EN_BUYUK = 60 * 1024 * 1024;

function indir(ad: string, veri: Uint8Array | Blob, tur = 'application/zip') {
  const url = URL.createObjectURL(new Blob([veri as BlobPart], { type: tur }));
  const a = document.createElement('a');
  a.href = url; a.download = ad;
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60_000);
}

const hataMetni = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ---------- Evren ekranındaki "Yedek" sekmesi ----------
export function YedekSekmesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [son, setSon] = useState<number | null>(null);
  const [durum, setDurum] = useState<'bos' | 'aliniyor' | 'alindi'>('bos');
  const [eksikGorsel, setEksikGorsel] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('sonYedek', { evren }).then(setSon); }, [evren, surum, durum]);

  const al = async () => {
    setHata(null); setDurum('aliniyor'); setEksikGorsel(0);
    try {
      const { dosyaAdi, veri, eksikGorsel } = await istemci.iste('yedekAl', { evren });
      indir(dosyaAdi, veri);
      setEksikGorsel(eksikGorsel);
      setDurum('alindi');
    } catch (e) { setHata(hataMetni(e)); setDurum('bos'); }
  };

  return (
    <div class="kart" style="margin-top:12px">
      <h3>Dosyaya tam yedek</h3>
      <p>Bu evrenin bütün kayıtları, metinleri, ilişkileri, sürüm geçmişi ve görselleri tek bir dosyaya yazılır. Dosyayı istediğiniz yerde saklayın (bir bellek ya da başka bir disk).</p>
      <p class="soluk kucuk">Yedeği “Evrenler” sayfasındaki “Yedekten geri yükle” ile hiçbir şey kaybetmeden geri yükleyebilirsiniz. Evren bu cihazda hâlâ duruyorsa ona dokunulmaz, yedek ayrı bir evren olarak açılır.</p>
      <div class="satir" style="margin-top:8px">
        <button class="dugme ana" onClick={al} disabled={durum === 'aliniyor'}>{durum === 'aliniyor' ? 'Yedek hazırlanıyor…' : 'Yedek al'}</button>
        <span class="soluk kucuk">{son ? `Son hazırlanan yedek dosyası: ${zamanYaz(son)}` : 'Bu evrenin bu cihazdan alınmış yedeği yok.'}</span>
      </div>
      {durum === 'alindi' && <p class="kucuk" role="status">Yedek dosyası hazırlandı ve indirme başlatıldı. Dosyanın kaydedildiğini tarayıcının indirilenler klasöründen denetleyin; program bunu göremez.</p>}
      {durum === 'alindi' && eksikGorsel > 0 && (
        <p class="uyari kucuk" role="alert">Bu yedek eksik: {eksikGorsel} görsel bu cihazda olmadığı için yedeğe girmedi ve bu dosyadan geri gelmez. Kayıtlar ve metinler eksiksiz. Görsellerin bulunduğu cihazdan yeniden yedek alın.</p>
      )}
      {hata && <p class="hata" role="alert">{hata}</p>}
    </div>
  );
}

const gunMetni = (gun: string) => new Date(gun + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Drive'daki dönemsel yedekler (§10.10): son yedek, liste, elle yedek, geri yükleme ve saklama süresi. */
export function DriveYedekleri({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const es = useEsitleme();
  const [d, setD] = useState<DonemselYedekDurumu | null>(null);
  const [liste, setListe] = useState<DriveYedegi[] | null>(null);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<GeriYuklemeSonucu | null>(null);
  const [ayar, setAyar] = useState<{ gun: string; ay: string } | null>(null);
  const bagli = !!es?.durum?.bagli;

  const yukle = async () => {
    const x = await istemci.iste('donemselYedekDurumu', { evren });
    setD(x);
    if (x.bagli && x.esitlenir) istemci.iste('driveYedekleri', { evren }).then(setListe, (e) => setHata(hataMetni(e)));
  };
  useEffect(() => { void yukle(); }, [evren, surum, bagli]);

  const simdi = async () => {
    setHata(null); setMesgul('yedekleniyor');
    try { setD(await istemci.iste('drivedaYedekAl', { evren })); setListe(await istemci.iste('driveYedekleri', { evren })); }
    catch (e) { setHata(hataMetni(e)); void yukle(); }
    setMesgul(null);
  };
  const geriYukle = async (y: DriveYedegi) => {
    setHata(null); setMesgul(y.id);
    try { setSonuc(await istemci.iste('drivedanGeriYukle', { id: y.id })); }
    catch (e) { setHata(hataMetni(e)); }
    setMesgul(null);
  };
  const ayarKaydet = async () => {
    if (!ayar) return;
    setHata(null);
    // Boş bırakılan kutu 0 sayılmaz (0 ay, ay başı yedeklerinin hepsini sildirirdi); geçersiz sayı olarak reddedilir.
    const sayi = (s: string) => (s.trim() ? Number(s) : NaN);
    try { await istemci.iste('yedekAyarlari', { gunSayisi: sayi(ayar.gun), aySayisi: sayi(ayar.ay) }); setAyar(null); void yukle(); }
    catch (e) { setHata(hataMetni(e)); }
  };

  if (!d) return null;
  return (
    <div class="kart" style="margin-top:12px">
      <h3>Drive'daki yedekler</h3>
      <p class="soluk kucuk">Google Drive'ınızdaki “Dünya Atlası yedekleri” klasörüne her gün bir yedek alınır. Görseller bu klasörün içindeki “medya” klasöründe tek kopya olarak saklanır.
        Günlük yedekler {d.gunSayisi} gün, her ayın ilk yedeği {d.aySayisi} ay saklanır.</p>
      {!d.esitlenir
        ? <p class="kucuk">Bu evren Drive ile eşitlenmediği için Drive'a yedeği de alınmaz. Eşitlemeyi “Eşitleme ve cihazlar” sayfasından açabilirsiniz.</p>
        : <p class="kucuk">{d.son
            ? <>Son yedek: <strong>{zamanYaz(d.son.zaman)}</strong>{d.son.dogrulandi ? ' · geri okunup doğrulandı' : ' · doğrulanamadı'}
              {d.son.eksikGorsel ? ` · ${d.son.eksikGorsel} görsel bu cihazda olmadığı için yedekte yok` : ''}</>
            : 'Bu evrenin Drive\'da yedeği henüz yok.'}</p>}
      {d.hata && <p class="uyari kucuk">Son yedekleme denemesi başarısız oldu: {d.hata}</p>}
      {!bagli && d.esitlenir && <p class="soluk kucuk">Yedekler Google Drive'a bağlıyken alınır. Bağlı değilken alınamayan yedek, bağlandığınızda alınır.</p>}
      {bagli && d.esitlenir && (
        <div class="satir" style="margin-top:8px">
          <button class="dugme" onClick={simdi} disabled={!!mesgul}>{mesgul === 'yedekleniyor' ? 'Yedekleniyor…' : 'Şimdi Drive\'a yedekle'}</button>
        </div>
      )}
      {sonuc && (
        <div style="margin-top:12px" role="status">
          <p>{sonuc.ayri ? 'Yedek ayrı bir evren olarak açıldı. Bu evrene dokunulmadı.' : 'Evren geri yüklendi.'}</p>
          <GorselUyarisi sonuc={sonuc} nerede="yedek klasöründe" />
          <button class="dugme ana" onClick={() => git(`/e/${sonuc.kod}`)}>Evreni aç</button>
        </div>
      )}
      {bagli && liste && liste.length > 0 && (
        <ul style="margin-top:12px;list-style:none;padding:0">
          {liste.map((y) => (
            <li key={y.id} class="satir">
              <span>{gunMetni(y.gun)} <span class="soluk kucuk">{y.zaman ? saatMetni(y.zaman) : ''}</span></span>
              <span class="bosluk" />
              <button class="dugme sade" onClick={() => geriYukle(y)} disabled={!!mesgul}
                title="Bu evren değişmez, yedek ayrı bir evren olarak açılır.">{mesgul === y.id ? 'Geri yükleniyor…' : 'Ayrı evren olarak aç'}</button>
            </li>
          ))}
        </ul>
      )}
      <details style="margin-top:8px">
        <summary class="kucuk">Saklama süresi</summary>
        <div class="satir" style="margin-top:8px">
          <label class="kucuk">Günlük yedekler <input type="number" min={1} max={3650} style="width:5em" value={ayar?.gun ?? d.gunSayisi}
            onInput={(e) => setAyar({ gun: (e.target as HTMLInputElement).value, ay: ayar?.ay ?? String(d.aySayisi) })} /> gün</label>
          <label class="kucuk">Ay başı yedekleri <input type="number" min={0} max={120} style="width:5em" value={ayar?.ay ?? d.aySayisi}
            onInput={(e) => setAyar({ ay: (e.target as HTMLInputElement).value, gun: ayar?.gun ?? String(d.gunSayisi) })} /> ay</label>
          <button class="dugme sade" onClick={ayarKaydet} disabled={!ayar}>Kaydet</button>
        </div>
        <p class="soluk kucuk">Süresi dolan yedekler bir sonraki yedekte klasörden kaldırılır. Bu ayar bu cihaz için geçerlidir.</p>
      </details>
      {hata && <p class="hata" role="alert">{hata}</p>}
    </div>
  );
}

const saatMetni = (t: number) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

type GeriYuklemeSonucu = { kod: string; ayri: boolean; eksikGorseller: string[]; bozukGorseller: string[] };

/** Geri yüklemenin sonucu: gelmeyen görseller sessizce atlanmaz (§10.10). */
function GorselUyarisi({ sonuc, nerede = 'yedekte' }: { sonuc: GeriYuklemeSonucu; nerede?: string }) {
  if (!sonuc.eksikGorseller.length && !sonuc.bozukGorseller.length) return null;
  return (
    <p class="uyari kucuk">Kayıtlar ve metinler eksiksiz geldi, ama {[
      sonuc.eksikGorseller.length ? `${sonuc.eksikGorseller.length} görsel ${nerede} bulunamadı` : '',
      sonuc.bozukGorseller.length ? `${sonuc.bozukGorseller.length} görsel bozuk olduğu için alınmadı` : '',
    ].filter(Boolean).join(', ')}. Bu görsellerin yerinde “görsel yok” görünür.</p>
  );
}

/** Bu bilgisayardaki günlük yedekler (K31, §10.10): yalnız Windows uygulamasında görünür. */
export function YerelYedekler({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [d, setD] = useState<YerelYedekDurumu | null>(null);
  const [liste, setListe] = useState<DriveYedegi[] | null>(null);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<GeriYuklemeSonucu | null>(null);

  const yukle = async () => {
    const x = await istemci.iste('yerelYedekDurumu', { evren });
    setD(x);
    if (x.var) istemci.iste('yerelYedekleri', { evren }).then(setListe, (e) => setHata(hataMetni(e)));
  };
  useEffect(() => { void yukle(); }, [evren, surum]);

  const simdi = async () => {
    setHata(null); setMesgul('yedekleniyor');
    try { setD(await istemci.iste('yerelYedekAl', { evren })); setListe(await istemci.iste('yerelYedekleri', { evren })); }
    catch (e) { setHata(hataMetni(e)); void yukle(); }
    setMesgul(null);
  };
  const ac = async (acik: boolean) => {
    setHata(null);
    try { setD(await istemci.iste('yerelYedekAyari', { evren, acik })); } catch (e) { setHata(hataMetni(e)); }
  };
  const klasor = async () => {
    setHata(null);
    try { await yedekKlasorunuAc(); } catch (e) { setHata(hataMetni(e)); }
  };
  const geriYukle = async (y: DriveYedegi) => {
    setHata(null); setMesgul(y.id);
    try { setSonuc(await istemci.iste('yereldenGeriYukle', { id: y.id })); }
    catch (e) { setHata(hataMetni(e)); }
    setMesgul(null);
  };

  if (!d?.var) return null;
  return (
    <div class="kart" style="margin-top:12px">
      <h3>Bu bilgisayardaki yedekler</h3>
      <p class="soluk kucuk">Program her gün bu bilgisayarın Belgeler klasöründeki “Dünya Atlası yedekleri” klasörüne bu evrenin tam yedeğini alır; internet gerekmez.
        Görseller bu klasörün içindeki “medya” klasöründe tek kopya olarak saklanır. Günlük yedekler {d.gunSayisi} gün, her ayın ilk yedeği {d.aySayisi} ay saklanır.</p>
      <label class="kucuk" style="display:flex;gap:8px;align-items:center">
        <input type="checkbox" checked={d.acik} onChange={(e) => void ac((e.target as HTMLInputElement).checked)} /> Her gün kendiliğinden yedek al
      </label>
      <p class="kucuk">{d.son
        ? <>Son yedek: <strong>{zamanYaz(d.son.zaman)}</strong>{d.son.dogrulandi ? ' · geri okunup doğrulandı' : ' · doğrulanamadı'}
          {d.son.eksikGorsel ? ` · ${d.son.eksikGorsel} görsel bu cihazda olmadığı için yedekte yok` : ''}</>
        : 'Bu evrenin bu bilgisayarda günlük yedeği henüz yok.'}</p>
      {!d.acik && <p class="soluk kucuk">Bu evren için günlük yedek kapalı. Elle yedek yine alınabilir.</p>}
      {d.hata && <p class="uyari kucuk">Son yedekleme denemesi başarısız oldu: {d.hata}</p>}
      <div class="satir" style="margin-top:8px">
        <button class="dugme" onClick={simdi} disabled={!!mesgul}>{mesgul === 'yedekleniyor' ? 'Yedekleniyor…' : 'Şimdi yedekle'}</button>
        <button class="dugme sade" onClick={klasor} title={d.yer ?? undefined}>Klasörü aç</button>
      </div>
      {sonuc && (
        <div style="margin-top:12px" role="status">
          <p>{sonuc.ayri ? 'Yedek ayrı bir evren olarak açıldı. Bu evrene dokunulmadı.' : 'Evren geri yüklendi.'}</p>
          <GorselUyarisi sonuc={sonuc} nerede="yedek klasöründe" />
          <button class="dugme ana" onClick={() => git(`/e/${sonuc.kod}`)}>Evreni aç</button>
        </div>
      )}
      {liste && liste.length > 0 && (
        <ul style="margin-top:12px;list-style:none;padding:0">
          {liste.map((y) => (
            <li key={y.id} class="satir">
              <span>{gunMetni(y.gun)} <span class="soluk kucuk">{y.zaman ? saatMetni(y.zaman) : ''}</span></span>
              <span class="bosluk" />
              <button class="dugme sade" onClick={() => geriYukle(y)} disabled={!!mesgul}
                title="Bu evren değişmez, yedek ayrı bir evren olarak açılır.">{mesgul === y.id ? 'Geri yükleniyor…' : 'Ayrı evren olarak aç'}</button>
            </li>
          ))}
        </ul>
      )}
      {hata && <p class="hata" role="alert">{hata}</p>}
    </div>
  );
}

// ---------- Evrenler ekranı: yedekten geri yükleme ----------
export function YedektenGeriYukle({ istemci, kapat, yenile }: { istemci: Istemci; kapat: () => void; yenile: () => void }) {
  const [veri, setVeri] = useState<Blob | null>(null);
  const [bilgi, setBilgi] = useState<YedekBilgisi | null>(null);
  const [sonuc, setSonuc] = useState<GeriYuklemeSonucu | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const sec = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    setHata(null); setBilgi(null); setSonuc(null); setVeri(null);
    if (!f) return;
    setMesgul(true);
    try {
      // Dosyanın kendisi verilir: içi istendikçe okunur, çok büyük yedek de belleğe tek seferde alınmaz.
      setBilgi(await istemci.iste('yedekIncele', { veri: f }));
      setVeri(f);
    } catch (err) { setHata(hataMetni(err)); }
    setMesgul(false);
  };

  const yukle = async () => {
    if (!veri) return;
    setMesgul(true); setHata(null);
    try { const r = await istemci.iste('yedektenYukle', { veri }); setSonuc(r); yenile(); }
    catch (err) { setHata(hataMetni(err)); }
    setMesgul(false);
  };

  const yerineKoy = async () => {
    if (!sonuc || !bilgi?.mevcut) return;
    try { await istemci.iste('evrenYerineKoy', { kopya: sonuc.kod, asil: bilgi.mevcut.kod }); yenile(); git(`/e/${sonuc.kod}`); }
    catch (err) { setHata(hataMetni(err)); }
  };

  return (
    <div class="kart" style="margin-top:16px">
      <div class="satir"><h3>Yedekten geri yükle</h3><span class="bosluk" /><button class="dugme sade" onClick={kapat}>Kapat</button></div>
      {!sonuc && (
        <>
          <p class="soluk kucuk">“Yedek al” ile indirdiğiniz dosyayı seçin. Önce içinde ne olduğu gösterilir, siz onaylamadan hiçbir şey yazılmaz.</p>
          <label class="dugme">Yedek dosyasını seç<input type="file" accept=".zip,application/zip" style="display:none" onChange={sec} /></label>
          {kabuk() && (
            <div style="margin-top:10px">
              <p class="soluk kucuk">Bu bilgisayarın günlük yedekleri Belgeler › Dünya Atlası yedekleri klasöründedir. Oradaki bir dosyayı seçerseniz görseller de o klasörden alınır.</p>
              <button class="dugme sade" onClick={() => yedekKlasorunuAc().catch((e) => setHata(hataMetni(e)))}>Klasörü aç</button>
            </div>
          )}
        </>
      )}
      {mesgul && <p class="soluk" role="status">Okunuyor…</p>}
      {bilgi && !sonuc && (
        <div style="margin-top:12px">
          <p><strong>{bilgi.evrenAdi}</strong></p>
          <p class="kucuk">Yedeğin alındığı an: {zamanYaz(bilgi.tarih)}<br />
            {bilgi.kayitSayisi} kayıt · {bilgi.islemSayisi} değişiklik · {bilgi.medyaSayisi} görsel</p>
          {bilgi.eksikMedya > 0 && <p class="uyari kucuk">Bu yedekte {bilgi.eksikMedya} görsel eksik; bu görseller geri gelmeyecek. Kayıtlar ve metinler yine geri yüklenebilir.</p>}
          {bilgi.mevcut
            ? <p class="uyari kucuk">Bu evren bu cihazda zaten var (“{bilgi.mevcut.ad}”). Var olan evren değişmez, yedek <strong>ayrı bir evren</strong> olarak açılır. İnceledikten sonra isterseniz asıl evrenin yerine koyabilirsiniz.</p>
            : <p class="kucuk">Bu evren bu cihazda yok, olduğu gibi geri yüklenecek.</p>}
          <button class="dugme ana" onClick={yukle} disabled={mesgul}>Geri yükle</button>
        </div>
      )}
      {sonuc && (
        <div style="margin-top:12px" role="status">
          <p>{sonuc.ayri ? 'Yedek ayrı bir evren olarak açıldı. Asıl evrene dokunulmadı.' : 'Evren geri yüklendi.'}</p>
          <GorselUyarisi sonuc={sonuc} />
          <div class="satir">
            <button class="dugme ana" onClick={() => git(`/e/${sonuc.kod}`)}>Evreni aç</button>
            {sonuc.ayri && bilgi?.mevcut && (
              <button class="dugme" onClick={yerineKoy} title="Hiçbir şey silinmez; asıl evren “eski” adıyla kalır.">Asıl evrenin yerine koy</button>
            )}
          </div>
          {sonuc.ayri && <p class="soluk kucuk">“Asıl evrenin yerine koy” hiçbir şeyi silmez. Yedekten gelen evren asıl adı alır, şimdiki evren “eski” adıyla listede kalır.</p>}
        </div>
      )}
      {hata && <p class="hata" role="alert">{hata}</p>}
    </div>
  );
}

// ---------- Evrenler ekranı: Markdown ya da prototip verisini içe aktarma ----------
export function IceAktar({ istemci, kapat, yenile }: { istemci: Istemci; kapat: () => void; yenile: () => void }) {
  const [dosyalar, setDosyalar] = useState<IceDosya[] | null>(null);
  const [rapor, setRapor] = useState<IceAktarimRaporu | null>(null);
  const [evrenAdi, setEvrenAdi] = useState('');
  const [sonuc, setSonuc] = useState<{ kod: string; gorselHatalari: string[] } | null>(null);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const sec = async (e: Event) => {
    const liste = [...((e.target as HTMLInputElement).files ?? [])];
    (e.target as HTMLInputElement).value = '';
    if (!liste.length) return;
    setHata(null); setRapor(null); setSonuc(null);
    setMesgul('Dosyalar okunuyor…');
    try {
      const okunan: IceDosya[] = [];
      for (const f of liste) {
        const yol = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
        if (/(^|\/)\./.test(yol)) continue; // gizli dosya ve klasörler
        if (METIN.test(yol) && f.size < EN_BUYUK) okunan.push({ yol, metin: await f.text() });
        else if (GORSEL.test(yol) && f.size < EN_BUYUK) okunan.push({ yol, veri: new Uint8Array(await f.arrayBuffer()), tur: f.type });
        else okunan.push({ yol });
      }
      const r = await istemci.iste('iceAktarIncele', { dosyalar: okunan });
      setDosyalar(okunan); setRapor(r);
      const ust = okunan[0]?.yol.includes('/') ? okunan[0].yol.split('/')[0] : '';
      setEvrenAdi((a) => a || ust || 'İçe alınan evren');
    } catch (err) { setHata(hataMetni(err)); }
    setMesgul(null);
  };

  const aktar = async (e: Event) => {
    e.preventDefault();
    if (!dosyalar) return;
    setMesgul('İçe aktarılıyor…'); setHata(null);
    try {
      const r = await istemci.iste('iceAktar', { dosyalar, evrenAdi });
      setSonuc({ kod: r.kod, gorselHatalari: r.gorselHatalari }); yenile();
    } catch (err) { setHata(hataMetni(err)); }
    setMesgul(null);
  };

  return (
    <div class="kart" style="margin-top:16px">
      <div class="satir"><h3>Dışarıdan içe aktar</h3><span class="bosluk" /><button class="dugme sade" onClick={kapat}>Kapat</button></div>
      {!sonuc && (
        <>
          <p class="soluk kucuk">Markdown notlarını (.md, .txt, örneğin bir Obsidian klasörü) ya da programın eski deneme hâlinden dışa aktarılan .json dosyasını seçin. Görselleri de seçebilirsiniz. İçe alınanlar <strong>yeni ve ayrı bir evrene</strong> yazılır, var olan evrenler değişmez.</p>
          <div class="satir">
            <label class="dugme">Dosyaları seç<input type="file" multiple accept=".md,.markdown,.txt,.json,image/*" style="display:none" onChange={sec} /></label>
            <label class="dugme">Klasör seç<input type="file" {...{ webkitdirectory: '' }} multiple style="display:none" onChange={sec} /></label>
          </div>
        </>
      )}
      {mesgul && <p class="soluk" role="status">{mesgul}</p>}
      {rapor && <RaporGorunumu rapor={rapor} />}
      {rapor && !sonuc && rapor.kayitSayisi > 0 && (
        <form class="satir" style="margin-top:12px" onSubmit={aktar}>
          <label for="ice-evren-adi" class="soluk">Yeni evrenin adı</label>
          <input id="ice-evren-adi" class="girdi" style="flex:1;min-width:200px" value={evrenAdi} onInput={(e) => setEvrenAdi((e.target as HTMLInputElement).value)} />
          <button class="dugme ana" type="submit" disabled={!evrenAdi.trim() || !!mesgul}>İçe aktar</button>
        </form>
      )}
      {sonuc && (
        <div style="margin-top:12px" role="status">
          <p>İçe aktarım bitti.</p>
          {sonuc.gorselHatalari.length > 0 && (
            <details><summary class="kucuk">{sonuc.gorselHatalari.length} görsel eklenemedi</summary>
              <ul class="kucuk">{sonuc.gorselHatalari.map((h) => <li>{h}</li>)}</ul></details>
          )}
          <button class="dugme ana" onClick={() => git(`/e/${sonuc.kod}`)}>Evreni aç</button>
        </div>
      )}
      {hata && <p class="hata" role="alert">{hata}</p>}
    </div>
  );
}

function RaporGorunumu({ rapor }: { rapor: IceAktarimRaporu }) {
  const ayrinti = (baslik: string, liste: string[]) => liste.length > 0 && (
    <details><summary class="kucuk">{baslik} ({liste.length})</summary>
      <ul class="kucuk">{liste.slice(0, 200).map((x) => <li>{x}</li>)}{liste.length > 200 && <li>… ve {liste.length - 200} tane daha</li>}</ul></details>
  );
  if (!rapor.kayitSayisi) {
    return <div style="margin-top:12px"><p>İçe alınacak kayıt bulunamadı.</p>{ayrinti('Okunamayan dosyalar', rapor.okunamayan)}</div>;
  }
  return (
    <div style="margin-top:12px">
      <p><strong>{rapor.kayitSayisi} kayıt</strong> bulundu · {rapor.baglantiSayisi} bağlantı · {rapor.gorselSayisi} görsel</p>
      <p class="kucuk">{rapor.turler.map(([t, n]) => `${turBul(t).ad}: ${n}`).join(' · ')}</p>
      {rapor.bahsedilenler.length > 0 && <p class="kucuk">Bağlantı verilmiş ama dosyası olmayan {rapor.bahsedilenler.length} ad <strong>fikir</strong> olarak oluşturulacak.</p>}
      {ayrinti('Fikir olarak oluşturulacak adlar', rapor.bahsedilenler)}
      {ayrinti('Aynı adlı kayıtlar (ikisi de alınır, bağlantılar ilkine gider)', rapor.tekrarAdlar)}
      {ayrinti('Tanınmayan türler (etiket olarak saklanacak)', rapor.taninmayanTurler)}
      {ayrinti('Tanınmayan alanlar (metnin sonuna yazılacak)', rapor.digerAlanlar)}
      {ayrinti('Düz metne dönüşecek biçimlendirmeler', rapor.kayiplar)}
      {ayrinti('Bulunamayan görseller', rapor.eksikGorseller)}
      {ayrinti('Okunamayan dosyalar', rapor.okunamayan)}
    </div>
  );
}
