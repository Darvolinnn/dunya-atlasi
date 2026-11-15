fn main() {
    // Windows'ta Rust sınamaları artık kütüphanede (lib.rs) koşar; tauri-build pencere bileşenleri bildirimini yalnız
    // programa gömer, sınama dosyası onsuz açılmaz (STATUS_ENTRYPOINT_NOT_FOUND). Bildirim sınama dosyasına da gömülür.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") && std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
        let bildirim = std::path::Path::new(&std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("windows").join("sinama.manifest");
        println!("cargo:rerun-if-changed=windows/sinama.manifest");
        println!("cargo:rustc-link-arg-tests=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg-tests=/MANIFESTINPUT:{}", bildirim.display());
    }
    // Programın kendi istekleri (Google girişi, bu bilgisayardaki yedek klasörü) izin listesine girer; sayfa yerel adresten (uzak köken) geldiği için
    // izin `capabilities/ana.json`'da açıkça verilir, yoksa çağrı "not allowed by ACL" diye reddedilir.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&[
                "google_izin", "google_cikis", "yerel_yedek_yeri", "yerel_yedek_listele", "yerel_yedek_oku",
                "yerel_yedek_yaz", "yerel_yedek_sil", "yerel_yedek_klasoru_ac",
            ])),
    )
    .expect("derleme hazırlığı başarısız");
}
