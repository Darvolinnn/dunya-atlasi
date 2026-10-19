# Devir notu: işi devralan ajan için

*Son güncelleme: 19 Ekim 2026 (Windows uygulaması başladı). İzdüşüm sürümü (`IZDUSUM_SURUMU`): **57**. Sınama: 76 dosya, 441 sınama, hepsi geçiyor. GitHub Actions'ta otomatik denetim var.*

Bu dosya, projeyi devralan bir yazılım ajanının kullanıcıya hiçbir şey sormadan kaldığı yerden devam edebilmesi için yazıldı. Davranışın tek kaynağı yine `tasarim/dunya-atlasi-tasarim.md` belgesidir; bu not yalnızca **durum, kalan işler ve çalışma yöntemi**dir. Bu dosya ile tasarım çelişirse tasarım geçerlidir.

**Her işin sonunda bu dosyayı güncelle:** durum tablosu, kalan işler ve son kayıt. Bir sonraki ajan buradan başlayacak.

---

## 1. Önce oku (sırayla)

1. `AGENTS.md`: bağlayıcı kurallar.
2. Bu dosya.
3. `tasarim/dunya-atlasi-tasarim.md`: §0 (okuma ve güncelleme kuralları), §0.4 (konu dizini), §1.3 (teknik kararlar), §14 (geliştirme sırası), §16.1 (fikirler F01–F35 ve durumları), §18 (kod için bağlayıcı sözleşmeler). Bir maddeyi kodlamadan önce o maddenin satırını ve bağlantı verdiği bölümleri oku.

## 2. Kullanıcı ve çalışma tercihi

- Kullanıcı Türkçe yazar; ona Türkçe, kısa ve sade cevap ver. Arayüzdeki ve hata iletilerindeki her metin Türkçedir; kullanıcıya görünen metinde programlama terimi olmaz.
- Her adım bitince DEVIR.md'de yapılan ve yapılacak adımlar güncellenir ve gönderilir (kullanıcı isteği, 19 Ekim 2026).
- Kullanıcının açık tercihi: **bir aşama ya da madde bitince onay beklemeden sıradakine geç.** Yalnızca geri alınamaz işlerde (zorla gönderme, toplu silme, dışarıya mesaj) ya da kullanıcının vermesi gereken bir kararda dur ve sor.
- **Arayüz değişikliklerinde önce taslak:** görünüşü ya da düzeni değiştiren bir işe kodlayarak başlama; önce seçenekli bir taslak göster, kullanıcı seçince kodla (kullanıcı isteği, 19 Ekim 2026).
- **Her değişiklik kullanıcının bilgisayarına da yüklenir** (19 Ekim 2026): gönderdikten sonra bilgisayarındaki proje klasöründe (yolu proje belleğinde) `main` dalında `git fetch` ve `git merge --ff-only origin/main`; bağımlılıklar değiştiyse PowerShell'de `$env:NODE_ENV='development'; npm install --include=dev` (uygulama klasöründe; ortam üretim modunda olduğundan aksi hâlde geliştirme araçları silinir); `npm run dev` 5173'te çalışır kalsın.
- Tablet ve iPhone denemeleri süresiz ertelendi; yalnız Windows (19 Ekim 2026).
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
| İnceleme | GPT paketi: kimlikte yönlendirme ve taşınan ilişkinin görünürlüğü, birleşen kaynakla metin güncelleme, silinmiş süreç kuralı, harita künyesi çatışma gösterimi, boş uyarlama bölümü, bağlam notu sınırı (9 sınama). GPT hakkı bittiği için listedeki öteki özellikler (F05, F25, F40, F11) incelenmemiş olabilir | `f00cb2f` |
| §15-2 | Argon paketi: ölçekli geometri ve erişim konturları (izdüşüm 57, tablolar `olcekli_olcekler`, `olcekli_araziler`). Sınır: çizim kendi kutusunda yapılır, haritanın görseli altına konmaz | `b3db094` |
| İnceleme 2 | Yardımcı ajan F05, F25, F40, F11'i inceledi: inanç ve dönüşüm kayıtlarında birleşmiş kayda yönlendirme düzeltildi. Düzeltilmeyen küçük şüpheler: inanç silme `alanYaz` ile yazılmıyor; F11'de silinmiş mekânla düzenlemede bağ sessizce düşüyor; F40 "Boş olamaz" iletisi belirsiz; F25'te kayıt kendi ardılına birleştirilebiliyor | `1af1e74` |
| F16 | Formül dili (TK8): şablonda birimli sayı alanı (`alan/nicelik.ts`); formül okuyucu ve üç değerli değerlendirme (`alan/formul.ts`); hukuk kuralının "kimlere" kısmı koşul listesi ya da formülle (`calisan/formul-ortami.ts`, `tanim.formul`); yazarken denetim ve hata yeri (`formulDenetle`); kural atölyesi formülü de değerlendirir. Tablo değişmedi, izdüşüm sürümü artmadı. Sınır: kayıt silme ve birleştirme uyarıları formüldeki kayıtları saymıyor (formül "hesaplanamadı" der; birleşmede kod yönlendirilir); süreç kurallarında formül yok | `da885c9`, `645367a`, `201f6d7`, `5986447` |
| Güvenilirlik | Dönemsel yedek: yeni yedek her zaman yeni dosya; geri okunup her değişiklik satırı denetlenmeden ve sayısı tutmadan ne aynı günün önceki yedeği ne saklama süresi dolanlar silinir; doğrulanamayan kopya kaldırılır. Drive yedeğinden geri yüklemede bulunamayan / bozuk görseller listelenir (`eksikGorseller`, `bozukGorseller`) | `ceca7fb` |
| Güvenilirlik | Otomatik denetim: `.github/workflows/denetim.yml` (tür denetimi, sınamalar, derleme; `main` ve `paket/**`) | `60bdc1b` |
| Güvenilirlik | Metin kurtarma taslağı (§10.7): `arayuz/taslak.ts`; taslaklar kurulum veritabanında `taslaklar` tablosunda (istekler `taslakOku/Yaz/Sil`); açılışta "kaydedilmemiş yazı bulundu" → Kurtar / Vazgeç. Tarayıcı süreci zorla öldürülerek denendi | `1bc1d87` |
| K24 | Arayüz yenileme, kullanıcının seçtiği "A · Üç sütun" taslağı (§5.10): evren açılınca **Yaz** gelir (`#/e/<evren>` ve `#/e/<evren>/yaz/<kod>`, `arayuz/YazEkrani.tsx`); solda gezinti çubuğu ve Yaz seçiliyken eser ağacı, oradan eser / bölüm / sahne eklenir (`arayuz/Kabuk.tsx`, `EvrenKabugu`); ortada metin, sağda kapatılabilir bağlam paneli. Az kullanılan sayfalar "Diğer" altında, kayıt sayfasında okunuş / başka adlar / etiketler ve sahne dışı bölümler katlanır. Krem renkler, Literata (metin) ve Source Sans 3 (arayüz) yazı tipleri pakette (`@fontsource-variable/*`, çevrimdışı çalışır). Komut paleti aramada bütün sayfaları ve görünümleri bulur. Ek: yazma ekranında "Çöp kutusuna taşı"; 1700 ve 2200 piksel üstü geniş ekranda yan sütunlar ve yazıları büyür (`--gezinti-gen`, `--baglam-gen`) | `4e98bc9`, `5fe80e8` |
| Onay | Bütün silme ve kaldırma düğmeleri (kayıt, harita, çizim, işaret, ilişki, bilgi, kural, masa, paket, sözcük, liste satırları), metni eski hâline döndürme, dönüşümü geri alma ve "Silinmiş kalsın" artık onay soruyor (`arayuz/onay.ts`) | bu kayıt |
| F19 | İnceleme: ayırt etme satırı var, sahne hatırlatıcısını sahne paneli karşılıyor; okur tanıtımı ve "sır yayına girmez" yayına (§11) bağlı, K20 gereği kapsam dışı | — |
### 3.2 Başka ajanlarda olan paketler (henüz `main`'de değil)

19 Ekim 2026'daki ilk dört paket birleştirildi. Aynı gün ikinci tur beş paket verildi; beşi de birleştirildi. Üçüncü turdaki Argon paketi (§15-2) birleştirildi; GPT inceleme paketi hak bittiği için yarım kaldı, yerine yardımcı ajan inceledi. Bekleyen paket yok. Dalı uzak depoda belirince birleştir (§6). Paketler `IZDUSUM_SURUMU`'nu artırmaz; artırmayı birleştiren yapar. Promptlar kullanıcının proje klasöründe `paket-promptlari/tur2/` altındadır; depoda değildir.

Bütün "Tasarım" maddeleri kodlandı (F16 formülü de, 19 Ekim 2026). Promptlar `paket-promptlari/tur3/`.

### 3.2a Biten iş: F16 formül dili (adım adım)

Kullanıcı kuralı: her adım bitince bu liste güncellenir ve gönderilir; yapılan ve yapılacak adımlar burada görünür.

- [x] Kullanıcı TK8 taslağını onayladı, sayılarla birlikte seçti (19 Ekim 2026)
- [x] Sözleşmeyi tasarım belgesine yaz (§18.1 "Kural ve formül dili", §1.3 TK8 satırı, geçmiş dosyasına bir satır)
- [x] Şablonlara birimli sayı alanı ekle (nicelik türü, birim, hassasiyet): `alan/nicelik.ts`, değer alanın birimine çevrilip `{ enAz, enCok, birim }` olarak saklanır; boşken varsayılan ayarı şablon kaydında artık korunuyor
- [x] Formül çözümleyici ve üç değerli değerlendirme (`alan/formul.ts`: `formulOku` adları çözer ve türleri denetler, `formulDegerlendir` bir `FormulOrtami` ile çalışır, `formulYazisi` güncel adlarla yazar; sınama `test/formul.test.ts`)
- [x] Hukuk kuralının "kimlere" kısmına formül alanı; kural atölyesi örnekleriyle sınama (`test/kural-atolyesi.test.ts`)
- [x] Arayüz: formül yazma, hatanın yerini gösterme, yazım kılavuzu; uygulanan kurallarda formülün belirsiz nedenleri ve "hesaplanamadı" (`arayuz/Hukuk.tsx`)
- [x] Sınamalar (435), izdüşüm sürümü (gerekmedi: tanım JSON olarak saklanıyor), DEVIR güncellemesi, gönderme

### 3.2b Süren iş: Windows uygulaması (TK6, Tauri 2)

Kullanıcı 19 Ekim 2026'da programın site gibi durduğunu söyledi; Windows için kurulan uygulama, tablet için APK istedi, iPhone'u plandan çıkardı. Sıra kullanıcının: **önce Windows; kullanıcı Windows'u onaylayınca Google girişi ve APK.** Analiz: proje klasöründe `analiz/uygulama-paketleme.md`.

- [x] Kabuk: `uygulama/src-tauri/` (Rust). Kurulu sürüm dosyaları `http://localhost:41730`'dan sunar (`tauri-plugin-localhost`, `.wasm` için doğru tür); bu adres veritabanının kökenidir, **değiştirme** (§17.4). Geliştirmede `npm run uygulama` 5173'ü kullanır. Tek örnek (ikinci açılış pencereyi öne getirir). Yalnız `accounts.google.com` yeni pencere açabilir.
- [x] GitHub: `.github/workflows/windows.yml` Windows'ta derler, `windows` ön sürüm sayfasına `Dunya-Atlasi-kurulum.exe` koyar (main ve `claude/**` dallarında).
- [x] Tasarım: K3, K7, K16, K17, TK3, TK6, §10.7, §10.9, §12.3, §14.3, §17 iPhone'suz ve Tauri'li.
- [ ] Kullanıcının bilgisayarında kur, aç, veritabanı ve yazma çalışıyor mu bak.
- [ ] Google: `http://localhost:41730` Google projesinde izinli adreslere eklenmeli (kullanıcı yapar). Sonra izin penceresi uygulama içinde açılıyor mu dene. Açılmazsa TK3'ü "sistem tarayıcısında giriş + yenileme jetonu" olarak değiştir.
- [ ] Veriyi tarayıcı kurulumundan uygulamaya taşı (Drive eşitlemesi ya da Taşıma ekranı); tarayıcı kurulumunu "kullanılmıyor" işaretle.
- [ ] APK (kullanıcı Windows'u onaylayınca): `tauri android init`, imza anahtarı (depoya girmez), dokunmatik düzen.

### 3.3 Kalan işler (önerilen sıra)

1. **Windows uygulaması, sonra tablet APK'sı** (§3.2b, §14.3). iPhone plandan çıktı (K3).
2. **K16**: iki haftalık gerçek kullanım. Kod işi değildir; kullanıcı yapar.
3. **Dış güvenilirlik eleştirisinin kalanları** (analiz: proje klasöründe `analiz/guvenilirlik-plani-analizi.md`): yapılanlar yukarıda. Ana ekran uygulaması ve Cloudflare yayını artık gerekmiyor (Tauri kabuğu, TK6). Bekleyen: büyük dosyada gerçekten kaldığı yerden yükleme (`drive.ts` tek parça gönderiyor, TK5 tersini söylüyor). Komut paleti §5.8'deki "iki mekân arası yolculuk süresi" ve "takvim günü hesabı" komutlarını henüz açmıyor (sayfalar ve görünümler artık bulunuyor). İsteğe bağlı: yeniden kurma süresini 50.000 işlemle ölçmek (`evren-vt.ts` geçmişe düşen işlem gelince bütün günlüğü baştan uygular)

"Öneri" durumundaki fikirler kodlanmaz; yeni fikir eklenmez (K11).

## 4. Kod yapısı ve yeni bir özellik ekleme tarifi

`uygulama/src/`:
- `alan/`: tarayıcıdan bağımsız kurallar ve arayüzün de kullandığı sabitler (ör. `alan/anlatim.ts`, `alan/delil.ts`). Arayüz `calisan/` altından içe aktarma yapmaz.
- `calisan/`: veritabanı çalışanı. `hizmet.ts` (bütün istekler), `izdusum.ts` (işlemlerin tablolara uygulanması), her özellik için ayrı modül.
- `veri/api.ts`: istek ve veri tipleri; `Istekler` arayüzü.
- `arayuz/`: ekranlar. Ortak çerçeve (gezinti çubuğu, eser ağacı, sayfa ve görünüm listeleri `ANA_SAYFALAR`, `DIGER_SAYFALAR`, `GORUNUMLER`) `Kabuk.tsx`; yazma ekranı `YazEkrani.tsx`; kayıt sayfası `KayitEkrani.tsx`; öteki sayfalar `EvrenEkrani.tsx`. Yeni bir sayfa ya da görünüm `Kabuk.tsx` listesine ve `EvrenEkrani.tsx`'e eklenir; komut paleti listeyi kendisi okur.

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
- Windows uygulaması: `npm run uygulama` (geliştirme penceresi, Rust gerekir), `npm run kurulum` (kurulum dosyası). Kullanıcının bilgisayarında Rust yok; kurulum dosyasını GitHub derler (`windows` sürüm sayfası).
- Arayüzü denemek için Playwright kullanılabilir: yeni evren oluştur, kayıt oluştur, bölümü kullan, tarayıcı konsolunda hata olmadığını gör. Ekran görüntülerini depoya koyma.

## 6. Paralel ajan dallarını birleştirme

- Dal promptunda şunlar olmalı: önce okunacaklar, görev, yeni dosyalar, ortak dosyalara **yalnızca ekleme** ve ekleme yerleri (bir satırın hemen önü/ardı), `IZDUSUM_SURUMU`'na dokunmama, işlem adı öneki, yasaklar, sınama listesi, `paket/<ad>` dalına gönderme.
- Birleştirme: `git fetch origin && git merge --no-ff origin/paket/<ad>`.
- **Çakışma eklemlerine dikkat:** iki taraf aynı yere satır eklediğinde git ortak kapanış satırlarını (`}`, `},`, `);`) bir kez yazıp diğerini düşürebilir. Her çakışma bölgesini elle oku; özellikle `izdusum.ts` içindeki SQL dizgelerinde kapanmayan `);` tür denetiminde görünmez, yalnızca çalışırken bozulur. Birleştirmeden sonra `npm test` mutlaka çalışsın.
- Tablolu her paket için `IZDUSUM_SURUMU`'nu 1 artır ve birleştirme kaydına yaz.
- Satır içi `import('../veri/api').Tip` gibi yazımları dosya başındaki içe aktarmaya çevir.
- **Silme, kaldırma ve geri dönüşü zor her düğme önce sorar:** `arayuz/onay.ts` içindeki `onayla('… kaldırılsın mı?')` ile (kullanıcı isteği, 19 Ekim 2026). Yeni eklenen her silme düğmesi de böyle olmalı.
- Kayıt sayfasına eklenen bölüm boşken sayfayı kalabalıklaştırmasın: tek bir sade düğmeye iner ya da hiç görünmez (ör. `Donusum.tsx`, `Kalabalik.tsx`).
- Birleştirdikten sonra tarayıcıda dene, sonra bu dosyanın §3'ünü güncelle.

## 7. Git

- Doğrudan `main` üzerinde çalışılıyor; kullanıcı bunu onayladı. Paralel ajanlar `paket/<ad>` dallarında çalışır.
- Kayıt mesajları Türkçedir: ilk satır kısa başlık (ör. "Delil geçmişi ve soruşturma masası (F08)"), altında ne değiştiği ve yeni tablo varsa izdüşüm sürümü.
- Zorla gönderme (force push) yapma; başkasının dalının geçmişini yeniden yazma.
- Depo herkese açıktır: sır, gerçek evren içeriği, dışa aktarılmış veri, ekran görüntüsü ve lisans dosyası girmez. Test ve örnek adları uydurmadır.
