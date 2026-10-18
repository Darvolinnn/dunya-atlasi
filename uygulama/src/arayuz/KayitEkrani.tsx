// Bir kaydın sayfası: adı, türü, karar durumu, kısa özet, okunuş, lakaplar ve etiketler, serbest metin,
// sürüm geçmişi (§10.8) ve çöp kutusuna taşıma.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { DegisebilirAlan, GunlukSatiri, Kayit, Spans } from '../veri/api';
import { KARARLAR, turBul } from '../alan/turler';
import { gizliAdimMi, islemAciklamasi, zamanYaz } from '../alan/islem-metni';
import { MetinEditoru, MetinGorunumu, type EditorDenetimi } from './MetinEditoru';
import { TurSecici } from './ortak';
import { git } from './Uygulama';

export function KayitEkrani({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string }) {
  const [kayit, setKayit] = useState<Kayit | null>(null);
  const [evrenAdi, setEvrenAdi] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [surum, setSurum] = useState(0);
  const [editorAnahtari, setEditorAnahtari] = useState(0);
  const [gecmisAcik, setGecmisAcik] = useState(false);
  const denetim = useRef<EditorDenetimi | null>(null);

  useEffect(() => { istemci.iste('kayit', { evren, kod }).then((k) => { setKayit(k); setHata(null); }, (e) => setHata(e.message)); }, [evren, kod, surum]);
  useEffect(() => { istemci.iste('evrenBilgisi', { evren }).then((b) => setEvrenAdi(b.ad), () => {}); }, [evren]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren && (d.kayitlar.includes(kod) || !d.kayitlar.length)) setSurum((s) => s + 1); }), [evren, kod]);
  useEffect(() => { if (kayit) document.title = `${kayit.ad} · Dünya Atlası`; return () => { document.title = 'Dünya Atlası'; }; }, [kayit?.ad]);

  if (hata) return <main class="sayfa"><p class="hata">{hata}</p><a href={`#/e/${evren}`}>Kayıtlara dön</a></main>;
  if (!kayit) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;

  const degistir = (alan: DegisebilirAlan, deger: string) => istemci.iste('kayitDegistir', { evren, kod, alan, deger });
  const tur = turBul(kayit.tur);

  return (
    <>
      <header class="ust">
        <a href={`#/e/${evren}`} class="dugme sade">← {evrenAdi || 'Kayıtlar'}</a>
        <span class="ad">{kayit.ad}</span>
        <span class="bosluk" />
        <button class="dugme sade" aria-expanded={gecmisAcik} onClick={() => setGecmisAcik(!gecmisAcik)}>Sürüm geçmişi</button>
      </header>
      <main class="sayfa kayit-sayfasi">
        {kayit.silindi && (
          <div class="uyari satir" style="margin-bottom:16px">
            <span style="flex:1">Bu kayıt {zamanYaz(kayit.silindi)} tarihinde çöp kutusuna taşındı.</span>
            <button class="dugme ana" onClick={() => istemci.iste('kayitGeriYukle', { evren, kod })}>Geri getir</button>
          </div>
        )}
        <div class="kayit-basi">
          <span class="tur-rozeti" title={tur.ad} aria-hidden="true">{tur.kisa}</span>
          <AlanGirdisi etiket="Ad" deger={kayit.ad} buyuk kaydet={(v) => degistir('ad', v)} zorunlu />
        </div>
        <div class="alanlar">
          <label class="alan">
            <span class="alan-adi">Tür</span>
            <TurSecici deger={kayit.tur} onDegis={(v) => degistir('tur', v)} />
          </label>
          <label class="alan">
            <span class="alan-adi">Karar durumu</span>
            <select class="girdi" value={kayit.karar} onChange={(e) => degistir('karar', (e.target as HTMLSelectElement).value)}>
              {KARARLAR.map((k) => <option value={k.kod}>{k.ad}</option>)}
            </select>
          </label>
          <div class="alan genis">
            <span class="alan-adi">Kısa özet</span>
            <AlanGirdisi etiket="Kısa özet" deger={kayit.ozet} kaydet={(v) => degistir('ozet', v)} ipucu="Bir satırda kim ya da ne olduğu" />
          </div>
          <div class="alan">
            <span class="alan-adi">Okunuş</span>
            <AlanGirdisi etiket="Okunuş" deger={kayit.okunus} kaydet={(v) => degistir('okunus', v)} ipucu="Örn. Jean → Jan" />
          </div>
          <div class="alan genis">
            <span class="alan-adi">Lakaplar ve başka adlar</span>
            <Liste ogeler={kayit.lakaplar} ekleEtiketi="Lakap ekle" ekle={(v) => istemci.iste('kayitListe', { evren, kod, liste: 'lakap', ekle: v })}
              cikar={(v) => istemci.iste('kayitListe', { evren, kod, liste: 'lakap', cikar: v })} />
          </div>
          <div class="alan genis">
            <span class="alan-adi">Etiketler</span>
            <Liste ogeler={kayit.etiketler} ekleEtiketi="Etiket ekle" ekle={(v) => istemci.iste('kayitListe', { evren, kod, liste: 'etiket', ekle: v })}
              cikar={(v) => istemci.iste('kayitListe', { evren, kod, liste: 'etiket', cikar: v })} />
          </div>
          {kayit.oncekiAdlar.length > 0 && (
            <p class="soluk kucuk genis">Önceki adları (aramada bulunur): {kayit.oncekiAdlar.join(', ')}</p>
          )}
        </div>

        <MetinEditoru key={editorAnahtari} istemci={istemci} evren={evren} kayit={kod} denetim={denetim} />

        {gecmisAcik && (
          <SurumGecmisi istemci={istemci} evren={evren} kayit={kayit} surum={surum}
            geriGetir={async (basliklar) => {
              await denetim.current?.kaydet();
              await istemci.iste('metinGeriYukle', { evren, kayit: kod, alan: 'govde', basliklar });
              setEditorAnahtari((n) => n + 1);
            }} />
        )}

        <div class="kayit-alti">
          <span class="soluk kucuk">Oluşturuldu {zamanYaz(kayit.olusturma)} · Son değişiklik {zamanYaz(kayit.duzenleme)}</span>
          <span class="bosluk" />
          {!kayit.silindi && (
            <button class="dugme tehlikeli" onClick={async () => {
              await denetim.current?.kaydet();
              await istemci.iste('kayitSil', { evren, kod });
              git(`/e/${evren}`);
            }}>Çöp kutusuna taşı</button>
          )}
        </div>
      </main>
    </>
  );
}

/** Tek satırlık alan: odaktan çıkınca ya da Enter'a basınca kaydeder, Esc ile vazgeçer. */
function AlanGirdisi({ etiket, deger, kaydet, ipucu, buyuk, zorunlu }: {
  etiket: string; deger: string; kaydet: (v: string) => Promise<unknown>; ipucu?: string; buyuk?: boolean; zorunlu?: boolean;
}) {
  const [yerel, setYerel] = useState(deger);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => setYerel(deger), [deger]);
  const bitir = async () => {
    if (yerel.trim() === deger.trim()) { setYerel(deger); return; }
    if (zorunlu && !yerel.trim()) { setYerel(deger); return; }
    try { await kaydet(yerel); setHata(null); } catch (e) { setHata((e as Error).message); }
  };
  return (
    <span class="alan-girdisi">
      <input class={buyuk ? 'girdi buyuk' : 'girdi'} aria-label={etiket} value={yerel} placeholder={ipucu}
        spellcheck={!buyuk} lang="tr"
        onInput={(e) => setYerel((e.target as HTMLInputElement).value)}
        onBlur={bitir}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') { setYerel(deger); setTimeout(() => (e.target as HTMLInputElement).blur()); }
        }} />
      {hata && <span class="hata kucuk">{hata}</span>}
    </span>
  );
}

function Liste({ ogeler, ekle, cikar, ekleEtiketi }: { ogeler: string[]; ekle: (v: string) => Promise<unknown>; cikar: (v: string) => Promise<unknown>; ekleEtiketi: string }) {
  const [yeni, setYeni] = useState('');
  return (
    <div class="liste">
      {ogeler.map((o) => (
        <span class="cip" key={o}>{o}<button type="button" aria-label={`${o} çıkar`} onClick={() => cikar(o)}>×</button></span>
      ))}
      <form class="cip-ekle" onSubmit={async (e) => { e.preventDefault(); if (!yeni.trim()) return; await ekle(yeni); setYeni(''); }}>
        <input class="girdi kucuk-girdi" aria-label={ekleEtiketi} placeholder={ekleEtiketi} value={yeni} lang="tr"
          onInput={(e) => setYeni((e.target as HTMLInputElement).value)} />
      </form>
    </div>
  );
}

function SurumGecmisi({ istemci, evren, kayit, surum, geriGetir }: {
  istemci: Istemci; evren: string; kayit: Kayit; surum: number; geriGetir: (b: string[]) => Promise<void>;
}) {
  const [satirlar, setSatirlar] = useState<GunlukSatiri[] | null>(null);
  const [secili, setSecili] = useState<{ satir: GunlukSatiri; spans: Spans } | null>(null);
  useEffect(() => { istemci.iste('kayitGecmisi', { evren, kod: kayit.kod }).then(setSatirlar); }, [kayit.kod, surum]);
  if (!satirlar) return null;
  const metinSurumleri = satirlar.filter((s) => s.tur === 'metin' && !gizliAdimMi(s.tur, s.veri));
  const enYeni = metinSurumleri[0]?.kod;
  const goster = async (s: GunlukSatiri) => {
    const r = await istemci.iste('metinSurumu', { evren, kayit: kayit.kod, alan: 'govde', basliklar: s.veri.basliklar as string[] });
    setSecili({ satir: s, spans: r.spans });
  };
  return (
    <section class="kart surum-gecmisi" aria-label="Sürüm geçmişi">
      <h2>Sürüm geçmişi</h2>
      <p class="soluk kucuk">Bu kayıtta yapılan her değişiklik. Metnin eski bir hâline bakabilir ve onu geri getirebilirsiniz; geri getirmek de yeni bir sürüm olarak eklenir, hiçbir sürüm silinmez.</p>
      {secili && (
        <div class="onizleme">
          <div class="satir">
            <strong style="flex:1">{zamanYaz(secili.satir.zaman)} tarihindeki metin</strong>
            {secili.satir.kod !== enYeni && (
              <button class="dugme ana" onClick={async () => { await geriGetir(secili.satir.veri.basliklar as string[]); setSecili(null); }}>Bu hâli geri getir</button>
            )}
            <button class="dugme" onClick={() => setSecili(null)}>Kapat</button>
          </div>
          <MetinGorunumu spans={secili.spans} />
        </div>
      )}
      <ul class="gunluk">
        {satirlar.filter((s) => !gizliAdimMi(s.tur, s.veri)).map((s) => (
          <li key={s.kod}>
            <span>{islemAciklamasi(s.tur, s.veri, () => kayit.ad)}</span>
            <span class="satir">
              <span class="soluk kucuk">{zamanYaz(s.zaman)}</span>
              {s.tur === 'metin' && <button class="dugme sade kucuk" onClick={() => goster(s)}>Metni göster</button>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
