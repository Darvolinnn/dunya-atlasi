// Dünya Atlası'nın Windows kabuğu (TK6). Program yine aynı web kodudur; kabuk yalnızca kendi penceresini
// açar ve dosyaları bu bilgisayarda sabit bir yerel adresten sunar. Adres sabittir, çünkü tarayıcı
// depolaması (veritabanı) ve Google'ın izin verdiği adres buna bağlıdır: değiştirilirse eski veri görünmez.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod google;
mod yerel_yedek;

use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{webview::NewWindowResponse, Manager, WebviewUrl, WebviewWindowBuilder};

/// Drive izni (TK3). Masaüstü istemcisi derlemeye konmamışsa `None` döner; program o zaman eski yoldan bağlanır.
/// `sessiz` (program açılırken): yalnız saklı anahtarla bağlanır, tarayıcı açılmaz; anahtar yoksa `None`.
#[tauri::command]
async fn google_izin<R: tauri::Runtime>(app: tauri::AppHandle<R>, durum: tauri::State<'_, google::Durum>, eposta: Option<String>, sessiz: Option<bool>) -> Result<Option<google::Izin>, String> {
    let Some(ist) = google::derlemedeki_istemci() else { return Ok(None) };
    let sessiz = sessiz.unwrap_or(false);
    let izin = durum
        .izin(&ist, &google::Uclar::default(), eposta, sessiz, |adres| {
            open::that_detached(adres).map_err(|_| "Tarayıcı açılamadı. Varsayılan tarayıcınızı denetleyin.".to_string())
        })
        .await?;
    // İzin tarayıcıda verildi; program yeniden öne gelsin.
    if !sessiz {
        if let Some(p) = app.get_webview_window("ana") {
            let _ = p.unminimize();
            let _ = p.set_focus();
        }
    }
    Ok(izin)
}

/// Sınamalarda yedek klasörü Belgeler yerine buradadır.
#[cfg(test)]
struct SinamaYedekYeri(std::path::PathBuf);

/// Belgeler\Dünya Atlası yedekleri (K31). Belgeler klasörü başka bir yere taşınmışsa (ör. OneDrive) oradadır.
fn yedek_klasoru<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<yerel_yedek::Klasor, String> {
    #[cfg(test)]
    if let Some(y) = app.try_state::<SinamaYedekYeri>() {
        return Ok(yerel_yedek::Klasor::new(y.0.clone()));
    }
    let belgeler = app.path().document_dir().map_err(|_| "Belgeler klasörü bulunamadı.".to_string())?;
    Ok(yerel_yedek::Klasor::new(belgeler.join(yerel_yedek::KLASOR_ADI)))
}

/// Disk işleri pencereyi bekletmesin diye ayrı iş parçacığında yapılır.
async fn arkada<T: Send + 'static>(is: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(is).await.map_err(|_| "Yedek klasörü işi yarıda kaldı.".to_string())?
}

/// Yedek klasörünün yeri (ekranda gösterilir).
#[tauri::command]
async fn yerel_yedek_yeri<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    Ok(yedek_klasoru(&app)?.kok().to_string_lossy().into_owned())
}

#[tauri::command]
async fn yerel_yedek_listele<R: tauri::Runtime>(app: tauri::AppHandle<R>, alt: String) -> Result<Vec<yerel_yedek::Dosya>, String> {
    let k = yedek_klasoru(&app)?;
    arkada(move || k.listele(&alt)).await
}

#[tauri::command]
async fn yerel_yedek_oku<R: tauri::Runtime>(app: tauri::AppHandle<R>, alt: String, ad: String) -> Result<Response, String> {
    let k = yedek_klasoru(&app)?;
    Ok(Response::new(arkada(move || k.oku(&alt, &ad)).await?))
}

/// Dosyanın baytları isteğin gövdesinde, yeri ve adı başlıklarda (Türkçe harfler için yüzde kodlu) gelir.
#[tauri::command]
async fn yerel_yedek_yaz<R: tauri::Runtime>(app: tauri::AppHandle<R>, request: Request<'_>) -> Result<(), String> {
    let baslik = |ad: &str| -> Result<String, String> {
        let h = request.headers().get(ad).and_then(|v| v.to_str().ok()).ok_or("Yedek dosyasının adı eksik.")?;
        percent_encoding::percent_decode_str(h).decode_utf8().map(|s| s.into_owned()).map_err(|_| "Yedek dosyasının adı okunamadı.".to_string())
    };
    let (alt, ad) = (baslik("alt")?, baslik("ad")?);
    // Sayfa baytları doğrudan gönderir; tarayıcı motoru o yolu kapatmışsa (yedek yol) sayı dizisi olarak gelir.
    let veri: Vec<u8> = match request.body() {
        InvokeBody::Raw(v) => v.clone(),
        InvokeBody::Json(serde_json::Value::Array(d)) => d
            .iter()
            .map(|x| x.as_u64().filter(|n| *n <= 255).map(|n| n as u8))
            .collect::<Option<_>>()
            .ok_or("Yedek dosyası bozuk geldi.")?,
        _ => return Err("Yedek dosyası boş geldi.".into()),
    };
    let k = yedek_klasoru(&app)?;
    arkada(move || k.yaz(&alt, &ad, &veri)).await
}

#[tauri::command]
async fn yerel_yedek_sil<R: tauri::Runtime>(app: tauri::AppHandle<R>, alt: String, ad: String) -> Result<(), String> {
    let k = yedek_klasoru(&app)?;
    arkada(move || k.sil(&alt, &ad)).await
}

/// Yedek klasörünü Dosya Gezgini'nde açar.
#[tauri::command]
async fn yerel_yedek_klasoru_ac<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    let k = yedek_klasoru(&app)?;
    std::fs::create_dir_all(k.kok()).map_err(|_| "Yedek klasörü oluşturulamadı.".to_string())?;
    open::that_detached(k.kok()).map_err(|_| "Klasör açılamadı.".to_string())
}

/// Kabuğun bütün istekleri; `build.rs` ve `capabilities/ana.json` ile aynı liste olmalı.
macro_rules! istekler {
    () => {
        tauri::generate_handler![
            google_izin, google_cikis, yerel_yedek_yeri, yerel_yedek_listele, yerel_yedek_oku, yerel_yedek_yaz,
            yerel_yedek_sil, yerel_yedek_klasoru_ac
        ]
    };
}

/// Drive bağlantısı kesilince bu oturumdaki yenileme anahtarı Google'da geri alınır.
#[tauri::command]
async fn google_cikis(durum: tauri::State<'_, google::Durum>) -> Result<(), String> {
    durum.cikis(&google::Uclar::default()).await;
    Ok(())
}

/// Kurulu programın yerel adresinin kapısı. Geliştirme sunucusu (5173) ile aynı anda çalışabilsin diye ayrıdır.
#[cfg(not(debug_assertions))]
const KAPI: u16 = 41730;

fn main() {
    let kurucu = tauri::Builder::default().plugin(tauri_plugin_single_instance::init(|app, _, _| {
        // İkinci kez açılırsa yeni pencere açılmaz; açık olan öne gelir (aynı veritabanını iki süreç açmasın).
        if let Some(p) = app.get_webview_window("ana") {
            let _ = p.unminimize();
            let _ = p.set_focus();
        }
    }));
    #[cfg(not(debug_assertions))]
    let kurucu = kurucu.plugin(
        tauri_plugin_localhost::Builder::new(KAPI)
            .on_request(|istek, yanit| {
                // Veritabanı motoru (.wasm) doğru türle gelmezse tarayıcı onu hızlı yoldan yükleyemez.
                if istek.url().split('?').next().is_some_and(|y| y.ends_with(".wasm")) {
                    yanit.add_header("Content-Type", "application/wasm");
                }
            })
            .build(),
    );

    kurucu
        .manage(google::Durum::default())
        .invoke_handler(istekler!())
        .setup(|app| {
            #[cfg(debug_assertions)]
            let adres = WebviewUrl::App("index.html".into());
            #[cfg(not(debug_assertions))]
            let adres = WebviewUrl::External(format!("http://localhost:{KAPI}").parse().expect("yerel adres"));
            WebviewWindowBuilder::new(app, "ana", adres)
                .title("Dünya Atlası")
                .inner_size(1400.0, 900.0)
                .min_inner_size(900.0, 600.0)
                .maximized(true)
                // Google'ın izin penceresi açılabilsin; başka yeni pencere açılmaz. Masaüstü istemcisi derlemeye
                // konduysa izin bu pencere yerine bilgisayarın tarayıcısında verilir (google.rs); bu yol yedektir.
                .on_new_window(|adres, _| {
                    if adres.host_str() == Some("accounts.google.com") {
                        NewWindowResponse::Allow
                    } else {
                        NewWindowResponse::Deny
                    }
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Dünya Atlası açılamadı");
}

#[cfg(test)]
mod sinama {
    use tauri::ipc::{CallbackFn, InvokeResponseBody};
    use tauri::test::{get_ipc_response, mock_builder, MockRuntime, INVOKE_KEY};
    use tauri::webview::InvokeRequest;

    struct KasaYok;
    impl super::google::Kasa for KasaYok {
        fn oku(&self) -> Option<String> { None }
        fn yaz(&self, _: &str) {}
        fn sil(&self) {}
    }

    fn pencere(adres: &str, yedek_yeri: Option<std::path::PathBuf>) -> (tauri::App<MockRuntime>, tauri::WebviewWindow<MockRuntime>) {
        use super::*;
        let mut kurucu = mock_builder().manage(super::google::Durum::yeni(Box::new(KasaYok)));
        if let Some(y) = yedek_yeri {
            kurucu = kurucu.manage(SinamaYedekYeri(y));
        }
        let app = kurucu.invoke_handler(istekler!()).build(tauri::generate_context!()).unwrap();
        let url: tauri::Url = adres.parse().unwrap();
        let w = tauri::WebviewWindowBuilder::new(&app, "ana", tauri::WebviewUrl::External(url)).build().unwrap();
        (app, w)
    }

    fn istek(w: &tauri::WebviewWindow<MockRuntime>, komut: &str, body: tauri::ipc::InvokeBody, basliklar: &[(&str, &str)]) -> Result<InvokeResponseBody, String> {
        let mut headers = tauri::http::HeaderMap::new();
        for (a, d) in basliklar {
            headers.insert(tauri::http::HeaderName::from_bytes(a.as_bytes()).unwrap(), d.parse().unwrap());
        }
        get_ipc_response(w, InvokeRequest {
            cmd: komut.into(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: w.url().unwrap(),
            body,
            headers,
            invoke_key: INVOKE_KEY.to_string(),
        })
        .map_err(|e| e.to_string())
    }

    /// Kurulu programın sayfası yerel adresten gelir; istekler izin listesine girmezse
    /// "not allowed by ACL" diye reddedilir (21 Ekim'de kurulu programda görüldü).
    fn cagir(adres: &str, komut: &str) -> Result<(), String> {
        let (_app, w) = pencere(adres, None);
        istek(&w, komut, Default::default(), &[]).map(|_| ())
    }

    #[test]
    fn yerel_adresten_google_istekleri_izinli() {
        cagir("http://localhost:41730", "google_cikis").unwrap();
        let e = cagir("http://localhost:9999", "google_cikis").unwrap_err();
        assert!(e.contains("not allowed"), "{e}");
    }

    #[test]
    fn yerel_adresten_yedek_klasoru_istekleri_izinli() {
        // Yalnız izin denetimi: istek çağrılabiliyor ("not allowed" değil). Sınamada Belgeler klasörü olmayabilir.
        for komut in ["yerel_yedek_yeri", "yerel_yedek_listele", "yerel_yedek_oku", "yerel_yedek_yaz", "yerel_yedek_sil", "yerel_yedek_klasoru_ac"] {
            if let Err(e) = cagir("http://localhost:41730", komut) { assert!(!e.contains("not allowed"), "{komut}: {e}"); }
            let e = cagir("http://localhost:9999", komut).unwrap_err();
            assert!(e.contains("not allowed"), "{komut}: {e}");
        }
    }

    /// Program yedeği, sayfadan gelen istekle olduğu gibi yazar ve geri okur: baytlar gövdede, Türkçe harfli ad başlıkta.
    #[test]
    fn yedek_dosyasi_istekle_yazilir_listelenir_okunur_silinir() {
        use serde_json::json;
        let yer = std::env::temp_dir().join(format!("dunya-atlasi-istek-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&yer);
        let (_app, w) = pencere("http://localhost:41730", Some(yer.join("Dünya Atlası yedekleri")));
        let ad = "Sisli Kıyı 2026-10-21.zip";
        let kodlu: String = percent_encoding::utf8_percent_encode(ad, percent_encoding::NON_ALPHANUMERIC).to_string();
        let veri: Vec<u8> = (0..=255u8).cycle().take(70_000).collect();
        istek(&w, "yerel_yedek_yaz", tauri::ipc::InvokeBody::Raw(veri.clone()), &[("alt", ""), ("ad", &kodlu)]).unwrap();
        let liste = istek(&w, "yerel_yedek_listele", json!({ "alt": "" }).into(), &[]).unwrap();
        let InvokeResponseBody::Json(liste) = liste else { panic!("liste") };
        assert_eq!(serde_json::from_str::<serde_json::Value>(&liste).unwrap(), json!([{ "ad": ad, "boy": 70_000 }]));
        let geri = istek(&w, "yerel_yedek_oku", json!({ "alt": "", "ad": ad }).into(), &[]).unwrap();
        let InvokeResponseBody::Raw(geri) = geri else { panic!("baytlar gelmedi") };
        assert_eq!(geri, veri);
        // Yedek yol: baytlar sayı dizisi olarak gelir.
        istek(&w, "yerel_yedek_yaz", json!([1, 2, 255]).into(), &[("alt", "medya"), ("ad", "ab")]).unwrap();
        let InvokeResponseBody::Raw(g) = istek(&w, "yerel_yedek_oku", json!({ "alt": "medya", "ad": "ab" }).into(), &[]).unwrap() else { panic!() };
        assert_eq!(g, vec![1, 2, 255]);
        assert!(istek(&w, "yerel_yedek_yaz", json!([1, 256]).into(), &[("alt", "medya"), ("ad", "ac")]).is_err());
        // Klasörün dışına yazılamaz; ad eksikse yazılmaz.
        let disari = percent_encoding::utf8_percent_encode("../disari.zip", percent_encoding::NON_ALPHANUMERIC).to_string();
        assert!(istek(&w, "yerel_yedek_yaz", tauri::ipc::InvokeBody::Raw(vec![1]), &[("alt", ""), ("ad", &disari)]).is_err());
        assert!(istek(&w, "yerel_yedek_yaz", tauri::ipc::InvokeBody::Raw(vec![1]), &[("alt", "")]).is_err());
        assert!(!yer.join("disari.zip").exists());
        istek(&w, "yerel_yedek_sil", json!({ "alt": "", "ad": ad }).into(), &[]).unwrap();
        let InvokeResponseBody::Json(liste) = istek(&w, "yerel_yedek_listele", json!({ "alt": "" }).into(), &[]).unwrap() else { panic!() };
        assert_eq!(liste, "[]");
        let _ = std::fs::remove_dir_all(&yer);
    }
}
