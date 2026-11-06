// Okunabilir dışa aktarma (§10.11): evrenin Markdown klasörü, eserin EPUB'u ve yazdırılabilir sayfası.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { CiktiAgaci, CiktiSahnesi } from '../veri/api';
import { SAHNE_CALISMA } from '../alan/sablon';

const hataYaz = (e: unknown) => (e as Error).message;
function indir(ad: string, veri: Uint8Array, tur: string) {
  const url = URL.createObjectURL(new Blob([veri as BlobPart], { type: tur }));
  const a = document.createElement('a');
  a.href = url; a.download = ad;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Sayfayı görünmez bir çerçevede açıp yazdırma penceresini getirir; oradan "PDF olarak kaydet" seçilir. */
export function yazdir(html: string) {
  const c = document.createElement('iframe');
  c.setAttribute('aria-hidden', 'true');
  c.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  c.srcdoc = html;
  c.onload = () => { c.contentWindow?.focus(); c.contentWindow?.print(); setTimeout(() => c.remove(), 60_000); };
  document.body.appendChild(c);
}

export function MarkdownCiktisi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const [durum, setDurum] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const al = async () => {
    setHata(null); setCalisiyor(true);
    try {
      const r = await istemci.iste('markdownDisaAktar', { evren });
      indir(r.dosyaAdi, r.veri, 'application/zip');
      setDurum(`${r.kayitSayisi} kayıt indirildi.${r.eksikGorsel ? ` ${r.eksikGorsel} görsel bu cihazda olmadığı için eklenemedi.` : ''}`);
    } catch (e) { setHata(hataYaz(e)); } finally { setCalisiyor(false); }
  };
  return (
    <div class="kart" style="margin-top:12px">
      <h3>Okumak için dışa aktar (Markdown)</h3>
      <p>Her kayıt ayrı bir Markdown dosyası olur. Bağlantılar [[Ad]] biçiminde korunur; dosyalar Obsidian gibi programlarda açılabilir.</p>
      <p class="soluk kucuk">Bu çıktı okumak içindir. Değişiklik geçmişi, tarihli inançlar, haritalar, takvim hesapları ve hesap kuralları buna girmez; eksiklerin tam listesi klasördeki OKUBENI dosyasındadır. Her şeyi kayıpsız taşımak için yukarıdaki tam yedeği kullanın.</p>
      <div class="satir"><button class="dugme" onClick={al} disabled={calisiyor}>{calisiyor ? 'Hazırlanıyor…' : 'Markdown olarak indir'}</button></div>
      {durum && <p class="kucuk" role="status">{durum}</p>}
      {hata && <p class="hata" role="alert">{hata}</p>}
    </div>
  );
}

const secimAnahtari = (evren: string, eser: string) => `dunya-atlasi:cikti-disarida:${evren}:${eser}`;
/** Çıktı seçimi bu cihazda eser başına hatırlanır; dışarıda bırakılanlar saklanır ki yeni sahneler kendiliğinden girsin. */
function disaridakileriOku(a: string): Set<string> {
  try { const v = JSON.parse(localStorage.getItem(a) ?? '[]'); return new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []); } catch { return new Set(); }
}
const durumAdi = (k: string | null) => SAHNE_CALISMA.find((d) => d.kod === k)?.ad ?? null;

export function EserCiktisi({ istemci, evren, eser }: { istemci: Istemci; evren: string; eser: string }) {
  const [basliklar, setBasliklar] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [agac, setAgac] = useState<CiktiAgaci | null>(null);
  const [disarida, setDisarida] = useState<Set<string>>(() => disaridakileriOku(secimAnahtari(evren, eser)));
  useEffect(() => { istemci.iste('ciktiAgaci', { evren, eser }).then(setAgac, () => setAgac(null)); }, [evren, eser]);
  useEffect(() => { setDisarida(disaridakileriOku(secimAnahtari(evren, eser))); }, [evren, eser]);
  const kaydet = (d: Set<string>) => { setDisarida(d); try { localStorage.setItem(secimAnahtari(evren, eser), JSON.stringify([...d])); } catch { /* yok */ } };

  const tum = agac ? [...agac.dogrudan, ...agac.bolumler.flatMap((b) => b.sahneler)] : [];
  const secililer = tum.filter((x) => !disarida.has(x.kod));
  // Bütün sahneler seçiliyse süzgeç gönderilmez: çıktı bugünkü gibi bütün eserdir.
  const sahneler = disarida.size && tum.some((x) => disarida.has(x.kod)) ? secililer.map((x) => x.kod) : undefined;
  const degistir = (kodlar: string[], gir: boolean) => { const d = new Set(disarida); for (const k of kodlar) if (gir) d.delete(k); else d.add(k); kaydet(d); };
  const hizli = (sec: (x: CiktiSahnesi) => boolean) => kaydet(new Set(tum.filter((x) => !sec(x)).map((x) => x.kod)));

  const epub = async () => {
    setHata(null); setCalisiyor(true);
    try { const r = await istemci.iste('epubYaz', { evren, eser, sahneBasliklari: basliklar, sahneler }); indir(r.dosyaAdi, r.veri, 'application/epub+zip'); }
    catch (e) { setHata(hataYaz(e)); } finally { setCalisiyor(false); }
  };
  const pdf = () => istemci.iste('eserBaskiSayfasi', { evren, eser, sahneBasliklari: basliklar, sahneler }).then((r) => { setHata(null); yazdir(r.html); }, (e) => setHata(hataYaz(e)));
  const sahneSatiri = (x: CiktiSahnesi) => (
    <li key={x.kod}>
      <label><input type="checkbox" checked={!disarida.has(x.kod)} onChange={(e) => degistir([x.kod], (e.target as HTMLInputElement).checked)} /> {x.ad}</label>
      {' '}{durumAdi(x.calisma) && <span class="rozet">{durumAdi(x.calisma)}</span>}
      {!x.metinli && <span class="soluk kucuk"> · metni yok</span>}
    </li>
  );
  const bos = tum.length > 0 && !secililer.length;
  return (
    <section class="surecler" aria-label="Eserin çıktısı">
      <h2>Çıktı</h2>
      <p class="soluk kucuk">Bölümler ve sahneler okuma sırasıyla yazılır, sahnelerin arasına ayraç konur. Vazgeçilmiş sahneler çıktıya girmez. PDF için yazdırma penceresinde “PDF olarak kaydet”i seçin.</p>
      {tum.length > 0 && (
        <details class="cikti-secimi">
          <summary class="kucuk">Nelerin gireceğini seçin <span class="soluk">({secililer.length === tum.length ? `${tum.length} sahnenin hepsi seçili` : `${tum.length} sahneden ${secililer.length} tanesi seçili`})</span></summary>
          <div class="satir kucuk">
            <span class="soluk">Hızlı seçim:</span>
            <button class="dugme sade kucuk" onClick={() => hizli(() => true)}>Hepsi</button>
            <button class="dugme sade kucuk" onClick={() => hizli((x) => x.calisma === 'gozden_gecirildi')}>Yalnız “Gözden geçirildi”</button>
            <button class="dugme sade kucuk" onClick={() => hizli((x) => x.calisma !== 'planlandi')}>“Planlandı” hariç</button>
          </div>
          <ul class="cikti-agaci kucuk">
            {agac!.dogrudan.length > 0 && <li><strong>{agac!.bolumler.length ? 'Giriş' : 'Sahneler'}</strong><ul>{agac!.dogrudan.map(sahneSatiri)}</ul></li>}
            {agac!.bolumler.map((b) => {
              const kodlar = b.sahneler.map((x) => x.kod);
              const secili = kodlar.filter((k) => !disarida.has(k)).length;
              return (
                <li key={b.kod}>
                  <label><input type="checkbox" checked={kodlar.length > 0 && secili === kodlar.length} disabled={!kodlar.length}
                    ref={(el) => { if (el) el.indeterminate = secili > 0 && secili < kodlar.length; }}
                    onChange={(e) => degistir(kodlar, (e.target as HTMLInputElement).checked)} /> <strong>{b.ad}</strong></label>
                  {kodlar.length ? <ul>{b.sahneler.map(sahneSatiri)}</ul> : <span class="soluk kucuk"> · sahnesi yok</span>}
                </li>
              );
            })}
          </ul>
          <p class="soluk kucuk">Seçim bu cihazda bu eser için hatırlanır. Sonradan eklenen sahneler kendiliğinden seçili gelir.</p>
        </details>
      )}
      <div class="satir">
        <label class="kucuk"><input type="checkbox" checked={basliklar} onChange={(e) => setBasliklar((e.target as HTMLInputElement).checked)} /> Sahne adlarını başlık olarak yaz</label>
        <button class="dugme kucuk" onClick={epub} disabled={calisiyor || bos}>EPUB indir</button>
        <button class="dugme kucuk" onClick={pdf} disabled={bos}>Yazdır / PDF</button>
        {bos && <span class="soluk kucuk">Çıktıya girecek sahne seçilmedi.</span>}
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}
