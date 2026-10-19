// Okunabilir dışa aktarma (§10.11): evrenin Markdown klasörü, eserin EPUB'u ve yazdırılabilir sayfası.
import { useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';

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
      <p>Her kayıt bir Markdown dosyası olur; bağlantılar [[Ad]] biçiminde korunur, Obsidian gibi programlarda açılır.</p>
      <p class="soluk kucuk">Bu çıktı okumak içindir: değişiklik geçmişi, tarihli inançlar, haritalar, takvim hesapları ve hesap kuralları girmez (klasördeki OKUBENI dosyası tam listeyi verir). Kayıpsız taşımak için yukarıdaki tam yedeği kullanın.</p>
      <div class="satir"><button class="dugme" onClick={al} disabled={calisiyor}>{calisiyor ? 'Hazırlanıyor…' : 'Markdown olarak indir'}</button></div>
      {durum && <p class="kucuk" role="status">{durum}</p>}
      {hata && <p class="hata" role="alert">{hata}</p>}
    </div>
  );
}

export function EserCiktisi({ istemci, evren, eser }: { istemci: Istemci; evren: string; eser: string }) {
  const [basliklar, setBasliklar] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const epub = async () => {
    setHata(null); setCalisiyor(true);
    try { const r = await istemci.iste('epubYaz', { evren, eser, sahneBasliklari: basliklar }); indir(r.dosyaAdi, r.veri, 'application/epub+zip'); }
    catch (e) { setHata(hataYaz(e)); } finally { setCalisiyor(false); }
  };
  const pdf = () => istemci.iste('eserBaskiSayfasi', { evren, eser, sahneBasliklari: basliklar }).then((r) => { setHata(null); yazdir(r.html); }, (e) => setHata(hataYaz(e)));
  return (
    <section class="surecler" aria-label="Eserin çıktısı">
      <h2>Çıktı</h2>
      <p class="soluk kucuk">Bölümler ve sahneler okuma sırasıyla; sahneler arasında ayraç. Vazgeçilmiş sahneler girmez. PDF için yazdırma penceresinde “PDF olarak kaydet”i seçin.</p>
      <div class="satir">
        <label class="kucuk"><input type="checkbox" checked={basliklar} onChange={(e) => setBasliklar((e.target as HTMLInputElement).checked)} /> Sahne adlarını başlık olarak yaz</label>
        <button class="dugme kucuk" onClick={epub} disabled={calisiyor}>EPUB indir</button>
        <button class="dugme kucuk" onClick={pdf}>Yazdır / PDF</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}
