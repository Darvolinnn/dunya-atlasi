fn main() {
    // Programın kendi istekleri (Google girişi) izin listesine girer; sayfa yerel adresten (uzak köken) geldiği için
    // izin `capabilities/ana.json`'da açıkça verilir, yoksa çağrı "not allowed by ACL" diye reddedilir.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["google_izin", "google_cikis"])),
    )
    .expect("derleme hazırlığı başarısız");
}
