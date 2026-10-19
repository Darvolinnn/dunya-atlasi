// Google girişi (TK3, Windows kısmı): sunucu yok, tarayıcıda yaklaşık 1 saatlik Drive izni alınır.
// Google penceresi yalnızca kullanıcı dokununca açılır. Hesabın e-postası yalnızca bu cihazda saklanır ve
// yenilemede Google'a ipucu olarak verilir; böylece birden çok hesap açıkken bile hesap seçimi sorulmaz.

/**
 * Google projesinin web istemci kodu. Gizli değildir: Google girişi kullanan her sayfa bunu tarayıcıya verir.
 * Yalnızca Google projesinde izin verilen adreslerden (şimdilik http://localhost:5173) çalışır.
 */
export const GOOGLE_ISTEMCI = '729483923715-a7fllp5jsqka5i7sbbsjk8fu590799bj.apps.googleusercontent.com';
const IZINLER = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';
const EPOSTA = 'dunya-atlasi:google-eposta';

interface Yanit { access_token?: string; expires_in?: number | string; error?: string; error_description?: string; scope?: string }
interface JetonIstemcisi { requestAccessToken(o?: { prompt?: string; login_hint?: string }): void; callback: (y: Yanit) => void }
declare global {
  interface Window { google?: { accounts: { oauth2: {
    initTokenClient(o: { client_id: string; scope: string; callback: (y: Yanit) => void; error_callback?: (e: { type: string }) => void; login_hint?: string; prompt?: string }): JetonIstemcisi;
    hasGrantedAllScopes(y: Yanit, ...k: string[]): boolean;
    revoke(jeton: string, cb?: () => void): void;
  } } } }
}

let yukleniyor: Promise<void> | null = null;
function kutuphane(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  yukleniyor ??= new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => { yukleniyor = null; no(new Error('Google\'a ulaşılamadı. İnternet bağlantısını kontrol edin.')); };
    document.head.append(s);
  });
  return yukleniyor;
}

const oku = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const yaz = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* özel pencere */ } };

export const kayitliEposta = () => oku(EPOSTA);
export const epostaKaydet = (e: string | null) => yaz(EPOSTA, e);

/** Sayfa açılınca kütüphaneyi önceden yükler; böylece dokununca pencere hemen açılır (açılır pencere engellenmez). */
export function googleHazirla() { if (kayitliEposta()) void kutuphane().catch(() => {}); }

/**
 * Drive izni ister. Kullanıcının dokunuşuyla çağrılmalıdır. İlk bağlantıda Google hesap ve izin sorar;
 * sonrasında e-posta ipucuyla çoğunlukla hiçbir şey sormadan döner.
 */
export async function izinAl(): Promise<{ jeton: string; bitis: number }> {
  await kutuphane();
  const eposta = kayitliEposta() ?? undefined;
  return new Promise((ok, no) => {
    const istemci = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_ISTEMCI, scope: IZINLER, login_hint: eposta,
      callback: (y) => {
        if (y.error || !y.access_token) { no(new Error(y.error === 'access_denied' ? 'Google izni verilmedi.' : 'Google izni alınamadı.')); return; }
        if (!window.google!.accounts.oauth2.hasGrantedAllScopes(y, 'https://www.googleapis.com/auth/drive.appdata')) {
          no(new Error('Drive izni verilmedi. Bağlanırken programın kendi Drive klasörüne erişim izni veren kutuyu işaretleyin.')); return;
        }
        ok({ jeton: y.access_token, bitis: Date.now() + Number(y.expires_in ?? 3600) * 1000 });
      },
      error_callback: (e) => no(new Error(e.type === 'popup_closed' ? 'Google penceresi kapatıldı.' : e.type === 'popup_failed_to_open' ? 'Google penceresi açılamadı. Tarayıcı açılır pencereyi engellemiş olabilir.' : 'Google izni alınamadı.')),
    });
    istemci.requestAccessToken({ prompt: eposta ? '' : 'consent', login_hint: eposta });
  });
}

/** Drive bağlantısını keser: izin Google'da geri alınır, e-posta unutulur. Drive'daki dosyalar silinmez. */
export async function izniGeriAl(jeton: string | null) {
  epostaKaydet(null);
  if (!jeton) return;
  try { await kutuphane(); window.google!.accounts.oauth2.revoke(jeton); } catch { /* bağlantı yok: izin süresi zaten dolacak */ }
}
