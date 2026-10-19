# Devir notu: işi devralan ajan için

*Son güncelleme: 19 Ekim 2026. İzdüşüm sürümü (`IZDUSUM_SURUMU`): **57**. Sınama: 80 dosya, 451 sınama; tarayıcıda 7 akış sınaması, hepsi geçiyor. GitHub Actions'ta otomatik denetim var (Ubuntu ve Windows).*

Bu dosya, projeyi devralan bir yazılım ajanının kullanıcıya hiçbir şey sormadan kaldığı yerden devam edebilmesi için yazıldı. Davranışın tek kaynağı yine `tasarim/dunya-atlasi-tasarim.md` belgesidir; bu not yalnızca **durum, kalan işler ve çalışma yöntemi**dir. Bu dosya ile tasarım çelişirse tasarım geçerlidir.

**Her işin sonunda bu dosyayı güncelle:** durum tablosu, kalan işler ve son kayıt. Bir sonraki ajan buradan başlayacak.

---

## 1. Önce oku (sırayla)

1. `AGENTS.md`: bağlayıcı kurallar.
2. Bu dosya.
3. `tasarim/dunya-atlasi-tasarim.md`: §0 (okuma ve güncelleme kuralları), §0.4 (konu dizini), §1.3 (teknik kararlar), §14 (geliştirme sırası), §16.1 (fikirler F01–F35 ve durumları), §18 (kod için bağlayıcı sözleşmeler). Bir maddeyi kodlamadan önce o maddenin satırını ve bağlantı verdiği bölümleri oku.

## 2. Kullanıcı ve çalışma tercihi

- Kullanıcı Türkçe yazar; ona Türkçe, kısa ve sade cevap ver. Programdaki metinlerde hitap "siz"dir (kullanıcı kararı, 19 Ekim 2026; §12.4). Arayüzdeki ve hata iletilerindeki her metin Türkçedir; kullanıcıya görünen metinde programlama terimi olmaz.
- Her adım bitince DEVIR.md'de yapılan ve yapılacak adımlar güncellenir ve gönderilir (kullanıcı isteği, 19 Ekim 2026).
- Kullanıcının açık tercihi: **bir aşama ya da madde bitince onay beklemeden sıradakine geç.** Yalnızca geri alınamaz işlerde (zorla gönderme, toplu silme, dışarıya mesaj) ya da kullanıcının vermesi gereken bir kararda dur ve sor.
- **Arayüz değişikliklerinde önce taslak:** görünüşü ya da düzeni değiştiren bir işe kodlayarak başlama; önce seçenekli bir taslak göster, kullanıcı seçince kodla (kullanıcı isteği, 19 Ekim 2026).
- **Tamamen bulut (kullanıcı kararı, 19 Ekim 2026, öncekinin yerine):** bütün iş bulut oturumunda yapılır; kullanıcının bilgisayarındaki proje klasörüne, masaüstüne ve oradaki programa dokunulmaz, zip oraya konmaz. Kullanıcı programı denemek isterse klasörü kendisi günceller. Windows denetimini GitHub'daki Windows işi yapar.
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
| Onay | Bütün silme ve kaldırma düğmeleri (kayıt, harita, çizim, işaret, ilişki, bilgi, kural, masa, paket, sözcük, liste satırları), metni eski hâline döndürme, dönüşümü geri alma ve "Silinmiş kalsın" artık onay soruyor (`arayuz/onay.ts`) | `1966ff0` |
| F19 | İnceleme: ayırt etme satırı var, sahne hatırlatıcısını sahne paneli karşılıyor; okur tanıtımı ve "sır yayına girmez" yayına (§11) bağlı, K20 gereği kapsam dışı | — |
### 3.2 Başka ajanlarda olan paketler (henüz `main`'de değil)

19 Ekim 2026'daki ilk dört paket birleştirildi. Aynı gün ikinci tur beş paket verildi; beşi de birleştirildi. Üçüncü turdaki Argon paketi (§15-2) birleştirildi; GPT inceleme paketi hak bittiği için yarım kaldı, yerine yardımcı ajan inceledi. Bekleyen paket yok. Dalı uzak depoda belirince birleştir (§6). Paketler `IZDUSUM_SURUMU`'nu artırmaz; artırmayı birleştiren yapar. Promptlar kullanıcının proje klasöründe `paket-promptlari/tur2/` altındadır; depoda değildir.

Bütün "Tasarım" maddeleri kodlandı (F16 formülü de, 19 Ekim 2026). Promptlar `paket-promptlari/tur3/`.

**Birleşmeyi bekleyen dal (19 Ekim 2026):** Windows uygulaması (TK6, Tauri 2) başka bir oturumda `claude/project-thread-hdk5g6` dalında yapıldı, PR #1 açık; denetim yeşil, kurulum dosyası `windows` ön sürüm sayfasında (`Dunya-Atlasi-kurulum.exe`). Dalın DEVIR'inde iş listesi §3.2b olarak var; kalanlar: kullanıcının bilgisayarında kurup deneme, Google izinli adreslerine `http://localhost:41730` ekleme (kullanıcı yapar), verinin tarayıcıdan uygulamaya taşınması, sonra tablet APK'sı. Aynı dalda karar: iPhone plandan çıktı (K3). Kullanıcı kurulumu deneyip onaylayınca PR birleştirilir; birleşince bu paragraf silinir.

### 3.2a Biten iş: F16 formül dili (adım adım)

Kullanıcı kuralı: her adım bitince bu liste güncellenir ve gönderilir; yapılan ve yapılacak adımlar burada görünür.

- [x] Kullanıcı TK8 taslağını onayladı, sayılarla birlikte seçti (19 Ekim 2026)
- [x] Sözleşmeyi tasarım belgesine yaz (§18.1 "Kural ve formül dili", §1.3 TK8 satırı, geçmiş dosyasına bir satır)
- [x] Şablonlara birimli sayı alanı ekle (nicelik türü, birim, hassasiyet): `alan/nicelik.ts`, değer alanın birimine çevrilip `{ enAz, enCok, birim }` olarak saklanır; boşken varsayılan ayarı şablon kaydında artık korunuyor
- [x] Formül çözümleyici ve üç değerli değerlendirme (`alan/formul.ts`: `formulOku` adları çözer ve türleri denetler, `formulDegerlendir` bir `FormulOrtami` ile çalışır, `formulYazisi` güncel adlarla yazar; sınama `test/formul.test.ts`)
- [x] Hukuk kuralının "kimlere" kısmına formül alanı; kural atölyesi örnekleriyle sınama (`test/kural-atolyesi.test.ts`)
- [x] Arayüz: formül yazma, hatanın yerini gösterme, yazım kılavuzu; uygulanan kurallarda formülün belirsiz nedenleri ve "hesaplanamadı" (`arayuz/Hukuk.tsx`)
- [x] Sınamalar (435), izdüşüm sürümü (gerekmedi: tanım JSON olarak saklanıyor), DEVIR güncellemesi, gönderme

### 3.2c Biten iş: sayfa rehberi ve Türkçe gözden geçirme (19 Ekim 2026)

Kullanıcı isteği: her sekmeye "?" ile açılan ayrıntılı rehber; programın Türkçesi garip, gözden geçirilsin; kaynak kodlar zip olarak masaüstüne.

- [x] Taslak (üç seçenek: sayfa içi kart, yan panel, ortada pencere) resimleriyle gösterildi; **kullanıcı B'yi seçti: sağdan açılan yan panel**
- [x] **Kullanıcı kararı: hitap "siz"** (açıklama, uyarı, hata metinleri "seçin, yazın"; düğmeler kısa kalır)
- [x] Tasarım: K25 satırı, §12.4 "Sayfa rehberi ve dil", konu dizini, geçmiş dosyasına bir satır
- [x] Rehber metinleri `arayuz/rehber-metinleri.ts` (eski adı `rehber.ts`; 33 sayfa: evrenler, eşitleme, yaz, masa, kayıtlar, kayıt sayfası, haritalar, takvim, inceleme, "Diğer" altındakiler, 17 görünüm); panel `arayuz/SayfaYardimi.tsx` (eski adı `Rehber.tsx`), stiller `stil.css` sonunda
- [x] "?" düğmesi her sayfanın başlığında: `EvrenEkrani.tsx` (bütün sekmeler ve Masa), `YazEkrani.tsx`, `KayitEkrani.tsx`, `EvrenlerEkrani.tsx`, `Esitleme.tsx`
- [x] Bütün kullanıcıya görünen metinler (arayüz, `alan/`, `calisan/` hata ve uyarı iletileri, işlem günlüğü) "siz" hitabına ve doğal Türkçeye çevrildi; terimler birleştirildi (ör. "oturtma" → "hizalama", "dal/taslak" → "deneme kopyası"); metni bekleyen sınamalar güncellendi. Kaydedilen değerler (seçenek adları, şablon alan adları, gerekçe ve sonuç sabitleri) bilerek değiştirilmedi
- [x] Sınamalar (441) ve tür denetimi yeşil; tarayıcıda denendi (panel açılıyor, Esc ile kapanıyor, konsolda hata yok)
- [x] Kaynak kodlar zip'lendi (`main` ve Windows dalı, .git hariç): proje klasöründe `kaynak/dunya-atlasi-kaynak.zip`, kullanıcının masaüstünde `dunya-atlasi-kaynak.zip`

**Yeni sayfa eklerken:** `rehber-metinleri.ts`'e o sayfanın rehberini ekle; başlığa `<SayfaYardimi sayfa="…" />` koy. Yeni metinler "siz" hitabıyla yazılır (§12.4).

### 3.2d Biten iş: dış inceleme raporunun ilk üç maddesi (19 Ekim 2026)

Kullanıcı bir dış inceleme raporu (`INCELEME-VE-ONERILER.md`, kullanıcının eki; depoda değil) gönderip görüş sordu. 1–3. maddeler doğrulandı ve düzeltildi; 4–10 aşağıda yapılacak/öneri olarak duruyor, kodlanmadı.

- [x] **Windows derlemesi:** `Rehber.tsx` ile `rehber.ts` yalnız harf büyüklüğüyle ayrılıyordu; Windows'ta `./Rehber` içe aktarması metin dosyasına gidiyor, derleme kırılıyordu. Dosyalar `SayfaYardimi.tsx` ve `rehber-metinleri.ts` oldu. Sınama `test/dosya-adlari.test.ts` aynı klasörde böyle iki dosya bulununca kırılır. Otomatik denetim artık Ubuntu ve Windows'ta çalışıyor (`denetim.yml`, `matrix.os`)
- [x] **Kurtarma taslağı kaybı:** `acilistaTaslak` kurtarma alanına yazamadığında asıl taslağı yine de siliyordu. Artık yazım başarılı değilse asıl taslak yerinde kalır, sonraki açılışta yine bulunur (`test/taslak.test.ts`)
- [x] **"Açılıyor…"da takılma:** `Istemci` çalışanın `error` ve `messageerror` olaylarını dinlemiyordu. Artık çalışan yüklenemez ya da çökerse bekleyen istekler Türkçe bir iletiyle hata verir, sonraki istekler beklemeden reddedilir; okunamayan yanıtta bekleyenler hatayla biter. Açılış hata ekranına "Yeniden dene" eklendi. İstemci sınamada sahte çalışan alabiliyor (`test/istemci.test.ts`)
- [x] Kullanıcının Windows bilgisayarında denendi: `npm run build` geçiyor, 446 sınama geçiyor. İlk soğuk çalıştırmada `esitleme.test.ts` "kullanım dışı cihaz temizliği bekletmez" bir kez kırıldı, tek başına ve ikinci tam çalıştırmada geçti; yük altında süreye bağlı olabilir, Windows denetim işinde yinelenirse kök nedeni aranır
- [ ] Otomatik denetimin Windows işinin sonucunu gör (gönderimde sırada bekliyordu)
- [x] Bilgisayardaki proje klasörü `main`'e alındı, bağımlılıklar kuruldu, `npm run dev` 5173'te çalışıyor; güncel zip masaüstünde ve proje klasöründe (`kaynak/`)

### 3.2e Dış inceleme raporunun 4–10. maddeleri (yapılacak / öneri; kodlanmadı)

Arayüzü değiştirenler önce seçenekli taslakla kullanıcıya gösterilir (§2). Yeni özellik değildir; mevcut davranışın iyileştirilmesidir, yine de tasarımda karşılığı yoksa önce §16'ya Öneri olarak yazılır (K11).

4. **Kademeli açılış:** ilk kullanımda atlanabilir kısa yol (eser aç → sahne yaz → karaktere bağla → tarih/mekân). Zorunlu sihirbaz yok. Görünümlerin gruplanması K16 gerçek kullanım gözlemine göre. *Öneri; taslak gerekir.*
5. **Bağlam panelinde boş durum:** tarih ve karakter yokken uzun açıklamalar yerine tek kısa cümle ve ilgili eylem; ayrıntı rehbere, okur bilgisi içerik oluşana kadar katlı. *Yapılacak; taslak gerekir.*
6. **Kayıt / eşitleme / yedek özeti:** "Bu cihazda kaydedildi · Drive'a gönderilecek N değişiklik · Son doğrulanan yedek …" tek bakışta; eşitlendi ile yedek var ayrı söylenir; uzun süre yedek yoksa yazıyı kesmeyen hatırlatma. *Yapılacak; taslak gerekir.*
7. **Windows uygulamasına geçiş:** PR #1 güncel `main`'i (rehber, Türkçe, bu düzeltmeler) içermiyor; birleştirmeden önce `main` dala alınır. Kabul akışı: tam yedek → uygulamaya ayrı evren olarak yükle → metin/görsel denetimi; eski kopya korunur. Ayarlarda görünen sürüm ve derleme tarihi. Gerçek kurulumda: açılış, yeniden açılış, ikinci başlatma, yedek, geri yükleme, EPUB/PDF, Google izin yenilemesi. *Yapılacak (§3.2'deki PR'a bağlı).*
8. **Büyük görselde kaldığı yerden yükleme:** `drive.ts` sürdürülebilir oturum açıp tek parça gönderiyor (§3.3-3'te zaten var). İlerleme, iptal, süre sınırı ve kesintiden sonra devam sınaması. *Yapıldı, bkz. §3.2g.*
9. **Kullanıcı akışı ve hata anı sınamaları:** küçük bir tarayıcı sınaması grubu (yeni evren/sahne, yaz-yeniden aç, `[[` bağlantısı, rehber paneli, yedek ve ayrı evren olarak geri yükleme); kayıt sürerken sahne değiştirme, taslak yazılamazken kapatma, süreç öldürme, yedekten dönüşte karşılaştırma, iki kopyada çatışma. Kapanışta taslak yazımı çalışana asenkron gider; yazıldığı ayrıca kanıtlanmalı. *Yapılacak.*
10. **Performans ve bakım:** temsili büyük evrende (ör. 50.000 işlem) açılış, arama, sahne değiştirme, kaydetme, yeniden kurma, yedekten dönüş süreleri ölçülür (§3.3-3'teki ölçümle aynı iş). `hizmet.ts`, `izdusum.ts`, `api.ts` baştan yazılmaz; bir hata düzeltilirken ilgili kısım küçük modüle taşınır. Seyrek açılan ekranların ihtiyaç anında yüklenmesi değerlendirilir. *Öneri.*

### 3.2f Rehberli arayüz (kullanıcı isteği, 19 Ekim 2026; karar bekliyor, kodlanmadı)

Kullanıcı etkileşimli bir taslak ve gerekçe belgesi gönderdi (ekler depoda değil): program kullanıcıyı küçük, atlanabilir adımlarla yönlendirsin, yalnız o anda gereken alanları göstersin, sonraki adımı anlaşılır kılsın. İstek: önce uyarlama önerisi, kod yok. Öneri proje klasöründe `analiz/rehberli-arayuz-uyarlama.md`. Özeti: boş evrende "Nereden başlamak istersiniz?" ve üç kısa akış (sahne, kayıt, not) + sonuç kartında tek sonraki adım (Aşama A); gezinti Yaz / Evren / İncele / Masa / Yönetim, boşken kapalı bağlam paneli, seyrek işler "⋯" menüsünde (Aşama B, önce resimli taslak); kayıt sayfasında boş bölümlerin gizlenmesi (Aşama C). Yeni veri yok; onaylanırsa tasarıma K26 olarak girer. §3.2e madde 4'ün yerini alır; madde 5 (boş bağlam paneli), 6 (durum özetinin yeri) ve 9 (ilk açılış sınaması) ile çakışma ve iş bölümü öneride §4'te.

- [x] Taslak ve gerekçe okundu, mevcut ekranlarla karşılaştırıldı, öneri yazıldı
- [ ] Kullanıcı kararları: Aşama A'ya başlansın mı; gezinti gruplaması; bağlam paneli boşken kapalı mı; Masa ayrı mı kalsın
- [ ] Onaylanırsa: tasarım belgesi (K26, §5.10, §12.4, §13), sonra Aşama A kodu

### 3.2g Sürmekte olan iş: raporun 5, 6, 8, 9. maddeleri (19 Ekim 2026)

Kullanıcı "şu 4'ü de yap" dedi (5, 6, 8, 9). 5 ve 6 ekranı değiştirir: önce taslak; kullanıcı aynı anda "rehberli arayüz" yaklaşımı gönderdi (§3.2f), 5 ve 6'nın taslakları o yaklaşımla uyumlu olacak ve ekran kodu o öneri netleşince yazılacak.

- [x] **8. Büyük dosyada kaldığı yerden yükleme (TK5):** `drive.ts` artık 5 MB üstünü 8 MB'lık parçalarla gönderiyor; bağlantı koparsa, parça 2 dakikada bitmezse ya da Drive geçici hata verirse ulaşan bayt sorulup oradan sürüyor (en çok 5 deneme). Yükleme adresi kurulum veritabanında (`ayar`, `yukleme:<içerik özeti>:<ad>:<id>`) saklanıyor; program kapanıp açılınca da sürer, aynı adla farklı içerik sürdürmez, Drive adresi unuttuysa yeniden başlar. Bağlantı kesilince (`baglantiyiKes`) sürmekte olan istekler durur. İlerleme eşitleme durumunda (`yukleme`) ve alttaki eşitleme özetinde "Büyük dosya gönderiliyor · %40". Sınama `test/drive-yukleme.test.ts` (sahte Drive). Gerçek Drive'da denenmedi: 308 yanıtındaki `Range` başlığı tarayıcıdan okunamazsa ulaşan kısım 0 sayılır (doğru ama baştan gönderir)
- [x] **9. Kullanıcı akışı ve hata anı sınamaları:** tarayıcı sınamaları `uygulama/e2e/akislar.spec.ts` (Playwright; `npm run sina:tarayici`; yerelde hazır Chromium için `PW_CHROMIUM=<yol>`), otomatik denetimde ayrı `tarayici` işi. Kapsam: yeni evren → eser → sahne → yaz → yeniden aç; `[[` bağlantısı; rehber paneli ve Esc; dosyaya yedek → ayrı evren olarak geri yükleme → metin yerinde; kayıt sürerken başka sahneye geçme; yazıp beklemeden sayfayı kapatma; veri bölümü yüklenemeyince hata ekranı. İki kopyada çatışma ve yedekten dönüş karşılaştırması zaten birim sınamalarında (`catisma`, `esitleme`, `tasima`). **Bulunan hata düzeltildi:** kayıttan hemen sonra sayfa kapanırsa kayıtlı yazının eski taslağı kalıyor, açılışta "kaydedilmemiş yazı bulundu" çıkıyor ve "Kurtar" yazıyı ikinci kez ekliyordu. Artık `metinKaydet` taslağı aynı istekte siler (yalnız kayıt isteğinden önce yazılmışsa; `test/taslak-kayit.test.ts`)
- [x] **5 ve 6 taslakları** gösterildi (proje klasöründe `taslaklar/baglam-ve-durum/secenek-A.png`, `secenek-B.png`). A: panel açık, boşken tek cümle + "Nasıl çalışır?", alanlar tek satırlık liste, okur bilgisi katlı. B: boşken panel kapalı, başlıkta "Bağlam ekle" (rehberli öneriyle uyumlu). İkisinde de durum özeti gezintinin altında: en zayıf halka başlıkta ("Yalnız bu cihazda kayıtlı"), açılınca cihazda kayıt / Drive / son yedek ayrı satırlar ve eylemleri, eşitleme ile yedeğin farkı tek cümle
- [x] **Kullanıcı kararı (19 Ekim 2026): B · boşken kapalı.** Durum özeti (6) taslaktaki gibi
- [ ] **5'i kodla** (`arayuz/YazEkrani.tsx`, `arayuz/Anlati.tsx`): sahne "boş" = `sahneBaglami`'nda tarih, yer, bakış, anlatıcı, odak ve katılımcı yok. Tercih yerelde üç değerli tutulur (açık / kapalı / kullanıcı seçmedi; bugünkü `dunya-atlasi:yazma-baglami-kapali` anahtarı). Kullanıcı seçmediyse panel boş sahnede kapalı, dolu sahnede açık. Kapalıyken başlıktaki düğme boş sahnede "Bağlam ekle", doluda "Bağlamı göster". Panel açıkken boş durum: `SahneBaglamPaneli`'ndeki iki uzun açıklama yerine tek cümle "Tarih ve mekân eklediğinizde sahnenin o andaki bağlamı burada görünür." (ayrıntı rehbere, `rehber-metinleri.ts` yaz girdisi); `SahneOkurPaneli` okur bilgisi yokken (`siralar` hepsinde `once` ve `buSahnede` boş, uyarı yok) `<details>` ile katlı, başlıkta "· bu sahneye kadar kayıt yok"; uzun açıklama da katlının içine
- [ ] **6'yı kodla** (`arayuz/Esitleme.tsx` `EsitlemeOzeti`, `Kabuk.tsx` gezinti-alti): `<details>` kart. Başlık en zayıf halka: Drive yoksa ve yedek yoksa "Yalnız bu cihazda kayıtlı"; Drive'da bekleyen varsa "N değişiklik gönderilecek"; hepsi tamamsa "Kaydedildi ve eşitlendi". Satırlar: "Bu cihazda kaydedildi" (yerel kayıt her zaman başarılı; bağlantı kesikken de söylenir), Drive durumu + Bağlan / Şimdi eşitle, son doğrulanan yedek (`donemselYedekDurumu` ya da `sonYedek`) + "Yedek al" (yedek sayfasına gider). 7 günden eski ya da hiç yedek yoksa satır sarı, yazıyı kesen uyarı yok. Altta tek cümle: "Eşitleme başka cihazlara taşır; yedek, geri dönebileceğiniz ayrı bir kopyadır." Evren dışında (Evrenler sayfası) bugünkü tek satır kalabilir
- [ ] Sınama: `e2e/akislar.spec.ts`'e boş sahnede panelin kapalı, "Bağlam ekle" ile açıldığı ve tercihin yeniden açılışta korunduğu bir akış; durum özetinin açılıp satırların göründüğü bir akış. `npm test`, `npm run denetle`, `PW_CHROMIUM=/opt/pw-browsers/chromium npm run sina:tarayici`
- [ ] Ekran görüntüsünü kullanıcıya göster (proje klasöründe `taslaklar/baglam-ve-durum/`; depoya konmaz)
- Not: "Rehberli arayüz" (§3.2f) kodlanırsa ilk açılışta başlangıç sorusu gelecek; tarayıcı sınamalarındaki `sahneAc` yardımcısı ona göre güncellenmeli. Taslak resimlerini üreten betik proje klasöründe `taslaklar/baglam-ve-durum/taslak-uret.mjs` (geliştirme sunucusu açıkken çalışır)
- [ ] Kullanıcı seçince 5 ve 6'yı kodla; DEVIR (tamamen bulut: zip ve bilgisayar yok)

### 3.3 Kalan işler (önerilen sıra)

1. **Tablet ve iPhone** (§14.3): kullanıcı 19 Ekim 2026'da süresiz erteledi; şimdilik yalnız Windows tarafına odaklanılıyor.
2. **K16**: iki haftalık gerçek kullanım. Kod işi değildir; kullanıcı yapar.
3. **Dış güvenilirlik eleştirisinin kalanları** (analiz: proje klasöründe `analiz/guvenilirlik-plani-analizi.md`): yapılanlar yukarıda. Tablet / iPhone ertelendiği için bekleyenler: ana ekran uygulaması (uygulama tanımı, çevrimdışı katman, Cloudflare Pages yayını, "güncelleme hazır" davranışı) Komut paleti §5.8'deki "iki mekân arası yolculuk süresi" ve "takvim günü hesabı" komutlarını henüz açmıyor (sayfalar ve görünümler artık bulunuyor). İsteğe bağlı: yeniden kurma süresini 50.000 işlemle ölçmek (`evren-vt.ts` geçmişe düşen işlem gelince bütün günlüğü baştan uygular)

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
