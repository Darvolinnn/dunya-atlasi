// Google Drive taşıyıcısı (TK4): eşitleme dosyaları Drive'ın kullanıcıya görünmeyen uygulama klasöründe
// (drive.appdata). Program yalnızca kendi oluşturduğu dosyaları görür. İzin anahtarı yalnızca bellekte durur.
import { IzinHatasi, type Tasiyici, type UzakDosya } from './esitleme';

const API = 'https://www.googleapis.com/drive/v3';
const YUKLEME = 'https://www.googleapis.com/upload/drive/v3';
/** Bu boyuttan büyük dosyalar sürdürülebilir yüklemeyle gönderilir (TK5). */
const BUYUK = 5 * 1024 * 1024;
/** Sürdürülebilir yüklemede bir parça; Drive 256 KB'ın katlarını ister. */
const PARCA = 8 * 1024 * 1024;
/** Tek bir parçanın gönderilmesi bundan uzun sürerse kesilir; yükleme kaldığı yerden sürer. */
const PARCA_SURESI = 120_000;
/**
 * Genel bir Drive isteği (yanıtın okunması dahil) bundan uzun sürerse kesilir ve yeniden denenir. Takılan bir istek
 * eşitlemeyi sonsuza dek bekletmesin; bekleyen sonraki eşitleme de ancak bu biterse başlayabilir.
 */
const ISTEK_SURESI = 60_000;
/** Dosya indirme ve tek parçada yükleme daha büyük olabilir; onlara daha uzun süre tanınır. */
const AKTARIM_SURESI = 10 * 60_000;
/** Kaydedilmiş yükleme adresi bundan eskiyse kullanılmaz (Drive bir hafta tutar). */
const OTURUM_OMRU = 6 * 24 * 3600_000;

/** Yarım kalan büyük yüklemelerin Drive adresleri; program kapanıp açılsa da kaldığı yerden sürsün diye bu cihazda tutulur. */
export interface YuklemeOturumlari { oku(k: string): string | null; yaz(k: string, v: string): void; sil(k: string): void }
export interface YuklemeIlerlemesi { ad: string; gonderilen: number; toplam: number }
export interface DriveSecenekleri {
  oturumlar?: YuklemeOturumlari;
  ilerleme?: (i: YuklemeIlerlemesi | null) => void;
  /** Sınama için. */
  fetch?: typeof fetch; parca?: number; buyuk?: number; bekleme?: number; istekSuresi?: number;
}

const kacis = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** 308 yanıtındaki "Range: bytes=0-N" başlığından Drive'a ulaşan bayt sayısı (N+1); başlık yoksa undefined. */
const alinan = (r: Response): number | undefined => {
  const m = /bytes=0-(\d+)/.exec(r.headers.get('Range') ?? '');
  return m ? Number(m[1]) + 1 : undefined;
};
const ozet = async (veri: Uint8Array) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', veri as BufferSource))].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');

export class DriveTasiyici implements Tasiyici {
  private readonly iptalci = new AbortController();
  private readonly getir: typeof fetch;

  constructor(private readonly jeton: string, private readonly bitis: number, private readonly alan: 'appDataFolder' | 'drive' = 'appDataFolder',
    private readonly secenek: DriveSecenekleri = {}) {
    this.getir = secenek.fetch ?? ((u, a) => fetch(u, a));
  }

  /** Bağlantı kesilince sürmekte olan istekler durdurulur. */
  iptal() { this.iptalci.abort(); }

  private bekle(ms: number) { return bekle(this.secenek.bekleme ?? ms); }

  /**
   * İstek gönderir; geçici hatalarda (çok istek, sunucu hatası, bağlantı kopması, süre aşımı) birkaç kez yeniden dener.
   * Süre sınırı yanıtın gövdesini de kapsar: gövdeyi `oku` ile okuyun.
   */
  private async istek(url: string, ayar: RequestInit = {}, deneme = 0, sure = ISTEK_SURESI): Promise<Response> {
    if (Date.now() > this.bitis - 30_000) throw new IzinHatasi('Google izninin süresi doldu.');
    let r: Response;
    try {
      const signal = AbortSignal.any([this.iptalci.signal, AbortSignal.timeout(this.secenek.istekSuresi ?? sure)]);
      r = await this.getir(url, { ...ayar, signal, headers: { ...(ayar.headers as Record<string, string> | undefined), Authorization: `Bearer ${this.jeton}` } });
    } catch (e) {
      if (this.iptalci.signal.aborted) throw new Error('Drive bağlantısı kesildi.');
      if (deneme < 3) { await this.bekle(1000 * 2 ** deneme); return this.istek(url, ayar, deneme + 1, sure); }
      throw new Error('Drive\'a ulaşılamadı. İnternet bağlantısını kontrol edin.');
    }
    if (r.status === 401) throw new IzinHatasi('Google izni yenilenmeli.');
    const metin = r.status === 403 ? await r.clone().text().catch(() => '') : '';
    if (r.status === 507 || /storageQuota/i.test(metin)) throw new Error('Drive\'da yer kalmadı.');
    if ((r.status === 429 || r.status >= 500 || /rateLimit|userRateLimit/i.test(metin)) && deneme < 4) {
      await this.bekle(1000 * 2 ** deneme + Math.random() * 500);
      return this.istek(url, ayar, deneme + 1, sure);
    }
    if (r.status === 403) {
      if (/insufficient|scope/i.test(metin)) throw new IzinHatasi('Programın Drive izni eksik. Bağlanırken izin kutularını işaretleyin.');
      throw new Error('Drive bu işleme izin vermedi.');
    }
    if (!r.ok) throw new Error(`Drive işlemi tamamlanamadı (hata ${r.status}).`);
    return r;
  }

  /** Yanıtın gövdesini okur; bağlantı kesilir ya da süre dolarsa anlaşılır bir hata verir. */
  private async oku<T>(r: Response, bicim: (r: Response) => Promise<T>): Promise<T> {
    try { return await bicim(r); }
    catch {
      if (this.iptalci.signal.aborted) throw new Error('Drive bağlantısı kesildi.');
      throw new Error('Drive yanıtı zamanında gelmedi. Eşitleme sonra yeniden denenecek.');
    }
  }
  private json<T>(r: Response) { return this.oku(r, (x) => x.json() as Promise<T>); }

  async listele(oz: Record<string, string>): Promise<UzakDosya[]> {
    const kosul = Object.entries(oz).map(([k, v]) => `appProperties has { key='${kacis(k)}' and value='${kacis(v)}' }`);
    if (this.alan === 'appDataFolder') kosul.unshift("'appDataFolder' in parents");
    kosul.push('trashed = false');
    const sonuc: UzakDosya[] = [];
    let sayfa: string | undefined;
    do {
      const p = new URLSearchParams({ q: kosul.join(' and '), fields: 'nextPageToken,files(id,name,appProperties)', pageSize: '1000' });
      if (this.alan === 'appDataFolder') p.set('spaces', 'appDataFolder');
      if (sayfa) p.set('pageToken', sayfa);
      const j = await this.json<{ nextPageToken?: string; files: { id: string; name: string; appProperties?: Record<string, string> }[] }>(await this.istek(`${API}/files?${p}`));
      for (const f of j.files) sonuc.push({ id: f.id, ad: f.name, ozellikler: f.appProperties ?? {} });
      sayfa = j.nextPageToken;
    } while (sayfa);
    return sonuc;
  }

  async indir(id: string): Promise<Uint8Array> {
    const r = await this.istek(`${API}/files/${encodeURIComponent(id)}?alt=media`, {}, 0, AKTARIM_SURESI);
    return new Uint8Array(await this.oku(r, (x) => x.arrayBuffer()));
  }

  async yukle(ad: string, ozellikler: Record<string, string>, veri: Uint8Array, id?: string, ust?: string): Promise<UzakDosya> {
    const ustBilgi: Record<string, unknown> = { name: ad, appProperties: ozellikler };
    if (!id) ustBilgi.parents = [ust ?? (this.alan === 'appDataFolder' ? 'appDataFolder' : 'root')];
    const yol = id ? `${YUKLEME}/files/${encodeURIComponent(id)}` : `${YUKLEME}/files`;
    const yontem = id ? 'PATCH' : 'POST';
    const alanlar = 'fields=id,name,appProperties';
    let r: Response;
    if (veri.length > (this.secenek.buyuk ?? BUYUK)) {
      r = await this.surdurulebilir(`${yol}?uploadType=resumable&${alanlar}`, yontem, ustBilgi, veri, `${ad}:${id ?? ''}`);
    } else {
      const sinir = 'dunya-atlasi-' + Math.random().toString(36).slice(2);
      const govde = new Blob([
        `--${sinir}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(ustBilgi)}\r\n`,
        `--${sinir}\r\nContent-Type: application/octet-stream\r\n\r\n`, veri as BlobPart, `\r\n--${sinir}--`,
      ]);
      r = await this.istek(`${yol}?uploadType=multipart&${alanlar}`, { method: yontem, headers: { 'Content-Type': `multipart/related; boundary=${sinir}` }, body: govde }, 0, AKTARIM_SURESI);
    }
    const f = await this.json<{ id: string; name: string; appProperties?: Record<string, string> }>(r);
    return { id: f.id, ad: f.name, ozellikler: f.appProperties ?? {} };
  }

  /**
   * Sürdürülebilir yükleme (TK5): içerik parça parça gönderilir. Bağlantı koparsa Drive'a ne kadarının ulaştığı sorulur
   * ve oradan sürer; adres bu cihazda saklandığı için program yeniden açılınca da öyle. Aynı adla farklı içerik yarım
   * yüklemeyi sürdürmesin diye adres içeriğin özetiyle eşlenir.
   */
  private async surdurulebilir(baslatma: string, yontem: string, ustBilgi: unknown, veri: Uint8Array, ad: string): Promise<Response> {
    const toplam = veri.length;
    const parca = this.secenek.parca ?? PARCA;
    const depo = this.secenek.oturumlar;
    const anahtar = `yukleme:${await ozet(veri)}:${ad}`;
    const bildir = (gonderilen: number) => this.secenek.ilerleme?.({ ad, gonderilen, toplam });
    let adres: string | null = null;
    let gonderilen = 0;
    try {
      const k = JSON.parse(depo?.oku(anahtar) ?? 'null') as { adres: string; zaman: number } | null;
      if (k && Date.now() - k.zaman < OTURUM_OMRU) adres = k.adres;
    } catch { /* bozuk kayıt yok sayılır */ }
    if (adres) {
      const d = await this.yuklemeDurumu(adres, toplam);
      if (d instanceof Response) { depo?.sil(anahtar); return d; }
      if (d === null) { depo?.sil(anahtar); adres = null; } else gonderilen = d;
    }
    if (!adres) {
      const baslat = await this.istek(baslatma, {
        method: yontem, headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(toplam) }, body: JSON.stringify(ustBilgi),
      });
      adres = baslat.headers.get('Location');
      if (!adres) throw new Error('Drive yüklemeyi başlatamadı.');
      depo?.yaz(anahtar, JSON.stringify({ adres, zaman: Date.now() }));
    }
    let hata = 0;
    try {
      for (;;) {
        bildir(gonderilen);
        const son = Math.min(gonderilen + parca, toplam);
        let r: Response | null = null;
        try {
          r = await this.getir(adres, {
            method: 'PUT', body: veri.subarray(gonderilen, son) as BodyInit,
            headers: { 'Content-Range': `bytes ${gonderilen}-${son - 1}/${toplam}` },
            signal: AbortSignal.any([this.iptalci.signal, AbortSignal.timeout(PARCA_SURESI)]),
          });
        } catch { if (this.iptalci.signal.aborted) throw new Error('Drive bağlantısı kesildi.'); }
        if (r?.ok) { depo?.sil(anahtar); return r; }
        if (r?.status === 308) {
          const a = alinan(r);
          if (a !== undefined && a > gonderilen) { gonderilen = a; hata = 0; continue; }
          // Range yoksa ya Drive hiçbir bayt almamıştır ya da başlık tarayıcıdan okunamıyordur: parça ulaşmış sayılır.
          // Son parça da 308 alırsa (yükleme bitmedi) ya da Range ilerleme göstermezse bir parça yolda kalmıştır: geçici
          // hata gibi beklenir, durum sorulur ve oradan sürülür. Hata sayacı yalnız görülen ilerlemede sıfırlanır (sonsuz döngü olmaz).
          if (a === undefined && son < toplam) { gonderilen = son; continue; }
          r = null;
        }
        if (r?.status === 401) throw new IzinHatasi('Google izni yenilenmeli.');
        if (r && (r.status === 404 || r.status === 410)) { depo?.sil(anahtar); throw new Error('Drive yüklemeyi yarıda bıraktı; sonraki eşitlemede yeniden başlar.'); }
        if (r && r.status < 500 && r.status !== 429) throw new Error(`Drive işlemi tamamlanamadı (hata ${r.status}).`);
        // Bağlantı koptu, süre doldu ya da Drive geçici hata verdi: ne kadarının ulaştığını sor, oradan sür.
        if (++hata > 5) throw new Error('Drive\'a ulaşılamadı. Yükleme kaldığı yerden sonraki eşitlemede sürecek.');
        await this.bekle(1000 * 2 ** (hata - 1));
        const d = await this.yuklemeDurumu(adres, toplam).catch(() => gonderilen);
        if (d instanceof Response) { depo?.sil(anahtar); return d; }
        if (d === null) { depo?.sil(anahtar); throw new Error('Drive yüklemeyi yarıda bıraktı; sonraki eşitlemede yeniden başlar.'); }
        gonderilen = d;
      }
    } finally { this.secenek.ilerleme?.(null); }
  }

  /** Yarım yüklemenin durumu: Drive'a ulaşan bayt sayısı, tamamlandıysa yanıt, adres geçersizse null. */
  private async yuklemeDurumu(adres: string, toplam: number): Promise<number | Response | null> {
    const r = await this.getir(adres, { method: 'PUT', headers: { 'Content-Range': `bytes */${toplam}` }, signal: AbortSignal.any([this.iptalci.signal, AbortSignal.timeout(PARCA_SURESI)]) });
    if (r.ok) return r;
    if (r.status === 308) return alinan(r) ?? 0;
    if (r.status === 404 || r.status === 410) return null;
    if (r.status === 401) throw new IzinHatasi('Google izni yenilenmeli.');
    throw new Error(`Drive işlemi tamamlanamadı (hata ${r.status}).`);
  }

  async sil(id: string): Promise<void> {
    try { await this.istek(`${API}/files/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
    catch (e) { if (!(e instanceof Error && /404/.test(e.message))) throw e; }
  }

  /** Kullanıcının görebildiği bir klasör (dönemsel yedekler için, drive.file); yoksa oluşturur. */
  async klasor(ad: string, ozellikler: Record<string, string>, ust?: string): Promise<string> {
    const kosul = [...Object.entries(ozellikler).map(([k, v]) => `appProperties has { key='${kacis(k)}' and value='${kacis(v)}' }`),
      "mimeType = 'application/vnd.google-apps.folder'", 'trashed = false'];
    if (ust) kosul.push(`'${kacis(ust)}' in parents`);
    const p = new URLSearchParams({ q: kosul.join(' and '), fields: 'files(id)', pageSize: '10' });
    const j = await this.json<{ files: { id: string }[] }>(await this.istek(`${API}/files?${p}`));
    if (j.files[0]) return j.files[0].id;
    const r = await this.istek(`${API}/files?fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ name: ad, mimeType: 'application/vnd.google-apps.folder', appProperties: ozellikler, ...(ust ? { parents: [ust] } : {}) }),
    });
    return (await this.json<{ id: string }>(r)).id;
  }

  /** Hesabın e-postası (yenilemede Google'a ipucu olarak verilir, TK3). */
  async hesap(): Promise<{ eposta: string; ad: string }> {
    const j = await this.json<{ user: { emailAddress: string; displayName: string } }>(await this.istek(`${API}/about?fields=user(emailAddress,displayName)`));
    return { eposta: j.user.emailAddress, ad: j.user.displayName };
  }
}
