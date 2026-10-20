# Devir notu: işi devralan ajan için

*Son güncelleme: 20 Ekim 2026, 14:30 UTC (yeni ajana devir öncesi). İzdüşüm sürümü (`IZDUSUM_SURUMU`): **58**. Sınama: 102 dosya, 503 sınama; tarayıcıda 30 akış sınaması, hepsi geçiyor. GitHub Actions'ta otomatik denetim var (Ubuntu ve Windows).*

Bu dosya, projeyi devralan bir yazılım ajanının kullanıcıya hiçbir şey sormadan kaldığı yerden devam edebilmesi için yazıldı. Davranışın tek kaynağı yine `tasarim/dunya-atlasi-tasarim.md` belgesidir; bu not yalnızca **durum, kalan işler ve çalışma yöntemi**dir. Bu dosya ile tasarım çelişirse tasarım geçerlidir.

**Her işin sonunda bu dosyayı güncelle:** durum tablosu, kalan işler ve son kayıt. Bir sonraki ajan buradan başlayacak.

---

## 0. Devralan ajan için kısa başlangıç (20 Ekim 2026)

- **Durum:** tasarımdaki bütün "Tasarım" maddeleri ve K28 kullanım kolaylığı paketi (örnek evren dahil) kodlandı ve `main`'de. Bekleyen kod işi yok; açık PR yalnız #1 (Windows uygulaması).
- **Kullanıcıdan bekleyenler:** Windows kurulum dosyasını denemek ve Google izinli adreslerine `http://localhost:41730` eklemek (§3.3-4); K16 gerçek kullanım; birleşik karar listesinde kararı bekleyen maddeler (B3, B13, C3, C5, C8, C9, C10, E1).
- **İlk iş:** `main`'i Windows dalına (`claude/project-thread-hdk5g6`, PR #1) al (#10–#14 alınmadı), denetimin yeşil olduğunu gör.
- **Ajanın kendiliğinden yapabileceği küçük işler:** `metinBelleginiTemizle`'deki bellek sızıntısı (A.free yok); örnek evren kurulumunu hızlandırma (~12 sn, §3.3-0); §3.3-6 ve 7.
- **Yeni iş gelirse:** §2'deki kurallar (arayüzde önce taslak, birleştirme, kullanıcının bilgisayarını güncelleme), §4 tarif, §5 denetim. İş bitince bu dosyayı güncelle.

## 1. Önce oku (sırayla)

1. `AGENTS.md`: bağlayıcı kurallar.
2. Bu dosya.
3. `tasarim/dunya-atlasi-tasarim.md`: §0 (okuma ve güncelleme kuralları), §0.4 (konu dizini), §1.3 (teknik kararlar), §14 (geliştirme sırası), §16.1 (fikirler F01–F35 ve durumları), §18 (kod için bağlayıcı sözleşmeler). Bir maddeyi kodlamadan önce o maddenin satırını ve bağlantı verdiği bölümleri oku.

## 2. Kullanıcı ve çalışma tercihi

- Kullanıcı Türkçe yazar; ona Türkçe, kısa ve sade cevap ver. Programdaki metinlerde hitap "siz"dir (kullanıcı kararı, 19 Ekim 2026; §12.4). Arayüzdeki ve hata iletilerindeki her metin Türkçedir; kullanıcıya görünen metinde programlama terimi olmaz.
- Her adım bitince DEVIR.md'de yapılan ve yapılacak adımlar güncellenir ve gönderilir (kullanıcı isteği, 19 Ekim 2026).
- **Yapılanları daima anlat** (kullanıcı isteği, 20 Ekim 2026): her işin sonunda kullanıcıya neyin yapıldığını, neyin denendiğini ve neyin onayını beklediğini sade Türkçe ile yaz; DEVIR'i güncellemeyi unutma.
- Kullanıcının açık tercihi: **bir aşama ya da madde bitince onay beklemeden sıradakine geç.** Yalnızca geri alınamaz işlerde (zorla gönderme, toplu silme, dışarıya mesaj) ya da kullanıcının vermesi gereken bir kararda dur ve sor.
- **PR'ları ajan birleştirir (kullanıcı kararı, 19 Ekim 2026; 20 Ekim'de "İzin veriyorum" ile yeniden):** otomatik denetim (Ubuntu, Windows, tarayıcı) yeşil ve çakışma yoksa PR'ı ajan kendisi `main`'e birleştirir; kırmızıysa önce düzeltir. Görünüşü değiştiren işlerde birleştirmeden önce ekran görüntüsü gösterilip onay alınır (aşağıdaki taslak kuralı). Kullanıcı yazılımcı değil; kod incelemesi beklenmez.
- **Arayüz değişikliklerinde önce taslak:** görünüşü ya da düzeni değiştiren bir işe kodlayarak başlama; önce seçenekli bir taslak göster, kullanıcı seçince kodla (kullanıcı isteği, 19 Ekim 2026).
- **İş bulutta yapılır (kullanıcı kararı, 19 Ekim 2026):** kodlama bulut oturumunda yapılır; masaüstüne ve oradaki programa dokunulmaz, zip oraya konmaz. Windows denetimini GitHub'daki Windows işi yapar.
- **`main`'e giren her değişiklik kullanıcının bilgisayarına da gelir (kullanıcı kuralı, 20 Ekim 2026):** bir PR birleşince bilgisayardaki `C:\Users\Kaan\Documents\Writing` klasöründe (Uzaktan Denetim oturumuyla) `main` dalında olduğu denetlenir, `git pull origin main` yapılır (izlenen dosyada yerel değişiklik varsa dokunulmaz, bildirilir), `package.json` değiştiyse `uygulama`'da `npm install`, geliştirme sunucusu (`npm run dev`, 5173) çalışmıyorsa başlatılır. Bunu Remote Control oturumu yapar (`start_rc_session`). Klasördeki izlenmeyen dosyalara (raporlar, `dunya-atlasi-*` klasörleri, `analiz/` kopyaları) dokunulmaz. O bilgisayarda `gh` kurulu değil.
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
| İnceleme 2 | Kalan dört şüphe: inanç kaldırma ile eşzamanlı düzenleme çatışma olur (izdüşüm 58); çöp kutusundaki yere bağlı iz düzenlenince bağ düşmez; kayıt dönüşümdeki kendi devamıyla birleştirilemez; toplu sayımda açık boş alan iletileri | `b22b861` |
| §5.8 | Komut paletinde "Yolculuk süresi" (kayıtlı rotalarla en kısa yol) ve "Takvim günü hesabı" (tarihe gün/yıl ekleme, iki tarih arası; `alan/tarih.ts` `gunFarki`), `arayuz/Hesaplar.tsx` | `b7601cd` |
| Hız | `disaridanAl` adayları her turda baştan tarıyordu (kareli). 52.500 işlemde evreni başka cihazda kurma 101 sn → 22 sn; yerelde baştan kurma 25 sn, arama 63 ms, tek değişiklik 1 ms | `7a876b0` |
| §10.1 | Metnin toplu uygulanması ve bellekte en çok 32 metin belgesi; 21.800 gerçekçi işlemde yeni cihazda kurma 154 sn → 9,3 sn (ayrıntı §3.3-2) | `99ba813` |
| Bellek | Automerge geçici kopyaları bırakılmıyordu (uzun yazma oturumunda bellek sınırsız büyüyor, 4 GB'da çöküyordu); kapatıldı | `2253aa4` |
| F19 | İnceleme: ayırt etme satırı var, sahne hatırlatıcısını sahne paneli karşılıyor; okur tanıtımı ve "sır yayına girmez" yayına (§11) bağlı, K20 gereği kapsam dışı | — |
| İnceleme (#5) | Codex'in iki bulgusu: baştan kurma hatayla yarıda kalınca hazırlanma şeridi ekranda asılı kalıyordu (`EvrenVt.ilerlemeyiKapat`); evren kaldırılıp yeniden indirilince deneme kopyasında bu cihazın yalnız parça olarak gönderdikleri geri gelmiyor, sıra numaraları yeniden kullanılabiliyordu (kendi parçaları yerelde yoksa alınır; kopyaların ayarları da silinir) | #5 |
| K28 | Kullanım kolaylığı paketi (birleşik karar listesinden B1, B2, B4–B12, C1, C2, C4, C6, C7): tür grubu renkleri, kelime sayacı ve odak kipi, boş sahne yardımı, palette rozet ve `?` kısayol listesi, andıkları/ananlar, önce üç soru, not panosu, "Ne yazıyorsunuz?" kurgu türü, son yedek satırı, araç tanıtımı, boş sayfalar; iki yedek hatası (bozuk yedek açılmaz, dosya yedeği "hazırlandı" der); **koyu tema varsayılan** (`arayuz/tema.ts`), renkli kurgu türü kartları, Genel bakışta son çalışmanın özeti (`calisan/son-calisma.ts`). Kullanıcı ekran görüntülerini onayladı (20 Ekim 13:55). Ayrıntı: aşağıda §3.3-0 | #13, `26169ad` |
### 3.2 Açık PR'lar ve dallar

| PR | Dal | Ne | Durum |
|---|---|---|---|
| [#1](https://github.com/Darvolinnn/dunya-atlasi/pull/1) | `claude/project-thread-hdk5g6` | Windows uygulaması (TK6, Tauri 2). Kurulum dosyası: [windows ön sürümü](https://github.com/Darvolinnn/dunya-atlasi/releases/tag/windows) (`Dunya-Atlasi-kurulum.exe`); dala her gönderimde yeniden derlenir. Dalın kendi DEVIR'inde iş listesi §3.2b | Açık kalır. `main` her birleştirmeden sonra bu dala alınır (son: #9, 20 Ekim). **#10–#14 henüz alınmadı** (dalın ucu `b5cbb91`); sıradaki ajanın ilk işlerinden. Kullanıcı 19 Ekim sürümünü kurup denedi, sorun görmedi; Google izinli adresi bekliyor. Bulut çalışma ağacı `/home/user/windows-dali` (oturuma özgü) |

Birleşenler: #2 (19 Ekim akşam oturumu), #5 (ilerleme şeridi, evren kaldırma, anlık görüntü), #6 (K27 rehberli yazarlık: menü adları, rehber, sorular, seri, alternatifler, olay örgüsü masası, karakter yolu, Şimdi; #5 inceleme bulguları), #7 (K27 sonraya bırakılanlar, boş alanları gizleme, yeni evren hızı), #8 (DEVIR), #9 (İlk adımlarda "Yap", eser oluşunca sahne kutusu, sıradaki adım satırı), #10 (DEVIR), #11 ve #12 (kullanım kolaylığı araştırması, yazar.io karşılaştırması, birleşik karar listesi; yalnız belge), #13 (K28 kullanım kolaylığı paketi, koyu tema, son çalışma özeti, iki yedek hatası), #14 (örnek evren D1 ve bu devir notu).

Paralel ajan paketlerinin (`paket/**`) hepsi birleştirildi; bekleyen paket yok. Promptlar kullanıcının proje klasöründe `paket-promptlari/` altındadır, depoda değildir.

### 3.3 Açık işler (önerilen sıra)

**Kullanıcının kararı ya da işi gereken:**
0. **K28 kullanım kolaylığı paketi (kullanıcı 20 Ekim'de "Al" önerilenlerin hepsini seçti: B1, B2, B4–B12, C1, C2, C4, C6, C7, D1).** Dal `claude/project-thread-xspzg2`. Taslak seçimi (20 Ekim 12:33): T1 B (yol ve sayaç üst şeritte), T2 A (rozet renkli), T4 A (andıkları/ananlar yan yana), T5 B (durum sütunları, A'daki gibi renkli durum çipleri), T6 A+B (evren oluşturma kutusunda açıklamalı kartlar); T3, T7, T8 tek seçenekti. **Kodlandı:** tür grubu renkleri (`grupSinifi`, `--tg-*`), kelime sayacı ve odak kipi (`YazEkrani`, `kisayollar.ts`'te `ODAK_OLAYI`), boş sahne yardımı (`sonParagraf` isteği), yol satırında seri, palette nereden/rozet/kısayol ve `?` ile Kısayollar listesi, andıkları/ananlar, önce üç soru (`ONDE_SORU`), not panosu (`NotPanosu.tsx`, istek `notPanosu`, `MeseleListesi.celiskiNotlari`), "Ne yazıyorsunuz?" (işlem `evren_kurgu_turu`, istek `kurguTuruYaz`, `KURGU_TURLERI`, `KurguBaglami`), son yedek satırı (`SonYedekSatiri`; "doğrulandı" yalnız Drive yedeğinde), araç tanıtımı (`AracTanitimi`, istek `aracTanitimlari`, cihazda `dunya-atlasi:arac-tanitimlari`), boş sayfalar (`BosSayfa`, `YeniKarti`). Testler: `test/kolaylik.test.ts`, `e2e/kolaylik.spec.ts`. Aynı dalda Codex raporunun iki yedek hatası da düzeltildi (kullanıcı 20 Ekim'de listeye ekledi): eksik/tekrarlı satırlı ya da sayısı tutmayan yedek açılmaz ve yarım evren silinir (`yedektenYukle`, `test/tasima.test.ts`); dosya yedeği "indirildi" yerine "hazırlandı, indirme başlatıldı" der. Kullanıcının 20 Ekim 13:32 istekleri de kodlandı: program **koyu temayla açılır** (`arayuz/tema.ts`, cihazda `dunya-atlasi:tema`; "Eşitleme ve cihazlar" sayfasında Görünüm: Koyu / Açık / Cihazın ayarı), kurgu türü kartları tür grubu renklerini alır (`KURGU_TURLERI[].renk`), Genel bakışta "Kaldığınız yer" kartında **son çalışmanın özeti** (`calisan/son-calisma.ts`, istek `sonCalisma`; oturum = aralarında 2 saatten uzun boşluk olmayan son işlemler). `metinBelleginiTemizle`'deki küçük bellek sızıntısı (A.free yok) açık kaldı. K28 PR #13 ile main'e girdi (20 Ekim, kullanıcı onayıyla). **Örnek evren (D1)** kullanıcı içeriği onaylayınca kodlandı: `calisan/ornek-evren.ts` (`ornekEvreniKur`, istek `ornekEvrenKur`; kayıtlar `iceAktar` ile, kalanı olağan isteklerle), harita görseli `calisan/ornek-harita.ts` (programla gelen düz renkli PNG), Evrenler sayfasında "Örnek evreni aç"; sınama `test/ornek-evren.test.ts` ve `e2e/kolaylik.spec.ts`. Kurulum tarayıcıda ~12 sn sürüyor (yaklaşık 200 ayrı kayıt işlemi; her biri diske ayrı yazılır); hızlandırmak için işlemleri toplu yazmak gerekir, yapılmadı. Örnek evren PR #14 ile main'e girdi (20 Ekim). **K28 bitti.** Kararı bekleyen maddeler (B3, B13, C3, C5, C8–C10, E1) ve sonraya bırakılanlar (D2, D3) kullanıcı seçmeden kodlanmaz. Bulut oturumunun güvenlik denetimi PR birleştirmeyi o oturumda kullanıcının açık onayı olmadan engelleyebilir; engellerse kullanıcıdan tek cümlelik onay iste.

1. **Windows uygulamasını dene** (#9 ile yeniden derlendi): kurup aç, yeni evren ve İlk adımlardaki "Yap", seri sayfası, olay örgüsü masası, boş alanları gizleme.
2. **Büyük evrende hız ve bellek.** Kullanıcı kararı (19 Ekim): seri büyüklüğünde (Red Rising gibi, ~1 milyon kelime; taslak ve düzeltmelerle 300.000–1.500.000 işlem) evren dakikalar içinde kurulmalı; bellek bilgisayarda 16 GB'a kadar kabul, **tablette 4 GB altı şart**. Tanım §10.1 "Tablolar günlükten baştan kurulabilir".
   - [x] **Adım 1: metni toplu uygula, bellekte yalnız son kullanılanlar** (`99ba813`). Ölçüm (gerçekçi karışım: 400 sahne, sahne başına 2.500 kelimeye kadar cümle cümle yazma, sonra düzeltme turları, işlemlerin %80'i metin):

     | İşlem | Önce: yeni cihaz | Şimdi: yeni cihaz | Şimdi: baştan kurma | Bellek artışı (yeni cihaz) |
     |---|---|---|---|---|
     | 21.800 | 154 sn | 9,3 sn | 10,2 sn | 253 MB → 192 MB |
     | 40.800 | 319 sn | — | — | — |
     | 63.400 | — | 25 sn | 21 sn | +247 MB |
     | 153.400 | — | 60 sn | 49 sn | süreç toplamı ~0,8 GB (iki cihaz + 106 MB işlem dosyası aynı süreçte) |

     153.400 işlemde (19 Ekim): veritabanı 146 MB, iki anlık görüntüyle 165 MB; geç gelen işlemle eşitleme 0,12 sn (görüntüden, 20 işlem uygulandı); arama 115 ms. Ölçüm Node'da; gerçek tarayıcı belleği (tablet sınırı 4 GB) ayrıca ölçülmeli.

     Neden yavaştı: her metin kaydı uygulanırken belge baştan okunuyor (`A.spans`) ve baştan paketleniyordu (`A.save`); Automerge'ün değişikliği işlemesi (`A.loadIncremental`) de değişiklik başına pahalıydı. Toplu yolun kuralları `izdusum.ts` "Toplu uygulama" yorumunda; eşdeğerlik sınaması `test/toplu-metin.test.ts`.
   - [x] **Automerge bellek sızıntısı kapatıldı** (`2253aa4`): her metin kaydı belgenin tam kopyasını (`A.clone`) alıp bırakıyordu; Automerge belleği çöp toplayıcıya görünmediği için birikiyordu (3.000 kayıtta +1,2 GB; 70.000 kayıtta modül 4 GB sınırında çöktü). Geçici kopyalar `try/finally` ile `A.free`; 32'yi aşıp bellekten çıkan belge de bırakılır. Şimdi 3.000 kayıtta +26 MB. **Yeni bir `A.clone`/`A.from`/`A.load` yazarken sonucu iş bitince `A.free` ile bırak** (`A.view`, `A.change`, `A.loadIncremental`, `A.merge` yeni bellek açmaz).
   - [ ] **Tablette gerçek bellek ölçümü:** yukarıdaki bellek sayıları Node sınama sürecinin (iki cihaz birden). Tarayıcıda büyük bir evrenle (açılış, yazma, baştan kurma) ölçülmeli; tablet 4 GB'ın altında kalmalı. Wasm belleği büyüyünce küçülmez; tepe değer önemli.
   - [x] **Program güncellemesinde ilerleme şeridi** (kullanıcı kararı "A", 19 Ekim; §10.7): `EvrenVt` ilerleme bildirir (5.000 işlemden büyük evrende, 2.000 işlemde bir), çalışan `postMessage({ ilerleme })`, `arayuz/Hazirlanma.tsx` şerit. Sınama `test/ilerleme.test.ts`.
   - [x] **Adım 2: anlık görüntüden kurma** (`calisan/anlik-goruntu.ts`). Her 5.000 işlemde (`EvrenVt.goruntuAraligi`) iki yuvalı görüntü (`goruntuler` tablosu, `goruntu<yuva>_<tablo>` kopyaları, `rowid` korunur). `disaridanAl` geç gelen işlemin anahtarından önceki görüntüyü yükleyip yalnız sonrasını uygular, sonrakileri siler; izdüşüm sürümü değişince hepsi silinir. 63.400 işlemde iki cihaz eşitlemesi 20,8 sn → 0,05 sn; görüntü alma 0,02 sn, görüntü başına ~9 MB. Eşdeğerlik sınaması `test/anlik-goruntu.test.ts` (bütün tablolar, satır sırasıyla; yanlış görüntü seçildiğinde kırıldığı denendi). Not: metin çatışma tabloları sahne sahne işlendiği için sahneler arası satır sırası yola göre değişir; yalnızca sahne içinde okunur, çatışma listesi tam sıralanır.
   - [ ] **Yedekten geri yükleme ve yeni cihaz** hâlâ bütün günlüğü uygular (63.400 işlemde ~25 sn). Hızlanması için görüntünün yedekle / Drive'la taşınması gerekir (Adım 3). Evren belli aralıklarla tabloların anlık görüntüsünü saklar; geçmişe düşen işlem ve yedekten dönüş baştan değil görüntüden işler. **Program güncellemesi** ayrıca düşünülmeli: (a) tabloları silmeden yerinde dönüştürme ya da (b) yeni tabloları arka planda kurarken eskileriyle yazmaya devam. Kullanıcı A'yı seçti (beklenir, şerit gösterilir); yerinde dönüştürme ileriye. Kullanıcı yazılımcı değil; günlük hayat ya da bilgisayar örnekleri tercih ediyor, laboratuvar benzetmesi istemiyor.
   - [ ] **Adım 3 (öneri): yeni cihaza günlük yerine anlık görüntü gönderme.** Eşitleme biçimi değişir; yalnız Adım 1–2'den sonra yeni cihaza indirme hâlâ yavaşsa.
   Ölçüm kalıbı: geçici vitest dosyası (`test/_*.test.ts`, depoya girmez); `Hizmet` bellekte; `metinKaydet` dönüşündeki `basliklar` sonraki kaydın `temel`'i; işlemler JSON'a (ikili base64) yazılıp ayrı süreçte `evreniDisaridanKur` ve `evren(...).yenidenKur()` ölçülür.
3. **Rehberli arayüz ve rehberli yazarlık (DEVIR §3.5):** hepsi kodlandı (İlk adımlar, menü adları, Aşama C, K27 paketleri P1–P10 ve sonraya bırakılanlar). Açık soru: "Eksik kayıtlar" adı "eksik listesi değil" ilkesiyle gerilimli; kullanıcı isterse "Henüz yazılmayanlar" yapılır.
4. **Windows uygulaması (PR #1):** kurup denemek; Google izinli adreslerine `http://localhost:41730` eklemek. Kabul akışı: tam yedek → uygulamaya ayrı evren olarak yükle → metin ve görsel denetimi; eski kopya korunur. Gerçek kurulumda denenecekler: açılış, yeniden açılış, ikinci başlatma, yedek, geri yükleme, EPUB/PDF, Google izin yenilemesi. Ayarlarda görünen sürüm ve derleme tarihi.
5. **K16:** iki haftalık gerçek kullanım (kod işi değil).

**Ajanın yapabileceği (karar gerekmeyen):**
6. **Gerçek Drive'da büyük görsel yükleme denemesi:** parça parça ve kaldığı yerden yükleme yalnız sahte Drive'la sınandı. 308 yanıtındaki `Range` başlığı tarayıcıdan okunamazsa ulaşan kısım 0 sayılır (doğru ama baştan gönderir). Google hesabı gerektirir.
7. **Türkçe:** ~5.800 kullanıcıya görünen metnin bilinen kalıpları tarandı (sen hitabı yok, programlama terimi birkaç tane kalmıştı, düzeltildi) ve 70 uzun açıklama örneklemi okundu; çoğu doğal. Tek tek okunmadı. Kullanıcı garip bulduğu ekranları bildirdikçe düzeltilir. `alan/sablon.ts` varsayılan sorudaki "söz" tekrarı ("Söylenmemiş bir söz … tutulmamış bir söz") kayıtlı şablon değeri olduğu için bilerek değiştirilmedi.

**Ertelenen:** tablet ve iPhone (§14.3, kullanıcı 19 Ekim'de süresiz erteledi); ana ekran uygulaması (uygulama tanımı, çevrimdışı katman, Cloudflare Pages yayını, "güncelleme hazır" davranışı).

"Öneri" durumundaki fikirler kodlanmaz; yeni fikir eklenmez (K11).

### 3.4 Biten işlerden kalan dersler

- **Sayfa rehberi (K25, §12.4):** yeni sayfa eklerken `rehber-metinleri.ts`'e rehberini ekle, başlığa `<SayfaYardimi sayfa="…" />` koy. Metinler "siz" hitabıyla; düğmeler kısa. Kaydedilen değerler (seçenek adları, şablon alan adları, gerekçe ve sonuç sabitleri) Türkçe düzeltmelerinde bilerek değiştirilmez.
- **Dosya adları:** aynı klasörde yalnız harf büyüklüğüyle ayrılan iki dosya Windows derlemesini kırar; `test/dosya-adlari.test.ts` yakalar.
- **Esc ve odak dinleyicileri `useLayoutEffect` ile bağlanır.** Preact `useEffect` bir sonraki kareyi bekler; görüntüsüz tarayıcıda kare geç gelince panel göründüğü an basılan Esc kaçıyordu. Açılışta değeri sıfırlayan etkiler ilk çizimde çalışmamalı (`TarihAlani`). Tarayıcı sınamaları bu durumu `window.requestAnimationFrame = () => 0` ile üretir.
- **Bağlam paneli** tercihi üç değerli (`dunya-atlasi:yazma-baglami-kapali`: `1` kapalı, `0` açık, yok = seçilmedi); seçilmemişse boş sahnede kapalı. Sahne "boş" = `sahneBaglamiBos` (`Anlati.tsx`).
- **Durum özeti** evren içinde `Esitleme.tsx` `DurumOzeti`; Evrenler sayfasında eski tek satır (`EsitlemeOzeti`).
- **Tarayıcı sınamaları:** `uygulama/e2e/akislar.spec.ts`, `npm run sina:tarayici`; bulutta `PW_CHROMIUM=/opt/pw-browsers/chromium`. "Rehberli arayüz" kodlanırsa ilk açılışta başlangıç sorusu gelir; `e2e/yardimci.ts` `sahneAc` ona göre güncellenmeli.
- **Kurtarma taslağı:** `metinKaydet` taslağı aynı istekte siler (kayıt isteğinden önce yazılmışsa); kurtarma alanına yazılamazsa asıl taslak silinmez.
- **İstemci:** çalışan yüklenemez ya da çökerse bekleyen istekler hatayla biter; açılış hata ekranında "Yeniden dene".
- **Masaüstü dili:** fareyle kullanılan ekranlarda "dokunun" değil "tıklayın" (`dddfbda`, başka oturum); "Vazgeçilmişler" → "Vazgeçilen kayıtlar", başlangıç sorusunda "merkez çatışması" → "ana çatışması".
- `test/kural-atolyesi.test.ts` "tarih ve geçerlilik aralığı" sınaması bütün sınamalar birlikte çalışınca ara sıra kırılıyormuş, tek başına hep geçiyor (başka oturumun notu; nedeni bulunmadı).
- Windows'ta bir kez görülen `esitleme.test.ts` "kullanım dışı cihaz temizliği bekletmez" kırılması (yük altında süre); GitHub'daki Windows işinde yinelenirse kök nedeni aranır.

### 3.5 Rehberli arayüz ve rehberli yazarlık (kullanıcı isteği, 19 Ekim 2026; kodlandı)

Kullanıcı etkileşimli bir taslak ve gerekçe belgesi gönderdi (ekler depoda değil): program kullanıcıyı küçük, atlanabilir adımlarla yönlendirsin, yalnız o anda gereken alanları göstersin, sonraki adımı anlaşılır kılsın. Öneri proje klasöründe `analiz/rehberli-arayuz-uyarlama.md`. Özeti: boş evrende "Nereden başlamak istersiniz?" ve üç kısa akış (sahne, kayıt, not) + sonuç kartında tek sonraki adım (Aşama A); gezinti Yaz / Evren / İncele / Masa / Yönetim, seyrek işler "⋯" menüsünde (Aşama B, önce resimli taslak); kayıt sayfasında boş bölümlerin gizlenmesi (Aşama C). Yeni veri yok; onaylanırsa tasarıma K26 olarak girer. Boş bağlam panelinin kapalı olması ve durum özeti artık kodda (PR #2), öneri bunlarla uyumlu.

- [x] Kullanıcı kararları (19 Ekim): başlangıç akışı taslak B ("İlk adımlar"), menü yapısı K24 gibi kalır
- [x] Menü adları: kullanıcı önerilen tabloyu seçti ve kodlandı (§5.10). Kayıt türü "Açık mesele" ve değişiklik/kullanım/koşul masası araç adları değişmedi; kod içi adlar (`masa`, `masalar`) aynı kaldı.

**Rehberli yazarlık ve roman serisi (kullanıcı isteği, 19 Ekim 2026; kararlar alındı, kodlandı).** Kullanıcı roman yazma yöntemini bilmediğini, programın bu konuda yol göstermesini istediğini yazdı ve iki brif gönderdi (depoda değil): önce istek, sonra ilk sürümün eleştirisi. İkinci brif üzerine ilk sürümün tasarım, akış ve farklar belgeleri kaldırıldı (git geçmişinde, `6fa89ac`). Şimdiki belgeler `analiz/` altında; hiçbiri bağlayıcı değil:
- `yazarlik-ve-roman-serisi-calisma-rehberi.md`: 24 konuluk yazarlık rehberi, yöntem haritası (A.6), uydurma örnek seri *Hatıra İmparatorluğu*. Kod beklemeden okunabilir.
- `roman-serisi-veri-ve-kavram-modeli.md`: **kavramların tek tanımı**: düzeyler (evren kuralı / seri sorusu / hikâye çekirdeği), adım durumları (yapıldı · geçildi · ilgisiz · başlanmadı) ve dayanakları, seri üyeliği ve silme/geri yükleme, plan–alternatif–gerçek, kitap sonunda açık olanlar (montaja dayanır), karakterin kitaptaki yolu, çalışma durumları.
- `rehberli-yazarlik-urun-tasarimi-v2.md`: ekranlar (İlk adımlar yolları, Şimdi kartı, sahne planı, seri sayfası, olay örgüsü masası), paketler P1–P10, kararlar D1–D13.
- `yaratici-calisma-akislari-v2.md`: senaryolar ve kabul ölçütleri.
- `rehberli-yazarlik-revizyon-analizi.md`: eleştirinin kodla doğrulanması, eski çelişkiler, `main` ile #5'teki özellikler.

Ana bulgular: (1) Kurgu hattı ipucu rolleri yalnız sayılıyor; "kitap sonunda açık olanlar" montajdaki okur soruları ve sahne niyetleri üzerinden hesaplanmalı. (2) Plan için ayrı katman gerekmez; kayıt ve alan düzeyi karar durumu var, eksik olan `alternatif` ilişkisi. (3) Olay örgüsü masası yeni veri istemez; var olan dört görünümü birleştirir. Onaylanırsa K11 gereği önce §16'ya *Öneri* olarak girer. Sıradaki adım: kullanıcı D1–D13'ü seçer; ilk kodlanacak P1 (rehber) ve P2 (soru setleri).
- [x] Kullanıcı kararları (19 Ekim, gece): D1–D13'ün hepsi önerildiği gibi; sıra önce rehber ve sorular (P1, P2). Menü adları önerilen tablo (Masa → Genel bakış, İnceleme → Uyarılar, Görünümler → Grafikler, Çalışma masaları → Konu dosyaları, Açık meseleler → Karar bekleyenler, Bahsedilen ama yazılmamış → Eksik kayıtlar, Geçmiş → Değişiklik geçmişi, Sürümler → Kayıtlı anlar). #5'in üç görünüşü onaylandı; şerit sarısı deve tüyü oldu.
- [x] K27 tasarıma girdi (§1.1); kavram modeli paket paket işlenecek.
- [x] P2 (ilk kısım): eser (`cekirdek`, `eser`), sahne (`sahne_plani`) ve kurgu hattı (`hat`) soru setleri varsayılan; Ek A, §4.6; `test/anlati-sorulari.test.ts`. Şablonu değiştirilmiş evrende kendiliğinden eklenmez.
- [x] P2 (kalan): Yaz ekranında bağlam panelinin üstünde katlı "Sahne planı" (`Sablon.tsx` `SahnePlani`, §5.10). `seri` seti P4 ile. #6 ile birleşti.
- [x] P3: İlk adımlarda başlangıç yolları (§5.10; `YazEkrani.tsx` `YOLLAR`, istek `ilkAdimlar` dayanakları; sınamalar). #6 ile birleşti.
- [x] P4 seri (ilk kısım): `seri` türü, `anlati.yerlestir` eseri seri altına kabul eder, istek `seriler`, yazma ağacında seri başlığı, seri sayfasında "Kitaplar" ve sorular, eser sayfasında "Serisi" seçimi; `test/seri.test.ts` (silme/geri getirme, iki cihaz). Zaman çizelgesinde eserin serisi eser sanılmasın diye `zamanCizelgesi` yalnız eser/bölüm üstlerini sayar. #6 ile birleşti.
- [x] P5 alternatifler: `alternatif` ilişkisi (aynı tür), istek `alternatifler`, kayıt sayfasında kesinleştirince öbürlerini vazgeçirme sorusu, Uyarılar'da "Alternatifler" denetimi; `test/alternatif.test.ts`. Seri sayfasındaki "Olası finaller" #7 ile geldi (`olasi_final`).
- [x] P8 çalışma durumları: eser ve sahne şablonunda "Çalışma durumu" seçim alanı (`ESER_CALISMA`, `SAHNE_CALISMA`); bölüm dağılımı ve olay örgüsü masasındaki durum satırı P6 ile.
- [x] P9 kitap sonunda açık kalanlar: `montaj.kitapSonuAciklar`, eser sayfasında bölüm; `test/kitap-sonu.test.ts`.
- [x] P10 Şimdi kartı: `Masa.tsx` `SimdiKarti`, istekler `etkinCalisma`, `etkinCalismaYaz`, `simdi`; işlem `evren_etkin_calisma`; `test/simdi.test.ts`. İlk adımların sıradaki adımı karta katılmadı (liste zaten Yaz sayfasında).
- [x] P7 karakterin kitaptaki yolu: `eser_odagi` ilişkisi, `karakter_kitapta` soruları (`ILISKI_SETLERI`; `sablon.ts` `odakIliskisiMi` ilişki kodunu soru sahibi kabul eder), istek `karakterYollari`, eser sayfasında "Odak karakterler", seri sayfasında tablo; `test/karakter-yolu.test.ts`. 5. ve 6. soruya sahne/olay bağı #7 ile geldi.
- [x] P6 olay örgüsü masası: kullanıcı taslak A'yı seçti (20 Ekim). `arayuz/OlayOrgusu.tsx` (Grafikler › Olay örgüsü, `#/e/<evren>/orgu/<eser>`), `montaj.olayOrgusu`; dönüm noktası = sahneye `DONUM_ETIKETI` etiketi (`alan/sablon.ts`). Taşıma özeti ve geri alma arayüzde. Seri düzeyi #7 ile geldi.
- [x] Sonraya bırakılanlar (20 Ekim): ek kitap (`seri_eseri`), okuma yolları (`seri_okuma_yollari`, evren anahtarı `okuma_yollari:<seri>`), olası finaller (`olasi_final` + `alternatif`), karakter yolunda sahne bağı (`soruBagla`, soru tanımında `bagla`), soru örnekleri (`alan/soru-ornekleri.ts`), seri düzeyinde olay örgüsü masası. `calisan/seri.ts`, `arayuz/SeriPlani.tsx`.
- [x] Aşama C (taslak A, 20 Ekim): kayıt sayfasında boş alanlar "+ ad" düğmeleri (`SablonAlanlari` `acilan`/`ac`/`ekCipler`, `KayitEkrani` `acilan`), boş görsel ve ilişki "Henüz eklenmedi" satırında (`Iliskiler` `gizli`/`sayiBildir`/`formAcik`).
- [x] İlk adımlarda "Yap" (kullanıcı isteği, 20 Ekim): `arayuz/IlkAdimlar.tsx` (liste ve Yaz dışındaki `SiradakiAdim` satırı ortak `useIlkAdimlar` ile; tercihler değişince `dunya-atlasi:ilk-adimlar-degisti` olayı), `arayuz/yonlendirme.ts` `gitVeYap` (adrese git, öğe çizilince odakla/tıkla/olay gönder), istek `ilkAdimlar` `hedefler` (ilk eser/sahne/not/karakter). Eser oluşunca ağaçta yeni sahne kutusu açılır (`YENI_SAHNE_OLAYI`; istek eserin yapısı okunana dek bekletilir). Komut paleti `PALET_OLAYI` ile açılır. Sınamalarda "Eser oluştur" düğmesi `exact: true` aranır ("Yap: Bir eser oluşturun" ile karışmasın); `sahneAc` artık "+ Sahne"ye basmaz.
- Yeni evren dosyası tek veritabanı işleminde kurulur (`EvrenVt` kurucusu); tarayıcıda evren oluşturma ~4 sn → ~0,4 sn. `e2e` "İlk adımlar" sınamasının ara sıra kırılması buydu.
- [x] P1: yazarlık rehberi programın içinde (§12.4): `arayuz/YazarlikRehberi.tsx`, metinler `arayuz/yazarlik-rehberi.ts` (analiz belgesinden üretildi; belge değişirse yeniden üretilmeli: başlıklar `### Konu N — …`, alanlar `**Ne:**` biçiminde). Soru başına "Örnek" #7 ile geldi. #6 ile birleşti.
- [x] Tasarım K26, §5.10; kod ve sınamalar (`test/ilk-adimlar.test.ts`, tarayıcı akışı)

**Kullanım kolaylığı araştırması ve yazar.io karşılaştırması (20 Ekim 2026; araştırma bitti, karar bekliyor).** Kullanıcı UX araştırması ve benzer bir Türkçe site (yazar.io, dünya kurma wikisi; roman metni dışarıda yazılıyor) ile karşılaştırma istedi. yazar.io girişli olduğu için içeriden incelemeyi kullanıcının kendi Chrome eklentisi yaptı; promptları önceki ajan yazdı (güvenlik sınırları: ödeme yok, ayar değiştirme yok, yayımlama yok, yalnız "Deneme" projesi, uydurma içerik, kişisel bilgi yazılmaz), kullanıcı raporları sohbete yapıştırdı. Ajan kendi web araştırmasını kullanıcının isteğiyle bıraktı. Belgeler `analiz/` altında, bağlayıcı değil:
- `kullanici-deneyimi-arastirmasi.md`: benzer programlarda (Scrivener, Dabble, Campfire, World Anvil, Plottr…) övülen ve şikâyet edilenler, ilkeler, 15 öneri (KD-1…KD-15).
- `yazar-io-karsilastirma.md`: §1–7 açık sayfalar; §8 ve §9 içeriden gezme; §10 arayüz incelemesi; §11 ek inceleme (adla bağlama, ad değişikliği, silme, geri alma, not durumları, alan türleri, wiki, arama, dışa aktarma, kısayollar; Dünya Atlası ile yan yana tablo). §10'daki "Türkçe ekleri tanımıyor" bulgusu §11'de düzeltildi.
- **`birlesik-karar-listesi.md`: dört kaynağın tek listesi ve iş planı.** §0 devralan için iş akışı ve sınırlar; A zaten var (denetlendi) · B küçük (B1–B13) · C orta (C1–C10) · D büyük (D1–D3) · E tasarımla çelişebilir (E1, K1) · F alınmayacaklar. Her maddede ne, nasıl, dokunulacak dosyalar, tasarımdaki yeri, kabul ölçütü.
- Önemli bulgular: (1) yazar.io'nun güçlü göründüğü bağlama ve aramada tasarımımız zaten ileride (ayırt etme satırı, ad düzeltme önizlemesi, metin içinde ve ekli arama, çöp kutusu, sürüm geçmişi). (2) Bazı maddeler yeni fikir değil, tasarımda olup kodda eksik: tür renkleri ve karşıtlık (§12.1, B10–B11), yedeğin görünmesi (§10.8, B5). (3) Palet aramanın döndürdüğü metin parçasını göstermiyor (B8, yalnız arayüz). (4) Not kaydında tür ve durum yok (C1). (5) §12.1 "yazar.io'nun kimliği kopyalanmaz": görsel kimlik alınmaz.
- Kullanıcının yazar.io hesabında eklentinin bıraktığı deneme kayıtları var ("Test Lale", "Test Lale Yeni", "Emir", "Test Kuzey Arşivi", "Test Olay"); kalıcı silme onayı gerektirdiği için eklenti silmedi, kullanıcıya söylendi. Depoyla ilgisi yok.
- İsteğe bağlı, yalnız kullanıcı isterse: LegendKeeper, Kanka, Notebook.ai, Fantasia Archive karşılaştırması; programımızın kendi kullanım incelemesi (yarıda kalan ajan işi).

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

- Bulut oturumu kendisine verilen dalda (`claude/...`) çalışır, PR açar ve denetim yeşilse kendisi birleştirir (§2). Birleşen PR'ın dalı yeni iş için güncel `main`'den yeniden başlatılır. Aynı anda birden çok oturum çalışıyorsa DEVIR.md gibi ortak dosyalarda çakışma çıkar; birleştirmeden önce `main` dala alınır. Paralel ajanlar `paket/<ad>` dallarında çalışır.
- Kayıt mesajları Türkçedir: ilk satır kısa başlık (ör. "Delil geçmişi ve soruşturma masası (F08)"), altında ne değiştiği ve yeni tablo varsa izdüşüm sürümü.
- Zorla gönderme (force push) yapma; başkasının dalının geçmişini yeniden yazma.
- Depo herkese açıktır: sır, gerçek evren içeriği, dışa aktarılmış veri, ekran görüntüsü ve lisans dosyası girmez. Test ve örnek adları uydurmadır.
