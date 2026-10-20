// Hukuk ve statü (§15-11): kural yazma ve bir kişiye bir yerde uygulanabilecek kurallar. Resmî kural ile fiilî
// uygulama ayrıdır; çatışan yetkiler yan yana gösterilir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { HukukKurali, HukukTanimGirdisi, UygulananKurallar } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import { KuralOrnekleriBolumu } from './KuralAtolyesi';
import { geriAlinabilir } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
export const HUKUK_SAHIPLERI = ['siyasi', 'kultur', 'inanc', 'topluluk', 'sehir', 'mekan', 'makam'];
const TURLER = [{ kod: 'yasak', ad: 'Yasak' }, { kod: 'hak', ad: 'Hak' }, { kod: 'yukumluluk', ad: 'Yükümlülük' }] as const;
const FIILI = [{ kod: '', ad: 'Bilinmiyor' }, { kod: 'uygulaniyor', ad: 'Uygulanıyor' }, { kod: 'gevsek', ad: 'Gevşek uygulanıyor' }, { kod: 'uygulanmiyor', ad: 'Kâğıt üzerinde kaldı' }];
const ILISKILER = [
  { kod: 'uye', ad: 'üyesi' }, { kod: 'kulturu', ad: 'kültüründen' }, { kod: 'turu', ad: 'türünden' },
  { kod: 'yurutur', ad: 'makamını yürüten' }, { kod: 'hizmet', ad: 'hizmetinde' }, { kod: 'yasar', ad: 'orada yaşayan' },
];
const turAdi = (t: string) => TURLER.find((x) => x.kod === t)?.ad ?? t;

type Taslak = HukukTanimGirdisi & { formul: string };
const taslakYap = (k: HukukKurali): Taslak => {
  const { formul: _f, ...t } = structuredClone(k.tanim);
  return { ...t, baslangic: k.tanim.baslangic?.ifade ?? '', bitis: k.tanim.bitis?.ifade ?? '', formul: k.formulYazisi ?? '' };
};

export function HukukKurallariBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [l, setL] = useState<HukukKurali[] | null>(null);
  const [ad, setAd] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('hukukKurallari', { evren, sahip: kod }).then(setL, () => {}); }, [kod, surum]);
  if (!l) return null;
  return (
    <section class="surecler" aria-label="Hukuk kuralları">
      <h2>Hukuk kuralları</h2>
      <p class="soluk kucuk">Kime, nerede neyin yasak, hak ya da yükümlülük olduğunu ve yaptırımını yazın. Kâğıttaki kuralı ve gerçekte nasıl uygulandığını ayrı yazın.</p>
      {l.map((k) => <HukukKuraliDuzenleyici key={k.kod} istemci={istemci} evren={evren} k={k} surum={surum} />)}
      <form class="satir" onSubmit={(e) => { e.preventDefault(); istemci.iste('hukukKuraliOlustur', { evren, sahip: kod, ad }).then(() => { setAd(''); setHata(null); }, (x) => setHata(hataYaz(x))); }}>
        <input class="girdi" style="flex:1;min-width:180px" lang="tr" aria-label="Yeni hukuk kuralının adı" placeholder="Yeni kural (ör. Surda silah yasağı)" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
        <button class="dugme kucuk" type="submit" disabled={!ad.trim()}>Hukuk kuralı ekle</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}

function HukukKuraliDuzenleyici({ istemci, evren, k, surum }: { istemci: Istemci; evren: string; k: HukukKurali; surum: number }) {
  const kayitli = JSON.stringify(taslakYap(k));
  const [t, setT] = useState<Taslak>(() => taslakYap(k));
  const [adlar, setAdlar] = useState<Record<string, string>>({});
  const [hata, setHata] = useState<string | null>(null);
  const [formulKipi, setFormulKipi] = useState(!!k.formulYazisi);
  useEffect(() => { setT(taslakYap(k)); if (k.formulYazisi) setFormulKipi(true); }, [kayitli]);
  const ad = (kod: string) => adlar[kod] ?? (k.kimlere.find((x) => x.hedef === kod)?.hedefKayit.ad ?? (k.yer?.kod === kod ? k.yer.ad : '…'));
  const degisti = JSON.stringify(t) !== kayitli;
  const yaz = (f: (x: Taslak) => void) => { const y = structuredClone(t); f(y); setT(y); };
  return (
    <details class="kart surec-kurali" open={!k.tanim.konu}>
      <summary><strong>{k.tanim.ad}</strong> <span class="soluk kucuk">· {turAdi(k.tanim.tur)}{k.tanim.konu ? `: ${k.tanim.konu}` : ''}</span></summary>
      <div class="satir">
        <input class="girdi" style="flex:2;min-width:140px" lang="tr" aria-label="Kuralın adı" value={t.ad} onInput={(e) => yaz((x) => { x.ad = (e.target as HTMLInputElement).value; })} />
        <select class="girdi kucuk-secim" aria-label="Kuralın türü" value={t.tur} onChange={(e) => yaz((x) => { x.tur = (e.target as HTMLSelectElement).value as Taslak['tur']; })}>
          {TURLER.map((x) => <option value={x.kod}>{x.ad}</option>)}
        </select>
      </div>
      <input class="girdi" lang="tr" aria-label="Kuralın konusu" placeholder="Konusu (ör. kılıç taşımak). Konusu aynı yazılan kurallar karşılaştırılır." value={t.konu} onInput={(e) => yaz((x) => { x.konu = (e.target as HTMLInputElement).value; })} />
      <div class="satir kucuk">
        <span class="soluk">Kime uygulanacağı:</span>
        <button class={`dugme kucuk ${formulKipi ? 'sade' : 'ana'}`} aria-pressed={!formulKipi} disabled={!!t.formul.trim()} title={t.formul.trim() ? 'Önce formülü boşaltın' : undefined} onClick={() => setFormulKipi(false)}>Koşul listesi</button>
        <button class={`dugme kucuk ${formulKipi ? 'ana' : 'sade'}`} aria-pressed={formulKipi} disabled={!!t.kimlere.length} title={t.kimlere.length ? 'Önce koşul listesini boşaltın' : undefined} onClick={() => setFormulKipi(true)}>Formül</button>
      </div>
      {formulKipi ? <FormulYazici istemci={istemci} evren={evren} deger={t.formul} degistir={(v) => yaz((x) => { x.formul = v; })} /> : <div class="kucuk">
        <span class="soluk">Kimlere: </span>{!t.kimlere.length && <span class="soluk">herkese</span>}
        {t.kimlere.map((c, i) => (
          <span class="satir" key={i}>
            <label class="satir"><input type="checkbox" checked={c.degil} onChange={() => yaz((x) => { x.kimlere[i].degil = !c.degil; })} /> değil</label>
            <KayitSec istemci={istemci} evren={evren} secili={{ kod: c.hedef, ad: ad(c.hedef) }} sec={(s) => { if (s) { setAdlar({ ...adlar, [s.kod]: s.ad }); yaz((x) => { x.kimlere[i].hedef = s.kod; }); } }} />
            <select class="girdi kucuk-secim" aria-label="Koşulun ilişkisi" value={c.iliski} onChange={(e) => yaz((x) => { x.kimlere[i].iliski = (e.target as HTMLSelectElement).value; })}>
              {ILISKILER.map((r) => <option value={r.kod}>{r.ad}</option>)}
            </select>
            <button class="dugme sade kucuk" aria-label="Koşulu kaldır" onClick={() => yaz((x) => { x.kimlere.splice(i, 1); })}>×</button>
          </span>
        ))}
        <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Koşul ekle" sec={(s) => { if (s) { setAdlar({ ...adlar, [s.kod]: s.ad }); yaz((x) => { x.kimlere.push({ iliski: 'uye', hedef: s.kod, degil: false }); }); } }} />
      </div>}
      <div class="satir kucuk">
        <span class="soluk">Nerede:</span>
        <KayitSec istemci={istemci} evren={evren} secili={t.yer ? { kod: t.yer, ad: ad(t.yer) } : null} etiket="Sahibinin yetki bölgesinde" sec={(s) => { if (s) { setAdlar({ ...adlar, [s.kod]: s.ad }); yaz((x) => { x.yer = s.kod; }); } }} />
        {t.yer && <button class="dugme sade kucuk" onClick={() => yaz((x) => { x.yer = null; })}>Kaldır</button>}
      </div>
      <input class="girdi" lang="tr" aria-label="Yaptırım" placeholder="Yaptırım (isteğe bağlı)" value={t.yaptirim} onInput={(e) => yaz((x) => { x.yaptirim = (e.target as HTMLInputElement).value; })} />
      <div class="satir">
        <select class="girdi kucuk-secim" aria-label="Fiilen" value={t.fiili ?? ''} onChange={(e) => yaz((x) => { x.fiili = ((e.target as HTMLSelectElement).value || null) as Taslak['fiili']; })}>
          {FIILI.map((x) => <option value={x.kod}>Fiilen: {x.ad}</option>)}
        </select>
        <input class="girdi" style="flex:1;min-width:160px" lang="tr" aria-label="Fiilî uygulama notu" placeholder="Fiilen kimler korunuyor, nerede gevşek uygulanıyor…" value={t.fiiliNot} onInput={(e) => yaz((x) => { x.fiiliNot = (e.target as HTMLInputElement).value; })} />
      </div>
      <div class="satir">
        <input class="girdi" style="flex:1;min-width:120px" aria-label="Kuralın başlangıcı" placeholder="Başlangıç (isteğe bağlı)" value={t.baslangic} onInput={(e) => yaz((x) => { x.baslangic = (e.target as HTMLInputElement).value; })} />
        <input class="girdi" style="flex:1;min-width:120px" aria-label="Kuralın bitişi" placeholder="Bitiş (isteğe bağlı)" value={t.bitis} onInput={(e) => yaz((x) => { x.bitis = (e.target as HTMLInputElement).value; })} />
      </div>
      <div class="satir">
        <span class="bosluk" />
        <button class="dugme ana kucuk" disabled={!degisti} onClick={() => istemci.iste('hukukKuraliYaz', { evren, kod: k.kod, tanim: t }).then(() => setHata(null), (x) => setHata(hataYaz(x)))}>Kaydet</button>
        <button class="dugme kucuk" disabled={!degisti} onClick={() => setT(taslakYap(k))}>Vazgeç</button>
        <button class="dugme sade kucuk" onClick={() => istemci.iste('hukukKuraliKopyala', { evren, kod: k.kod }).then(() => setHata(null), (x) => setHata(hataYaz(x)))}>Kopyala</button>
        <button class="dugme sade kucuk" onClick={() => void geriAlinabilir('Kural kaldırıldı.', () => istemci.iste('hukukKuraliSil', { evren, kod: k.kod }), () => istemci.iste('hukukKuraliSil', { evren, kod: k.kod, geriYukle: true }))}>Kuralı kaldır</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      <KuralOrnekleriBolumu istemci={istemci} evren={evren} kural={k.kod} surum={surum} />
    </details>
  );
}

/** Formül yazımı (TK8): yazarken denetlenir; okunamıyorsa hatanın yeri işaretlenir, okunuyorsa programın okuyuşu gösterilir. */
function FormulYazici({ istemci, evren, deger, degistir }: { istemci: Istemci; evren: string; deger: string; degistir: (v: string) => void }) {
  const [d, setD] = useState<{ yazi: string } | { hata: string; konum: number; uzunluk: number } | null>(null);
  const [yardim, setYardim] = useState(false);
  useEffect(() => {
    if (!deger.trim()) { setD(null); return; }
    let iptal = false;
    const z = setTimeout(() => { istemci.iste('formulDenetle', { evren, yazi: deger }).then((x) => { if (!iptal) setD(x); }, () => {}); }, 300);
    return () => { iptal = true; clearTimeout(z); };
  }, [deger]);
  const h = d && 'hata' in d ? d : null;
  return (
    <div class="kucuk formul-yazici">
      <textarea class="girdi" rows={2} lang="tr" spellcheck={false} aria-label="Kimlere uygulanır (formül)" aria-invalid={!!h}
        placeholder={'Ör. üyesi [Kuzey Loncası] ve ({Rütbe} = "Subay" veya yaş < 16 yıl)'} value={deger}
        onInput={(e) => degistir((e.target as HTMLTextAreaElement).value)} />
      {!deger.trim() && <p class="soluk">Formül boşsa kural herkese uygulanır.</p>}
      {h && (
        <p class="hata" role="alert">
          {h.hata}
          <br /><code class="formul-hata-yeri">{deger.slice(0, h.konum)}<mark>{deger.slice(h.konum, h.konum + h.uzunluk) || ' '}</mark>{deger.slice(h.konum + h.uzunluk)}</code>
        </p>
      )}
      {d && 'yazi' in d && d.yazi && <p class="soluk">Programın okuduğu: <code>{d.yazi}</code></p>}
      <button class="dugme sade kucuk" aria-expanded={yardim} onClick={() => setYardim(!yardim)}>{yardim ? 'Yazım kılavuzunu gizle' : 'Nasıl yazılır?'}</button>
      {yardim && (
        <ul class="soluk">
          <li>Kayıtları köşeli parantez içinde yazın: <code>üyesi [Kuzey Loncası]</code>. “üyesi” yerine kültüründen, türünden, makamını yürüten, hizmetinde ve orada yaşayan da yazılabilir.</li>
          <li>Alanları süslü parantez içinde yazın: <code>{'{Rütbe} = "Subay"'}</code>, <code>{'{Mühürlü}'}</code>, <code>{'{Doğum tarihi} < "400"'}</code>, <code>{'{Boy} >= 180 cm'}</code>.</li>
          <li>Yaş: <code>yaş &gt;= 16 yıl</code> (örnekteki ya da sorulan tarihe göre hesaplanır).</li>
          <li><code>ve</code>, <code>veya</code>, <code>değil</code> ve parantez kullanılabilir. Aynı adı taşıyan iki kayıt ya da alan varsa türünü yazın: <code>[Kuzey (Şehir)]</code>.</li>
          <li>Bilgi eksik ya da çelişkiliyse sonuç “belirsiz” olur, “hayır” sayılmaz.</li>
        </ul>
      )}
    </div>
  );
}

/** Kişi sayfasında: bu kişi şu yere girince hangi kayıtlı kurallar uygulanabilir? */
export function UygulananKurallarAraci({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [yer, setYer] = useState<{ kod: string; ad: string } | null>(null);
  const [tarih, setTarih] = useState('');
  const [s, setS] = useState<UygulananKurallar | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const hesapla = () => { if (yer) istemci.iste('uygulananKurallar', { evren, kisi: kod, yer: yer.kod, tarih }).then((x) => { setS(x); setHata(null); }, (x) => { setS(null); setHata(hataYaz(x)); }); };
  useEffect(hesapla, [yer?.kod, surum]);
  return (
    <section class="surecler" aria-label="Uygulanan kurallar">
      <h2>Bir yerde bu kişiye uygulanan kurallar</h2>
      <div class="satir kucuk">
        <KayitSec istemci={istemci} evren={evren} secili={yer} etiket="Yer seç" sec={setYer} />
        <input class="girdi" style="max-width:160px" aria-label="Hangi tarihte" placeholder="Tarih (isteğe bağlı)" value={tarih} onInput={(e) => setTarih((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === 'Enter') hesapla(); }} onBlur={hesapla} />
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      {s && (
        <>
          <p class="soluk kucuk">Kapsam: {s.yerler.map((y) => y.ad).join(' ⊂ ')}{s.yonetimler.length ? `; yönetim: ${s.yonetimler.map((y) => y.ad).join(', ')}` : ''}. Yalnızca kayıtlı kurallar gösterilir; burada görünmeyen bir kural yine de var olabilir.</p>
          {!s.kurallar.length && <p class="soluk kucuk">Bu yerde bu kişiye uygulanabilecek kayıtlı kural yok.</p>}
          <ul class="toplanan-listesi">
            {s.kurallar.map((x) => (
              <li key={x.kural.kod}>
                <strong>{turAdi(x.kural.tanim.tur)}</strong>{x.kural.tanim.konu ? `: ${x.kural.tanim.konu}` : ''} <span class="soluk kucuk">· {x.kural.tanim.ad} · <a href={`#/e/${evren}/k/${x.kural.sahip.kod}`}>{x.kural.sahip.ad}</a> · {x.nedenYer}</span>
                {x.kural.tanim.yaptirim && <div class="kucuk">Yaptırım: {x.kural.tanim.yaptirim}</div>}
                <div class="kucuk soluk">Fiilen: {FIILI.find((f) => f.kod === (x.kural.tanim.fiili ?? ''))!.ad.toLocaleLowerCase('tr-TR')}{x.kural.tanim.fiiliNot ? ` · ${x.kural.tanim.fiiliNot}` : ''}</div>
                {x.durum === 'kosul_kayitsiz' && x.kosullar.some((c) => c.durum === 'kayitsiz') && <div class="kucuk">Şu koşullar kayıtlı değil: {x.kosullar.filter((c) => c.durum === 'kayitsiz').map((c) => c.ad).join(', ')}. Kural yine de uygulanıyor olabilir.</div>}
                {x.formulNedenleri && <div class="kucuk">Formül kesin bir sonuç vermiyor: {x.formulNedenleri.join(' ')} Kural yine de uygulanıyor olabilir.</div>}
                {x.durum === 'hesaplanamadi' && <div class="kucuk hata">{x.hesaplanamadi} Kuralı açıp formülü düzeltin.</div>}
                {x.zaman === 'tarihsiz' && <div class="kucuk soluk">Kural yalnızca belli bir dönemde geçerli. Tarih yazılmadığı için buna bakılmadı.</div>}
                {x.zaman === 'belirsiz' && <div class="kucuk soluk">Bu tarihte kuralın geçerli olup olmadığı belirsiz.</div>}
              </li>
            ))}
          </ul>
          {s.catismalar.map((c) => (
            <p class="uyari kucuk" key={c.konu}>“{c.konu}” konusunda yetkiler çatışıyor: {c.kurallar.map((k) => s.kurallar.find((x) => x.kural.kod === k)!).map((x) => `${x.kural.sahip.ad} (${turAdi(x.kural.tanim.tur).toLocaleLowerCase('tr-TR')})`).join(', ')}. Hangisinin geçerli olduğuna program karar vermez.</p>
          ))}
        </>
      )}
    </section>
  );
}
