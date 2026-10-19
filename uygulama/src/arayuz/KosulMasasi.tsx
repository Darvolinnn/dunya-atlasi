// §15-13 sonuçtan koşullara masası (F03): hedeften kayıtlı seçeneklerle uyan yol planları. Hiçbir şey yazmaz.
import { useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KisaKayit, KosulMasasi } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import { PaketSecimi } from './Haber';

const hataYaz = (e: unknown) => (e as Error).message;
const gun = (n: number) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün`;
type Secim = { kod: string; ad: string };

function SecimListesi({ istemci, evren, etiket, liste, setListe }: { istemci: Istemci; evren: string; etiket: string; liste: Secim[]; setListe: (l: Secim[]) => void }) {
  return (
    <div class="alan"><span class="alan-adi">{etiket}</span>
      <span class="satir">
        {liste.map((s) => <span class="etiket" key={s.kod}>{s.ad} <button type="button" class="dugme sade kucuk" aria-label={`${s.ad} kaldır`} onClick={() => setListe(liste.filter((x) => x.kod !== s.kod))}>×</button></span>)}
        <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Ekle" sec={(s) => { if (s && !liste.some((x) => x.kod === s.kod)) setListe([...liste, s]); }} />
      </span>
    </div>
  );
}

export function KosulMasasiSekmesi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const [nereden, setNereden] = useState<Secim | null>(null);
  const [nereye, setNereye] = useState<Secim | null>(null);
  const [sinir, setSinir] = useState('');
  const [cikis, setCikis] = useState('');
  const [kosul, setKosul] = useState('');
  const [kisi, setKisi] = useState<Secim | null>(null);
  const [yasakRota, setYasakRota] = useState<Secim[]>([]);
  const [yasakYer, setYasakYer] = useState<Secim[]>([]);
  const [paket, setPaket] = useState<string | null>(null);
  const [m, setM] = useState<KosulMasasi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const bag = (k: KisaKayit) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
  const ara = (e: Event) => {
    e.preventDefault();
    if (!nereden || !nereye) return;
    istemci.iste('kosulMasasi', { evren, nereden: nereden.kod, nereye: nereye.kod, enCokGun: Number(sinir.replace(',', '.')), cikis: cikis.trim() || null,
      kosul: kosul.trim() || null, kisi: kisi?.kod ?? null, yasakRotalar: yasakRota.map((x) => x.kod), yasakYerler: yasakYer.map((x) => x.kod), paket })
      .then((x) => { setM(x); setHata(null); }, (x) => { setM(null); setHata(hataYaz(x)); });
  };
  return (
    <section class="kosul-masasi" aria-label="Sonuçtan koşullara">
      <h2>Sonuçtan koşullara</h2>
      <p class="soluk kucuk">Varmak istediğin yeri, süre sınırını ve kullanılamayacak yolları yaz; kayıtlı rotalardan uyan planları görürsün. Yeni yol ya da süre uydurulmaz; evrene bir şey yazılmaz.</p>
      <form class="kart" onSubmit={ara}>
        <div class="satir">
          <KayitSec istemci={istemci} evren={evren} secili={nereden} etiket="Nereden?" sec={setNereden} />
          <span>→</span>
          <KayitSec istemci={istemci} evren={evren} secili={nereye} etiket="Nereye?" sec={setNereye} />
        </div>
        <div class="satir">
          <label class="alan"><span class="alan-adi">En çok kaç günde?</span>
            <input class="girdi" style="width:100px" inputMode="decimal" value={sinir} placeholder="3" onInput={(e) => setSinir((e.target as HTMLInputElement).value)} /></label>
          <label class="alan"><span class="alan-adi">Çıkış tarihi (isteğe bağlı)</span>
            <input class="girdi" lang="tr" value={cikis} placeholder="Örn. 430" onInput={(e) => setCikis((e.target as HTMLInputElement).value)} /></label>
          <label class="alan"><span class="alan-adi">Koşul (isteğe bağlı)</span>
            <input class="girdi" lang="tr" value={kosul} placeholder="kış, atlı…" onInput={(e) => setKosul((e.target as HTMLInputElement).value)} /></label>
        </div>
        <SecimListesi istemci={istemci} evren={evren} etiket="Kullanılamayacak rotalar" liste={yasakRota} setListe={setYasakRota} />
        <SecimListesi istemci={istemci} evren={evren} etiket="Uğranmayacak yerler" liste={yasakYer} setListe={setYasakYer} />
        <div class="satir">
          <KayitSec istemci={istemci} evren={evren} secili={kisi} etiket="Kim gidiyor? (isteğe bağlı)" sec={setKisi} />
          {kisi && <button type="button" class="dugme sade kucuk" onClick={() => setKisi(null)}>Kişiyi kaldır</button>}
          <PaketSecimi istemci={istemci} evren={evren} paket={paket} sec={setPaket} id="kosul-masasi-paketi" />
        </div>
        <button class="dugme ana" type="submit" disabled={!nereden || !nereye || !sinir.trim()}>Planları bul</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
      {m && (
        <div class="kosul-sonucu">
          <p><strong>{m.hukum === 'çözüm bulundu' ? `Uyan plan: ${m.planlar.length}${m.dahaFazla ? ' (daha fazlası var)' : ''}` : 'Kayıtlı seçeneklerde bulunamadı'}</strong> <span class="soluk kucuk">· {m.tur}</span></p>
          {m.nedenler.map((n) => <p class="kucuk">{n}</p>)}
          <ol class="kosul-planlari">{m.planlar.map((p, i) => (
            <li key={i} class="kart">
              <strong>{gun(p.toplam)}</strong>{p.varis ? <span class="soluk kucuk"> · varış {p.varis}</span> : null}
              <ol class="kucuk">{p.adimlar.map((a) => <li>{bag(a.nereden)} → {bag(a.nereye)}: {bag(a.rota)} {a.gun !== null ? `(${gun(a.gun)}${a.kosul ? `, ${a.kosul}` : ''})` : ''}</li>)}</ol>
              <ul class="kucuk soluk">{p.gerekenler.map((g) => <li>{g}</li>)}</ul>
            </li>
          ))}</ol>
          {m.suresizler.length > 0 && <p class="soluk kucuk">Süresi girilmemiş rotalar: {m.suresizler.map((r, i) => <>{i ? ', ' : ''}{bag(r)}</>)}</p>}
          <p class="soluk kucuk">{m.kapsam}</p>
          {m.varsayimlar.map((v) => <p class="soluk kucuk">{v}</p>)}
        </div>
      )}
    </section>
  );
}
