# Devir notu: işi devralan ajan için

*Son güncelleme: 19 Ekim 2026. İzdüşüm sürümü (`IZDUSUM_SURUMU`): **56**. Sınama: 71 dosya, 410 sınama, hepsi geçiyor.*

Bu dosya, projeyi devralan bir yazılım ajanının kullanıcıya hiçbir şey sormadan kaldığı yerden devam edebilmesi için yazıldı. Davranışın tek kaynağı yine `tasarim/dunya-atlasi-tasarim.md` belgesidir; bu not yalnızca **durum, kalan işler ve çalışma yöntemi**dir. Bu dosya ile tasarım çelişirse tasarım geçerlidir.

**Her işin sonunda bu dosyayı güncelle:** durum tablosu, kalan işler ve son kayıt. Bir sonraki ajan buradan başlayacak.

---

## 1. Önce oku (sırayla)

1. `AGENTS.md`: bağlayıcı kurallar.
2. Bu dosya.
3. `tasarim/dunya-atlasi-tasarim.md`: §0 (okuma ve güncelleme kuralları), §0.4 (konu dizini), §1.3 (teknik kararlar), §14 (geliştirme sırası), §16.1 (fikirler F01–F35 ve durumları), §18 (kod için bağlayıcı sözleşmeler). Bir maddeyi kodlamadan önce o maddenin satırını ve bağlantı verdiği bölümleri oku.

## 2. Kullanıcı ve çalışma tercihi

- Kullanıcı Türkçe yazar; ona Türkçe, kısa ve sade cevap ver. Arayüzdeki ve hata iletilerindeki her metin Türkçedir; kullanıcıya görünen metinde programlama terimi olmaz.
- Kullanıcının açık tercihi: **bir aşama ya da madde bitince onay beklemeden sıradakine geç.** Yalnızca geri alınamaz işlerde (zorla gönderme, toplu silme, dışarıya mesaj) ya da kullanıcının vermesi gereken bir kararda (ör. TK8) dur ve sor.
- Kullanıcı bazen başka ajanları (GPT/Codex, Argon) ayrı dallarda paralel çalıştırır. Onlara verilecek promptları sen yazarsın; dalları sen birleştirir, sürümü sen artırır, denetimi sen yaparsın (bkz. §6).

## 3. Durum

### 3.1 Bitenler

- **§14.1 geliştirme sırasının bütün aşamaları (0, 1a, 1b, 2, 3, 4, 5) kodlandı.** Tasarımda aşama 6 ve sonrası yok.
- Aşama 5'ten sonra kodlanan "Tasarım" durumundaki maddeler:

| Madde | Ne | Kayıt |
|---|---|---|
| §5.7 / F14 | Metin işaretleme (cümleyi kayda ve bilgisine bağlama) | `87a1fa4` |
| §15-7 | Gökyüzü, ay evreleri (birinci düzey) | `5f9a3d1` |
| F20 | Sözlük ve anakronizm denetimi | `d9a0656` |
| §15-6 | Sahne yerleşimi, görüş ve ses | `3cc8150` |
| F24 | Önemli değişiklikte niyet sorusu (iki kısım) | `9997621`, `824addc` |
| F04 | Değişiklik masası (korunacakları seçerek tarih değiştirme) | `f7de1dd` |
| §15-13 / F03 | Sonuçtan koşullara masası | `9fb52c5` |
| F23 | Bağlam karşılaştırma masası | `b6cafe0` |
| F28 | Çelişen anlatılar için iddia dosyası | `4f76ad1` |
| F08 | Delil geçmişi ve soruşturma masası | `ea19c5b` |
| F33 | Bir sonraki yararlı soru | `238fac0` |
| F31 | Açık verilere dayanan keşif soruları (ilk şablon) | `5111598` |
| F12 | Neden her yerde kullanılmıyor masası | `1076426` |
| F22 | Yoğunluk ve boşluk (GPT paketi, birleştirildi) | `9165e25` |
| F15 | Anlatı ve evren sözleşmesi (GPT paketi, birleştirildi; açık bırakılan kayıtlar "bahsedilenler" ve F33'te eksik sayılmıyor) | `dfa30d3`, `890822f` |
| F26 | Haklar, yetkiler, yükümlülükler (GPT paketi, birleştirildi) | `6f1851c` |
| F31 | Keşif sorularına ikinci şablon: aynı şey üzerinde çelişen hak iddiaları | `4430a31` |
| F32 | Bakım ve tekrarlar (Argon paketi, birleştirildi) | `9809403` |
| §9.7 | Deneme kopyalarının cihazlar arası eşitlenmesi | `26a1dc5` |
| F16 | Kural atölyesi, formülsüz kısım: hukuk kuralına örnek durumlar, beklenti ve önceki tanımla karşılaştırma, örnekleriyle kopyalama (izdüşüm 46, tablo `kural_ornekleri`) | `c522478` |
| Boşluk | Göreli tarihlerde ayrılma eki; gökyüzü tarih hatası girdinin yanında (Argon paketi) | `a76e230` |
| §3.4 | Zaman akışlarında yaşanan süre; kalış yalnızca "orada yaşayan" ilişkisinden (GPT paketi) | `b75fe2f` |
| §5.5 | Sahne panelinde okur bilgisi, okuma sırasına göre (GPT paketi) | `3e029cc` |
| F35 | Baskı ve uyarlama karşılaştırma: iki eser ya da eser ile deneme kopyası arasında yazarın eşlemeleri, gözden geçirmeden sonraki değişikliklerin listesi; eser sayfasında (GPT paketi, izdüşüm 47, tablo `uyarlama_eslemeleri`) | `c23ccce` |
| Boşluk | Eşitleme ekranında deneme kopyalarının yalnızca bu cihazda olan ve bekleyen değişiklikleri | `f5941dc` |
| F05 | Başkasının bilgisine dair inanç: soru kartında "kim, kimin hakkında ne sanıyor", kayıtlı bilgiyle karşılaştırma (izdüşüm 48, tablo `dair_inanclar`) | `8d735e2` |
| F06 | Kişi, kimlik, beden: "Kimlik" türü ve "kullandığı kimlik" ilişkisi, kimliğe ayırma / kimlik olarak bağlama (önizlemeli, tek işlem grubu), beden rolleri ve dirilmeyi tanıyan yaşam denetimi. Okur görünümünde ayrı kalma yayına (§11.2) bağlı, yapılmadı | `6627690` |
| F25 | Evren içi birleşme, bölünme, dönüşüm (GPT paketi, izdüşüm 49, tablo `donusum_kayitlari`) | `6d31ea8` |
| F29 | Sahne içi bağlam parçaları: seçili parçaya ayrı tarih, yer, bakış açısı (sahneyle aynı / belirtilmemiş / bu parçaya özgü); metindeki işaretle durur, yan panel imlecin parçasını gösterir (izdüşüm 50, tablo `baglam_parcalari`) | `295ac1a` |
| F40 | Kalabalık ve toplu sayım: tarihli gözlemler, sayımı değiştiren olaylar, tarihe göre tahmin (GPT paketi, izdüşüm 51, tablolar `kalabalik_gozlemleri`, `kalabalik_olaylari`) | `86d8d19` |
| F17 | Harita künyesi: evren içi tarih, yapan, amaç, bilinen hatalar (Argon paketi, izdüşüm 52, tablo `harita_kunyeleri`) | `7697a46` |
| F07 | Süreç adımlarının sorumluları, durdurabilir / fiilî veto listeleri (Argon paketi, izdüşüm 53, tablo `surec_sorumlulari`) | `9a0aa6b` |
| F30 | Metin ile kullanım yeri: editörde "Metin al" (ortak kaynağa bağla / kopyala / bağımsız türev), bağlı kullanımda kaynak değişti uyarısı ve kaynaktan güncelleme, başka metne taşıma, kaynak sayfasında kullanıldığı yerler. Baskıya sabitlenmiş kopya yayım sürümüdür (F18) (izdüşüm 54, tablo `metin_kullanimlari`) | `1d932fc` |
| F11 | Geçmişin bugünkü izleri: olayda kısa vadeli sonuç / kalıcı iz, mekânda dönem katmanları (Argon paketi, izdüşüm 55, tablo `iz_kayitlari`) | `07402ea` |
| F09 | Mümkün ile erişilebilir: rotada geçiş şartı (izin / ücret), "taşıdığı izin" ilişkisi, en kısa yolda ve yolculuk aşamasında iznin varış anında değerlendirilmesi (D17) (izdüşüm 56, tablo `rota_gecis_sartlari`) | `71d5995` |
| F19 | İnceleme: ayırt etme satırı var, sahne hatırlatıcısını sahne paneli karşılıyor; okur tanıtımı ve "sır yayına girmez" yayına (§11) bağlı, K20 gereği kapsam dışı | — |
### 3.2 Başka ajanlarda olan paketler (henüz `main`'de değil)

19 Ekim 2026'daki ilk dört paket birleştirildi. Aynı gün ikinci tur beş paket verildi; beşi de birleştirildi; bekleyen paket yok. Dalı uzak depoda belirince birleştir (§6). Paketler `IZDUSUM_SURUMU`'nu artırmaz; artırmayı birleştiren yapar. Promptlar kullanıcının proje klasöründe `paket-promptlari/tur2/` altındadır; depoda değildir.

Paket dışında kalan "Tasarım" maddelerinin hepsi kodlandı. Kısmen olan: §15-2 ölçekli geometri ve erişim konturları (üçüncü turda Argon'a verildi, `paket/olcekli-harita`, önek `olcekli_`). GPT'ye inceleme paketi verildi (`paket/inceleme`: bugünkü özelliklerde küçük düzeltmeler, bulgular teslim notunda). Promptlar `paket-promptlari/tur3/`.

### 3.3 Kalan işler (önerilen sıra)

1. **F16 formül yazımı**: formülsüz kısım kodlandı (kullanım sözleşmesi tasarımda §16.1 sonunda). Formül için önce **TK8** sözleşmesi yazılmalı ve kullanıcı onaylamalı; kodlamadan önce sor. Süreç kuralları için örnek durumlar henüz yok.
2. **Tablet ve iPhone** (§14.3): kullanıcının cihazlarında deney gerektirir; kullanıcıyla birlikte yapılır.
3. **K16**: iki haftalık gerçek kullanım. Kod işi değildir; kullanıcı yapar.

"Öneri" durumundaki fikirler kodlanmaz; yeni fikir eklenmez (K11).

## 4. Kod yapısı ve yeni bir özellik ekleme tarifi

`uygulama/src/`:
- `alan/`: tarayıcıdan bağımsız kurallar ve arayüzün de kullandığı sabitler (ör. `alan/anlatim.ts`, `alan/delil.ts`). Arayüz `calisan/` altından içe aktarma yapmaz.
- `calisan/`: veritabanı çalışanı. `hizmet.ts` (bütün istekler), `izdusum.ts` (işlemlerin tablolara uygulanması), her özellik için ayrı modül.
- `veri/api.ts`: istek ve veri tipleri; `Istekler` arayüzü.
- `arayuz/`: ekranlar. Kayıt sayfası `KayitEkrani.tsx`, evren sekmeleri `EvrenEkrani.tsx` (`GORUNUMLER`).

Yeni bir yazma isteği eklemek (sırayla):
1. `veri/api.ts`: tipler `export interface EvrenDali {` satırının önüne; istek satırı `Istekler` içine.
2. `calisan/vt.ts`: istek adını `IZINLI` kümesine ekle (eklenmezse arayüz çağıramaz).
3. Özellik modülü `calisan/<ad>.ts`: doğrulama ve okuma. Yazma yalnızca `b.yaz(girdiler, ilgiliKayitlar)` ile; birden çok girdi tek işlem grubudur.
4. `calisan/izdusum.ts`: tablo (`CREATE TABLE IF NOT EXISTS …`), tablo adı `IZDUSUM_TABLOLARI`'na, uygulayıcı `UYGULAYICILAR`'a. Uygulayıcı her alan için `alanYaz(db, i, nesne, alan, deger)` çağırır; iki cihazdaki farklı yazım böyle çatışma olarak görünür. **Tablo eklenince ya da tablonun türetilişi değişince `IZDUSUM_SURUMU`'nu 1 artır.**
5. `calisan/hizmet.ts`: modül içe aktarması ve istek yöntemi; `catismalar` yöntemine etiket dalı, `alanCatismasiCoz` yöntemine çözüm dalı (`delil` ve `anlatim` dalları örnektir).
6. `alan/islem-metni.ts`: işlem günlüğünde görünen Türkçe açıklama.
7. Arayüz bileşeni ve `KayitEkrani.tsx` ya da `EvrenEkrani.tsx` satırı; gerekirse `arayuz/stil.css` sonuna sınıflar.
8. `test/<ad>.test.ts`: bellekte SQLite ile `Hizmet` (kalıp: `test/delil.test.ts`). İki cihaz çatışması kalıbı: `test/anlatim.test.ts`.

Deneme kopyaları: dalda her cihaz kendi kurulum koduyla yazar (eski dallarda yazar dalın kodudur); dalın kendi işlemleri `gordu`'dan (açıldığı an) sonraki işlemlerdir (`dalIslemleri`). Eşitlemede dal, ana evreninin ardından kendi koduyla ve Drive dosyalarında `ana` özelliğiyle eşitlenir; bu cihazda hiç açılmamış ve Drive'da dosyası olmayan dal kurulmaz, silinen dal eşitlenmez. Eşitleme ekranı dalların yalnızca bu cihazda olan ve bekleyen değişikliklerini ayrıca gösterir.

Kurallar: veritabanına yalnızca `EvrenVt.islemYap()` (hizmette `this.yaz`) yazar; serbest metinden anlam çıkarılmaz; kayıt kodları `yonlendir` ile birleşmiş kayda çevrilir; yeni kod `yeniKod()`.

## 5. Komutlar ve denetim

- `cd uygulama && npm ci`, sonra `npm test` (bütün sınamalar) ve `npm run denetle` (tür denetimi). İkisi de hatasız olmadan kayıt yapma.
- `npm run dev` → http://localhost:5173 (Google girişine izin verilen adres bu).
- Arayüzü denemek için Playwright kullanılabilir: yeni evren oluştur, kayıt oluştur, bölümü kullan, tarayıcı konsolunda hata olmadığını gör. Ekran görüntülerini depoya koyma.

## 6. Paralel ajan dallarını birleştirme

- Dal promptunda şunlar olmalı: önce okunacaklar, görev, yeni dosyalar, ortak dosyalara **yalnızca ekleme** ve ekleme yerleri (bir satırın hemen önü/ardı), `IZDUSUM_SURUMU`'na dokunmama, işlem adı öneki, yasaklar, sınama listesi, `paket/<ad>` dalına gönderme.
- Birleştirme: `git fetch origin && git merge --no-ff origin/paket/<ad>`.
- **Çakışma eklemlerine dikkat:** iki taraf aynı yere satır eklediğinde git ortak kapanış satırlarını (`}`, `},`, `);`) bir kez yazıp diğerini düşürebilir. Her çakışma bölgesini elle oku; özellikle `izdusum.ts` içindeki SQL dizgelerinde kapanmayan `);` tür denetiminde görünmez, yalnızca çalışırken bozulur. Birleştirmeden sonra `npm test` mutlaka çalışsın.
- Tablolu her paket için `IZDUSUM_SURUMU`'nu 1 artır ve birleştirme kaydına yaz.
- Satır içi `import('../veri/api').Tip` gibi yazımları dosya başındaki içe aktarmaya çevir.
- Kayıt sayfasına eklenen bölüm boşken sayfayı kalabalıklaştırmasın: tek bir sade düğmeye iner ya da hiç görünmez (ör. `Donusum.tsx`, `Kalabalik.tsx`).
- Birleştirdikten sonra tarayıcıda dene, sonra bu dosyanın §3'ünü güncelle.

## 7. Git

- Doğrudan `main` üzerinde çalışılıyor; kullanıcı bunu onayladı. Paralel ajanlar `paket/<ad>` dallarında çalışır.
- Kayıt mesajları Türkçedir: ilk satır kısa başlık (ör. "Delil geçmişi ve soruşturma masası (F08)"), altında ne değiştiği ve yeni tablo varsa izdüşüm sürümü.
- Zorla gönderme (force push) yapma; başkasının dalının geçmişini yeniden yazma.
- Depo herkese açıktır: sır, gerçek evren içeriği, dışa aktarılmış veri, ekran görüntüsü ve lisans dosyası girmez. Test ve örnek adları uydurmadır.
