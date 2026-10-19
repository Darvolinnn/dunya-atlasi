// F32 Bakım ve tekrarlar (§16.1): bir yapının ya da düzenin bakım tanımı, bakım kayıtları,
// seçilen tarihteki bakım durumu hesabı ve uzman/malzeme ters görünümleri.
import { useState } from 'preact/hooks';
import {
  BAKIM_BIRIMLERI,
  BAKIM_BIRIM_ADLARI,
  BAKIM_KAYDI_DURUMLARI,
  BAKIM_KAYDI_DURUM_ADLARI,
  bakimSahibiMi,
  siklikYazisi,
  sureYazisi,
  type BakimBirimi,
  type BakimKaydiDurumu,
} from '../alan/bakim';
import type {
  BakimDosyasi,
  BakimDurumuSonucu,
  BakimTanimi,
  BakimTanimiOkumasi,
  BakimUzmanligiSonucu,
  KisaKayit,
} from '../veri/api';
import type { Istemci } from '../veri/istemci';
import { useYukle } from './Anlati';
import { KayitSec } from './KayitBolumleri';
import { KararRozeti, KararSecici } from './ortak';

const hataYaz = (e: unknown) => (e as Error).message;
type Secim = { kod: string; ad: string };
type MalzemeSatiri = { kayit: Secim | null; metin: string };

export function BakimBolumu({
  istemci,
  evren,
  kod,
  tur,
  saltOkunur,
}: {
  istemci: Istemci;
  evren: string;
  kod: string;
  tur: string;
  saltOkunur?: boolean;
}) {
  const [tarih, setTarih] = useState('');
  const [tanimFormu, setTanimFormu] = useState<BakimTanimiOkumasi | 'yeni' | null>(null);
  const [kayitFormuTanim, setKayitFormuTanim] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const sahipMi = bakimSahibiMi(tur);
  const [dosya] = useYukle<BakimDosyasi | null>(
    istemci,
    evren,
    () => (sahipMi ? istemci.iste('bakimOku', { evren, kayit: kod, cop: true }) : Promise.resolve(null)),
    [kod, tur],
  );
  const [durumSonucu] = useYukle<BakimDurumuSonucu | null>(
    istemci,
    evren,
    () => (sahipMi ? istemci.iste('bakimDurumu', { evren, kayit: kod, tarih: tarih.trim() || null }) : Promise.resolve(null)),
    [kod, tur, tarih],
  );

  if (!sahipMi || !dosya) return null;

  const etkinTanimlar = dosya.tanimlar.filter((t) => t.silindi === null);
  const kaldirilanTanimlar = dosya.tanimlar.filter((t) => t.silindi !== null);
  const durumHaritasi = new Map((durumSonucu?.tanimlar ?? []).map((d) => [d.tanim.kod, d]));
  const bag = (k: KisaKayit) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;

  const tanimKaldir = (tanimKod: string, geri: boolean) => {
    istemci
      .iste(geri ? 'bakimTanimGeriYukle' : 'bakimTanimSil', { evren, kod: tanimKod })
      .then(() => setHata(null), (e) => setHata(hataYaz(e)));
  };

  const kayitKaldir = (kayitKod: string, geri: boolean) => {
    istemci
      .iste(geri ? 'bakimKaydiGeriYukle' : 'bakimKaydiSil', { evren, kod: kayitKod })
      .then(() => setHata(null), (e) => setHata(hataYaz(e)));
  };

  return (
    <section class="surecler bakim-bolumu" aria-label="Bakım ve tekrarlar">
      <div class="satir">
        <h2>Bakım ve tekrarlar</h2>
        <span class="bosluk" />
        {!saltOkunur && etkinTanimlar.length > 0 && tanimFormu === null && (
          <button type="button" class="dugme sade kucuk" onClick={() => setTanimFormu('yeni')}>
            Bakım tanımı ekle
          </button>
        )}
      </div>

      {etkinTanimlar.length === 0 && tanimFormu === null && (
        <div class="satir">
          <p class="soluk kucuk" style="margin:0">
            Bu yerin ya da düzenin bakımı tanımlanmamış. İsterseniz sıklığını, uzmanını ve bakım yapılmazsa ne olacağını yazabilirsiniz.
          </p>
          {!saltOkunur && (
            <button type="button" class="dugme sade kucuk" onClick={() => setTanimFormu('yeni')}>
              Bakım tanımı ekle
            </button>
          )}
        </div>
      )}

      {etkinTanimlar.length > 0 && (
        <div class="satir kucuk" style="margin-bottom:8px">
          <label class="satir" style="gap:6px">
            <span>Hangi tarihte?</span>
            <input
              class="girdi"
              style="width:180px"
              lang="tr"
              aria-label="Hangi tarihte?"
              placeholder="En son durum (ör. 435)"
              value={tarih}
              onInput={(e) => setTarih((e.target as HTMLInputElement).value)}
            />
          </label>
          {tarih.trim() && (
            <button type="button" class="dugme sade kucuk" onClick={() => setTarih('')}>
              Temizle
            </button>
          )}
        </div>
      )}

      {tanimFormu !== null && !saltOkunur && (
        <BakimTanimFormu
          istemci={istemci}
          evren={evren}
          kayitKod={kod}
          eski={tanimFormu === 'yeni' ? null : tanimFormu}
          kapat={() => setTanimFormu(null)}
        />
      )}

      {etkinTanimlar.map((t) => {
        const hesap = durumHaritasi.get(t.kod);
        const aktifKayitlar = t.kayitlar.filter((k) => k.silindi === null);
        const silinenKayitlar = t.kayitlar.filter((k) => k.silindi !== null);
        return (
          <div class={`kart bakim-karti karar-satir-${t.karar}`} key={t.kod}>
            <div class="satir">
              <strong>{t.ad}</strong>
              <span class="kucuk soluk">· {siklikYazisi(t.siklik)}</span>
              <KararRozeti karar={t.karar} />
              {t.catismali && <span class="rozet uyari">İki cihazda farklı yazıldı</span>}
              <span class="bosluk" />
              {!saltOkunur && (
                <>
                  <button type="button" class="dugme sade kucuk" onClick={() => setTanimFormu(t)}>
                    Düzenle
                  </button>
                  <button type="button" class="dugme sade kucuk tehlikeli" onClick={() => tanimKaldir(t.kod, false)}>
                    Kaldır
                  </button>
                </>
              )}
            </div>

            {hesap && (
              <div class="bakim-hesap kucuk">
                <p style="margin:4px 0">{hesap.ozet}</p>
                {hesap.kesinti && (
                  <p class="kucuk" style="margin:2px 0">
                    “{hesap.kesinti}”
                  </p>
                )}
                {hesap.uzmanNotlari.map((n, i) => (
                  <p class="soluk kucuk" style="margin:2px 0" key={i}>
                    {n}
                  </p>
                ))}
                <p class="soluk kucuk" style="margin:2px 0">
                  Dayanak: {hesap.dayanak}. {hesap.not}
                </p>
              </div>
            )}

            <div class="kucuk bakim-ayrintilar">
              {t.uzmanlar.length > 0 && (
                <div>
                  <strong>Uzmanlar: </strong>
                  {t.uzmanlar.map((u, i) => (
                    <span key={u.kod}>
                      {i ? ', ' : ''}
                      {bag(u)}
                    </span>
                  ))}
                </div>
              )}
              {t.malzemeler.length > 0 && (
                <div>
                  <strong>Malzemeler: </strong>
                  {t.malzemeler.map((m, i) => (
                    <span key={i}>
                      {i ? ', ' : ''}
                      {m.kayit ? bag(m.kayit) : null}
                      {m.kayit && m.metin ? ` (${m.metin})` : m.metin}
                    </span>
                  ))}
                </div>
              )}
              {t.bedel && (
                <div>
                  <strong>Bedel: </strong>
                  <span>{t.bedel}</span>
                </div>
              )}
              {t.kesinti && (
                <div>
                  <strong>Bakım yapılmazsa: </strong>
                  <span>{t.kesinti}</span>
                  {t.kesintiSuresi && <span class="soluk"> (bakım geciktikten {sureYazisi(t.kesintiSuresi)} sonra)</span>}
                </div>
              )}
            </div>

            {aktifKayitlar.length > 0 && (
              <div class="bakim-tablo-sarmal">
                <table class="karsilastirma kucuk bakim-tablosu">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Durum</th>
                      <th>Yapan</th>
                      <th>Olay</th>
                      <th>Not</th>
                      {!saltOkunur && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {aktifKayitlar.map((k) => (
                      <tr key={k.kod}>
                        <td>{k.tarih.ifade}</td>
                        <td>
                          {BAKIM_KAYDI_DURUM_ADLARI[k.durum]}
                          {k.catismali && <span class="rozet uyari"> İki cihazda farklı yazıldı</span>}
                        </td>
                        <td>
                          {k.yapan ? bag(k.yapan) : <span class="soluk">—</span>}
                          {k.bilgiNotu && <div class="soluk kucuk">{k.bilgiNotu}</div>}
                        </td>
                        <td>{k.olay ? bag(k.olay) : <span class="soluk">—</span>}</td>
                        <td>{k.not || <span class="soluk">—</span>}</td>
                        {!saltOkunur && (
                          <td>
                            <button
                              type="button"
                              class="dugme sade kucuk tehlikeli"
                              onClick={() => kayitKaldir(k.kod, false)}
                            >
                              Kaldır
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {silinenKayitlar.length > 0 && !saltOkunur && (
              <details class="kucuk">
                <summary>Kaldırılan bakım kayıtları ({silinenKayitlar.length})</summary>
                <ul>
                  {silinenKayitlar.map((k) => (
                    <li key={k.kod}>
                      {k.tarih.ifade} · {BAKIM_KAYDI_DURUM_ADLARI[k.durum]}
                      {k.not ? ` · ${k.not}` : ''}{' '}
                      <button type="button" class="dugme sade kucuk" onClick={() => kayitKaldir(k.kod, true)}>
                        Geri getir
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {!saltOkunur && (
              <div style="margin-top:6px">
                {kayitFormuTanim === t.kod ? (
                  <BakimKaydiFormu
                    istemci={istemci}
                    evren={evren}
                    tanimKod={t.kod}
                    kapat={() => setKayitFormuTanim(null)}
                  />
                ) : (
                  <button type="button" class="dugme sade kucuk" onClick={() => setKayitFormuTanim(t.kod)}>
                    Bakım kaydı ekle
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {kaldirilanTanimlar.length > 0 && !saltOkunur && (
        <details class="kucuk">
          <summary>Kaldırılan bakım tanımları ({kaldirilanTanimlar.length})</summary>
          <ul>
            {kaldirilanTanimlar.map((t) => (
              <li key={t.kod}>
                {t.ad} · {siklikYazisi(t.siklik)}{' '}
                <button type="button" class="dugme sade kucuk" onClick={() => tanimKaldir(t.kod, true)}>
                  Geri getir
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}

function BakimTanimFormu({
  istemci,
  evren,
  kayitKod,
  eski,
  kapat,
}: {
  istemci: Istemci;
  evren: string;
  kayitKod: string;
  eski: BakimTanimiOkumasi | null;
  kapat: () => void;
}) {
  const [ad, setAd] = useState(eski?.ad ?? '');
  const [siklikDeger, setSiklikDeger] = useState(eski?.siklik ? String(eski.siklik.deger) : '');
  const [siklikBirim, setSiklikBirim] = useState<BakimBirimi>(eski?.siklik?.birim ?? 'yil');
  const [uzmanlar, setUzmanlar] = useState<Secim[]>(
    eski?.uzmanlar.map((u) => ({ kod: u.kod, ad: u.ad })) ?? [],
  );
  const [malzemeler, setMalzemeler] = useState<MalzemeSatiri[]>(
    eski?.malzemeler.map((m) => ({
      kayit: m.kayit ? { kod: m.kayit.kod, ad: m.kayit.ad } : null,
      metin: m.metin,
    })) ?? [],
  );
  const [bedel, setBedel] = useState(eski?.bedel ?? '');
  const [kesinti, setKesinti] = useState(eski?.kesinti ?? '');
  const [kesintiDeger, setKesintiDeger] = useState(eski?.kesintiSuresi ? String(eski.kesintiSuresi.deger) : '');
  const [kesintiBirim, setKesintiBirim] = useState<BakimBirimi>(eski?.kesintiSuresi?.birim ?? 'ay');
  const [karar, setKarar] = useState(eski?.karar ?? 'kesin');
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = (e: Event) => {
    e.preventDefault();
    const sDeger = siklikDeger.trim() === '' ? null : Number(siklikDeger);
    const kDeger = kesintiDeger.trim() === '' ? null : Number(kesintiDeger);
    const tanim: BakimTanimi = {
      kayit: kayitKod,
      ad,
      siklik: sDeger !== null ? { deger: sDeger, birim: siklikBirim } : null,
      uzmanlar: uzmanlar.map((u) => u.kod),
      malzemeler: malzemeler.map((m) => ({ kayit: m.kayit?.kod ?? null, metin: m.metin })),
      bedel,
      kesinti,
      kesintiSuresi: kDeger !== null ? { deger: kDeger, birim: kesintiBirim } : null,
      karar,
    };
    istemci
      .iste('bakimTanimYaz', { evren, kod: eski?.kod ?? null, tanim })
      .then(() => kapat(), (err) => setHata(hataYaz(err)));
  };

  return (
    <form class="kart bakim-formu" onSubmit={kaydet}>
      <label class="alan">
        <span class="alan-adi">Bakım adı</span>
        <input
          class="girdi"
          lang="tr"
          maxLength={80}
          placeholder="Ör. Kapı taşlarının yeniden mühürlenmesi"
          value={ad}
          onInput={(e) => setAd((e.target as HTMLInputElement).value)}
        />
      </label>

      <div class="satir">
        <label class="alan">
          <span class="alan-adi">Ne sıklıkla yapılmalı? (Boşsa bilinmiyor)</span>
          <span class="satir">
            <input
              class="girdi"
              style="width:90px"
              type="number"
              min="1"
              placeholder="Sayı"
              value={siklikDeger}
              onInput={(e) => setSiklikDeger((e.target as HTMLInputElement).value)}
            />
            <select
              class="girdi"
              aria-label="Sıklık birimi"
              value={siklikBirim}
              onChange={(e) => setSiklikBirim((e.target as HTMLSelectElement).value as BakimBirimi)}
            >
              {BAKIM_BIRIMLERI.map((b) => (
                <option value={b}>{BAKIM_BIRIM_ADLARI[b]}</option>
              ))}
            </select>
          </span>
        </label>

        <label class="alan">
          <span class="alan-adi">Bakım geciktikten ne kadar sonra sorun başlar?</span>
          <span class="satir">
            <input
              class="girdi"
              style="width:90px"
              type="number"
              min="1"
              placeholder="İsteğe bağlı"
              value={kesintiDeger}
              onInput={(e) => setKesintiDeger((e.target as HTMLInputElement).value)}
            />
            <select
              class="girdi"
              aria-label="Kesinti süresi birimi"
              value={kesintiBirim}
              onChange={(e) => setKesintiBirim((e.target as HTMLSelectElement).value as BakimBirimi)}
            >
              {BAKIM_BIRIMLERI.map((b) => (
                <option value={b}>{BAKIM_BIRIM_ADLARI[b]}</option>
              ))}
            </select>
          </span>
        </label>
      </div>

      <div class="alan">
        <span class="alan-adi">Uzmanlar (bakımı yapabilen kişiler, topluluklar ya da makamlar)</span>
        <div class="satir">
          {uzmanlar.map((u) => (
            <span class="rozet" key={u.kod}>
              {u.ad}{' '}
              <button
                type="button"
                class="dugme sade kucuk"
                aria-label={`${u.ad} uzmanını çıkar`}
                onClick={() => setUzmanlar(uzmanlar.filter((x) => x.kod !== u.kod))}
              >
                ×
              </button>
            </span>
          ))}
          {uzmanlar.length < 20 && (
            <KayitSec
              istemci={istemci}
              evren={evren}
              secili={null}
              etiket="Uzman ekle"
              sec={(s) => {
                if (s && !uzmanlar.some((x) => x.kod === s.kod)) setUzmanlar([...uzmanlar, s]);
              }}
            />
          )}
        </div>
      </div>

      <div class="alan">
        <span class="alan-adi">Malzemeler</span>
        {malzemeler.map((m, i) => (
          <div class="satir" key={i}>
            <KayitSec
              istemci={istemci}
              evren={evren}
              secili={m.kayit}
              etiket="Kayıt seç (isteğe bağlı)"
              sec={(s) =>
                setMalzemeler(malzemeler.map((x, j) => (j === i ? { ...x, kayit: s } : x)))
              }
            />
            {m.kayit && (
              <button
                type="button"
                class="dugme sade kucuk"
                aria-label="Malzeme kaydını kaldır"
                onClick={() =>
                  setMalzemeler(malzemeler.map((x, j) => (j === i ? { ...x, kayit: null } : x)))
                }
              >
                ×
              </button>
            )}
            <input
              class="girdi"
              style="flex:1;min-width:140px"
              lang="tr"
              maxLength={80}
              placeholder="Miktar ya da açıklama (ör. iki külçe gümüş)"
              value={m.metin}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setMalzemeler(malzemeler.map((x, j) => (j === i ? { ...x, metin: v } : x)));
              }}
            />
            <button
              type="button"
              class="dugme sade kucuk"
              aria-label="Malzeme satırını çıkar"
              onClick={() => setMalzemeler(malzemeler.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        {malzemeler.length < 20 && (
          <button
            type="button"
            class="dugme sade kucuk"
            onClick={() => setMalzemeler([...malzemeler, { kayit: null, metin: '' }])}
          >
            Malzeme ekle
          </button>
        )}
      </div>

      <label class="alan">
        <span class="alan-adi">Bedel</span>
        <input
          class="girdi"
          lang="tr"
          maxLength={200}
          placeholder="Ör. her seferinde bir gümüş fıçı"
          value={bedel}
          onInput={(e) => setBedel((e.target as HTMLInputElement).value)}
        />
      </label>

      <label class="alan">
        <span class="alan-adi">Bakım yapılmazsa ne olur?</span>
        <textarea
          class="girdi"
          lang="tr"
          rows={2}
          maxLength={500}
          placeholder="Ör. Kapı önce titrer, üç ay sonra kapanır"
          value={kesinti}
          onInput={(e) => setKesinti((e.target as HTMLTextAreaElement).value)}
        />
      </label>

      <label class="alan">
        <span class="alan-adi">Karar durumu</span>
        <KararSecici etiket="Bakım tanımı" karar={karar} onDegis={setKarar} />
      </label>

      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button type="submit" class="dugme ana kucuk">
          Kaydet
        </button>
        <button type="button" class="dugme sade kucuk" onClick={kapat}>
          Vazgeç
        </button>
      </div>
    </form>
  );
}

function BakimKaydiFormu({
  istemci,
  evren,
  tanimKod,
  kapat,
}: {
  istemci: Istemci;
  evren: string;
  tanimKod: string;
  kapat: () => void;
}) {
  const [tarih, setTarih] = useState('');
  const [durum, setDurum] = useState<BakimKaydiDurumu>('yapildi');
  const [yapan, setYapan] = useState<Secim | null>(null);
  const [olay, setOlay] = useState<Secim | null>(null);
  const [not, setNot] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = (e: Event) => {
    e.preventDefault();
    istemci
      .iste('bakimKaydiYaz', {
        evren,
        kayit: {
          tanim: tanimKod,
          tarih,
          durum,
          yapan: yapan?.kod ?? null,
          olay: olay?.kod ?? null,
          not,
        },
      })
      .then(() => kapat(), (err) => setHata(hataYaz(err)));
  };

  return (
    <form class="kart bakim-kaydi-formu" onSubmit={kaydet}>
      <div class="satir">
        <label class="alan">
          <span class="alan-adi">Tarih</span>
          <input
            class="girdi"
            style="width:150px"
            lang="tr"
            placeholder="Ör. 428 ya da yaklaşık 420"
            value={tarih}
            onInput={(e) => setTarih((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="alan">
          <span class="alan-adi">Durum</span>
          <select
            class="girdi"
            value={durum}
            onChange={(e) => setDurum((e.target as HTMLSelectElement).value as BakimKaydiDurumu)}
          >
            {BAKIM_KAYDI_DURUMLARI.map((d) => (
              <option value={d}>{BAKIM_KAYDI_DURUM_ADLARI[d]}</option>
            ))}
          </select>
        </label>
      </div>

      <div class="satir">
        <div class="alan">
          <span class="alan-adi">Yapan (isteğe bağlı)</span>
          <span class="satir">
            <KayitSec istemci={istemci} evren={evren} secili={yapan} etiket="Yapanı seç" sec={setYapan} />
            {yapan && (
              <button type="button" class="dugme sade kucuk" aria-label="Yapanı kaldır" onClick={() => setYapan(null)}>
                ×
              </button>
            )}
          </span>
        </div>
        <div class="alan">
          <span class="alan-adi">Anlatıldığı olay ya da sahne (isteğe bağlı)</span>
          <span class="satir">
            <KayitSec
              istemci={istemci}
              evren={evren}
              secili={olay}
              etiket="Olay ya da sahne seç"
              sec={setOlay}
            />
            {olay && (
              <button type="button" class="dugme sade kucuk" aria-label="Olayı kaldır" onClick={() => setOlay(null)}>
                ×
              </button>
            )}
          </span>
        </div>
      </div>

      <label class="alan">
        <span class="alan-adi">Kısa not</span>
        <input
          class="girdi"
          lang="tr"
          maxLength={200}
          value={not}
          onInput={(e) => setNot((e.target as HTMLInputElement).value)}
        />
      </label>

      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button type="submit" class="dugme ana kucuk">
          Ekle
        </button>
        <button type="button" class="dugme sade kucuk" onClick={kapat}>
          Vazgeç
        </button>
      </div>
    </form>
  );
}

export function BakimUzmanligiBolumu({
  istemci,
  evren,
  kod,
}: {
  istemci: Istemci;
  evren: string;
  kod: string;
}) {
  const [sonuc] = useYukle<BakimUzmanligiSonucu>(
    istemci,
    evren,
    () => istemci.iste('bakimUzmanligi', { evren, kayit: kod }),
    [kod],
  );
  if (!sonuc || (sonuc.uzmanOldugu.length === 0 && sonuc.malzemeOldugu.length === 0)) return null;

  return (
    <section class="surecler bakim-uzmanligi" aria-label="Bakım bağlantıları">
      {sonuc.uzmanOldugu.length > 0 && (
        <div class="kucuk">
          <h2>Bakımını yapabildiği yerler</h2>
          <ul>
            {sonuc.uzmanOldugu.map((u) => (
              <li key={u.tanimKod}>
                <a href={`#/e/${evren}/k/${u.yer.kod}`}>{u.yer.ad}</a>: {u.ad}{' '}
                <span class="soluk">({siklikYazisi(u.siklik)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {sonuc.malzemeOldugu.length > 0 && (
        <div class="kucuk">
          <h2>Bakımında kullanıldığı yerler</h2>
          <ul>
            {sonuc.malzemeOldugu.map((m) => (
              <li key={m.tanimKod}>
                <a href={`#/e/${evren}/k/${m.yer.kod}`}>{m.yer.ad}</a>: {m.ad}{' '}
                <span class="soluk">
                  ({siklikYazisi(m.siklik)}
                  {m.metin ? ` · ${m.metin}` : ''})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
