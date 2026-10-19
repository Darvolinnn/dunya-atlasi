// F23 bağlam karşılaştırma masası (§5.2): aynı kayıt farklı kaynak, evren tarihi ve bilen bağlamlarında yan yana.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { BaglamKarsilastirmasi, EvrenDali, EvrenSurumu } from '../veri/api';
import { KayitSec } from './KayitBolumleri';

const hataYaz = (e: unknown) => (e as Error).message;
type Secim = { kod: string; ad: string };
type Sutun = { kaynak: string; tarih: string; bilen: Secim | null };
const bos = (): Sutun => ({ kaynak: '', tarih: '', bilen: null });

export function BaglamKarsilastirmaBolumu({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string }) {
  const [ac, setAc] = useState(false);
  const [sutunlar, setSutunlar] = useState<Sutun[]>([bos(), bos()]);
  const [kaynaklar, setKaynaklar] = useState<{ surumler: EvrenSurumu[]; dallar: EvrenDali[] }>({ surumler: [], dallar: [] });
  const [r, setR] = useState<BaglamKarsilastirmasi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { setR(null); setHata(null); }, [kod]);
  useEffect(() => {
    if (!ac) return;
    Promise.all([istemci.iste('surumler', { evren }), istemci.iste('dallar', { evren })]).then(([surumler, dallar]) => setKaynaklar({ surumler, dallar }), () => {});
  }, [ac, evren]);
  const degis = (i: number, f: (s: Sutun) => Sutun) => setSutunlar(sutunlar.map((s, j) => (j === i ? f(s) : s)));
  const karsilastir = () => istemci.iste('baglamKarsilastir', { evren, kayit: kod, baglamlar: sutunlar.map((s) => ({ kaynak: s.kaynak || null, tarih: s.tarih.trim() || null, bilen: s.bilen?.kod ?? null })) })
    .then((x) => { setR(x); setHata(null); }, (e) => { setR(null); setHata(hataYaz(e)); });
  return (
    <section class="baglam-karsilastirma" aria-label="Bağlam karşılaştırma">
      <details open={ac} onToggle={(e) => setAc((e.target as HTMLDetailsElement).open)}>
        <summary><h2 style="display:inline">Bağlamları karşılaştır</h2></summary>
        <p class="soluk kucuk">Bu kaydı farklı evren tarihlerinde, bir kişinin bildiğine göre ya da bir sürümde yan yana gör. Fark olan satırda farkın hangi bağlamdan gelebileceği yazılır.</p>
        <div class="baglam-secimleri">
          {sutunlar.map((s, i) => (
            <div class="kart baglam-secimi" key={i}>
              <label class="alan"><span class="alan-adi">Kaynak</span>
                <select class="girdi" value={s.kaynak} onChange={(e) => degis(i, (x) => ({ ...x, kaynak: (e.target as HTMLSelectElement).value }))}>
                  <option value="">Güncel</option>
                  {kaynaklar.surumler.map((v) => <option value={`surum:${v.kod}`}>Sürüm: {v.ad}</option>)}
                  {kaynaklar.dallar.map((v) => <option value={`dal:${v.kod}`}>Deneme: {v.ad}</option>)}
                </select></label>
              <label class="alan"><span class="alan-adi">Evren tarihi</span>
                <input class="girdi" lang="tr" value={s.tarih} placeholder="Boş: en son hâl" onInput={(e) => degis(i, (x) => ({ ...x, tarih: (e.target as HTMLInputElement).value }))} /></label>
              <div class="alan"><span class="alan-adi">Kimin bilgisi</span>
                <span class="satir"><KayitSec istemci={istemci} evren={evren} secili={s.bilen} etiket="Bilen seç (isteğe bağlı)" sec={(b) => degis(i, (x) => ({ ...x, bilen: b }))} />
                  {s.bilen && <button class="dugme sade kucuk" aria-label="Bileni kaldır" onClick={() => degis(i, (x) => ({ ...x, bilen: null }))}>×</button>}</span></div>
              {sutunlar.length > 2 && <button class="dugme sade kucuk tehlikeli" onClick={() => setSutunlar(sutunlar.filter((_, j) => j !== i))}>Bağlamı kaldır</button>}
            </div>
          ))}
        </div>
        <div class="satir">
          {sutunlar.length < 4 && <button class="dugme kucuk" onClick={() => setSutunlar([...sutunlar, bos()])}>Bağlam ekle</button>}
          <button class="dugme ana kucuk" onClick={karsilastir}>Karşılaştır</button>
        </div>
        {hata && <p class="hata kucuk">{hata}</p>}
        {r && (
          <div class="tablo-kap">
            <table class="karsilastirma karsilastirma-tablosu">
              <thead><tr><th />{r.sutunlar.map((c) => <th>{c.kaynak}{c.tarih ? ` · ${c.tarih.ifade}` : ''}{c.bilen ? ` · ${c.bilen.ad} için` : ''}{c.yok ? <div class="soluk kucuk">Bu kaynakta bu kayıt yok.</div> : null}</th>)}</tr></thead>
              <tbody>{r.satirlar.map((s) => (
                <tr class={s.farkli ? 'farkli' : ''}>
                  <th scope="row">{s.baslik}{s.farkli && s.neden.length > 0 && <div class="soluk kucuk">Fark: {s.neden.join(' ya da ')}</div>}</th>
                  {s.degerler.map((d) => <td>{d ?? <span class="soluk">—</span>}</td>)}
                </tr>
              ))}</tbody>
            </table>
            {r.notlar.map((n) => <p class="soluk kucuk">{n}</p>)}
          </div>
        )}
      </details>
    </section>
  );
}
