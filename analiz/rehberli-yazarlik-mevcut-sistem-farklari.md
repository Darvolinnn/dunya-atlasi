# Rehberli yazarlık: mevcut sistemle farklar

> **Belge türü:** Eleştirel inceleme. Davranış tanımlamaz. 19 Ekim 2026'da `claude/modest-lovelace-ozltpf` dalındaki kod (`fda4e45`) ve tasarım belgesi okunarak hazırlandı.

## 1. Bugün çalışanlar (kodla doğrulandı)

| Özellik | Nerede | Rehbere katkısı |
|---|---|---|
| İlk adımlar (eser → sahne → bağlantı → tarih/mekân) | `arayuz/YazEkrani.tsx` `IlkAdimlar`, istek `ilkAdimlar` | Ö2'nin temeli |
| Masa: kaldığınız yer ve devam notu, son düzenlenenler, hızlı notlar, bahsedilenler | `arayuz/Masa.tsx` | Ö6'nın kaynakları |
| Masa: "Başlamak için" üç soru (kayıt sayısı < 5 iken), önemli açık meseleler, Dünya Pusulası, evren kurma rehberi, haritasız evren büyütme | `arayuz/Sablon.tsx` `MasaPusulasi` | Ö4 `cekirdek` buraya eklenir |
| Soru kütüphanesi: 16 set; her kayda "Bu kayda soru seti ekle"; soru durumları cevaplandı / sonra / ilgisiz; "Yeni kayıtla cevapla" | `alan/sablon.ts`, `Sablon.tsx` `SoruBolumu`, `SoruSatir` | Ö3, Ö4, Ö5 tamamen bunun üstüne |
| Şablon düzenleyici (tür başına alanlar ve sorular, evrene kaydedilir) | `Sablon.tsx` `SablonlarSekmesi` | Eski evrenlerde yeni setlerin davranışı (Ö4 sınır durumu) |
| Açık mesele (düşünülecek / kararlaştırıldı / şu an gerekmiyor, önemli) ve gerekçe kaydı | türler `acik_mesele`, `gerekce` | Plan ile evren gerçeği ayrımı (§5) |
| Karar durumu fikir / kesinleşmiş / vazgeçilmiş; zaman çizelgesinde rozetle | `alan/turler.ts`, `Takvim.tsx` | Alternatif finaller (Akış 12) |
| Kurgu hattı ve sahne bağları: hattı ilerletir, ipucu planlandı / yerleştirildi / karşılığı verildi / vazgeçildi | `alan/iliski-turleri.ts` `HAT_ROLLERI`; Görünümler › Kurgu hatları | Ö9 |
| Neden–sonuç ağı (yol açtı, kolaylaştırdı, engelledi, tepki) | Görünümler | Rehber Konu 13 |
| Sahne alanları: tarih, mekân, bakış açısı, anlatıcı, odak karakter, katılımcı rolleri, bağlam parçaları | `Anlati.tsx`, ilişki türleri `bakis`, `anlatici`, `odak`, `sahnede` | Ö5 bunları tekrar sormaz |
| Okur modeli (eser başına), kurgu montajı, sahne niyet işaretleri, anlatı etki özeti | `calisan/bilgi.ts`, `sahne-okur.ts`, `Montaj.tsx` | Rehber Konu 16–18 |
| Anlatı sözleşmesi (eser) | `AnlatiSozlesmesi.tsx` | Rehber Konu 11 |
| Keşif soruları (F31), bir sonraki yararlı soru (F33) | `Kesif.tsx`, `SonrakiSoru.tsx` | Yapısal öneri örneği; edebi rehber değil |
| Sürümler, deneme kopyaları, sabit başvuru sürümü | `Surumler.tsx`, `calisan/dal.ts` | Rehber Konu 21, 24 |
| Çalışma masaları, gezinti, görsel pano | `Masalar.tsx`, `Derleme.tsx` | Rehber Konu 19, 23 |
| Sayfa rehberi (`?`), yan panel | `SayfaYardimi.tsx`, `rehber-metinleri.ts` | Ö1'in taşıyıcısı |
| Anlatı ağacı (`anlati` tablosu: üst, konum) | `calisan/anlati.ts` | Ö7'de seri düzeyi buna eklenir |

## 2. Tasarımda olup kodlanmayanlar (rehberle ilgili)

| Tasarım | Durum | Not |
|---|---|---|
| Korur / İster / Korkar bileşeni (§3.1) | Bileşen olarak yok; "Topluluk" soruları (neyi korur / ne ister / neden korkar) var | Rehber karakter soruları üzerinden anlatıyor |
| Okur için birden çok okuma sırası (§3.6 "ikinci kitaptan başlayan okur ayrı bir okuma sırasıdır") | Okur modeli eser başına | Ö8'e bağlı; sonraya |
| Not şablonları (sahne fikri, karakter notu, evren notu, araştırma) (§4.6) | Doğrulanmadı | Rehber Konu 1 hızlı nota yönlendiriyor |
| F47 çalışma devri kartı | Öneri durumunda | Ö6 bunun bir kısmını, yeni veri istemeden karşılar |

## 3. Var olup kullanıcıya keşfettirilmeyenler

Bunlar rehbere en çok yarayacak, ama yeni kullanıcının bulamayacağı özelliklerdir. Ö1 ve Ö3 bunları "Neden?" bağlantılarıyla görünür kılar:

1. **"Bu kayda soru seti ekle"** (karşıt karakter, ilişki, olay izi, alışkanlık setleri). Karakter sayfasında yalnız temel altı soru varsayılan; karşıt güç soruları bir seçim kutusunun içinde.
2. **"Yeni kayıtla cevapla"**. Bir soruyu bir kayıtla cevaplamak (ortadaki karakter → karakter kaydı).
3. **İpucu durumları**. Kurgu hattına sahne eklerken rol seçiminde saklı.
4. **Gerekçe kaydı**. "Neden bunu seçtim?" sorusunun yeri; Diğer menüsünün altında.
5. **Deneme kopyası**. Alternatif bir yolu ana metni bozmadan denemek.
6. **Keşif soruları**. Yapısal ilişkilerden "mümkün" sahne fikirleri.

## 4. Bu brifte önerilen yeni kavramlar

| Kavram | Öneri | Yeni veri |
|---|---|---|
| Başlangıç yolu | Ö2 | Cihaz tercihi |
| Yazarlık rehberi metinleri | Ö1, Ö3 | Program metni |
| Anlatı soru setleri | Ö4, Ö5 | Soru tanımları |
| "Şimdi" kartı | Ö6 | Yok (D9: bir alan) |
| Seri | Ö7 | Tür + ağaç düzeyi |
| Okuma yolları | Ö8 | Sonraya |
| Seriye kalanlar | Ö9 | Yok |
| Eserin odak karakteri | Ö11 | Bir ilişki türü |
| Eserin çalışma durumu | D7 | Şablon alanı |
| Etkin iş | D9 | Kaldığınız yerde bir alan |

## 5. Önceki rehberli arayüz planıyla ilişki

`DEVIR.md` §3.5'teki plan (kullanıcının daha önce gönderdiği taslaktan uyarlanmış; eki depoda değil, `analiz/rehberli-arayuz-uyarlama.md` proje klasöründe, bu oturumdan erişilemiyor):

| Önceki plan | Durum | Bu belgelerle ilişkisi |
|---|---|---|
| Aşama A: boş evrende "Nereden başlamak istersiniz?" + üç kısa akış (sahne, kayıt, not) + sonuç kartında tek sonraki adım | Kullanıcı 19 Ekim'de **taslak B**'yi (İlk adımlar) seçti; kodlandı (K26) | Ö2 B'yi bozmadan A'nın "yol seçimi"ni listeye taşır (D1) |
| Aşama B: gezintiyi Yaz / Evren / İncele / Masa / Yönetim olarak yeniden düzenlemek | Kullanıcı K24 menüsünün kalmasını seçti; yalnız adlar bekliyor | Bu belgeler menüye öğe eklemez |
| Aşama C: kayıt sayfasında boş bölümleri gizlemek | Bekliyor, önce taslak | Ö4 yeni soru setleri ekler. Aşama C ile birlikte düşünülmeli: soru bölümleri cevapsızken katlı mı başlasın? Öneri: cevapsız soru seti katlı, başlığında "6 soru" yazar (doluluk değil, sayı) |

**Dünya Pusulası ile Masa ayrı mı kalmalı?** Pusula zaten Masa'da, katlı bir bölüm. Ö6 "Şimdi" kartı Masa'nın en üstüne gelir; Pusula ve `cekirdek` katlı kalır.

**Var olan rehber kartları yeniden mi yazılacak?** Hayır. Sayfa rehberi (K25) kullanım rehberi olarak kalır; Ö1 ona yalnız "Bu işi neden yapıyorum?" bağlantıları ekler.

## 6. Eski ya da sapmış ifadeler

| İfade | Yer | Öneri |
|---|---|---|
| "Sürüm 6 · 18 Ekim 2026 · Aşama: tasarım. Program kodu yazılmadı." | `tasarim/dunya-atlasi-tasarim.md` 3. satır | Kodlama K9 onayıyla başladı; §14.1 aşamalarının hepsi kodlandı (DEVIR §3.1). Tutarlılık düzeltmesi olarak güncellenmeli. Kullanıcı onayıyla. |
| "Rehberli arayüz (§3.5)" | `DEVIR.md` §3.3 madde 3 | DEVIR'in kendi §3.5'i kastediliyor; tasarımın §3.5'i (Durum geçmişi) ile karışabilir. "DEVIR §3.5" yazılmalı. |
| Başlangıç sorusu "Temel fikir: evreni farklı kılan tek kural" | `alan/sablon.ts` `baslangic.1` | Bu soru dünya kuran için iyi, roman planlayan için dar. Kayıtlı değer olduğu için metni değiştirilmez; Ö4 `cekirdek` ayrı set olarak eklenir. |

**Bu belgeler hiçbir ifadeyi kendiliğinden değiştirmez.** Değişiklikler kullanıcı onayından sonra, §0.2 güncelleme kuralına göre yapılır.
