// Okunabilir dışa aktarma (§10.11): evrenin Markdown klasörü; eserin PDF'i, Word dosyası, EPUB'u ve yazdırılabilir sayfası.
import { useEffect, useState } from 'preact/hooks';
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
      <p>Her kayıt ayrı bir Markdown dosyası olur. Bağlantılar [[Ad]] biçiminde korunur; dosyalar Obsidian gibi programlarda açılabilir.</p>
      <p class="soluk kucuk">Bu çıktı okumak içindir. Değişiklik geçmişi, tarihli inançlar, haritalar, takvim hesapları ve hesap kuralları buna girmez; eksiklerin tam listesi klasördeki OKUBENI dosyasındadır. Her şeyi kayıpsız taşımak için yukarıdaki tam yedeği kullanın.</p>
      <div class="satir"><button class="dugme" onClick={al} disabled={calisiyor}>{calisiyor ? 'Hazırlanıyor…' : 'Markdown olarak indir'}</button></div>
      {durum && <p class="kucuk" role="status">{durum}</p>}
      {hata && <p class="hata" role="alert">{hata}</p>}
    </div>
  );
}

const ACIKLAMA = 'Yalnız eserin metni çıkar: bölümler ve sahneler okuma sırasıyla, sahnelerin arasında ayraç. Kayıtlar ve notlar girmez; vazgeçilmiş sahneler de girmez. Word dosyası Word, LibreOffice ya da Google Dokümanlar\'da düzenlenebilir.';

/** Eserin PDF, Word, EPUB ve yazdırma düğmeleri; eserin sayfasında ve Yedek sekmesinde aynı. */
function CiktiDugmeleri({ istemci, evren, eser }: { istemci: Istemci; evren: string; eser: string | null }) {
  const [basliklar, setBasliklar] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState<string | null>(null);
  const calistir = (ad: string, is: (eser: string) => Promise<void>) => async () => {
    if (!eser) return;
    setHata(null); setCalisiyor(ad);
    try { await is(eser); } catch (e) { setHata(hataYaz(e)); } finally { setCalisiyor(null); }
  };
  const pdf = calistir('pdf', async (eser) => {
    const r = await istemci.iste('eserKitabi', { evren, eser, sahneBasliklari: basliklar });
    const [{ pdfYaz }, yt] = await Promise.all([import('../alan/pdf'), import('./yazi-tipleri').then((m) => m.kitapYaziTipleri())]);
    indir(`${r.dosyaKoku}.pdf`, await pdfYaz(r.kitap, yt), 'application/pdf');
  });
  const docx = calistir('docx', async (eser) => {
    const r = await istemci.iste('docxYaz', { evren, eser, sahneBasliklari: basliklar });
    indir(r.dosyaAdi, r.veri, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
  const epub = calistir('epub', async (eser) => {
    const r = await istemci.iste('epubYaz', { evren, eser, sahneBasliklari: basliklar });
    indir(r.dosyaAdi, r.veri, 'application/epub+zip');
  });
  const yazdirma = calistir('yazdir', async (eser) => yazdir((await istemci.iste('eserBaskiSayfasi', { evren, eser, sahneBasliklari: basliklar })).html));
  const kapali = !eser || !!calisiyor;
  return (
    <>
      <div class="satir">
        <label class="kucuk"><input type="checkbox" checked={basliklar} onChange={(e) => setBasliklar((e.target as HTMLInputElement).checked)} /> Sahne adlarını başlık olarak yaz</label>
      </div>
      <div class="satir">
        <button class="dugme kucuk" onClick={pdf} disabled={kapali}>{calisiyor === 'pdf' ? 'Hazırlanıyor…' : 'PDF indir'}</button>
        <button class="dugme kucuk" onClick={docx} disabled={kapali}>{calisiyor === 'docx' ? 'Hazırlanıyor…' : 'Word (.docx) indir'}</button>
        <button class="dugme kucuk" onClick={epub} disabled={kapali}>{calisiyor === 'epub' ? 'Hazırlanıyor…' : 'EPUB indir'}</button>
        <button class="dugme kucuk" onClick={yazdirma} disabled={kapali}>Yazdır</button>
      </div>
      {hata && <p class="hata kucuk" role="alert">{hata}</p>}
    </>
  );
}

export function EserCiktisi({ istemci, evren, eser }: { istemci: Istemci; evren: string; eser: string }) {
  return (
    <section class="surecler" aria-label="Eserin çıktısı">
      <h2>Çıktı</h2>
      <p class="soluk kucuk">{ACIKLAMA}</p>
      <CiktiDugmeleri istemci={istemci} evren={evren} eser={eser} />
    </section>
  );
}

/** Yedek sekmesinde: bir eser seçilip metni dışa aktarılır. */
export function EserDisaAktarma({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const [eserler, setEserler] = useState<{ kod: string; ad: string }[] | null>(null);
  const [secili, setSecili] = useState<string | null>(null);
  useEffect(() => {
    istemci.iste('eserler', { evren }).then((l) => { setEserler(l); setSecili((s) => s && l.some((x) => x.kod === s) ? s : l[0]?.kod ?? null); }, () => setEserler([]));
  }, [istemci, evren]);
  return (
    <div class="kart" style="margin-top:12px">
      <h3>Eseri dışa aktar (PDF, Word, EPUB)</h3>
      <p>{ACIKLAMA}</p>
      {eserler && !eserler.length ? <p class="soluk kucuk">Henüz eser yok. Yaz sayfasından bir eser oluşturun.</p> : (
        <>
          {eserler?.length === 1 && <p class="kucuk">Eser: <strong>{eserler[0].ad}</strong></p>}
          {eserler && eserler.length > 1 && (
            <div class="satir"><label class="kucuk">Eser <select value={secili ?? ''} onChange={(e) => setSecili((e.target as HTMLSelectElement).value)}>
              {eserler.map((x) => <option key={x.kod} value={x.kod}>{x.ad}</option>)}
            </select></label></div>
          )}
          <CiktiDugmeleri key={secili ?? ''} istemci={istemci} evren={evren} eser={secili} />
        </>
      )}
    </div>
  );
}
