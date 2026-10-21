; Kaldırma uyarısı (veri güvenliği). Windows'ta program kaldırılırken "Uygulama verilerini sil" kutusu
; işaretlenirse kurulum programı bu bilgisayardaki bütün evrenleri (kayıtlar, metinler, görseller) siler: hepsi
; %LOCALAPPDATA%\io.github.darvolinnn.dunyaatlasi klasöründedir. Kutu yanlışlıkla işaretlenmiş olabilir; bu yüzden
; silmeden önce bir kez daha sorulur. Varsayılan cevap "Hayır"dır; sessiz kaldırmada da veriler kalır.
; Güncelleme sırasında (UpdateMode) veriler zaten silinmez; o zaman soru da sorulmaz.
; Not: Bu dosya UTF-8 (BOM'lu) kaydedilmelidir; yoksa Türkçe harfler bozuk görünür.
!macro NSIS_HOOK_PREUNINSTALL
  ${If} $DeleteAppDataCheckboxState = 1
  ${AndIf} $UpdateMode <> 1
    MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON2 "Uygulama verilerini silmeyi seçtiniz.$\n$\nBu, bu bilgisayardaki bütün evrenlerinizi (kayıtlar, metinler, görseller) kalıcı olarak siler ve geri alınamaz. Google Drive'daki kopyalara ve yedek dosyalarınıza dokunulmaz.$\n$\nEmin değilseniz Hayır'ı seçin: program kaldırılır, evrenleriniz bu bilgisayarda kalır ve program yeniden kurulunca hepsi yerinde olur.$\n$\nBu bilgisayardaki bütün evrenler silinsin mi?" /SD IDNO IDYES dunya_atlasi_verileri_sil
    StrCpy $DeleteAppDataCheckboxState 0
    dunya_atlasi_verileri_sil:
  ${EndIf}
!macroend
