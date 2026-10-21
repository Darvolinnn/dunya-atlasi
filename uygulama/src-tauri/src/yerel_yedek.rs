// Bu bilgisayardaki günlük yedekler (K31): Belgeler klasöründeki "Dünya Atlası yedekleri" klasörü.
// Program (web kodu) yedeği hazırlar ve buraya yalnızca bu birkaç istekle dosya yazar, okur ve siler; başka hiçbir
// klasöre erişemez. Dosya adları denetlenir: yol ayracı, "..", Windows'un yasak harfleri kabul edilmez.
// Yazma önce geçici dosyaya yapılır, diske işlenir, sonra yerine taşınır: elektrik kesilse de yarım dosya kalmaz.
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use serde::Serialize;

pub const KLASOR_ADI: &str = "Dünya Atlası yedekleri";
const GECICI_EK: &str = ".yaziliyor";

#[derive(Serialize, Debug, PartialEq)]
pub struct Dosya {
    pub ad: String,
    pub boy: u64,
}

/// Yalnız iki yer var: yedek klasörünün kendisi ("") ve görsellerin tek kopyasının durduğu "medya".
pub fn alt_gecerli(alt: &str) -> bool {
    alt.is_empty() || alt == "medya"
}

pub fn ad_gecerli(ad: &str) -> bool {
    !ad.is_empty()
        && ad.chars().count() <= 180
        && ad != "."
        && ad != ".."
        && !ad.ends_with('.')
        && !ad.ends_with(' ')
        && !ad.ends_with(GECICI_EK)
        && !ad.chars().any(|c| c.is_control() || matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|'))
}

pub struct Klasor {
    kok: PathBuf,
}

impl Klasor {
    pub fn new(kok: PathBuf) -> Self {
        Klasor { kok }
    }

    pub fn kok(&self) -> &Path {
        &self.kok
    }

    fn dizin(&self, alt: &str) -> Result<PathBuf, String> {
        if !alt_gecerli(alt) {
            return Err("Yedek klasöründe böyle bir yer yok.".into());
        }
        Ok(if alt.is_empty() { self.kok.clone() } else { self.kok.join(alt) })
    }

    fn yol(&self, alt: &str, ad: &str) -> Result<PathBuf, String> {
        if !ad_gecerli(ad) {
            return Err("Yedek dosyasının adı geçersiz.".into());
        }
        Ok(self.dizin(alt)?.join(ad))
    }

    /// Klasördeki dosyalar (alt klasörler ve yarım kalmış geçici dosyalar hariç). Klasör yoksa oluşturulur.
    pub fn listele(&self, alt: &str) -> Result<Vec<Dosya>, String> {
        let d = self.dizin(alt)?;
        fs::create_dir_all(&d).map_err(|e| hata("Yedek klasörü oluşturulamadı", &e))?;
        let mut liste = Vec::new();
        for g in fs::read_dir(&d).map_err(|e| hata("Yedek klasörü okunamadı", &e))? {
            let Ok(g) = g else { continue };
            let Ok(t) = g.file_type() else { continue };
            if !t.is_file() {
                continue;
            }
            let Ok(ad) = g.file_name().into_string() else { continue };
            if !ad_gecerli(&ad) {
                continue;
            }
            let boy = g.metadata().map(|m| m.len()).unwrap_or(0);
            liste.push(Dosya { ad, boy });
        }
        liste.sort_by(|a, b| a.ad.cmp(&b.ad));
        Ok(liste)
    }

    pub fn oku(&self, alt: &str, ad: &str) -> Result<Vec<u8>, String> {
        fs::read(self.yol(alt, ad)?).map_err(|e| hata("Yedek dosyası okunamadı", &e))
    }

    /// Önce geçici dosyaya yazar ve diske işler, sonra eski dosyanın yerine koyar.
    pub fn yaz(&self, alt: &str, ad: &str, veri: &[u8]) -> Result<(), String> {
        let hedef = self.yol(alt, ad)?;
        let d = self.dizin(alt)?;
        fs::create_dir_all(&d).map_err(|e| hata("Yedek klasörü oluşturulamadı", &e))?;
        let gecici = d.join(format!("{ad}{GECICI_EK}"));
        let sonuc = (|| {
            let mut f = fs::File::create(&gecici)?;
            f.write_all(veri)?;
            f.sync_all()?;
            drop(f);
            fs::rename(&gecici, &hedef)?;
            // Taşımanın kendisi de diske işlensin (Windows'ta klasör açılamaz; orada taşıma zaten kalıcıdır).
            #[cfg(unix)]
            if let Ok(k) = fs::File::open(&d) {
                let _ = k.sync_all();
            }
            Ok::<(), std::io::Error>(())
        })();
        sonuc.map_err(|e| {
            let _ = fs::remove_file(&gecici);
            hata("Yedek dosyası yazılamadı", &e)
        })
    }

    /// Dosyayı siler; zaten yoksa hata sayılmaz.
    pub fn sil(&self, alt: &str, ad: &str) -> Result<(), String> {
        match fs::remove_file(self.yol(alt, ad)?) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(hata("Eski yedek silinemedi", &e)),
        }
    }
}

fn hata(ne: &str, e: &std::io::Error) -> String {
    match e.kind() {
        std::io::ErrorKind::StorageFull => format!("{ne}: diskte yer kalmadı."),
        std::io::ErrorKind::PermissionDenied => format!("{ne}: Windows izin vermedi."),
        std::io::ErrorKind::NotFound => format!("{ne}: dosya bulunamadı."),
        _ => format!("{ne}."),
    }
}

#[cfg(test)]
mod sinama {
    use super::*;

    fn gecici_klasor(ad: &str) -> PathBuf {
        let k = std::env::temp_dir().join(format!("dunya-atlasi-sinama-{ad}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&k);
        k
    }

    #[test]
    fn yazar_okur_listeler_siler() {
        let kok = gecici_klasor("temel");
        let k = Klasor::new(kok.join(KLASOR_ADI));
        assert_eq!(k.listele("").unwrap(), vec![]);
        k.yaz("", "Sisli Kıyı 2026-10-21.zip", b"birinci").unwrap();
        k.yaz("medya", "ab12", b"gorsel").unwrap();
        k.yaz("", "Sisli Kıyı 2026-10-21.zip", b"ikinci hali").unwrap(); // üzerine yazma
        assert_eq!(k.oku("", "Sisli Kıyı 2026-10-21.zip").unwrap(), b"ikinci hali");
        assert_eq!(k.listele("").unwrap(), vec![Dosya { ad: "Sisli Kıyı 2026-10-21.zip".into(), boy: 11 }]);
        assert_eq!(k.listele("medya").unwrap(), vec![Dosya { ad: "ab12".into(), boy: 6 }]);
        // Geçici dosya kalmaz.
        assert!(fs::read_dir(k.kok()).unwrap().all(|g| !g.unwrap().file_name().to_string_lossy().ends_with(GECICI_EK)));
        k.sil("", "Sisli Kıyı 2026-10-21.zip").unwrap();
        k.sil("", "Sisli Kıyı 2026-10-21.zip").unwrap(); // yoksa da hata değil
        assert_eq!(k.listele("").unwrap(), vec![]);
        let _ = fs::remove_dir_all(&kok);
    }

    #[test]
    fn klasorun_disina_cikilamaz() {
        let kok = gecici_klasor("sinir");
        let k = Klasor::new(kok.join(KLASOR_ADI));
        for ad in ["../disari.txt", "..", "a/b", "a\\b", "C:x", "kotu?", "", "sonu nokta.", "x.yaziliyor"] {
            assert!(k.yaz("", ad, b"x").is_err(), "{ad}");
            assert!(k.oku("", ad).is_err(), "{ad}");
            assert!(k.sil("", ad).is_err(), "{ad}");
        }
        for alt in ["..", "medya/..", "baska", "/"] {
            assert!(k.listele(alt).is_err(), "{alt}");
            assert!(k.yaz(alt, "a", b"x").is_err(), "{alt}");
        }
        assert!(!kok.join("disari.txt").exists());
        let _ = fs::remove_dir_all(&kok);
    }

    #[test]
    fn yarim_kalan_gecici_dosya_listede_gorunmez() {
        let kok = gecici_klasor("yarim");
        let k = Klasor::new(kok.join(KLASOR_ADI));
        k.yaz("", "tamam.zip", b"x").unwrap();
        fs::write(k.kok().join("yarim.zip.yaziliyor"), b"yar").unwrap();
        assert_eq!(k.listele("").unwrap().len(), 1);
        let _ = fs::remove_dir_all(&kok);
    }
}
