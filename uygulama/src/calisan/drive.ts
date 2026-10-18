// Google Drive taşıyıcısı (TK4): eşitleme dosyaları Drive'ın kullanıcıya görünmeyen uygulama klasöründe
// (drive.appdata). Program yalnızca kendi oluşturduğu dosyaları görür. İzin anahtarı yalnızca bellekte durur.
import { IzinHatasi, type Tasiyici, type UzakDosya } from './esitleme';

const API = 'https://www.googleapis.com/drive/v3';
const YUKLEME = 'https://www.googleapis.com/upload/drive/v3';
/** Bu boyuttan büyük dosyalar sürdürülebilir yüklemeyle gönderilir (TK5). */
const BUYUK = 5 * 1024 * 1024;

const kacis = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class DriveTasiyici implements Tasiyici {
  constructor(private readonly jeton: string, private readonly bitis: number, private readonly alan: 'appDataFolder' | 'drive' = 'appDataFolder') {}

  /** İstek gönderir; geçici hatalarda (çok istek, sunucu hatası, bağlantı kopması) birkaç kez yeniden dener. */
  private async istek(url: string, ayar: RequestInit = {}, deneme = 0): Promise<Response> {
    if (Date.now() > this.bitis - 30_000) throw new IzinHatasi('Google izninin süresi doldu.');
    let r: Response;
    try {
      r = await fetch(url, { ...ayar, headers: { ...(ayar.headers as Record<string, string> | undefined), Authorization: `Bearer ${this.jeton}` } });
    } catch (e) {
      if (deneme < 3) { await bekle(1000 * 2 ** deneme); return this.istek(url, ayar, deneme + 1); }
      throw new Error('Drive\'a ulaşılamadı. İnternet bağlantısını kontrol edin.');
    }
    if (r.status === 401) throw new IzinHatasi('Google izni yenilenmeli.');
    const metin = r.status === 403 ? await r.clone().text() : '';
    if (r.status === 507 || /storageQuota/i.test(metin)) throw new Error('Drive\'da yer kalmadı.');
    if ((r.status === 429 || r.status >= 500 || /rateLimit|userRateLimit/i.test(metin)) && deneme < 4) {
      await bekle(1000 * 2 ** deneme + Math.random() * 500);
      return this.istek(url, ayar, deneme + 1);
    }
    if (r.status === 403) {
      if (/insufficient|scope/i.test(metin)) throw new IzinHatasi('Programın Drive izni eksik. Bağlanırken izin kutularını işaretleyin.');
      throw new Error('Drive isteği reddetti.');
    }
    if (!r.ok) throw new Error(`Drive isteği başarısız oldu (${r.status}).`);
    return r;
  }

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
      const j = await (await this.istek(`${API}/files?${p}`)).json() as { nextPageToken?: string; files: { id: string; name: string; appProperties?: Record<string, string> }[] };
      for (const f of j.files) sonuc.push({ id: f.id, ad: f.name, ozellikler: f.appProperties ?? {} });
      sayfa = j.nextPageToken;
    } while (sayfa);
    return sonuc;
  }

  async indir(id: string): Promise<Uint8Array> {
    return new Uint8Array(await (await this.istek(`${API}/files/${encodeURIComponent(id)}?alt=media`)).arrayBuffer());
  }

  async yukle(ad: string, ozellikler: Record<string, string>, veri: Uint8Array, id?: string, ust?: string): Promise<UzakDosya> {
    const ustBilgi: Record<string, unknown> = { name: ad, appProperties: ozellikler };
    if (!id) ustBilgi.parents = [ust ?? (this.alan === 'appDataFolder' ? 'appDataFolder' : 'root')];
    const yol = id ? `${YUKLEME}/files/${encodeURIComponent(id)}` : `${YUKLEME}/files`;
    const yontem = id ? 'PATCH' : 'POST';
    const alanlar = 'fields=id,name,appProperties';
    let r: Response;
    if (veri.length > BUYUK) {
      // Sürdürülebilir yükleme: önce adres alınır, sonra içerik gönderilir.
      const baslat = await this.istek(`${yol}?uploadType=resumable&${alanlar}`, {
        method: yontem, headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(veri.length) }, body: JSON.stringify(ustBilgi),
      });
      const adres = baslat.headers.get('Location');
      if (!adres) throw new Error('Drive yükleme adresi vermedi.');
      r = await this.istek(adres, { method: 'PUT', body: veri as BodyInit });
    } else {
      const sinir = 'dunya-atlasi-' + Math.random().toString(36).slice(2);
      const govde = new Blob([
        `--${sinir}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(ustBilgi)}\r\n`,
        `--${sinir}\r\nContent-Type: application/octet-stream\r\n\r\n`, veri as BlobPart, `\r\n--${sinir}--`,
      ]);
      r = await this.istek(`${yol}?uploadType=multipart&${alanlar}`, { method: yontem, headers: { 'Content-Type': `multipart/related; boundary=${sinir}` }, body: govde });
    }
    const f = await r.json() as { id: string; name: string; appProperties?: Record<string, string> };
    return { id: f.id, ad: f.name, ozellikler: f.appProperties ?? {} };
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
    const j = await (await this.istek(`${API}/files?${p}`)).json() as { files: { id: string }[] };
    if (j.files[0]) return j.files[0].id;
    const r = await this.istek(`${API}/files?fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ name: ad, mimeType: 'application/vnd.google-apps.folder', appProperties: ozellikler, ...(ust ? { parents: [ust] } : {}) }),
    });
    return (await r.json() as { id: string }).id;
  }

  /** Hesabın e-postası (yenilemede Google'a ipucu olarak verilir, TK3). */
  async hesap(): Promise<{ eposta: string; ad: string }> {
    const j = await (await this.istek(`${API}/about?fields=user(emailAddress,displayName)`)).json() as { user: { emailAddress: string; displayName: string } };
    return { eposta: j.user.emailAddress, ad: j.user.displayName };
  }
}
