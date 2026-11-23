fn main() {
    // Windows'ta pencere bileşenleri bildirimi (Common Controls 6) tauri-build yerine bağlayıcıyla gömülür: tauri-build onu
    // yalnız programa gömüyor; Rust sınamaları artık kütüphanede (lib.rs) koştuğu için sınama dosyası onsuz açılmıyordu
    // (STATUS_ENTRYPOINT_NOT_FOUND). Bildirimin içeriği tauri-build'in varsayılanıyla aynıdır.
    let windows = std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") && std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc");
    if windows {
        let bildirim = std::path::Path::new(&std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("windows").join("uygulama.manifest");
        println!("cargo:rerun-if-changed=windows/uygulama.manifest");
        println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg=/MANIFESTINPUT:{}", bildirim.display());
    }
    // Google masaüstü istemcisi (google.rs `option_env!`). Tablet derlemesinde cargo'yu Gradle çalıştırır ve işin ortam
    // değişkenleri ona ulaşmıyor (15 Kasım: APK'da istemci yoktu); o yüzden derleme işi değerleri depoya girmeyen
    // `google-istemci.txt`'e (iki satır: kod, gizli) yazar, buradan derlemeye verilir.
    println!("cargo:rerun-if-env-changed=GOOGLE_MASAUSTU_ISTEMCI");
    println!("cargo:rerun-if-env-changed=GOOGLE_MASAUSTU_GIZLI");
    println!("cargo:rerun-if-changed=google-istemci.txt");
    if std::env::var("GOOGLE_MASAUSTU_ISTEMCI").map_or(true, |v| v.trim().is_empty()) {
        if let Ok(icerik) = std::fs::read_to_string("google-istemci.txt") {
            let mut satirlar = icerik.lines().map(str::trim);
            if let (Some(kod), Some(gizli)) = (satirlar.next(), satirlar.next()) {
                if !kod.is_empty() && !gizli.is_empty() {
                    println!("cargo:rustc-env=GOOGLE_MASAUSTU_ISTEMCI={kod}");
                    println!("cargo:rustc-env=GOOGLE_MASAUSTU_GIZLI={gizli}");
                }
            }
        }
    }
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .windows_attributes(tauri_build::WindowsAttributes::new_without_app_manifest())
            .app_manifest(tauri_build::AppManifest::new().commands(&[
                "google_izin", "google_cikis", "yerel_yedek_yeri", "yerel_yedek_listele", "yerel_yedek_oku",
                "yerel_yedek_yaz", "yerel_yedek_sil", "yerel_yedek_klasoru_ac", "indirilenlere_kaydet",
            ])),
    )
    .expect("derleme hazırlığı başarısız");
}
