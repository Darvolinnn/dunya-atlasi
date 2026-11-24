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
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .windows_attributes(tauri_build::WindowsAttributes::new_without_app_manifest())
            .app_manifest(tauri_build::AppManifest::new().commands(&[
                "google_izin", "google_cikis", "yerel_yedek_yeri", "yerel_yedek_listele", "yerel_yedek_oku",
                "yerel_yedek_yaz", "yerel_yedek_sil", "yerel_yedek_klasoru_ac", "pencereyi_kapat",
            ])),
    )
    .expect("derleme hazırlığı başarısız");
}
