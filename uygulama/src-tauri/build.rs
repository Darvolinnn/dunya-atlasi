fn main() {
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
