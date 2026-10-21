// Dünya Atlası'nın Windows kabuğu (TK6). Program yine aynı web kodudur; kabuk yalnızca kendi penceresini
// açar ve dosyaları bu bilgisayarda sabit bir yerel adresten sunar. Adres sabittir, çünkü tarayıcı
// depolaması (veritabanı) ve Google'ın izin verdiği adres buna bağlıdır: değiştirilirse eski veri görünmez.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{webview::NewWindowResponse, Manager, WebviewUrl, WebviewWindowBuilder};

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
                // Google'ın izin penceresi açılabilsin; başka yeni pencere açılmaz.
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
