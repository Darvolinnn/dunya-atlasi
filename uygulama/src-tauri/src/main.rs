// Dünya Atlası'nın Windows kabuğu (TK6). Program yine aynı web kodudur; kabuk yalnızca kendi penceresini
// açar ve dosyaları bu bilgisayarda sabit bir yerel adresten sunar. Adres sabittir, çünkü tarayıcı
// depolaması (veritabanı) ve Google'ın izin verdiği adres buna bağlıdır: değiştirilirse eski veri görünmez.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod google;

use tauri::{webview::NewWindowResponse, Manager, WebviewUrl, WebviewWindowBuilder};

/// Drive izni (TK3). Masaüstü istemcisi derlemeye konmamışsa `None` döner; program o zaman eski yoldan bağlanır.
#[tauri::command]
async fn google_izin<R: tauri::Runtime>(app: tauri::AppHandle<R>, durum: tauri::State<'_, google::Durum>, eposta: Option<String>) -> Result<Option<google::Izin>, String> {
    let Some(ist) = google::derlemedeki_istemci() else { return Ok(None) };
    let izin = durum
        .izin(&ist, &google::Uclar::default(), eposta, |adres| {
            open::that_detached(adres).map_err(|_| "Tarayıcı açılamadı. Varsayılan tarayıcınızı denetleyin.".to_string())
        })
        .await?;
    // İzin tarayıcıda verildi; program yeniden öne gelsin.
    if let Some(p) = app.get_webview_window("ana") {
        let _ = p.unminimize();
        let _ = p.set_focus();
    }
    Ok(Some(izin))
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
        .invoke_handler(tauri::generate_handler![google_izin, google_cikis])
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
    use tauri::ipc::{CallbackFn, InvokeBody};
    use tauri::test::{get_ipc_response, mock_builder, INVOKE_KEY};
    use tauri::webview::InvokeRequest;

    /// Kurulu programın sayfası yerel adresten gelir; Google istekleri izin listesine girmezse
    /// "not allowed by ACL" diye reddedilir (21 Ekim'de kurulu programda görüldü).
    fn cagir(adres: &str) -> Result<(), String> {
        let app = mock_builder()
            .manage(super::google::Durum::default())
            .invoke_handler(tauri::generate_handler![super::google_izin, super::google_cikis])
            .build(tauri::generate_context!())
            .unwrap();
        let url: tauri::Url = adres.parse().unwrap();
        let w = tauri::WebviewWindowBuilder::new(&app, "ana", tauri::WebviewUrl::External(url.clone())).build().unwrap();
        get_ipc_response(&w, InvokeRequest {
            cmd: "google_cikis".into(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url,
            body: InvokeBody::default(),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_string(),
        })
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    #[test]
    fn yerel_adresten_google_istekleri_izinli() {
        cagir("http://localhost:41730").unwrap();
        let e = cagir("http://localhost:9999").unwrap_err();
        assert!(e.contains("not allowed"), "{e}");
    }
}
