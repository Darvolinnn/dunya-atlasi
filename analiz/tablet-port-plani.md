# Dünya Atlası'nı Galaxy Tab S11 Ultra'ya taşıma: süre tahmini ve plan

Tarih: 23 Ekim 2026. Durum: **plan; iş başlamadı, kullanıcı "başla" diyene kadar bekler** (kullanıcı 23 Ekim: "gelecekte yapacağım, şimdilik dursun").
Dayanak: 19 Ekim fizibilite incelemesi (Tauri 2 ile tek kod tabanı), `DEVIR.md` ve `uygulama/src-tauri` kodu.

## Kısa cevap

> **Geçerli tahmin aşağıdaki "Güncelleme" bölümündedir** (1. sürüm ~2 hafta, Google ile ~3 hafta). Bu bölüm ilk, tam kapsamlı tahmindir.

- **Gerçekçi süre: 3 ila 5 hafta** (takvim). İyi giderse 2,5 hafta, cihazda çok sorun çıkarsa 6 hafta.
- **İki Pro hesabı süreyi yaklaşık %25–35 kısaltır**, yarıya indirmez. Asıl darboğaz Claude'un kullanım sınırı değil, tablette deneme ve arayüz taslaklarına kullanıcının onayı.
- İş miktarı: tek hesapla yaklaşık **35–50 çalışma oturumu** (bir "oturum" = bir 5 saatlik pencerenin verimli kısmı).

## Neden kısa değil

Uygulama Tauri 2 ile yazıldığı için Android'e çıkış "aynı proje"den olur; veritabanı, metin birleştirme, Drive eşitlemesi ve ekranların büyük kısmı aynen kalır. Ama Windows kabuğunda yalnız masaüstünde çalışan dört parça var ve Android karşılığı yazılmalı:

1. **Google girişi (`google.rs`)**: bugün sistem tarayıcısını açıp bilgisayarda küçük bir yerel adrese dönüyor. Android'de bu yol çalışmaz; Google'ın Android girişi (paket adı + imza parmak izi ile yeni istemci) ya da tarayıcıdan uygulamaya geri dönüş bağlantısı gerekir. Muhtemelen küçük bir Kotlin eklentisi yazılır. **En riskli parça.**
2. **Google bağlantısının hatırlanması**: Windows parola kasası yerine Android'in anahtar deposu.
3. **Bu cihazda günlük yedek (`yerel_yedek.rs`)**: Windows klasörü yerine Android'in klasör seçme izni (tablette "Belgeler" gibi bir klasör).
4. **Sabit yerel adres (kapı 41730)**: Windows'ta sayfa bu adresten açılıyor ve Google izni ona bağlı. Android'de sayfanın adresi farklı olur; bu yüzden Google tarafı ayrı ayarlanır. **Windows uygulamasının kimliği ve 41730 kapısı değiştirilmez**; Android ayarları yalnız Android'e özgü bölümde yapılır.

Ayrıca: dokunmatik ve S Pen için arayüz uyarlaması, tablette veritabanı ve bellek ölçümü (tasarımdaki kural: tablette 4 GB altı), PC ile tablet arasında gerçek Drive eşitlemesinin denenmesi.

## Kullanım sınırları hesabı

- Pro'da her hesap 5 saatlik pencerelerle çalışır; bu büyüklükte bir depoda bir pencerede verimli iş yaklaşık 1–2 saatlik ajan çalışmasıdır, sonra sınır dolar.
- Haftalık üst sınır da var: bir hesapla haftada gerçekçi olarak **8–12 verimli oturum**.
- İki hesapla haftada **16–24 oturum**. 35–50 oturumluk iş bu hızla 2–3 hafta tutar; üstüne cihaz denemesi ve onay beklemeleri eklenince 3–5 hafta.
- Sınırı uzatmak için: rutin işlerde (derleme ayarı, sınama düzeltmesi, belge güncellemesi) daha hafif modeli, giriş ve arayüz gibi zor işlerde güçlü modeli kullan. Her oturuma "önce `DEVIR.md`'yi oku" diye başlamak, tekrar keşif harcamasını azaltır.

## Güncelleme (23 Ekim 2026, 15:50): kullanıcının seçimi

- **Arayüz tamamen dokunmaya ve S Pen'e uyumlu olacak** (4. aşama tam kapsamıyla kalır; taslaklar önce kullanıcıya gösterilir).
- **İlk sürümde Google yok.** Evren PC'den tablete yedek dosyasıyla taşınır. Google girişi ve Drive eşitlemesi (3. aşama) ikinci sürüme kalır.

Yeni tahmin:
- **1. sürüm (Google'sız, tam uyumlu arayüz): yaklaşık 2 hafta (10–14 gün), 22–32 oturum.** Aşamalar 0, 1, 2, 4, 5, yedek dosyasıyla taşıma ve tablette deneme.
- **2. sürüm (Google girişi + eşitleme): üstüne yaklaşık 1 hafta.**
- Bölüşüm: A hesabı 0, 1, 2, 5 ve yedek dosyasıyla taşıma; B hesabı ilk günden arayüz taslakları ve 4. aşama.

## Aşamalar

| # | Aşama | Kim yapar | Oturum | Kullanıcının işi |
|---|---|---|---|---|
| 0 | **Deney** (depo dışı, K17): boş Android kabuğunda mevcut uygulama açılıyor mu; veritabanı ve Automerge tablette çalışıyor mu | A | 2–3 | APK'yı tablete kurup açmak |
| 1 | **Derleme düzeni**: Android projesi, imza anahtarı, GitHub'da APK derlemesi (bilgisayarına Android Studio kurmak şart değil) | A | 3–5 | İmza anahtarını GitHub gizli ayarına koymak (yol tarif edilir) |
| 2 | **Depolama ve veritabanı**: kalıcı depolama, büyük evrenle açılış/yazma/baştan kurma, bellek ölçümü (4 GB altı) | A | 4–6 | Tabletle ölçüm için USB hata ayıklamayı açmak |
| 3 | **Google girişi ve Drive**: Android girişi, bağlantının hatırlanması, eşitleme | A | 8–12 | Google konsolunda Android istemcisi eklemek (paket adı + parmak izi) |
| 4 | **Dokunmatik ve S Pen arayüzü**: dokunma alanları, sürükleme (harita, ağ, zaman çizelgesi), ekran klavyesi, uzun basma menüleri | B | 8–12 | **Önce taslakları seçmek** (kural: arayüzde önce seçenek) |
| 5 | **Cihazda yedek**: tablette günlük yedek klasörü | B | 2–3 | Klasör iznini vermek |
| 6 | **PC ↔ tablet veri taşıma**: Drive üzerinden evren alma, iki cihazda aynı anda yazma, çatışma ekranı | A+B | 3–4 | İki cihazda deneme |
| 7 | **Tablette deneme ve düzeltmeler** | A+B | 5–8 | Birkaç gün gerçek kullanım, hata bildirmek |

Toplam: **35–53 oturum**. Sıra: 0 ve 1 tek başına önce (her şey bunlara bağlı); sonra 2–3 (A) ile 4–5 (B) paralel; 6–7 birlikte.

## İki hesabı güvenli bölmek

- **Alanları ayır, dosyaları paylaşma.**
  - Hesap A: "kabuk" tarafı: `uygulama/src-tauri/**`, `uygulama/src/veri/kabuk.ts`, `uygulama/src/arayuz/google.ts`, `.github/workflows/`.
  - Hesap B: "arayüz" tarafı: `uygulama/src/arayuz/**` (google.ts hariç) ve stiller.
- **Her hesap kendi dalında** (`android/kabuk`, `android/arayuz` gibi) ve küçük PR'larla çalışır; denetim yeşilse birleştirilir, öteki hesap her oturuma `main`'i dalına alarak başlar.
- **Ortak dosyaların tek sahibi olsun**: `DEVIR.md`, tasarım belgesi, `package.json` ve kilit dosyası yalnız A tarafından değiştirilir; B ihtiyacını PR açıklamasına yazar. Birleştirmede bilinen tuzak: çakışma yerlerinde kapanan `}` / `);` kaybolabiliyor; birleştirmeden sonra tür denetimi ve sınamalar mutlaka çalıştırılır.
- **İkinci hesap bu projeyi görmez.** Ortak bellek yalnız GitHub'dır: `DEVIR.md`'de bir "Android" bölümü açılır, her oturum sonunda iki hesap da kendi satırını günceller (ya da B kendi notunu PR açıklamasına yazar, A birleştirirken `DEVIR.md`'ye taşır). İkinci hesabın depoya yazabilmesi için GitHub erişimi gerekir (TearsFears227 zaten ortak çalışan).
- **Aynı anda aynı dalda iki hesap çalışmasın.**

## Kullanıcının yapması gerekenler (özet)

- Tablette: geliştirici seçenekleri ve USB hata ayıklama; "bilinmeyen kaynaklardan kurulum" izni; APK'yı kurmak.
- Bilgisayarda: yalnız Android "platform araçları" (adb, küçük bir indirme) yeterli; tam Android Studio yalnız Android tarafında yerelde derleme istenirse gerekir (derleme GitHub'da yapılabilir).
- Google konsolunda Android istemcisi eklemek; uygulama "yayında" durumunda mı kontrol etmek.
- Arayüz taslaklarından seçim, cihazda deneme, hata bildirimi.

## Başlamadan önce karar gerekenler

- Tablet sürümü 19 Ekim'de ertelenmişti; başlamak tasarım belgesinde tablet satırının (§14.3, §17) "ertelendi"den çıkarılmasını gerektirir.
- ~~Tablette Windows'taki düzen mi, dokunmaya göre uyarlanmış düzen mi?~~ Karar verildi (23 Ekim): arayüz tamamen dokunmaya ve S Pen'e uyumlu olacak; ekran taslakları önce kullanıcıya gösterilir.
- `tauri.conf.json` `identifier` ve `main.rs` `KAPI` (41730) Android için de değiştirilmez; Android'e özgü ayar yalnız Android bölümünde yapılır (bkz. `AGENTS.md`).
