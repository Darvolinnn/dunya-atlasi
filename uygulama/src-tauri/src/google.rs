// Windows uygulamasında Google girişi (TK3). Google, izin sayfasının programın kendi penceresinde açılmasına izin
// vermez; masaüstü programı için yol şudur: izin sayfası bilgisayarın tarayıcısında açılır, Google yanıtı bu
// bilgisayardaki geçici bir yerel adrese (127.0.0.1, rastgele kapı) gönderir, program oradan alır (PKCE ile).
// Uzun süreli yenileme anahtarı yalnız bu süreçte, bellekte durur; program kapanınca unutulur, diske yazılmaz.
use std::sync::Mutex;
use std::time::Duration;

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

pub const IZINLER: &str = "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file";
/** Tarayıcıda izin verilmesi en çok bu kadar beklenir. */
const BEKLEME: Duration = Duration::from_secs(300);
/** Google'a yapılan her istek en çok bu kadar sürer. */
const ISTEK_SURESI: Duration = Duration::from_secs(60);

/// Google'ın adresleri; sınamada sahte sunucuya çevrilir.
pub struct Uclar {
    pub yetki: String,
    pub jeton: String,
    pub geri_al: String,
}

impl Default for Uclar {
    fn default() -> Self {
        Uclar {
            yetki: "https://accounts.google.com/o/oauth2/v2/auth".into(),
            jeton: "https://oauth2.googleapis.com/token".into(),
            geri_al: "https://oauth2.googleapis.com/revoke".into(),
        }
    }
}

/// Google projesindeki "Masaüstü uygulaması" istemcisi. Kodun içinde değil, derlenirken GitHub'daki gizli
/// değerlerden gelir (depo herkese açık). Yoksa program eski yoldan (pencere içinde) bağlanır.
pub struct Istemci {
    pub kod: String,
    pub gizli: String,
}

pub fn derlemedeki_istemci() -> Option<Istemci> {
    match (option_env!("GOOGLE_MASAUSTU_ISTEMCI"), option_env!("GOOGLE_MASAUSTU_GIZLI")) {
        (Some(k), Some(g)) if !k.trim().is_empty() && !g.trim().is_empty() => {
            Some(Istemci { kod: k.trim().into(), gizli: g.trim().into() })
        }
        _ => None,
    }
}

/// Bu süreçteki yenileme anahtarı.
#[derive(Default)]
pub struct Durum {
    yenileme: Mutex<Option<String>>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Izin {
    pub jeton: String,
    pub sure_sn: u64,
    pub kapsam: String,
}

#[derive(Deserialize)]
struct JetonYaniti {
    access_token: Option<String>,
    expires_in: Option<u64>,
    refresh_token: Option<String>,
    scope: Option<String>,
    error: Option<String>,
}

fn rastgele(n: usize) -> String {
    let mut b = vec![0u8; n];
    rand::thread_rng().fill_bytes(&mut b);
    URL_SAFE_NO_PAD.encode(b)
}

fn istemci_http() -> Result<reqwest::Client, String> {
    reqwest::Client::builder().timeout(ISTEK_SURESI).build().map_err(|_| "Google'a bağlanılamadı.".to_string())
}

/// Adres satırındaki sorgudan bir değer.
fn sorgu_degeri(yol: &str, ad: &str) -> Option<String> {
    let u = url::Url::parse(&format!("http://127.0.0.1{yol}")).ok()?;
    let d = u.query_pairs().find(|(k, _)| k == ad).map(|(_, v)| v.into_owned());
    d
}

const SAYFA_TAMAM: &str = "Google izni alındı. Bu sekmeyi kapatıp Dünya Atlası'na dönebilirsiniz.";
const SAYFA_HATA: &str = "Google izni alınamadı. Dünya Atlası'na dönüp yeniden deneyin.";

async fn yanitla(akis: &mut tokio::net::TcpStream, ileti: &str) {
    let govde = format!(
        "<!doctype html><html lang=\"tr\"><meta charset=\"utf-8\"><title>Dünya Atlası</title>\
         <body style=\"font-family:sans-serif;padding:3em;background:#1f1d1a;color:#eee\"><p>{ileti}</p></body></html>"
    );
    let yanit = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{govde}",
        govde.len()
    );
    let _ = akis.write_all(yanit.as_bytes()).await;
    let _ = akis.shutdown().await;
}

/// Tarayıcının yerel adrese gelişini bekler; Google'ın verdiği kodu döner.
/// Bağlantılar ayrı ayrı okunur: tarayıcı boş bağlantılar da açabilir, biri ötekini bekletmemeli.
async fn kodu_bekle(dinleyici: TcpListener, durum_kodu: &str) -> Result<String, String> {
    let (gonder, mut al) = tokio::sync::mpsc::channel::<(tokio::net::TcpStream, String)>(8);
    loop {
        let (mut akis, yol) = tokio::select! {
            k = dinleyici.accept() => {
                let (mut akis, _) = k.map_err(|_| "Google'ın yanıtı alınamadı.".to_string())?;
                let g = gonder.clone();
                tokio::spawn(async move {
                    let mut tampon = vec![0u8; 8192];
                    if let Ok(Ok(n)) = tokio::time::timeout(Duration::from_secs(30), akis.read(&mut tampon)).await {
                        let istek = String::from_utf8_lossy(&tampon[..n]).to_string();
                        let yol = istek.lines().next().and_then(|s| s.split_whitespace().nth(1)).unwrap_or("").to_string();
                        let _ = g.send((akis, yol)).await;
                    }
                });
                continue;
            }
            Some(x) = al.recv() => x,
        };
        // Tarayıcının kendiliğinden istediği sekme simgesi gibi istekler yok sayılır.
        if !yol.starts_with("/?") {
            let _ = akis.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").await;
            continue;
        }
        if sorgu_degeri(&yol, "state").as_deref() != Some(durum_kodu) {
            yanitla(&mut akis, SAYFA_HATA).await;
            return Err("Google'ın yanıtı bu girişe ait değil. Yeniden deneyin.".into());
        }
        if let Some(hata) = sorgu_degeri(&yol, "error") {
            yanitla(&mut akis, SAYFA_HATA).await;
            return Err(if hata == "access_denied" { "Google izni verilmedi.".into() } else { "Google izni alınamadı.".into() });
        }
        return match sorgu_degeri(&yol, "code") {
            Some(k) => { yanitla(&mut akis, SAYFA_TAMAM).await; Ok(k) }
            None => { yanitla(&mut akis, SAYFA_HATA).await; Err("Google izni alınamadı.".into()) }
        };
    }
}

async fn jeton_iste(uclar: &Uclar, form: &[(&str, &str)]) -> Result<JetonYaniti, String> {
    let r = istemci_http()?
        .post(&uclar.jeton)
        .form(form)
        .send()
        .await
        .map_err(|_| "Google'a ulaşılamadı. İnternet bağlantısını kontrol edin.".to_string())?;
    let y: JetonYaniti = r.json().await.map_err(|_| "Google'ın yanıtı okunamadı.".to_string())?;
    if y.error.is_some() || y.access_token.is_none() {
        return Err(match y.error.as_deref() {
            Some("invalid_grant") => "Google izninin süresi dolmuş. Yeniden bağlanın.".into(),
            Some("invalid_client") | Some("unauthorized_client") => "Programın Google ayarı geçersiz. Google Cloud'daki masaüstü istemcisini denetleyin.".into(),
            _ => "Google izni alınamadı.".into(),
        });
    }
    Ok(y)
}

fn izne_cevir(y: JetonYaniti) -> Izin {
    Izin { jeton: y.access_token.unwrap_or_default(), sure_sn: y.expires_in.unwrap_or(3600), kapsam: y.scope.unwrap_or_default() }
}

impl Durum {
    /// Drive izni: bu oturumda yenileme anahtarı varsa tarayıcı açılmadan yenilenir; yoksa tarayıcıda izin istenir.
    pub async fn izin(&self, ist: &Istemci, uclar: &Uclar, eposta: Option<String>, tarayicida_ac: impl Fn(&str) -> Result<(), String>) -> Result<Izin, String> {
        let elde = self.yenileme.lock().unwrap().clone();
        if let Some(rt) = elde {
            let form = [("client_id", ist.kod.as_str()), ("client_secret", ist.gizli.as_str()), ("refresh_token", rt.as_str()), ("grant_type", "refresh_token")];
            match jeton_iste(uclar, &form).await {
                Ok(y) => return Ok(izne_cevir(y)),
                // Anahtar geri alınmış ya da süresi dolmuş: unutulur, tarayıcıda yeniden izin istenir.
                Err(_) => { *self.yenileme.lock().unwrap() = None; }
            }
        }
        let dinleyici = TcpListener::bind("127.0.0.1:0").await.map_err(|_| "Google girişi için yerel bağlantı açılamadı.".to_string())?;
        let kapi = dinleyici.local_addr().map_err(|_| "Google girişi için yerel bağlantı açılamadı.".to_string())?.port();
        let donus = format!("http://127.0.0.1:{kapi}");
        let dogrulayici = rastgele(48);
        let meydan = URL_SAFE_NO_PAD.encode(Sha256::digest(dogrulayici.as_bytes()));
        let durum_kodu = rastgele(24);
        let mut adres = url::Url::parse(&uclar.yetki).map_err(|_| "Google girişi açılamadı.".to_string())?;
        {
            let mut q = adres.query_pairs_mut();
            q.append_pair("client_id", &ist.kod)
                .append_pair("redirect_uri", &donus)
                .append_pair("response_type", "code")
                .append_pair("scope", IZINLER)
                .append_pair("code_challenge", &meydan)
                .append_pair("code_challenge_method", "S256")
                .append_pair("state", &durum_kodu)
                .append_pair("access_type", "offline");
            if let Some(e) = eposta.as_deref().filter(|e| !e.is_empty()) {
                q.append_pair("login_hint", e);
            }
        }
        tarayicida_ac(adres.as_str())?;
        let kod = tokio::time::timeout(BEKLEME, kodu_bekle(dinleyici, &durum_kodu))
            .await
            .map_err(|_| "Google izni beklenirken süre doldu. Yeniden deneyin.".to_string())??;
        let form = [
            ("client_id", ist.kod.as_str()), ("client_secret", ist.gizli.as_str()), ("code", kod.as_str()),
            ("code_verifier", dogrulayici.as_str()), ("redirect_uri", donus.as_str()), ("grant_type", "authorization_code"),
        ];
        let mut y = jeton_iste(uclar, &form).await?;
        if let Some(rt) = y.refresh_token.take() {
            *self.yenileme.lock().unwrap() = Some(rt);
        }
        Ok(izne_cevir(y))
    }

    /// Bağlantı kesilince yenileme anahtarı Google'da geri alınır ve unutulur.
    pub async fn cikis(&self, uclar: &Uclar) {
        let rt = self.yenileme.lock().unwrap().take();
        if let (Some(rt), Ok(h)) = (rt, istemci_http()) {
            let _ = h.post(&uclar.geri_al).form(&[("token", rt.as_str())]).send().await;
        }
    }
}

#[cfg(test)]
mod sinama {
    use super::*;
    use std::sync::Arc;

    /// Google'ın jeton adresini taklit eden küçük sunucu: gelen formları kaydeder, sırayla verilen yanıtları döner.
    async fn sahte_jeton(yanitlar: Vec<&'static str>) -> (String, Arc<Mutex<Vec<String>>>) {
        let d = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let adres = format!("http://{}", d.local_addr().unwrap());
        let gelen = Arc::new(Mutex::new(Vec::new()));
        let g = gelen.clone();
        tokio::spawn(async move {
            for govde in yanitlar {
                let (mut a, _) = d.accept().await.unwrap();
                let mut t = vec![0u8; 16384];
                let mut toplam = 0;
                loop {
                    let n = a.read(&mut t[toplam..]).await.unwrap();
                    toplam += n;
                    let s = String::from_utf8_lossy(&t[..toplam]).to_string();
                    if let Some(i) = s.find("\r\n\r\n") {
                        let uzunluk = s.lines().find_map(|l| l.to_ascii_lowercase().strip_prefix("content-length: ").map(|x| x.trim().parse::<usize>().unwrap())).unwrap_or(0);
                        if toplam >= i + 4 + uzunluk { g.lock().unwrap().push(s[i + 4..].to_string()); break; }
                    }
                    if n == 0 { break; }
                }
                let y = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{govde}", govde.len());
                a.write_all(y.as_bytes()).await.unwrap();
            }
        });
        (adres, gelen)
    }

    fn ist() -> Istemci { Istemci { kod: "istemci-kodu".into(), gizli: "gizli".into() } }

    /// Tarayıcıyı taklit eder: adresi okur ve Google gibi yerel dönüş adresine gider.
    fn tarayici(sorgu: impl Fn(&url::Url) -> String) -> impl Fn(&str) -> Result<(), String> {
        move |a: &str| {
            let u = url::Url::parse(a).unwrap();
            let q = sorgu(&u);
            tokio::spawn(async move {
                let donus = u.query_pairs().find(|(k, _)| k == "redirect_uri").unwrap().1.into_owned();
                let mut akis = tokio::net::TcpStream::connect(donus.trim_start_matches("http://")).await.unwrap();
                // Önce sekme simgesi isteği gelir; yok sayılmalı.
                let mut f = tokio::net::TcpStream::connect(donus.trim_start_matches("http://")).await.unwrap();
                f.write_all(b"GET /favicon.ico HTTP/1.1\r\n\r\n").await.unwrap();
                let mut x = Vec::new(); let _ = f.read_to_end(&mut x).await;
                akis.write_all(format!("GET /?{q} HTTP/1.1\r\nHost: x\r\n\r\n").as_bytes()).await.unwrap();
                let mut y = Vec::new(); let _ = akis.read_to_end(&mut y).await;
            });
            Ok(())
        }
    }
    fn deger(u: &url::Url, ad: &str) -> String { u.query_pairs().find(|(k, _)| k == ad).unwrap().1.into_owned() }

    #[tokio::test]
    async fn tarayicida_izin_sonra_tarayicisiz_yenileme() {
        let (jeton, gelen) = sahte_jeton(vec![
            r#"{"access_token":"j1","expires_in":3599,"refresh_token":"r1","scope":"https://www.googleapis.com/auth/drive.appdata"}"#,
            r#"{"access_token":"j2","expires_in":3599,"scope":"https://www.googleapis.com/auth/drive.appdata"}"#,
        ]).await;
        let uclar = Uclar { yetki: "https://ornek.invalid/auth".into(), jeton, geri_al: "http://127.0.0.1:9/".into() };
        let d = Durum::default();
        let ac = tarayici(|u| {
            assert_eq!(deger(u, "code_challenge_method"), "S256");
            assert_eq!(deger(u, "login_hint"), "yazar@ornek.invalid");
            format!("state={}&code=KOD1", deger(u, "state"))
        });
        let i = d.izin(&ist(), &uclar, Some("yazar@ornek.invalid".into()), ac).await.unwrap();
        assert_eq!(i.jeton, "j1");
        let ilk = gelen.lock().unwrap()[0].clone();
        assert!(ilk.contains("code=KOD1") && ilk.contains("code_verifier=") && ilk.contains("grant_type=authorization_code"));
        // İkinci istekte tarayıcı açılmaz.
        let i2 = d.izin(&ist(), &uclar, None, |_| -> Result<(), String> { panic!("tarayıcı açılmamalı") }).await.unwrap();
        assert_eq!(i2.jeton, "j2");
        assert!(gelen.lock().unwrap()[1].contains("refresh_token=r1"));
    }

    #[tokio::test]
    async fn baska_girisin_yaniti_ve_reddedilen_izin_kabul_edilmez() {
        let uclar = Uclar { yetki: "https://ornek.invalid/auth".into(), jeton: "http://127.0.0.1:9/".into(), geri_al: "http://127.0.0.1:9/".into() };
        let d = Durum::default();
        let e = d.izin(&ist(), &uclar, None, tarayici(|_| "state=yanlis&code=KOD".into())).await.unwrap_err();
        assert!(e.contains("bu girişe ait değil"), "{e}");
        let e = d.izin(&ist(), &uclar, None, tarayici(|u| format!("state={}&error=access_denied", deger(u, "state")))).await.unwrap_err();
        assert_eq!(e, "Google izni verilmedi.");
    }
}
