# Dünya Atlası: Tasarım

**Sürüm 6 · 19 Ekim 2026 · Aşama: kodlama.** Kodlama kullanıcının onayıyla başladı (K9); geliştirme sırası §14'tedir, güncel durum `DEVIR.md`'dedir. Yeni bir davranış kullanıcının onayı olmadan kodlanmaz.

Bu belge programın **bugün geçerli** davranışını anlatır. Bir davranışın nereden geldiği, eskiden nasıl yazıldığı, hangi eleştiriyle değiştiği ve kaynak belgeler ayrı dosyadadır: [tasarim-gecmisi.md](tasarim-gecmisi.md). Geçmiş dosyası davranış tanımlamaz; iki dosya çelişirse bu belge geçerlidir.

---

## 0. Bu belge nasıl okunur ve nasıl güncellenir

### 0.1 Okuma kuralları

1. **Her davranışın tek bir geçerli tanımı vardır.** Yeri aşağıdaki konu dizininde yazar. Başka bölümler o davranışı yeniden anlatmaz; en fazla bir cümleyle anar ve tanımın yerine bağlantı verir. Kısa bir anış, tanımın kapsamını daraltmaz ya da genişletmez. Anış ile tanım farklı görünürse tanım geçerlidir ve anış hatalıdır.
2. **Bir bölümü tek başına okuyan kişi** (ya da bir yazılım ajanı) o bölümdeki bağlantıları da izlemelidir. Örneğin eşitleme kuracak biri §17'yi değil §10'u esas alır.
3. **Durum etiketleri** her kararın ve fikrin yanında bulunur. Etiketin tek kaynağı §1 (kararlar) ve §16 (fikirler) tablolarıdır.

| Etiket | Anlamı |
|---|---|
| **Karar** | Kullanıcının açıkça verdiği karar. Yalnızca kullanıcı değiştirir. |
| **Tasarım** | Bu tasarımın benimsediği davranış. Kullanıcı tasarımı onaylayınca kodlanacak olan budur; kullanıcı itiraz ederse değişir. |
| **Öneri** | Değerlendirilmiş ama henüz tasarıma alınmamış fikir. Kodlanmaz. |
| **Açık** | Kullanıcının vermesi gereken karar. Tasarım bir varsayılan önerir ama onu kesinleşmiş saymaz. |
| **Doğrulandı** | Çalışan programda denenmiş davranış. Şu an hiçbir davranış bu durumda değildir. |

Birden çok öneri belgesinin aynı şeyi söylemesi bir şeyi **Karar** yapmaz.

### 0.2 Güncelleme kuralı

Yeni bir eleştiri, öneri ya da kullanıcı kararı geldiğinde:

1. Etkilenen davranışın **tek tanımı yerinde yeniden yazılır.** Eski cümle silinir; yanına "düzeltme", "ancak", "⚖️" gibi bir ek konmaz. Belge her an yalnızca güncel hükmü içerir.
2. Konu dizininden, bu davranışı anan diğer yerler bulunur ve anışlar yeni tanıma uyacak biçimde düzeltilir ya da bağlantıya indirilir.
3. Değişiklik, gerekçesi ve kaynağıyla [tasarim-gecmisi.md](tasarim-gecmisi.md) değişiklik kaydına bir satır olarak yazılır. Eleştiri numaraları (M05, V4-07 gibi) yalnızca orada geçer.
4. Yeni fikirler §16'ya **Öneri** olarak girer. Tasarıma alınırsa tanımı ilgili bölüme yazılır ve §16 satırı yalnızca o bölüme bağlantı verir.
5. Kullanıcı bir karar verirse §1'deki satırın durumu değişir; başka hiçbir yerde karar durumu yazılmaz.

### 0.3 Örnekler

Belgedeki adlar (Velkar, Kaelen, Elin, Kuzey Kalesi…) yalnızca davranışı anlatmak için uydurulmuş örneklerdir. Depo herkese açıktır (K7); bu yüzden kullanıcının gerçek evreninden içerik, sır ya da ekran görüntüsü buraya konmaz.

### 0.4 Konu dizini

| Davranış | Tek tanımın yeri |
|---|---|
| Kullanıcı kararları, açık kararlar, teknik açık kararlar | §1 |
| Terimler | §0.5 |
| Ortak hesap ve kayıt kuralları | §2.2 |
| Sonuç zarfı: hüküm, güncellik, kapsam, dayanak, varsayımlar | §2.3 |
| Kayıt, tür, bileşen, çalışma sayfası | §3.1 |
| Bağlantı, ilişki, katılım rolü | §3.2 |
| Eser, bölüm, sahne, olay; sahne olayı; sahne taşıma | §3.3 |
| Zaman modeli: tarih saklama, takvim, zaman akışı, gün bölümleri, mevsim | §3.4 |
| Durum geçmişi, gözlem ve süren durum | §3.5 |
| Karar durumu ve varsayılan yorum; bilgi katmanları, inanç, okur bilgisi | §3.6 |
| Bilinmeyenin türleri ve her türün davranışı | §3.6 (tablo) |
| Fiziksel kapsama, siyasi bağlılık, kültür, tür; varsayılan değerler | §3.7 |
| Eşya, sahiplik, makam, kafile, kalabalık | §3.8 |
| Evren içi belge; kaynakların bağımsızlığı | §3.9 |
| Süreçler, adımlar ve eşikler | §3.10 |
| Varsayım paketleri | §3.11 |
| Kişi, kimlik ve beden | §3.12 |
| Bağlantı yazma, Türkçe ekler, ad değişikliği | §5.1 |
| Gömme ve bağlam | §5.2 |
| Süreklilik defteri, net fark | §5.6 |
| Metin işaretleme | §5.7 |
| Programın yazara sorduğu sorular | §6.1 |
| Soru kütüphanesinin başlangıç seti | Ek A |
| Harita uzayı ve işaretler; harita ekranı | §8.1 |
| Harita kipleri (geometri, süre ağı, kroki) | §8.4 |
| Kural tabanlı denetimler | §9.1 |
| İnceleme kuyruğu: ne açar, ne kapatır | §9.3 |
| Eşitleme, çatışma, cihazlar, sürüm uyumu | §10 |
| Yedek, kurtarma, dışa aktarma | §10.8–§10.11 |
| Medya dosyaları | §10.12 |
| Yayın paketi ve yayın güvenliği | §11 |
| Görünüm, erişilebilirlik, giriş yöntemleri; çizimlerin ortak ilkeleri | §12 |
| Sayfa rehberi ve hitap | §12.4 |
| Kabul senaryoları | §13 |
| Geliştirme ve cihaz sırası, aşama çıkışı | §14 |
| Hesap araçları | §15 |
| Fikirler F01–F47 ve durumları | §16 |
| Platform, depo ve barındırma | §17 |
| Veri sözleşmeleri, arama ve sıralama, özellik kullanım sözleşmesi | §18 |

### 0.5 Terimler

Aşağıdaki sözcükler belgede yalnızca bu anlamlarda kullanılır. Kodu yazacak kişi ya da ajan için bağlayıcıdır.

| Terim | Anlamı | Karıştırılmaması gereken |
|---|---|---|
| **Evren** | Programda ayrı tutulan en üst çalışma birimi. Kendi kayıtları, takvimleri, şablonları, kuralları, eşitlemesi ve yedeği vardır. Kullanıcının birden çok evreni olabilir (K18). "Evren tarihi", "evren olayı", "evren kaydı" bu birimin içindeki kurgusal gerçeği anlatır. | Kurgunun içindeki gezegen, boyut, alem ya da "dünya" sabit bir seviye değildir; bunlar mekân kayıtlarıdır ve türlerini kullanıcı adlandırır (K22, §3.7). Kurgu bir çoklu evren anlatıyorsa iç evrenler de aynı programsal evrende birer kayıttır. |
| **Kayıt** | Evrendeki bir varlığın sayfası (karakter, mekân, olay…). | Veriyi cihaza yazma eylemine "kaydetme" denir. |
| **Kod** | Kaydın, alanın, bölümün, işlemin ya da kurulumun adından bağımsız, hiç değişmeyen teknik kimliği. Kullanıcı görmez. | Evren içi kimlik. |
| **Kimlik** | Evren içinde birinin kullandığı ad ve rol: "Kara Tilki" bir kimliktir (§3.12). Okura görünen kimlikler §11.2'dedir. | Teknik kod. |
| **Ayırt etme satırı** | Aynı adlı iki kaydı seçicide ayıran kısa satır (F19). | |
| **Kullanıcı kararı** | §1.1'deki K-kararları. | Karar durumu, gerekçe kaydı. |
| **Karar durumu** | Bir kaydın ya da alanın yazarın gözündeki olgunluğu: *fikir · kesinleşmiş · vazgeçilmiş* (§3.6). | Eşitleme durumu. |
| **Gerekçe kaydı, gerekçe defteri** | Yazarın bir yazarlık kararını, seçeneklerini ve gerekçesini tuttuğu kayıt ve bunların listesi (§4.6). | |
| **Seçim geçmişi** | Bir karakterin evren içinde verdiği kararlar (§4.1). | |
| **Eşitleme durumu** | Bir değişikliğin cihazlar arasında nereye ulaştığı (§10.8). | Karar durumu. |
| **Sürüm** | Her zaman türüyle söylenir: belge sürümü (evren içi belge, §3.6), içerik sürümü (gömme, §5.2), evren sürümü (adlandırılmış, §9.7), plan sürümü (§8.6), takvim sürümü (§3.4), şema sürümü (§9.5) ve dört teknik sürüm (§10.7). | |
| **Zaman akışı** | Zamanın kendine özgü bir hızla aktığı kapsam (§3.4). Her evrenin bir ana akışı vardır. | |
| **Sahne olayı** | Her sahnenin kendiliğinden sahip olduğu görünür olay (§3.3). | Gizli zaman çapası; böyle bir şey yoktur (§3.5). |
| **Hüküm, güncellik** | Bir hesap ya da denetim sonucunun ne bulduğu ve hangi veriye ait olduğu (§2.3). | |

---

## 1. Kararlar

### 1.1 Kullanıcı kararları

| # | Karar | Tarih |
|---|---|---|
| K1 | **Programda yapay zekâ yoktur.** İçeriği kullanıcı yazar. Arama, filtreleme, hesap ve denetim yalnızca kullanıcının kaydettiği yapılandırılmış veri ve tanımladığı kurallarla çalışır. Program serbest metinden anlam çıkarmış gibi davranmaz. | 18 Ekim |
| K2 | **Eşitleme ve yedek Google Drive üzerinden yapılır ve ayrı işlevlerdir.** Eşitleme cihazları güncel tutar; dönemsel yedek geri dönülebilir kopyalar saklar. Ayrıntı §10. | 18 Ekim |
| K3 | **Cihazlar:** Windows 11 bilgisayar ve Samsung Galaxy Tab S11 Ultra (Android) aynı evrende çalışır; bir cihazda başlanan işe öbüründe devam edilir. iPhone için sürüm yapılmaz (19 Ekim). | 18 Ekim, 19 Ekim |
| K4 | **Tasarım, geliştirme maliyeti kaygısıyla daraltılmaz.** Geliştirme sırası (§14) yalnızca sırayı belirler. | 18 Ekim |
| K5 | **Program yazarlık yöntemi dayatmaz.** Hiçbir alan zorunlu değildir; kullanıcı önce serbestçe yazar, ayrıntıyı ihtiyaç duydukça açar. | 18 Ekim |
| K6 | **Özellik seçiminin ölçütü:** "Bu özellik evrenimi kurarken hangi işimi kolaylaştırıyor?" Rakiplerden farklılaşmak tek başına gerekçe değildir. | 18 Ekim |
| K7 | **Kod ve tasarım belgeleri herkese açık bir GitHub deposunda tutulur:** `Darvolinnn/dunya-atlasi` (Darvolinnn ve TearsFears227 hesaplarının ikisi de kullanıcınındır). Depo önce gizli olarak düşünülmüştü; kullanıcı 18 Ekim'de herkese açık olmasını seçti. Depoya sır, gerçek evren içeriği ve ekran görüntüsü konmaz. Program bilgisayara kurulan bir uygulamadır: Windows için kurulum dosyası, tablet için APK; ikisi de aynı koddan bir uygulama kabuğuyla üretilir (TK6, §17.1). İnternette yayımlanan bir site yoktur. Evren verisi depoya girmez (§17.3). | 18 Ekim, 19 Ekim |
| K8 | **Görünüm: soft, temiz, narin; sade kartlar.** Parşömen ve arşiv dokusu yalnızca kapakta, wikide ve evren içi belge çıktılarında. Ayrıntı §12. | 18 Ekim |
| K9 | **Tasarım aşaması kullanıcı "geç" demeden kapanmaz.** O zamana kadar depoya yalnızca tasarım belgeleri girer. Kullanıcının açık onayı olmadan kodlamaya geçilmez. | 18 Ekim |
| K10 | **Tasarım belgesi yalnızca güncel davranışı anlatır;** geçmiş ayrı tutulur (§0.2). | 18 Ekim |
| K11 | **Fikir girişi dondurulmuştur.** Yeni bir fikir ancak kullanıcının kendi evrenini yazarken yaşadığı somut bir takılmayla ("şu sahnede şu yüzden takıldım") §16'ya Öneri olarak girer. Mevcut modellerin tutarlılık düzeltmeleri yeni fikir sayılmaz. | 18 Ekim |
| K12 | **Zaman modeli:** Her tarih iki biçimde saklanır: girildiği biçim ve kanonik zaman ekseni. Zaman akışı birinci sınıf kavramdır; gün bölümleri takvimin parçasıdır. Ayrıntı §3.4. | 18 Ekim |
| K13 | **Düz değerin varsayılan anlamı:** Bir alana düz girilen değer *kesinleşmiş* ve *evrenin gerçeği*dir; `[[` ile doğan kayıt *fikir*dir. Fikir durumundaki değerler denetlenir ama uyarıları ayrı ve sessiz bir grupta durur; vazgeçilmiş değerler denetlenmez. Ayrıntı §3.6. | 18 Ekim |
| K14 | **Sahne olayı:** Sahnedeki değişimleri kaydetmek için önce olay oluşturmak gerekmez; her sahnenin görünür bir sahne olayı vardır. Ayrıntı §3.3. | 18 Ekim |
| K15 | **Eşitleme biçimi (eski A1):** Her kurulum değişmez parça dosyaları yazar. Yapılandırılmış veri programın kendi işlem günlüğüyle, uzun metin bir metin CRDT'siyle tutulur. Ayrıntı §10. | 18 Ekim |
| K16 | **Geliştirme ve cihaz sırası:** Önce Windows'ta, tek cihazda yerel çalışan sürüm; sonra Drive eşitlemesi; tablet en son. Bir aşama, kullanıcının o sürümü kendi evreniyle iki hafta her gün kullanmasıyla biter. Ayrıntı §14. | 18 Ekim |
| K17 | **Teknik deneyler:** Tasarımın dayandığı platform varsayımları kodlamadan önce depo dışındaki küçük deneylerle sınanır. Windows deneyleri önce, tablet deneyleri en son yapılır. Ayrıntı §1.3, §14. | 18 Ekim |
| K18 | **Tek yazar, birden çok evren:** Program yalnızca kullanıcının kendi cihazları içindir; ortak yazarlık hedef değildir. Kullanıcının birden çok evreni olabilir; her evren ayrı eşitlenir ve yedeklenir. | 18 Ekim |
| K19 | **Lisans ve görünürlük:** Depoya lisans eklenmez; kodu başkası kullanamaz. Depo, uygulama adresi ve belgeler olabildiğince kapalı tutulur. | 18 Ekim |
| K20 | **Wiki şimdilik yok.** Yayın ve wiki (§11) kullanıcı ileride isterse uygulanacak tasarım olarak durur; geliştirme sırasında yer almaz ve hiç yapılmayabilir. | 18 Ekim |
| K21 | **Dönemsel yedek (eski A2):** Günlük yedek alınır ve 30 gün saklanır; her ayın ilk yedeği bir yıl saklanır. Ayrıntı §10.10. | 18 Ekim |
| K22 | **Evren ile dünya:** Programdaki tek sabit üst birim evrendir. Dünya, gezegen, boyut ya da alem kurguya göre kayıtlarla esnek biçimde kurulur; program bir seviye dayatmaz (§0.5, §3.7). | 18 Ekim |
| K23 | **F37 (varsayım paketleri) ve F40 (kalabalıklar) tasarıma alındı** (eski A13'ün bir kısmı). Tanımları §3.11 ve §3.8. | 18 Ekim |
| K24 | **Arayüzde yazı merkezdedir.** Evren açılınca yazma düzeni gelir; ekran sadeleşir, az kullanılan araçlar katlanır ve görünüş yenilenir. Ayrıntı §5.10, §12.1. | 19 Ekim |
| K25 | **Her sayfanın rehberi ve tek hitap.** Her sayfanın başlığında bir "?" düğmesi vardır; sayfanın ne işe yaradığını ve nasıl kullanıldığını anlatan rehberi sağdan açılan yan panelde gösterir. Program kullanıcıya "siz" diye hitap eder. Ayrıntı §12.4. | 19 Ekim |
| K26 | **Yeni evrende ilk adımlar.** Yaz sayfasının üstünde dört adımlık bir liste durur: eser oluşturmak, ilk sahneyi eklemek, metinde bir kayda bağlanmak, sahneye tarih ya da mekân vermek. Yapılanlar evrenden anlaşılır ve işaretlenir; hepsi bitince ya da gizlenince görünmez. Zorunlu sihirbaz yoktur. Ayrıntı §5.10. Kayıt sayfasında boş alanlar ve bölümler gizlidir (§7, kullanıcı taslak A'yı seçti, 20 Ekim). | 19 Ekim |
| K27 | **Rehberli yazarlık ve roman serisi.** Program yazarlık yöntemini öğretir ama dayatmaz: programla gelen bir yazarlık rehberi, eser, sahne ve kurgu hattı için soru setleri, İlk adımlarda başlangıç yolu, seri kaydı, olası finallerin birbirine alternatif olarak bağlanması, karakterin kitaptaki yolu, eser ve sahne çalışma durumu, "şu an çalıştığım" seçimi ve olay örgüsü masası. Evrenin kuralı, serinin büyük sorusu ve hikâyenin çekirdeği ayrı tutulur. Kullanıcı önerilen varsayılanların hepsini seçti (D1–D13). Kavram modeli `analiz/roman-serisi-veri-ve-kavram-modeli.md`'dedir ve bu belgeye paket paket işlenir; işlenen: anlatı soru setleri (Ek A, §4.6), yazarlık rehberi (§12.4), başlangıç yolları ve sahne planı (§5.10), seri, ek kitap, okuma yolları ve olası finaller (§3.3), olay örgüsü masası (§7), soru örnekleri (Ek A). Görünüşü değiştiren her paketten önce resimli taslak gösterilir. | 19 Ekim |
| K28 | **Kullanım kolaylığı paketi.** Kullanıcı `analiz/birlesik-karar-listesi.md`'de önerilen "Al" maddelerinin hepsini seçti: sessiz kelime sayacı, odak kipi ve yol satırı (§5.10), boş sayfalar ve rehbere bağ (§12.4), son yedeğin görünmesi (§10.8), görünen kısayollar (§12.2), palette nereden bulunduğu (§5.8), andıkları ve ananlar (§3.2), tür renkleri ve okunurluk denetimi (§12.1), notun türü ve durumu (§4.6), yeni evrende tür seçimi (§4), boş sahnede başlama yardımı ve ileri araçların bir kez tanıtılması (§5.10), önce üç soru (§6), örnek evren (§5.10). Kararı bekleyen maddeler K29'da karara bağlandı; sonraya bırakılanlar (okur çıktısı, Word'den içe aktarma) tasarıma girmedi. Ekranı değiştiren her maddeden önce resimli taslak gösterilir. | 20 Ekim |
| K29 | **Kullanım kolaylığı paketinin ikinci kısmı.** Kullanıcı kararı bekleyen maddelerden şunları seçti: silmede onay sorusu yerine **"Geri al" şeridi** (§10.8), **`@` ile bağlantı** (§5.1), **alıntı** kayıt türü (§4.6), hazır türlere **soru setleri** (Ek A), **soy ağacında kişiler arası bağlar** (§7), **bağlantısız geçen adlar için öneri** (§5.1; K1 ile uyumu aşağıda) ve "Eksik kayıtlar" sayfasının adının **"Henüz yazılmayanlar"** olması (§5.10). **Yazma hedefi ve haftalık yazı/dünya kurma dengesi satırı alınmadı.** Bağlantısız ad önerisi K1'e aykırı sayılmaz: metinden anlam çıkarmaz, yalnız kayıt adlarının (ekli biçimleriyle) birebir geçtiği yeri gösterir; kendiliğinden bağlamaz, her bağlantıyı yazar kurar. | 20 Ekim |
| K30 | **Dört ekranın yeni düzeni (arayüz taslakları).** Kullanıcı resimli taslaklardaki önerilerin hepsini seçti: yazma ekranında **sessiz sayfa ve sekmeli bağlam** (tek ince üst satır, seyrek işler menüde, bağlam paneli okunacak bir özet kartı ve sekmeler; §5.10), ağda **odak halkası** ve yanında **bağ tablosu** (§7), zaman çizelgesinde **şeritler, çağlar ve kırık eksen**, dar ekranda **tarih defteri** (§7), haritada **tam ekran tuval, atlas lejantı ve yer kartı** (§8.1). Yeni karar isteyen seçenekler (kenar notları, ağ ile soy ağacının birleşmesi, okuma sırası × evren zamanı grafiği) alınmadı. Çizimlerin ortak ilkeleri §12.1'dedir. Yeni veri yoktur; yalnız görünüştür. | 20 Ekim |
| K31 | **Bu bilgisayarda günlük yedek ve hatırlanan Google bağlantısı.** Kullanıcı önerilen iki korumayı da seçti: Windows uygulaması her gün her evrenin tam yedeğini bu bilgisayarın Belgeler klasöründeki "Dünya Atlası yedekleri" klasörüne de alır; internet ve Google gerekmez (§10.10). Google bağlantısı Windows'un parola kasasında saklanır ve program açılınca dokunmadan yenilenir (TK3). Yedek sekmesindeki görünüşü resimli taslaktan seçilir. | 21 Ekim |
| K32 | **Kısa ve yumuşak geçişler.** Kullanıcı menülere, panellere ve sayfa değişimlerine geçiş istedi (22 Ekim): pencereler, menüler, katlanan bölümler ve kenardan gelen paneller 150–180 milisaniyede hafifçe kayarak ve solarak açılır; sayfa değişiminde yeni sayfa hafifçe belirir. Zıplama ve uzun geçiş yoktur. Cihazda "animasyonları azalt" ayarı açıksa hiçbir geçiş oynamaz (§12.1). | 22 Ekim |

### 1.2 Açık kararlar

Her satırda tasarımın önerisi yazılıdır. Kullanıcı karar verene kadar öneri kesinleşmiş sayılmaz; ilgili bölümler öneriye göre yazılmıştır ve kararla birlikte güncellenir. Karara dönüşen satırlar buradan çıkar ve numaraları yeniden kullanılmaz: A1 → K15, A2 → K21.

| # | Soru | Öneri | Etkilediği yer |
|---|---|---|---|
| A3 | Wiki hiç olacak mı; olursa nerede ve kimin için? | Şimdilik yok (K20). Olursa yazar uygulamasından **ayrı bir kökende** yayımlanan bir sitedir; okurları kullanıcı seçer | §11 |
| A4 | Yazar sayfası gerekli mi? | Ayrı modül yerine wiki kapağında isteğe bağlı "Hakkında / Önsöz" alanı | §11 |
| A5 | Harita çizimi: yalnızca yüklenen görseller mi, çizim aracı da mı? | Önce yükleme ve işaretleme; bölge çizimi aşama 3'te; serbest çizim için F46 değerlendirilir | §8 |
| A6 | Claude'daki prototipin akıbeti | Program hazır olana kadar karalama defteri; içe aktarımı aşama 1'dedir (§14); aktarım yazılırken sınanır, şimdiden kayıpsız sayılmaz | §14 |
| A7 | Hesap sonucu evrene ne zaman yazılır? | Hesap kendi görünümünde yenilenir; evrene yalnızca yazarın seçtiği sonuç, olay ya da karar olarak girer | §2.2 kural 1 |
| A8 | Hangi alanlar varsayılan olarak "eksiksiz" sayılır? | Hiçbiri; kullanıcı belirli bir liste, zaman ve kapsam için söyler | §18 Eksiksizlik |
| A9 | Doğal fizik modelleri (gökyüzü, gelgit, ses) | İsteğe bağlı paketler; fantastik kurallar kendi kapsamlarıyla | §15 |
| A10 | Okur görünümü hangi eser ve baskıya ait? | Her yayının açık sürümü ve okuma kapsamı olur | §11 |
| A11 | Bütün araçların ortak davranışı hangi fikirler olsun? | F01, F02, F03, F05, F14 | §16 |
| A12 | Hesap araçlarının sırası | Göreli kronoloji ve süreklilik aşama 3; rota, haber, soy/veraset, kurgu montajı aşama 4; dil tarihi, üretim, hukuk, gökyüzü, sahne yerleşimi aşama 4–5 | §14, §15 |
| A13 | Kalan önerilerden (F36, F38, F39, F41–F47) hangileri tasarıma alınsın? | Önce F47 (çalışma devri); diğerleri yalnızca K11'e uyan somut bir takılma gelince | §16 |

### 1.3 Teknik açık kararlar

Kodlamadan önce kapanması gereken teknik kararlardır. Numaraları §13'teki T senaryolarıyla karışmasın diye TK ile başlar. Her biri bir deneyle (K17) ya da kullanıcı kararıyla kapanır; tasarım bunlar kapanmadan bitmiş sayılmaz.

| # | Soru | Öneri | Nasıl kapanır | Etkilediği yer |
|---|---|---|---|---|
| TK1 | Yerel veritabanı | **Karar verildi (18 Ekim, Windows deneyi):** tarayıcıda SQLite (WASM), tarayıcının özel dosya alanında, "SAH havuzu" biçimiyle. Özel sunucu başlığı gerektirmez. Veritabanını aynı anda yalnızca bir sekme açar; bu, §10.5'teki tek yazıcı kuralıyla uyumludur. IndexedDB yalnızca özel dosya alanı olmayan bir cihaz için yedek kalır | Karar verildi. Ölçüm (25.000 kayıt, 3.000 sahne): açılış 0,2 sn, tüm sahnelerde arama 17–100 ms, sahne kaydı 13 ms, 162 MB. Ayrıntı: `deneyler/tk1-veritabani/SONUC.md` | §10.1 |
| TK2 | Uzun metin için metin CRDT kütüphanesi | **Karar verildi (18 Ekim, Windows deneyi): Automerge.** Değişiklik geçmişi ve işaretin sınır davranışı kütüphanede hazır. Tuşlar otomatik kaydetme aralığında gruplanıp tek değişiklik olarak kaydedilir. İşaretli metnin tamamı değişirse işaret kalkar; uygulama bunu inceleme listesine düşürür. Paragraf bölme ve birleştirme aşama 1a'da sınanır. Yjs yedek kalır (tablette boyut ya da hız sorun çıkarırsa) | Karar verildi. İki profilde eşzamanlı düzenleme: yazım kaybı yok, işaretler yerinde, ortak başlangıç ile A ve B sürümleri okunabiliyor. Ayrıntı: `deneyler/tk2-metin/SONUC.md` | §10.3, §5.7 |
| TK3 | Google oturum modeli | **Windows kısmı için karar verildi (18 Ekim):** tarayıcıda 1 saatlik erişim izni, sunucu yok. Açılışta ve izin dolunca tarayıcı dokunmadan Google penceresi açtırmaz; "eşitlemek için dokun" şeridi tek dokunuşla yeniler. Hesap e-postası yalnızca cihazda saklanır ve yenilemede Google'a ipucu olarak verilir; böylece birden çok hesap açıkken bile hesap seçimi ve izin sorulmaz. İzin yokken yazma sürer, değişiklikler bekler | Windows'ta karar verildi (yenileme yaklaşık 4,4 sn). Windows uygulamasında izin bilgisayarın tarayıcısında verilir (kullanıcı kararı, 21 Ekim 2026; Google, izin sayfasının programın kendi penceresinde açılmasını yasaklar): kabuk tarayıcıyı açar, yanıtı bu bilgisayardaki geçici yerel adresten alır; sonra izin tarayıcı açılmadan yenilenir. Yenileme anahtarı Windows'un parola kasasında (Kimlik Bilgisi Yöneticisi) saklanır; program açılınca, bağlantı düşünce ve izin bitmeden önce dokunmadan yenilenir (K31). Google anahtarı artık tanımazsa (Google projesi "deneme" durumundayken haftada bir) anahtar silinir ve şerit "eşitlemek için dokun" der; internet yoksa anahtar saklı kalır. "Bağlantıyı kes" anahtarı Google'da geri alır ve kasadan siler. Bunun için Google projesinde "Masaüstü uygulaması" istemcisi gerekir; istemci derlemeye konmamışsa uygulama yerel adresinde eski modelle çalışır (bu adres Google projesinde izinli adreslere eklenir, §17.4). Tablet (APK) kısmı açık: Google, uygulama içi pencerede girişe izin vermeyebilir. Ayrıntı: `deneyler/tk3-tk4-google/SONUC.md` | §10.8 |
| TK4 | Drive izin kapsamı ve klasörler | **Karar verildi (18 Ekim, Windows deneyi):** eşitleme gizli uygulama klasöründe (`drive.appdata`); yedekler kullanıcının görebildiği bir klasörde (`drive.file`). Uygulama yalnızca kendi oluşturduğu dosyaları görür. Dosyalar aynı anda birden çok gönderilip alınır (tek dosya yaklaşık 1,4 sn). Google'ın dosya seçicisi ilk sürümde yok; yalnızca elle taşınmış bir yedeği açmak için ileride eklenir | Karar verildi. 20 deneme dosyası yazıldı, geri okundu ve değişiklik listesinden bulundu; Drive'da yalnızca yedek görünüyor. Ayrıntı: `deneyler/tk3-tk4-google/SONUC.md` | §10.2, §10.10, §10.11 |
| TK5 | Medya saklama | **Karar verildi (18 Ekim, Windows deneyi):** içerikle adlandırılmış değişmez dosyalar; parça parça ve kaldığı yerden sürdürülebilen yükleme; cihaz başına indirme politikası, telefon için küçük önizleme. Yedekte her görsel bir kez saklanır. Konum bilgisi silinir. Büyük görsellerin gidip gelmesi arka planda yürür ve "indirilmemiş" durumu ekranda görünür (§10.8) | Karar verildi. 26 MB harita: yükleme 26 sn, yarıda kopunca 16 MB'tan sürdü; indirme 20 sn; önizleme 0,5 MB; günlük yedek başına 195 KB. Ayrıntı: `deneyler/tk3-tk4-google/SONUC.md` | §10.12 |
| TK6 | Uygulama kabuğu | **Karar verildi (19 Ekim, kullanıcı kararı): Tauri 2.** Aynı web kodu Windows'ta kendi penceresinde, Windows'un yerleşik tarayıcı motoruyla (WebView2) çalışır; kurulum dosyası GitHub'da derlenir. Tablet için aynı kabuktan APK | Windows'ta karar verildi. APK kısmı tablet aşamasında. Ayrıntı: proje klasöründe `analiz/uygulama-paketleme.md` | §17.1 |
| TK7 | Yayın mekanizması | Wiki yapılırsa uygulama paketi zip olarak üretir; yükleme ayrı ve bilinçli bir adımdır | K20 değişirse | §11 |
| TK8 | Kural ve formül dili (F16) | **Karar verildi (19 Ekim, kullanıcı onayı):** formül hukuk kuralının "kimlere" kısmını yazar; ilişkiler, şablon alanları, tarih ve birimli sayılar kullanılabilir; sonuç üç değerlidir; hatalı formül kaydedilmez | Karar verildi. Sözleşme §18.1 "Kural ve formül dili" | §18.1, §16.1 F16 |

---

## 2. İlkeler ve ortak kurallar

### 2.1 Temel ilkeler

- **Tek kaynak:** Bir bilgi tek yerde tutulur, her ekranda o kaynaktan gösterilir. Bir ebeveyn ilişkisi karakter sayfasında, soy ağacında ve ağ görünümünde aynı ilişki kaydından gelir.
- **Değişmeyen kod:** Her kaydın adından bağımsız, hiç değişmeyen bir kodu vardır. Ad, tür ya da konum değişse de bağlantılar kopmaz.
- **Serbest yazı önce, yapı sonra:** Karakter geçmişi bir paragraf olarak yazılabilir; istenen parçası sonradan bir olaya ya da davranışa bağlanır (§5.7).
- **Bahsetmek ilişki kurmak değildir:** Metinde bir adın geçmesi dostluk, üyelik ya da sahnede bulunma anlamına gelmez. Bu anlamları kullanıcı açıkça kurar.
- **Belirsizlik birinci sınıf veridir:** "Yaklaşık 300 yıl önce", "yeri bilinmiyor", "henüz karar verilmedi" sahte kesinlik istenmeden kaydedilir.
- **Gerçek ile inanç ayrıdır:** Evrenin gerçeği, halkın inandığı, bir karakterin bildiği ve okura açıklanan bilgi ayrı katmanlardır (§3.6).
- **Her işlem geri alınabilir:** Silme, birleştirme, şablon değiştirme ve toplu düzenleme önizlemeyle yapılır ve bir bütün olarak geri alınır (§10.4, §10.8).
- **Sade çalışma alanı:** Bütün araçlar aynı anda görünmez; ekran o anki çalışma türüne göre sadeleşir (§5.10).
- **Az veriyle başlanır:** Her özellik, işe yarayabileceği en az veriyle çalışır; ayrıntı eklendikçe derinleşir. Bir aracı açmak evrenin tamamını doldurmayı gerektirmez (§18.2).

### 2.2 Hesap ve kayıt için ortak kurallar

Bütün araçlar, denetimler ve görünümler bu kurallara uyar.

1. **Kaydedilmiş bilgi ile hesaplanan sonuç ayrıdır.** Hesap kendi görünümünde yenilenir. Bir sonucu evrene olay ya da karar olarak eklemek ayrı bir kullanıcı işlemidir. Sabitlenmiş bir karar, parametresi değişti diye sessizce silinmez; dayanağının değiştiği gösterilir.
2. **Deterministik olmak doğru olmak değildir.** Her sonuç üç türden biridir: *bu kurallara göre zorunlu sonuç · bu varsayımlarla tahmin · yazarın kararı*.
3. **"Bunu nereden biliyoruz?"** Her türetilmiş değer tıklanınca dayanağını gösterir: elle girilmiş mi, bir olaydan mı türedi, varsayılan mı, hesap mı, hangi varsayımla (F01).
4. **Bilinmiyor ile yok aynı değildir.** Boş alan "üye değil" anlamına gelmez. Yokluk çıkarımı yalnızca kullanıcının belirli bir kapsam için "bu liste eksiksiz" dediği yerde yapılır. Sorgularda bu kural §18'deki sorgu sözleşmesiyle uygulanır.
5. **İddia ile gerçek ayrıdır.** Güvenilir görünen bir belge de yanlış olabilir. Çelişen iddialar otomatik birleştirilmez.
6. **Evren olayı ile anlatım ayrıdır.** Aynı düello iki bakış açısından anlatılırsa yaralanma bir kez uygulanır. Sahnenin silinmesi olayı kanondan çıkarmaz.
7. **Yapılabilmesi yapıldığı anlamına gelmez.** Haberin ulaşabilmesi, karakterin bildiği anlamına gelmez. Rota, yetki, büyü ve haberleşme için aynı ayrım geçerlidir.
8. **Zaman bağı ile neden bağı ayrıdır.** Aynı gün olan iki olay kendiliğinden neden–sonuç oluşturmaz.
9. **Kod, ad ve rol ayrıdır.** Ad değişince bağlantı bozulmaz; aynı ad farklı kayıtları birleştirmez.
10. **Modelin kapsamı görünür.** Eksik veriyle tam bilgi varmış gibi sonuç verilmez. Denetim hangi eksik bilgi yüzünden durduğunu söyler.
11. **Yayın ayrı bir kapsamdır.** Bakış açısı seçmek yayın izni vermez. Yayımlanmış sürüm, dayandığı veri ve kural sürümüyle saklanır (§11).
12. **Uyarı yazarlık yasası değildir.** "15 sahnedir anılmadı" bir bilgidir, "unutuldu" yargısı değildir. Uyarının önemi yazarın tanımladığı hedefe bağlıdır. Yazarın kaydettiği olay, bir modelle çelişiyor diye silinmez ya da engellenmez; çelişki gösterilir ve açıklama yazara bırakılır.
13. **Model içinde bulunamamak, evrende imkânsız olmak değildir.** Bir arama ya da çözücü üç sonuçtan birini verir: *tanımlı model içinde çözüm bulundu · aranan kayıtlı seçeneklerde çözüm bulunamadı · eksiksiz ilan edilmiş model ve desteklenen kısıtlar içinde çelişki kanıtlandı*. Hesap bitmediyse bu ayrı bir durumdur ("hesaplanıyor"). Kayıtlı olmayan bir olanağın var olamayacağı ilan edilmez; gerekirse "bu sonuç için henüz tanımlanmamış bir olanak ya da koşul değişikliği gerekir" denir.
14. **Ayrı ayrı mümkün olan sonuçlar birlikte mümkün olmayabilir.** Her sonuç, hangi varsayımlar altında hesaplandığını taşır (§3.11). Farklı varsayımlarla bulunmuş sonuçlar aynı sahnede birlikte kullanılınca bu görünür olur; program onları tek bir tutarlı senaryo gibi sunmaz. Tarih aralıkları da yalnızca özettir: aralarındaki kısıtlar korunur, her tarih çifti kendiliğinden geçerli sayılmaz.
15. **Gizli seçim yoktur.** Bir alanın iki çözülmemiş değeri varsa (eşitleme çatışması, çelişen kaynaklar, çoklu varsayılan), hesap bunlardan birini görünmez biçimde seçmez; sonucu koşullu ya da belirsiz verir ve hangi değeri kullandığını söyler. "Son eklenen kazanır" gibi gizli kurallar yoktur.
16. **Sahte kesinlik üretilmez.** "Yaklaşık iki günlük yiyecek"ten "47 saat 18 dakika" çıkmaz. Aralığın ortası beklenen değer sayılmaz; belirsizlik olasılık yüzdesine ancak tanımlı bir olasılık modeli varsa çevrilir.

### 2.3 Sonuç zarfı

Bu, bir hesap, arama ya da denetim sonucunun nasıl anlatıldığının tek tanımıdır. Her sonuç beş bilgiyi birlikte taşır; araçlar ayrı sözlük kullanmaz.

| Bilgi | Değerler |
|---|---|
| **Sonucun türü** (§2.2 kural 2) | bu kurallara göre zorunlu sonuç · bu varsayımlarla tahmin · yazarın kararı |
| **Hüküm** | Denetimde: *açık çelişki · olası uyuşmazlık · sorun yok · bu kurala konu değil · denetlenemiyor* (hangi verinin eksik olduğu söylenir). Arama ve çözücüde (§2.2 kural 13): *çözüm bulundu · kayıtlı seçeneklerde bulunamadı · eksiksiz model ve desteklenen kısıtlar içinde çelişki kanıtlandı*. |
| **Güncellik** | *henüz çalıştırılmadı · hesaplanıyor · önceki sonuç* (dayandığı veri ya da kural değişti) *· güncel* |
| **Kapsam** | Hangi kurallar, hangi kayıtlar, hangi zaman ve dal için geçerli olduğu. "Sorun yok" yalnızca bu kapsam için geçerlidir. |
| **Dayanak ve varsayımlar** | Hangi kayıtlara, kural sürümüne, varsayım paketine (§3.11) ve yokluk varsayımına dayandığı (F01). |

Hüküm ile güncellik ayrı eksenlerdir: "önceki sonuç, olası uyuşmazlık" bir arada bulunabilir. Boş bir uyarı paneli "her şey doğrulandı" anlamına gelmez.

---

## 3. Kavram modeli

### 3.1 Kayıt, tür, bileşen ve çalışma sayfası

- **Kayıt:** kimlik, ad, eski adlar ve lakaplar, kısa özet, serbest metin, etiketler, görseller, karar durumu, oluşturulma ve düzenlenme bilgisi.
- **Tür:** kaydın ana niteliği (karakter, mekân, siyasi varlık, topluluk…). Tür değiştirilebilir; bağlantılar korunur. Yeni şablona uymayan alanlar silinmez, **"Eski türden aktarılan alanlar"** başlığı altında kalır.
- **Bileşen:** bir kayda eklenebilen modüler alan paketi (duyusal detaylar, Korur / İster / Korkar, kat planı, yaşam süresi…). Bir tür, varsayılan bileşenlerin listesidir; kullanıcı başka bileşen de ekler.
- **Ayrı kayıt mı, bileşen mi?** Ölçüt: *"Biri değiştiğinde ya da ortadan kalktığında diğeri bağımsız devam edebiliyor mu?"* Tapınak binası, rahip topluluğu ve inanç üç ayrı kayıttır ve ilişkiyle bağlanır; bina yıkılsa da inanç yaşar. Bileşenler yalnızca aynı varlığın farklı yönlerini taşır.
- **Birleşik çalışma sayfası:** Birden çok kayıt tek bir sayfada kartlar olarak birlikte düzenlenebilir ("Güneş Tapınağı" sayfasında bina, tarikat ve inanç). Sayfa bir çalışma düzenidir, yeni bir varlık değildir. Üyeleri rol ve zamanla tanımlanır; bir kayıt birden çok sayfada yer alabilir.
- **Bağlantı hedefi sessizce seçilmez.** Yapılandırılmış bir alan (sahnenin mekânı, karakterin dini) yalnızca uygun türdeki adayları daraltır. Tek aday varsa görünür biçimde önerilir; birden çoksa yazar seçer ya da bağlantıyı bilerek "genel sayfa" bırakır. Genel bağlantı yalnızca sayfaya götürür, "bu binada bulundu" gibi bir evren iddiası üretmez. Seçicide "Bina / Örgüt / İnanç / Genel sayfa" seçenekleri görünür; yeni sözdizimi ezberletilmez. Sayfaya sonradan üye eklenince eski bağlantıların hedefi değişmez.
- **Sonradan ayırma:** Tek kayda yazılmış bir bileşen "ayrı kayda ayır" ile yeni kayda taşınır. Açıkça o bileşene bağlı ilişkiler taşınır; hedefi belirsiz ilişkiler ("Tapınağa borçlu": binaya mı, rahiplere mi?) önizlemede kullanıcıya sorulur.
- **Tür tanımı ile tekil örnek:** "Gümüş ejderhalar" ile "Avar adlı ejderha" ayrı kayıtlardır. Tekil örnek tür tanımından ortak özellikleri gösterir, kendi istisnalarını ayrıca tutar. Bu, varsayılan değerlerin eksenlerinden biridir (§3.7).

### 3.2 Bağlantı, ilişki ve katılım rolü

| Kavram | Nasıl oluşur | Anlamı |
|---|---|---|
| **Bağlantı** | Metne `[[Ad]]` yazmak | "Bu metin şu kayıttan bahsediyor." Başka bir anlam taşımaz. Kayıt sayfasında iki yönde ayrı görünür (K28): kaydın kendi metninde bağlantı verdikleri **andıkları**, başka metinlerden bu kayda verilen bağlantılar **ananlar** (geri-atıf). İlişkiler bunlardan ayrı kalır. |
| **İlişki** | Kullanıcı açıkça kurar | İki kayıt arasında tipli, yönlü ve zamana bağlı bağ (ebeveyn, üye, düşman, sahibi…). |
| **Katılım rolü** | Sahne ya da olaya kayıt eklerken seçilir | Kaydın o sahne ya da olaydaki rolü. |

**İlişki türünün dört özelliği:** *yön* (A→B), *ters yönden okunuş* ("A, B'ye borçlu" ↔ "B, A'dan alacaklı"), *karşılıklılık kuralı* (karşılığı kendiliğinden oluşur mu) ve *çokluk kuralı* (bir kişinin kaç eşi olabilir). Çokluk, ilişki türünün sabit bir özelliği değildir: kültüre, zamana ya da kuruma göre değişebileceği için kapsamlı bir kural olarak tanımlanır (§9.1); aşıldığında engellemez, uyarı verir. Örnekler: karşılıklı (eş, kardeş, müttefik); farklı adlı karşılık (ebeveyn ↔ çocuk, usta ↔ çırak); karşılığı kendiliğinden oluşmayan (güvenir, nefret eder). Miktar, vade, kefil gibi ayrıntı gerekince ilişki kendi kodu olan bir kayda dönüşür.

**İlişkinin zamanı ve geçmişi:** başlangıç, bitiş ve dönüm noktaları (ilk karşılaşma, güven kazanma, kırılma, ihanet, barışma). İlişki kaydı ayrıca **ortak geçmiş**, **A'nın beklentisi**, **B'nin beklentisi**, **gerilim noktası**, **söylenmeyenler** ve **açık mesele** tutabilir.

**Katılım rolleri:**
- Sahnede: *bulunuyor · adı anılıyor · hatırlanıyor · hakkında haber alınıyor*.
- Olayda: *başlatan · emri veren · katılan · tanık · zarar gören · sonradan öğrenen*.
- Zaman ve konum denetimleri yalnızca **fiziksel olarak bulunan** kayıtları değerlendirir. Ölmüş bir kraldan sonraki sahnede söz edilmesi hata değildir; ölünün bedeninin cenazede bulunması canlı katılım sayılmaz.
- Bir kişinin sahnede bulunması bir kayıttır; envanterinin ya da durumunun değişmesi ayrı bir olay etkisidir.

### 3.3 Eser, bölüm, sahne ve olay

| Kavram | Anlamı | Örnek |
|---|---|---|
| **Seri** | Birden çok eseri önerilen okuma sırasıyla toplayan, isteğe bağlı kayıt (K27) | *Kuzey Seferleri* üçlemesi |
| **Eser** | Aynı evrende geçen roman, öykü ya da taslak | *Kuzey Seferi* |
| **Bölüm** | Sahnelerin eser içindeki sırası (sunum bilgisi) | 8. bölüm |
| **Sahne** | Anlatı parçası; varsayılan evren tarihi, mekânı ve bakış açısı vardır | Kuşatmanın bir askerin gözünden anlatılması |
| **Olay** | Evrende gerçekleşen şey | Kalenin 412'de düşmesi |
| **Düzenleme geçmişi** | Yazarın yaptığı değişiklikler | Sahnenin bugün 5. bölüme taşınması |

- Bir evrende birden çok eser olabilir. Evren kayıtları ortaktır; her eserin kendi bölümleri, sahneleri ve açık meseleleri vardır.
- **Seri (K27):** eserler isteğe bağlı olarak bir serinin altına yerleşir (anlatı ağacında seri › eser › bölüm › sahne). Seri içindeki sıra **önerilen okuma sırasıdır**; evren kronolojisi ya da yayın sırası değildir ve onları değiştirmez. Bir eserin ağaçta en çok bir serisi vardır (**ana serisi**); yan seri ya da antoloji gibi başka serilere *ek kitap* bağıyla (seri → eser) de katılabilir, bu ana serisini değiştirmez. **Okuma yolları:** seriye adlandırılmış başka sıralar yazılabilir (yayın sırası, olayların sırası…); yalnız serinin kitaplarını alır, silinen kitap yoldan düşer. Okuma yolu tarihleri, okur modelini ve önerilen okuma sırasını değiştirmez; kitap sonunda açık kalanlar istenirse bir yola göre gösterilir. **Olası finaller:** her olası final ayrı bir olaydır (fikir durumunda başlar), seriye *olası final* bağıyla, vazgeçilmemiş öbür finallere *alternatif* bağıyla bağlanır (§3.6). Eseri seriye koymak, taşımak ya da seriden çıkarmak eserin içindekileri, okur modelini ve tarihleri değiştirmez. **Seriyi silmek** eserlerin yerine dokunmaz: serisi silinmiş eser serisiz görünür; seri çöp kutusundan geri gelince eserler yeniden altına döner, arada başka yere taşınmış eser yeni yerinde kalır. Serinin soruları büyük soruyu, merkez çatışmayı ve büyük planı sorar (Ek A).
- Bağlantılar bölüm numarasına değil, sahne ve olay kodlarına dayanır.
- **Sahne olayı (K14):** Her sahne, ilk ihtiyaç anında kendiliğinden oluşan bir **sahne olayı** taşır: yazar süreklilik defterine (§5.6) bir değişim yazdığında ya da bir katılımcıya olay etkisi verdiğinde. Sahne olayı görünürdür; sahnenin panelinde adıyla ("Sahne: Kuşatmanın ilk gecesi") listelenir, tarihi, yeri ve zaman akışı sahneden gelir. Aynı olay ikinci bir sahnede de anlatılırsa (Z10) yazar iki sahneyi tek olaya bağlar; değişimler o zaman bir kez uygulanır. Yazar sahne olayını istediği an adlandırılmış bir evren olayına dönüştürebilir ya da başka bir olayla birleştirebilir. Sahne olayı gizli bir zaman çapası değildir (§3.5); dayanağı her zaman görünür.
- **Sahne başka bölüme taşınınca:** evren tarihi değişmez. Değişebilecek olanlar okura sunulan sıraya bağlı şeylerdir: okurun bir bilgiyi öğrenme sırası, adların ve kavramların ilk tanıtıldığı yer, önceki tanıtıma dayanan göndermeler ve yazarın işaretlediği hazırlık–karşılık bağları. Taşımadan sonra bunları listeleyen kısa bir **anlatı etki özeti** çıkar; özet yalnızca açık işaretlere dayanır.
- "Okur bunu biliyor mu?" sorusu **eser ve okuma sırası** belirtilerek cevaplanır (okur modeli: §3.6). Birinci kitapta açıklanan sır, aynı evrendeki başka kitabı ilk okuyan için hâlâ sır olabilir.
- **Sahne içinde bağlam parçaları:** Bir paragraf (geçmişe dönüş, okunan mektup, öbür cephe) kendi tarihini, yerini ve bakış açısını alabilir. Yan panel imlecin bulunduğu parçanın bağlamını gösterir. Bağlam boş da bırakılabilir. **Anlatıcı** ile **odak karakter** ayrıdır. Yazar veri modeline uysun diye sahneyi bölmek zorunda kalmaz.
- **Metin ile kullanım yeri ayrıdır:** Bir efsane metni romanda, yan kitapta ve wikide kullanılabilir. Kaynak metin, kullanım örneği ve baskıya sabitlenmiş kopya ayrıdır. Taşımak, kopyalamak, ortak kaynağa bağlamak ve bağımsız türev oluşturmak ayrı işlemlerdir.

### 3.4 Evren zamanı ve takvim

Bu, zaman modelinin tek tanımıdır (K12).

**Tarih biçimleri:** *kesin* (Yıl 412, Hasat'ın 12. günü, öğle nöbeti) · *yaklaşık* (yaklaşık 300 yıl önce) · *aralık* (410–415) · *göreli* (X olayından önce/sonra) · *çapalı* (X olayından +14 gün; X'in tarihi değişince kayar) · *bilinmiyor*. Göreli tarihlerin sayıya çevrilmesi gerekmez. Zaman çizelgesi belirsiz tarihleri aralık bandı ya da göreli sıra olarak gösterir ve kesin tarihlerden görsel olarak ayırır.

**Hassasiyet:** çağ, yıl, mevsim, ay, gün ya da gün bölümü. Gün bölümleri takvimin parçasıdır: her takvim günü kendi bölümlerine ayırır (sabah, öğle, akşam; nöbetler; çanlar). Saat zorunlu değildir. Hassasiyet korunur; gün düzeyinde girilmiş bir tarih "öğlen" sayılmaz (§2.2 kural 16).

**Saklama:** Her tarih iki biçimde saklanır.
1. *Girildiği gibi:* takvim, takvim sürümü, hassasiyet ve yazarın ifadesi. Görünüm her zaman bundan üretilir.
2. *Kanonik eksende:* evrenin ana zaman akışındaki tek bir gün ve gün bölümü sayacı üzerinde [en erken, en geç] aralığı. Sıralama, karşılaştırma, çözücü ve denetimler bu eksende çalışır.

Kanonik eksene eşlenemeyen tarih (takvim eşlemesi bilinmiyor, "üçüncü hükümdarın yedinci kışı") sembolik kalır ve yalnızca göreli kısıtlarla sıralanır.

**Karşılaştırma üç değerlidir:** İki tarihin karşılaştırması *önce · sonra · belirsiz* sonucunu verir; aralıklar örtüşüyorsa sonuç belirsizdir. Yan panel, sahne bağlam paneli ve durum geçmişi (§3.5) bu karşılaştırmayı kullanır; belirsiz durumda iki olası hâl de gösterilir.

**Takvim:** Her evren bir ya da birden çok takvim tanımlar: yıl uzunluğu, mevsimler, aylar (ad ve gün sayısıyla), hafta, gün bölümleri, bayramlar ve özel günler. Bir takvim bir mekâna, kültüre ya da kuruma bağlanabilir; bir boyutun ya da gezegenin kendi takvimi olabilir (K22). Aynı olay paralel tarihlerle gösterilir. Çağlar ve negatif yıllar ("Kuruluş öncesi") desteklenir.

**Takvim değişikliği bir şema değişikliğidir.** Bir aya gün eklemek, ay eklemek ya da gün bölümlerini değiştirmek takvim sürümünü artırır. Program etkiyi uygulamadan önce gösterir: hangi tarihlerin görünen ifadesi korunup ekseninin kayacağı, hangilerinin ekseni korunup ifadesinin değişeceği ve çapalı tarihlerin ("olaydan 30 gün sonra") nasıl davranacağı. Varsayılan: girildiği ifade korunur, kanonik yer yeniden hesaplanır; yazar alan ya da olay bazında tersini seçebilir. Değişiklik bir işlem grubudur (§10.4) ve eşitlemede şema değişikliği olarak ele alınır (§10.3).

**Zaman akışları:** Zaman akışı, zamanın kendine özgü bir hızla aktığı kapsamdır: Fey Boyutu, bir rüya alemi, bir lanetin içi. Her olay ve sahne bir akışa aittir; varsayılan akış evrenin ana akışıdır.
- Akış bir mekâna (ya da başka bir kapsama) ve ana akışa bir **oranla** bağlanır. Oranın yönü yazıyla belirtilir ("Fey'de geçen 10 gün dışarıda 1 gün"); oran zamanla değişiyorsa geçiş tarihleri girilir; oran bilinmiyorsa yalnızca önce–sonra ilişkisi tutulur.
- Bir akıştaki tarih ana eksene bu oranla çevrilir; oran bir aralıksa sonuç da aralıktır.
- Akışlar arasında geçen kişinin takvim yaşı ile yaşadığı süre ayrı tutulur (aşağıda Yaş).
- Kişisel kronoloji ve zaman yolculuğu (F45, Öneri) tasarıma alınırsa aynı mekanizmanın bir kişiye uygulanmış hâli olarak tanımlanır.

- **Dönüşüm her zaman tek tarih vermez.** Takvimler arası eşleme eksikse ya da kayıt "üçüncü hükümdarın yedinci kışı" diyorsa sonuç aralık, birkaç olasılık ya da "eşlenemiyor" olur. Kesin dönüşüm uydurulmaz.
- **Göreli ifadenin dayanağı sabittir.** "300 yıl önce" hangi olaya, sahneye ya da tarihli anlatıma göre söylendiyse ona bağlanır; uygulamanın bugününe göre kaymaz.
- **Mevsimin etkileri:** Bir mevsime toplumsal etkiler bağlanabilir: savaş mevsimi, hasat, denizin kapandığı aylar. Bu etkiler rota sürelerinde ve üretim hesaplarında kullanılabilir (§15).
- **Yaş:** Doğum tarihi biliniyorsa karakterin her olaydaki yaşı hesaplanır ve hangi evren tarihine bakıldığı yazılır. Doğum tarihinin çözülmemiş iki değeri varsa yaş koşullu gösterilir (§2.2 kural 15). Farklı zaman akışlarında bulunmuş bir kişide takvim yaşı ile yaşadığı süre ayrı gösterilir.

### 3.5 Durum geçmişi

Kalenin sahibi, unvan, ikamet, üyelik ve ilişkiler zamanla değişir. Bu alanlar **geçerlilik aralığıyla** saklanır:

```
Unvan: [ Çırak (412 – 418), Lonca Ustası (418 – …) ]
Sahibi (Kuzey Kalesi): [ Aldren Krallığı (… – 430), Varos (430 – …) ]
```

- Aralıklar **evren zamanına** bağlanır, bölüm numarasına bağlanmaz. Yan panel bir sahne açıkken kaydı o sahnenin evren tarihindeki durumuyla gösterir; sahnenin tarihi girilmemişse bunu söyler; sahnenin tarihi ile aralık sınırının karşılaştırması belirsizse iki olası durumu da gösterir (§3.4).
- **Aralığın sınırı** kesin tarih, yaklaşık tarih, aralık, bir olaya göre fark ya da yalnızca önce–sonra olabilir. Sınır bir olaya bağlanırsa olayın tarihi değişince kendiliğinden kayar ("Kuzey Valisi: Velkar Kuşatması'ndan → İsyan'a kadar"). Olaya bağlamak zorunlu değildir. Program gizli "zaman çapası" olayları oluşturmaz; dayanak her zaman görünür. Sahne olayı (§3.3) görünür olduğu için bu kurala uyar.
- **Neden ile aynı tarih ayrıdır:** "Kuşatma yüzünden el değiştirdi" ile "aynı yıl el değiştirdi" farklı kayıtlardır.
- **Evrendeki değişim ile düzenleme ayrıdır:** Kalenin 430'da el değiştirmesi evren olayıdır; yanlış girilmiş bir tarihi bugün düzeltmek değildir.
- **Dört zaman ayrılır:** olayın evren tarihi, bir kişinin onu öğrenme tarihi, okura sunulma sırası (eser ve baskıya göre) ve yazarın düzenleme tarihi.
- **Gözlem ile süren durum ayrıdır.** "420'de sarayda görüldü" tek bir anın gözlemidir; kişinin sonraki yıllarda sarayda yaşadığı anlamına gelmez. "420'den sonraki değişikliğe kadar ikametgâhı saray" ise süren durumdur. Her kayıt hangisi olduğunu taşır (anlık · aralık · sonraki değişikliğe kadar). Alanlar kendiliğinden ileri taşınmaz; ileri taşınan alanlar şablonda açıkça işaretlenir.

### 3.6 Karar durumu ve bilgi katmanları

**Yazarın karar durumu:** *fikir · kesinleşmiş · vazgeçilmiş*. Vazgeçilen fikirler silinmez; normal aramada istenirse gizlenir. Durum alan düzeyinde de tutulur: karakterin adı kesinleşmiş, doğum yılı hâlâ fikir olabilir. Kayıt düzeyindeki etiket yalnızca genel iş düzeni içindir. "Yazar karar verdi", "evrende doğru sanılıyor", "okura açıklandı" ve "hesaptan çıktı" aynı onay değildir.

**Alternatifler (K27):** Aynı soruya iki olası cevap (iki final, iki sahne sırası) aynı türden iki kayıt olarak yazılır ve **alternatif** ilişkisiyle bağlanır. Olası bir olay *fikir* durumundadır; olayın olacağı kesin ama ayrıntısı belli değilse kayıt kesinleşmiş, ilgili alan *fikir* olur. Biri kesinleştirilince program öbürünü kendiliğinden değiştirmez; kesinleştiren yazara öbürlerini de vazgeçilmiş yapmak isteyip istemediğini sorar. Vazgeçilen alternatif ve ona bağlı ipuçları silinmez. İki alternatifin ikisi de kesinse Uyarılar'da olası uyuşmazlık olarak görünür (§9.1).

**Varsayılan yorum (K13):** Bir alana düz girilen değer *kesinleşmiş* karar durumunda ve *evrenin gerçeği* katmanında doğar; yazar tek dokunuşla onu fikre, bir grubun inancına ya da bir karakterin bilgisine çevirebilir. `[[` ile doğan yeni kayıt *fikir* durumundadır (§5.1). Tutarlılık denetimleri (§9.1) fikir durumundaki değerleri de denetler, ama bu uyarılar ayrı ve sessiz bir grupta durur ve inceleme kuyruğunu doldurmaz; vazgeçilmiş değerler denetlenmez.

**Bilgi katmanları** tek bir "taslak / kanon" alanında birleştirilmez:

| Katman | Örnek |
|---|---|
| Evrenin gerçeği | Kralı kardeşi öldürdü. |
| Halkın / bir grubun inancı | Kralın hastalıktan öldüğü sanılıyor. |
| Bir karakterin bilgisi | Prenses gerçeği sonra öğreniyor. |
| Okura açıklanan bilgi | Katil, *Kuzey Seferi*'nin 8. bölümünde açığa çıkıyor. |

- **Bilgi durumu.** Arayüzde kısa liste görünür: *bilmiyor · yanlış biliyor · şüpheleniyor · biliyor ama saklıyor · biliyor*. Altta üç ayrı eksen tutulur: *inanç derecesi* (inanıyor, şüpheleniyor, reddediyor), *gerçekle uyumu* (yalnızca yazar gerçeği belirlediyse hesaplanır; belirlemediyse "yanlış biliyor" çıkarılmaz) ve *saklama* (kime karşı saklıyor).
- **Okur da bir bilendir.** Her eser ve baskı için bir okur vardır; okurun zaman ekseni okuma sırasıdır. Okurun bilgi durumu karakterlerinkiyle aynı eksenleri kullanır (*bilmiyor · yanlış biliyor · şüpheleniyor · biliyor*). İpucu durumları (§4.6), okura sunulan açıklamalar (F13) ve kurgu montajı (§15-9) bu tek modeli kullanır. Bir seriyi ikinci kitaptan başlayarak okuyan, ayrı bir okuma sırasıdır (§3.3).
- **Belge okununca:** Bir karakter sahnede evren içi bir belgeyi okuyunca panel belgedeki işaretli iddiaları listeler ve tutumu sorar: *inandı · reddetti · kararsız · anlamadı · yalnızca bir kısmını okudu · atla*. Tutum **okunan belge sürümüne** bağlanır. Mektup sonradan sahteleştirilirse eski okuyucunun inancı değişmez. Üç işlem ayrıdır: *yazar düzeltmesi* ("yanlış kaydetmişim"), *evren içi değişiklik* ("mektup 431'de değiştirildi"), *yeni öğrenme* ("Kaelen 432'de yeni nüshayı gördü").
- Bir belgenin bir iddiayı ileri sürmesi ile bir kişinin ona inanması ayrı kayıtlardır.
- **Bilgi kaynağı:** *gördü · birinden duydu · belge okudu · çıkarım yaptı*. Böylece "bunu nereden biliyordu?" cevaplanır.
- **Bakış açısı filtresi** soy ağacında, ağda, haritada ve zaman çizelgesinde de çalışır. Gerçeği yalnızca gizlemez, o grubun inandığı alternatifi gösterir (halk görünümünde gizli kardeşler "kuzen" görünür).
- **İnancın da zamanı vardır:** Her bilgi durumu başlangıç ve bitişiyle tutulur; sınırlar olaya bağlanabilir.
- **Soru ile cevap aynı türden olmalı:** "Ölüm nedeni", "fail" ve "kasıt" ayrı iddialardır.
- **Başkasının bilgisine dair inanç** ("vezir, prensesin bilmediğini sanıyor") yalnızca kullanıcının seçtiği sırlar ve kişiler için açılır (F05).
- **Grup bilgisi:** "Konsey biliyor" bütün üyelerin bildiği anlamına gelmeyebilir; toplantıda olanlar, sonradan öğrenenler ve dışarıda bırakılanlar ayrılabilir.
- **Bilinmeyenin türleri.** Program gizli bir "doğru değer" istemez. Bir alanın boş ya da belirsiz olması aşağıdaki beş türden biridir. Her türün davranışının tek tanımı bu tablodur; §3.7 ve §18 buraya bağlanır. Arayüzdeki "Bilinmiyor" seçeneği ayrı bir tür değildir: yazara *evrende bilinmiyor* ile *bilerek açık bırakıyorum* arasında seçim yaptırır.

  | Tür | Varsayılan gösterilir mi? (§3.7) | Hesapta | Sorgu grubu (§18) | Eksiklik raporu |
  |---|---|---|---|---|
  | Henüz düşünülmedi (alan boş) | Evet, öneri olarak | Yalnızca "varsayımla" etiketli tahminlerde | Bilgi yok; eksiksiz beyan edilmiş kapsamda doğrulanmış hayır | İstenirse listelenir |
  | Yazar bilerek açık bıraktı | Hayır | Hayır; hesap "bilerek açık" der | Bilgi yok; eksiksizlik beyanı bunu hayıra çevirmez | Listelenmez (§9.3) |
  | Evrende bilinmiyor | Hayır | Hayır | Bilgi yok | Listelenmez |
  | Kaynaklar çelişiyor | Çelişen değerler gösterilir | Koşullu sonuç (§2.2 kural 15) | Çelişkili | İnceleme kuyruğunda |
  | Bu kayıt için geçersiz | Hayır | Hayır | Konu dışı | Listelenmez |

  **Açık beyan örtük çıkarımı yener:** "Bu liste eksiksiz" beyanı yalnızca *henüz düşünülmedi* durumundaki alanları hayıra çevirir. Bilerek açık bırakılmış ya da evrende bilinmeyen alanlar beyanın istisnasıdır ve beyan ekranında listelenir.
- Bu alanlar yalnızca önemli bilgiler için doldurulur; hiçbiri zorunlu değildir.

### 3.7 Kapsama, bağlılık, kültür ve varsayılan değerler

Mekân ile siyasi varlık ayrı kayıt türleridir. **Bölge** bir mekândır (coğrafi alan). Gezegen, boyut, alem ya da kurgudaki "dünya" da birer mekândır; türlerini kullanıcı adlandırır ve en üst mekânın ne olduğunu program dayatmaz (K22). **Krallık** bir siyasi varlıktır: kontrol ettiği arazi, iddia ettiği arazi ve yönetim merkezi ayrı, tarihli ilişkilerdir. Sürgündeki krallığın hiç arazisi olmayabilir; sınır değişince krallığın kaydı ve geçmişi değişmez. İkisi bir çalışma sayfasında birlikte düzenlenebilir (§3.1); bu, kimliklerini birleştirmez.

| İlişki | Örnek | Değişir mi? |
|---|---|---|
| **Fiziksel kapsama** | Oda ⊂ Han ⊂ Mahalle ⊂ Şehir ⊂ Bölge | Nadiren; gemi, göçebe kampı, yürüyen kale gibi hareketli mekânlarda değişir |
| **Siyasi bağlılık** | Şehir → Krallık (egemenlik, idari bağ) | Fetihle değişir |
| **Kültürel aidiyet** | Şehrin halkı → Kuzey kültürü (birden çok olabilir) | Yavaş değişir |

- **Geçişli sorgu:** Üst bölge seçilince alt birimlerdeki kayıtlar da sonuca girer; hangi ilişki üzerinden gezileceği seçilir.
- **Hareketli mekân:** Kapsama, yerel koordinat ve üst mekândaki konum ayrı bağlanır; masanın kamaraya göre yeri sabitken üst mekândaki konumu değişebilir.
- **Alt birimlerden toplananlar:** Şehir sayfası, mahallelerinde yazılmış üretim, inanç, topluluk ve açık meseleleri kaynaklarıyla salt okunur olarak toplar. Aynı lonca üç mahalleye bağlıysa üç lonca sayılmaz. "Bu şehirde kayıtlı gördüklerimiz" ile "şehrin özelliği" ayrıdır. Şehirden miras alınan değer yeniden yukarı toplanıp kanıt sayılmaz.
- Aynı ülkenin içindeki sınıflar, bölgeler ve inanç toplulukları farklı kültürel özellikler taşıyabilir.

**Varsayılan değerler.** Bu, bir alan boşken ne gösterileceğinin tek tanımıdır.

- Yalnızca şablonda "varsayılan alabilir" diye işaretlenen alanlar başka bir kayıttan varsayılan alır. Her alanın hangi eksenden aldığı şablonda yazılıdır: iklim ve doğa fiziksel kapsamadan; resmî para, vergi, hukuk ve resmî takvim siyasi bağlılıktan; dil, hitap, gelenek ve mimari kültürel aidiyetten; yaşam süresi, beden ve doğal yetenekler tür tanımından (§3.1). İnsan şehrinde yaşayan bir elfin yaşam süresi türünden, dili kültüründen gelir. Şehrin koordinatı kendisine aittir.
- **Beş değer türü ayrıdır:** açıkça girilmiş değer · boşken gösterilen varsayılan · çevrede yaygın uygulama · resmî kural · fiilen uygulanmış değişiklik.
- **Varsayılan bir öneridir, kayıt değildir.** Arayüz kaynağını gösterir: *"Bölge varsayılanı: Kuzeyce"*. Varsayılanı değer olarak kabul etmek açık bir kullanıcı işlemidir. Şablon formundaki hazır seçenek de kişinin evrende o dili bildiğinin dayanağı değildir.
- **Birden çok kaynak:** Bir alan birden çok kaynaktan varsayılan alıyorsa (iki kültür iki farklı dil, iki otorite iki farklı resmî takvim) program şu durumları ayırır: *birlikte geçerli* (iki dil de konuşulur) · *kapsamları farklı* (biri sarayda, biri pazarda) · *öncelik kullanıcı tarafından belirlenmiş* · *çatışma çözülmemiş*. Çözülmemiş çatışmada iki değer de gösterilir; eklenme sırası hiçbir şeyi belirlemez.
- **Bilinmeyenin türleri** varsayılanı nasıl etkiler: §3.6'daki tablo. Yalnızca "henüz düşünülmedi" durumundaki boş alan varsayılan gösterir.

- **Fetih ve siyasi değişiklik:** Bir şehrin siyasi bağlılığı değişince konumu değişmez; para birimi, mahkemesi, dili ya da dini de o gün kendiliğinden değişmez. Program, eski yönetimden varsayılan olarak gelen alanları (para, vergi, hukuk, resmî takvim) listeler ve **her alan için ayrı** sorar: *eski uygulama sürüyor · yeni uygulama şu tarihte başladı · ikisi birlikte geçerli · henüz karar vermedim*. Önceki değer varsayımsa dayanağı "varsayım" olarak kalır. Vergi hemen, mahkeme iki yıl sonra, para yirmi yılda değişebilir; resmî para ile pazarda kullanılan para farklı olabilir.

### 3.8 Eşya, sahiplik, makam ve kafile

- **Eşya** için ayrı tutulanlar: *sahibi · elinde bulunduranı · konumu · durumu* (sağlam, kırık, kayıp, yok edilmiş). Hepsinin geçmişi vardır (§3.5). Kılıcı bir haberciye vermek taşıyanı değiştirir, sahibini değiştirmez.
- **Sahiplik:** Eşya açıkça "tek sahipli" işaretlendiyse yeni sahip girilince önceki sahip o tarihten itibaren düşer. Aksi hâlde sahiplik iddiası, hukuken tanınan hak, fiilî kontrol, taşıma ve kullanım hakkı ayrı tutulur; ortak mülk, hisseli gemi, rehin ve rakip mirasçılar mümkündür. Haklar için F26.
- **Tekil ve bölünebilir:** Kılıç gibi tekil nesne ile yüz çuval tahıl gibi bölünebilir miktar aynı envanter davranışına zorlanmaz. Miktarların anlamı §18 nicelik sözleşmesindedir.
- **Makam ile kişi ayrıdır:** Kuzey Valiliği kalıcı bir makam kaydıdır; belirli tarihlerde farklı kişiler yürütür. Makamın nasıl kazanıldığı §3.10'daki süreç kuralıyla tanımlanır.
- **Kafile:** Geçici grup kaydı. Üyelerin katılma ve ayrılma zamanları tutulur; kafile hareket ettiğinde yalnızca o sırada grupta olanlar onunla birlikte gösterilir.
- **Kalabalık (F40, K23):** Ordu, mürettebat, göçmen grubu gibi kalabalıklar bireyleri tek tek kaydetmeden toplu kayıt olarak tutulur: yaklaşık miktarlar, tarihli gözlemler ve alt gruplar (30 okçu, 10 yaralı). Alt grupların örtüşmesi ayrı bir bilgidir; bilinmiyorsa sonuç aralıktır (hazır okçu 20–30), tek sayı değildir (§18 nicelik). Bir üyeye ad vermek, yani onun için ayrı kayıt açmak toplamı artırmaz; katılma, ayrılma ve ölüm toplamı değiştiren gerçek olaylardır. Kalabalığın bireylerinin aynı inancı paylaştığı varsayılmaz (§3.6 grup bilgisi). Bir kafilenin üyesi bir kalabalık olabilir.

### 3.9 Evren içi belge ve araştırma kaynağı

| | Araştırma kaynağı (evren dışı) | Evren içi belge |
|---|---|---|
| Örnek | Ortaçağ limanları üzerine makale | Liman defteri, mektup, antlaşma, ilan |
| Alanlar | Bağlantı, sayfa, alıntı, yorum, ilgili kayıtlar | Yazarı, tarihi, alıcısı, kimin erişebildiği, sürümleri, **içerdiği iddialar** |

"Belgede ne yazıyor?" ile "gerçekte ne oldu?" ayrıdır; propaganda ya da güvenilmez anlatıcının sözü evrenin kesin bilgisine dönüşmez. Kopya, tercüme ve sansürlü sürüm aynı belge ailesine bağlanır (F08). Belgeler istenirse görsel bir şablonla sunulur (§11.5).

**Kaynakların bağımsızlığı:** Aynı kaynaktan kopyalanan, tercüme edilen ya da aktarılan anlatımlar bağımsız kanıt sayılmaz; aynı söylentiyi aynı belgeden aktaran beş kişi beş tanık değildir. Bu kuralın tek tanımı burasıdır; delil geçmişi (F08) ve iddia dosyası (F28) buna dayanır.

### 3.10 Süreçler, adımlar ve eşikler

Taç giyme, kuşatma, ritüel, antlaşma, yolculuk ve büyü uygulaması gibi süreçler için:

- **Plan, başlama, adımlar, yarıda kalma ve sonuç ayrı kayıtlardır.** Eksik adım "olmadı" sayılmaz; bilinmiyor olabilir.
- **Bir sürecin sonucu, ilgili kurumun ya da kuralın açık tanımına bağlıdır.** Program evrensel bir kural koymaz. Bir gelenekte makam yeminle, ötekinde taçla, üçüncüsünde konseyin tesciliyle kazanılır. Tören yarıda kalsa da hukuki aşama tamamlanmış olabilir.
- Süreç kuralı şunları tanımlayabilir: başlangıç koşulları, önemli adımlar, her adımın etkisi ve **geri dönülmez eşikler**. Büyünün bedeli hazırlıkta, etkisi tamamlanınca doğabilir; iptalde bedel iade edilmeyebilir. Hepsini kullanıcı açık kuralla belirler.
- **Çatışan otoriteler:** İki kural farklı sonuç veriyorsa (Kuzey geleneğine göre kral, başkent hukukuna göre tescil eksik) program tek bir "oldu/olmadı" sonucuna zorlamaz. Bu evren içindeki bir anlaşmazlıktır; yazar hangi hükmün fiilen uygulandığını ayrıca kaydedebilir.
- **Olay kaydı ile uygulanabilirliği ayrıdır.** Yazar "mühürsüz elçi kapıdan geçti" yazabilir; program bunu silmez. Geçiş kuralı mühür istiyorsa çelişki ya da açıklama ihtiyacı gösterir. "Nöbetçi kandırıldı" gibi açıklamalar kendiliğinden üretilmez.
- Süreçte tüketilen kaynak, süreç tamamlanmadı diye kendiliğinden geri dönmez; iadeyi kural ya da yazar belirler.

### 3.11 Varsayım paketleri

(F37, K23.) Bir varsayım paketi, birlikte geçerli sayılan varsayımların adlandırılmış listesidir: "köprü açık", "haberci yola çıkmadı", "Kaelen yemini duydu". Bütün evreni kopyalamadan küçük düşünce deneyleri için kullanılır; büyük değişiklikler için deneme kopyası vardır (§9.7).

- Bir konu dosyasında (§5.9) ya da bir hesapta bir paket seçilir; rota, haber, hukuk ve sahne bağlamı aynı paketi kullanır. Farklı araçların sonuçları ancak aynı paketle hesaplandıysa birlikte geçerlidir (§2.2 kural 14).
- Her sonuç hangi paketle hesaplandığını taşır (§2.3). Başka paketle çıkan sonuç yan yana karşılaştırılabilir.
- Varsayım, kullanıcı istemeden kanona yazılmaz. Paketteki bir varsayımı evrene yazmak ayrı bir kullanıcı işlemidir (§2.2 kural 1).
- "Henüz karar vermedim" ile "iki seçenekten biri doğru" ayrıdır: ikincisi iki ayrı paket olarak tutulur ve sonuç iki koşul altında gösterilir.
- Paket seçilmemişse hesap yalnızca kaydedilmiş veriyle yapılır; bu da sonuçta "varsayım yok" diye yazılır.

### 3.12 Kişi, kimlik ve beden

(F06.) Bir **kişi**, onun kullandığı **kimlikler** ve **bedeni** ayrıdır. "Kara Tilki" bir kimliktir; onu Arven kullanır, sonra başkası devralabilir. Bir kimliği birden çok kişi, bir kişi birden çok kimliği kullanabilir; bunlar tarihli ilişkilerdir (§3.5).

- Tanık iki kimliği ayrı kişi sanabilir; bu bir inançtır (§3.6). Kimlik açığa çıkınca eski metindeki adlar değişmez. Yazar görünümünde kimlikler kişide birleşir; okur görünümünde açıklama anına kadar ayrı kalır (yayın: §11.2).
- **Beden** ayrı tutulabilir: ölüm, bedensiz dönem, dirilme ve beden değişimi ayrı olaylardır (§9.1 Dirilme). Ruh göçü ya da beden değiştirme bu ayrımla anlatılır.
- **Makam** kişiden ayrıdır (§3.8); bir kimlik bir makamı da taşıyabilir.
- Bir kişiyi sonradan iki kimliğe ayırmak ya da iki kaydı tek kişinin iki kimliği olarak birleştirmek bir işlem grubudur (§10.4) ve önizlemeyle yapılır (§9.5).
- Çoğu karakterde bu ayrım görünmez: kişi tek kimlik ve tek bedenle başlar, ayrım ancak gerektiğinde açılır (§2.1 az veriyle başlanır).
- Kimliği belirsiz kişiler için adaylar F44'tedir (Öneri).

---

## 4. Kayıt türleri

Her tür bir **varsayılan bileşen listesi** ve bir **soru kütüphanesi** ile gelir. Sorular yalnızca öneridir (§6). Kullanıcı türleri ve şablonları düzenler, yeni tür ekler.

**Yeni evrende tür seçimi (K28):** evren oluşturulurken isteğe bağlı "Ne yazıyorsunuz?" sorulur: fantastik, bilimkurgu, tarihî, gerçekçi/çağdaş, polisiye/gizem, diğer. Seçime göre o kurguya uzak kayıt türleri yeni kayıt seçiminde ve gezintide "Diğer" altına katlanır (gerçekçide büyü sistemi, canlı türü gibi). Hiçbir şey silinmez; var olan kayıtlar her yerde görünür kalır; ekranda "Gizlediğiniz bölümlerin kayıtları silinmez, yalnızca menüden kalkar" yazar. Seçim evrene yazılır, eşitlenir ve evrenin ayarından değiştirilir. Seçenekler renkli kartlardır; her kurgu türü bir tür grubunun rengini alır ve adı her zaman yazılıdır (renk tek başına bilgi taşımaz).

### 4.1 İnsanlar, gruplar ve siyasi yapılar

| Tür | Öne çıkan alanlar (hepsi isteğe bağlı) |
|---|---|
| **Karakter** | İstek, korku, kusur, sır, sınır, geçmişin etkisi · kötü alışkanlık (tetikleyici, kimi rahatsız ettiği, neyi gizlediği) · bildiği diller ve düzeyi · **seçim geçmişi**: seçenekler, seçim, gerekçe, kaybettiği, sonradan ne düşündüğü · **söylediği ile yaptığı** · görseller (yaş, dönem, kıyafete göre). Kişilik puanı zorunlu değildir. |
| **Karşıt karakter** (karakter bileşeni) | Ne istiyor, neden kendini haklı görüyor, neyi kaybetmekten korkuyor, hangi sınırı aşmaz, ana karakterle ortak yanı |
| **Topluluk / kurum** | Korur / İster / Korkar · sancak ve arma · iç ayrışmalar · üyeler (zamanla değişir) |
| **Siyasi varlık** (krallık, imparatorluk, şehir devleti, sürgün hükümeti) | Taht kime geçer, hükümdarı kim sınırlar, gelir nereden gelir, halk ne bekler, dinin gücü, zayıf nokta · kontrol ettiği ve iddia ettiği araziler, yönetim merkezi (tarihli ilişkiler, §3.7) |
| **Makam** | Yetki, kaynak, destek, bağımlılık, karşı çıkma imkânı · yürütenler (zaman aralıklı) · nasıl kazanılır (§3.10) · boşaldığında kim hak iddia eder |
| **Kafile** | Üyeler (katılma ve ayrılma), taşınan eşyalar, bağlı yolculuklar |

### 4.2 Yerler

| Tür | Öne çıkan alanlar |
|---|---|
| **Mekân** (odadan kıtaya; ölçek bir alandır; bölge de bir mekândır) | Duyular: koku, ses, insanların hareketi, geceleri ne değiştiği, yerlilerin neyi normal bulduğu, geçmişten kalan izler · **kullanım hâlleri** (pazar sabahı, gece, işgal, bayram) · kat planı veya kroki · kapsama, bağlılık ve kültür ilişkileri (§3.7) |
| **Şehir** (mekân + lojistik bileşeni) | Su, yemek, atık, gece düzeni, mahalle farkları, şehri gerçekte kimin yönettiği · ne ürettiği, neye bağımlı olduğu, mevsimlik sıkıntıları |
| **Rota** | İki uç, mesafe (ölçekli haritadan ya da elle), yolun hâli, koşula göre süreler (yaz/kış, yaya/atlı), duraklar, tehlikeler. Kullanıcının girdiği süre ile kuralla hesaplanan tahmin ayrı gösterilir. Rotanın hangi harita kipinde kullanılabildiği §8.4'te. |
| **Yolculuk** | Belirli kişilerin belirli bir zamanda bir rotayı kullanması: planlanan ve gerçekleşen güzergâh, duraklar, gecikmeler, katılanlar ve ayrılanlar, taşınan eşyalar, yolda yaşanan olaylar. Su, yiyecek ve konaklama alanları isteğe bağlıdır. |

### 4.3 Kültür ve inanç

| Tür | Öne çıkan alanlar |
|---|---|
| **Kültür** | **İdeal ile gerçek:** kendisi hakkında söylediği · resmî kural · günlük uygulama · bölgesel fark · kuşak farkı · iç tartışma · kendini nasıl gördüğü · komşularının onu nasıl gördüğü · gelenekler · yasaklar ve tabular · ayıp ve kutsal sayılanlar · gündelik hayat kartları (selam, sofra, para, inanç, çatışma) · coğrafyanın etkisi (ulaşım, yemek, ticaret, korku) |
| **İnanç / mezhep** | Evreni nasıl açıkladığı, iyi insan tanımı, ölümden sonrası, ibadeti kimin yönettiği, kurumların nasıl geçindiği · resmî öğreti, yerel uygulama ve kişisel inanç · mezhepler |
| **Ritüel** | Amacı, zamanı (takvime bağlı), aşamaları (§3.10), kullanılan eşyalar, katılımcılar, yapılmamasının toplumsal sonucu |
| **Dil** | **Ses paleti** (hece listesi, sert ↔ akıcı, kısa ↔ uzun) · **morfoloji** (ön ek, kök, son ek ve anlamları) · sözlük · hitaplar, unvanlar, selamlaşmalar, küfürler, yeminler, atasözleri, tabu sözcükler (grup, dönem, bağlamla) · yazı sistemi · yer adlarının tarihsel ve yabancı biçimleri |
| **Hukuk ve statü** (siyasi varlık ya da kültür bileşeni) | Mülk edinme, silah taşıma, seyahat, eğitim, miras ve meslek hakları; bağlı oldukları statü · mahkemeler, soruşturma, cezalar · kanunu kim uyguluyor, kim fiilen korunuyor · bir karaktere bir bölgede uygulanan kurallar |

### 4.4 Evrenin işleyişi

| Tür | Öne çıkan alanlar |
|---|---|
| **Evren kuralı** | Zaman, ölüm, ruh, madde, tanrılar, bilinç, aylar, boyutlar arası zaman farkı · kapsamı, koşulları, bilinen istisnaları · **niteliği**: evrenin gerçeği mi, halkın kabulü mü, bir dinin öğretisi mi · etkilediği kurallar ve kurumlar |
| **Büyü sistemi** | **Kural · bedel · sınır** · isteğe bağlı: risk, sonuç, denge · kural / kısıt / etki tablosu · toplumsal yanı (öğretimi kim denetliyor, meslek mi, hangi kullanımlar suç, büyü yapamayanlar bağımlı mı) · ekoller |
| **Büyü uygulaması** | Gereksinimler, hazırlık, süre, bedel, başarısızlık biçimleri, geride bıraktığı iz, kimin öğrenebildiği. Bedelin hangi adımda doğduğu §3.10'a göre tanımlanır. Bedel hafıza kaybıysa hangi bilginin kaybolduğu kaydedilir. |
| **Teknoloji / buluş** | Alanlara göre düzey · keşif, yayılma ve gündelik hayata girme ayrı tarihler · kim biliyor / kim üretebiliyor / kim kullanabiliyor |
| **Canlı türü / bitki** | Yaşam alanı, beslenme, üreme, göç, mevsimsel davranış · insanlarla ilişkisi · besin ağı · kültür ve ekonomiyle bağları |
| **Ürün / üretim** | Kaynak, üretici, işlenme yeri, araçlar, taşıma yolu, kullanıcılar · takas, vergi, borç gibi para dışı ilişkiler |
| **Para birimi ve ölçü** | Dönüşüm oranları (bölgeye ve döneme göre) · alım gücü tablosu (bir gece han, bir tayın, bir muhafızın günlük ücreti) · mesafe birimleri (fersah, menzil). Birimlerin hesapta nasıl davrandığı §18 nicelik sözleşmesinde. |

### 4.5 Zaman ve tarih

| Tür | Öne çıkan alanlar |
|---|---|
| **Olay** | Tarih (§3.4), yer, katılımcılar ve rolleri · **etkileri**: kısa vadeli sonuçlar ile kalıcı izler (terk edilmiş şehir, değişen ticaret yolu, göç, süren korku) ayrı (F11) · **neden–sonuç bağları**: *neden oldu · kolaylaştırdı · engelledi · tepki olarak gerçekleşti* |
| **Dönem / çağ** | Baskın inançlar, teknolojiler, yönetim biçimleri, diller, yaygın korkular, gündelik alışkanlıklar · günümüze kalan izler |
| **Antlaşma / yükümlülük** | Taraflar, şartlar, süre, yerine getirilme koşulu, tanıklar, ihlalin sonucu · ölçeği (devletler arası antlaşmadan kişisel yemine) · gerçek durum ile tarafların kanaati |
| **Haber / söylenti** | Çıkış yeri, gönderiliş zamanı, taşıyıcı, alıcı, ulaşma zamanı, içeriğin sürümleri · bir karakterin karar anında hangi haberlere eriştiği |
| **Haberleşme yöntemi** | Ulak, gemi, işaret kulesi, büyülü ağ · erişim koşulları, sınırlar, gecikme |

### 4.6 Anlatı ve yazarlık

| Tür | Öne çıkan alanlar |
|---|---|
| **Seri** | Kitapları (önerilen okuma sırasıyla), başka serilerden ek kitapları (ana serisiyle), olası finalleri (karar durumlarıyla; yeni olay ya da var olan olay eklenir), okuma yolları, soruları: serinin büyük planı (Ek A), açık meseleleri · **karakterlerin yolu**: karakter × kitap tablosu (eserlerdeki odak karakter sorularından; karar ve bedel sorusuna bağlı sahne hücreden açılır) |
| **Eser** | Bölümler, sahneler, okuma sırası, açık meseleler, sabit başvuru sürümü (§9.7), anlatı sözleşmesi (F15) · **odak karakterler** (K27): karakter ile eser arasında *eserin odak karakteri* bağı ve bu bağın kendi soruları (Ek A, "Karakterin bu kitaptaki yolu"); bir eserin birden çok odak karakteri olabilir, sahnedeki *odak karakter* (§3.3) ayrı bir bağdır. Cevaplar o kitabın planıdır: karakterin evren kaydını, durum geçmişini ya da başka kitabın cevaplarını değiştirmez · **kitap sonunda açık kalanlar**: okura sorulup (§3.6 okur sorusu, sahne niyetleri) bu eserde açıklayan sahnesi işaretlenmemiş sorular, bu eserin okuma sırasına göre; eser bir serideyse serinin sonraki kitaplarında nerede açıklandığı. Sonraki kitaplar yazılınca bu eserin listesi değişmez; serbest metinden "çözüldü" çıkarılmaz (K27) · sorular: hikâye çekirdeği ve bu kitabın görevi (Ek A, K27) · çalışma durumu: *fikir · plan · ilk taslak · düzeltme · bitti · yayımlandı* (karar durumundan ayrı; K27) |
| **Bölüm** | Sıra, sahneler |
| **Sahne** | Evren tarihi, mekân, bakış açısı, anlatıcı ve odak karakter, bağlam parçaları (§3.3), katılımcılar ve rolleri · süreklilik defteri (§5.6) · geçici sahne yerleşimi · sorular: sahne planı (Ek A, K27) · çalışma durumu: *planlandı · ilk taslak · düzenleniyor · gözden geçirildi* (aynı eserde farklı olabilir; evren tarihini ve denetimleri etkilemez) |
| **Kurgu hattı** | Gizem, siyasi mücadele, ilişki ya da hedef · bağlı sahneler · ipuçları (*planlandı · metne yerleştirildi · karşılığı verildi · vazgeçildi*; okurun bunlardan ne öğrendiği §3.6 okur modelindedir) · "son bağlantılı sahne sekiz sahne önceydi" gibi somut bilgiler. Tempo yargısı verilmez. · sorular: kurgu hattı (Ek A, K27) |
| **Motif / simge** | Görünüşü, anlamı, kimin nasıl yorumladığı (kültüre ve döneme göre), geçtiği sahneler · eşyanın gerçek geçmişi ile anlatılan efsanesi ayrı |
| **Alıntı** (K29) | Sözün kendisi · türü: *söz · şarkı · kehanet · yazıt · atasözü · diğer* · kimin söylediği ya da yazdığı (karakter, topluluk, inanç…; ilişki) · geçtiği sahneler (ilişki) · bağlamı. Kehanet ya da ipucu olan alıntı bir kurgu hattına bağlanabilir ve okurun bilgisi (§3.6) bilinen yoldan izlenir. Paylaşım görseli üretmez |
| **Not** | Şablon (sahne fikri, karakter notu, evren notu, araştırma) · iliştirildiği kayıtlar · her zaman özel · tek dokunuşla kayda dönüşür ve bağ korunur · **notun türü** (sahne fikri, diyalog, dünya kuralı, karakter fikri, araştırma, çelişki/kontrol, diğer) ve **notun durumu** (fikir · geliştiriliyor · kontrol edilecek · kullanıldı · arşivlendi) (K28). Notun durumu kaydın karar durumundan (§3.6) ayrıdır. Not listesi türe ve duruma göre süzülür ve sayıları gösterir; durum karttan tek tıkla değişir. Çelişki/kontrol notları Karar bekleyenler sayfasında da listelenir; ikinci bir mesele listesi açılmaz |
| **Açık mesele** | Soru, bağlı kayıt ya da sahne · *düşünülecek · kararlaştırıldı · şu an gerekmiyor* · önemli olarak işaretlenebilir |
| **Gerekçe kaydı** | Soru, düşünülen seçenekler, seçilen çözüm, gerekçe, etkilenen kayıtlar. Örnek: *"Büyü iyileştiremez, çünkü yaralar hikâyede ağırlığını korumalı."* |

---

## 5. Yazma deneyimi

### 5.1 Bağlantı yazma

- `[[` yazılınca küçük bir **seçim kutusu** açılır. Kullanıcı mevcut bir kaydı seçer ya da türü ve özetiyle yeni kayıt oluşturur. Yeni kayıt **fikir** durumunda doğar ve "Bahsedilen ama yazılmamış" listesine düşer.
- **`[[` tek yol değildir.** Türkçe Q ve F klavyede `[` AltGr+8 ile, tabletin Türkçe ekran klavyesinde sembol sayfasından yazılır. Bu yüzden dokunmatik ekranda klavyenin üstünde bir **Bağla** düğmesi aynı seçim kutusunu açar; her cihazda metin seçilip "Bağla" denebilir. `[[` masaüstünde kısayol olarak kalır. **`@` de aynı seçim kutusunu açar (K29):** yalnız kelime başında (satır başı, boşluk ya da açılan ayraçtan sonra) yazılınca; "ad@örnek" gibi kelime içindeki `@` kutu açmaz. Esc kutuyu kapatır ve `@` düz yazı olarak kalır.
- **Bağlantısız geçen adlar (K29):** Bir sahnenin ya da kaydın metninde bir kaydın adı, lakabı ya da önceki adı bağlantısız geçiyorsa metnin altında katlı tek satır görünür: "Bu metinde bağlantısız geçen 3 ad var · Göster". Açılınca her biri cümlesiyle listelenir ve yanında "Bağla", "Bu sefer değil" ve "Bu adı hiç önerme" vardır. Eşleşme yalnız adın kendisine ve Türkçe ekli biçimlerine (ek modülü) bakar; büyük-küçük harf ve Türkçe harfler ayırt edilmez ("DENİZ", "Deniz'in"), ancak büyük harfle başlayan bir ad metinde küçük harfle başlıyorsa önerilmez ("Deniz" adı ile "deniz kıyısı" karışmasın); kelimenin ortasında eşleşmez; üç harften kısa adlar aranmaz. Sahne, bölüm, not, açık mesele ve gerekçe kayıtlarının adları aranmaz (yapı kayıtlarıdır), metnin kendi kaydı da önerilmez. Aynı adı taşıyan birden çok kayıt varsa "Bağla" ayırt etme satırıyla seçim ister. **Program kendiliğinden bağlamaz** ve yazarken öneri açmaz (yazı bölünmez, §5.10); liste metin kaydedildikten sonra güncellenir. "Bu sefer değil" o metindeki o yeri bir daha göstermez; "Bu adı hiç önerme" o kaydı evrenin her yerinde öneriden çıkarır; listenin altındaki "Önerilmeyen adlar" satırında "Yeniden öner" ile geri alınır. Bu iki seçim evrene yazılır ve eşitlenir. Bağlantı kurulunca görünen metin değişmez, ek bağlantının görünümüne dahil edilir.
- **Kısayol sözdizimi:** görünen metin için `[[Kayıt|görünen metin]]`; yeni kayıt için `[[Ad::Tür::özet]]`. `|` yalnızca görünen metin içindir; `#` blok bağlantısına ayrılmıştır.
- **Türkçe ekler:** `[[Velkar]]'dan` ya da `[[Kaelen]]'in` yazıldığında ek bağlantının görünümüne dahil edilir. Program cümledeki ekleri kendiliğinden değiştirmez. Bağlantının hedefi ile görünen ifade ayrı tutulur.
- **Türkçe ek modülü:** Kök bulma ve ek uyumu aynı Türkçe kural tablosunu kullanır: ünlü uyumu, ünsüz benzeşmesi (Velkar'da / Kaelet'te), kaynaştırma harfi (Velkar'ı / Ela'yı), ünsüz yumuşaması ve ünlü düşmesi. Uydurma adlar yazıldığı gibi değil okunduğu gibi ek alır; bu yüzden her kayıtta isteğe bağlı bir **okunuş** alanı vardır ("Jean" → okunuşu "Jan" → Jean'a). Okunuş girilmemişse program yazımdan tahmin eder; tahmin edemezse sorar (§6.1).
- **Çekimli biçimden kök bulma:** `[[kuzey kılıcıyla]]` yazılınca program Türkçe ek modülüyle (ünsüz yumuşaması, ünlü düşmesi dahil) kök adaylarını çıkarır. Tek ve güçlü eşleşme varsa öneri yapar; birden çok aday varsa kısa seçim gösterir. Görünen metin değişmez. Bir yerin eski ya da yabancı adı da aynı kayda bağlanır (§15-4).
- **Ad değişikliği iki ayrı işlemdir.** *Evren içinde yeni ad:* kişi 430'da adını değiştirdi; eski metinler eski adla kalır, yeni ad tarihli olarak eklenir (§3.5). *Yazar düzeltmesi:* yazar adı beğenmedi; bağlantılı bütün görünen ifadeler yeni adla değişir ve ek uyumu önizlemesi gösterilir ("Velkar'dan → Elin'den, 14 yer"). Yazar tümünü, bir kısmını ya da hiçbirini onaylar. İki durumda da bağlantılar korunur; eski adlar ve lakaplar aramada bulunur (§18 arama ve sıralama). Aynı adlı iki kayıt türleri, özetleri ya da bağlı oldukları yerle ayırt edilir (F19 ayırt etme satırı).
- **Yazım denetimi:** Bağlantı olarak işaretli adlar ve kayıt adları tarayıcının yazım denetiminden muaf tutulur; bunun tarayıcılarda nasıl çalıştığı Windows deneyinde sınanır (K17).

### 5.2 Gömme ve bağlam

`![[Kayıt#Bölüm]]` başka bir kaydın belirli bir bölümünü metnin içinde gösterir. Gömme, bölümün değişmeyen koduna bağlanır; başlık değişse de bozulmaz.

**Dört bağımsız bağlam** gösterimi belirler: *içeriğin hangi sürümü* (güncel ya da sabitlenmiş), *hangi evren tarihi*, *kimin bilgisi* ve *hangi yayın kapsamı*. Çoğu bulunduğu yerden (sahneden) devralınır; değiştirilen ya da sabitlenen bağlam görünür. Bu dört bağlam bütün görünümlerde (yan panel, bağlam karşılaştırma, yayın önizlemesi) aynı anlamdadır.

**Bağlamların birleşimi:**
- Bağlamlar farklı kaynaklardan seçildiyse (eski baskının metni ile yeni taslağın evren bilgisi) görünüm bunu açıkça yazar: "karşılaştırma görünümü, eski baskının kendisi değil".
- **Düz metin ile yapılandırılmış blok ayrıdır.** Yapılandırılmış bir alandan üretilen kart (Velkar'ın yönetimi) evren tarihine göre değişir: 410'daki sahnede o yılın, 430'dakinde o yılın yönetimini gösterir. Düz yazılmış bir paragraf ("Velkar 430'da Varos'a bağlıdır") tarih değişince kendiliğinden yeniden yazılmaz; yalnızca yazarın hazırladığı başka bir sürüm ya da blok seçilebilir.

Sık kullanılan kipler: **güncel kaynağı izle** · **bu sürümü sabitle** · **sahnenin bağlamıyla göster**.

Bakış açısı filtresi yayın izni vermez. Wikide yalnızca açıkça "okura açık" işaretlenmiş bloklar ve alanlar çıkar; program etiketsiz serbest metindeki gizli cümleleri ayıklayamaz (§11).

### 5.3 Özet kartı

Bir bağlantının üzerine gelince küçük kart açılır: görsel, tür, ayırt etme satırı ve ana alanlar. Dokunmatik cihazlarda kart dokunup basılı tutunca da açılır, ama bu tek yol değildir: seçili bağlantının yanında görünen bir bilgi düğmesi de aynı kartı açar (§12.2).

### 5.4 Yan panel

Bir bölüm ya da not açıkken başka bir kayıt yan panelde açılır; birden çok kayıt sekme olarak tutulur. Telefonda yan panel yerine alttan açılan kart kullanılır.

### 5.5 Sahne bağlam paneli

Açık sahnenin (ya da imlecin bulunduğu bağlam parçasının) evren tarihine, mekânına ve bakış açısına göre salt okunur olarak toplar:
- Katılımcıların o tarihteki durumu (unvan, yaş, taşıdıkları eşyalar).
- Mekânın duyuları ve o zamanki kullanım hâli.
- İlgili kültürün gündelik kuralları, tabuları ve hitapları; karaktere uygulanan hukuk kuralları.
- Bakış açısı karakterinin o anda bildikleri ve eriştiği haberler.
- Tarih girilmemişse bunu açıkça söyler.

Sahnede tarih, mekân, bakış açısı, anlatıcı, odak karakter ve sahnedeki kimse yoksa sahne **boştur**. Yazma düzeninde (§5.10) panel, kullanıcı açıp kapatmayı seçmediyse boş sahnede kapalı, dolu sahnede açık başlar; seçim cihazda hatırlanır. Kapalıyken başlıktaki düğme boş sahnede "Bağlam ekle", doluda "Bağlamı göster" der. Boş sahnede panel uzun açıklamalar yerine tek cümle söyler; ayrıntı sayfa rehberindedir (§12.4). Okurun bilgisi, kayıt yokken katlı durur.

### 5.6 Süreklilik defteri

Sahneye bağlı küçük bir panel: sahne başındaki durum, sahne içindeki değişimler ve sahne sonundaki durum. Yalnızca yazarın izlemek istediği ayrıntılar (yaralı el, kimdeki kılıç, kilitli kapı, ok sayısı) izlenir. Değişiklikleri kullanıcı işaretler, program metinden tahmin etmez.

Üç şey birbirinden ayrıdır ve birbirinin yerine geçmez:

| | Nasıl oluşur | Ne söyler |
|---|---|---|
| **Gözlenen durum** | Yazar "sahne başında 5 ok, sonda 3 ok" der | O anlardaki durumu |
| **Net fark** | İki gözlemden hesaplanır | "−2". Kaç ok atıldığını, verildiğini ya da yanlış sayıldığını söylemez |
| **Gerçekleşmiş olay** | Yazar ayrıca kaydeder ("iki ok attı") | Farkı yaratan eylemi |

- Başlangıç ve olaylar biliniyorsa son durum hesaplanabilir; bu yalnızca seçili geçiş modeli (sayılabilir kaynak, iyileşme süresi) buna izin veriyorsa yapılır.
- İki gözlemden eylem çıkarılmaz. Kapının önce kapalı, sonra açık olması açılma yöntemini söylemez; yaralının iyileşmesi hangi iyileşme olayının gerçekleştiğini söylemez.
- Hesap ile gözlem uyuşmazsa ikisi de korunur, biri sessizce ezilmez.
- Değişimler sahnelere değil **evren olaylarına** bağlanır. Yazar ayrı bir olay açmadıysa değişim sahnenin kendi sahne olayına bağlanır (§3.3, K14); olay açmak hiçbir zaman ön koşul değildir. Aynı olay iki sahnede anlatılıyorsa değişim bir kez uygulanır; sahne silinince harcama geri gelmez (§9.6).

### 5.7 Metin işaretleme (serbest yazıyı sonradan yapılandırma)

Bir cümle seçilip bir iddiaya, evren durumuna ya da olaya bağlanabilir ("Sarnıcın anahtarı o gece Elin'deydi" → anahtar kaydı, taşıyan, olay zamanı). Her cümlenin işaretlenmesi gerekmez.

- **Dört şey ayrıdır:** metindeki işaret · işaretlenen iddia · bağlı evren durumu ya da olay · bunların sürümü. Aynı iddia üç sahnede anılabilir; tek cümle iki iddiaya bağlanabilir; işaretler kısmen üst üste gelebilir.
- İşaret, metin düzenlendikçe yerinde kalır (karakter sırasına değil metnin yapısına bağlıdır; bunu metin CRDT'sinin kararlı konumları sağlar, §10.3, TK2). **Yerini korumak, anlamını korumak değildir:** "Elin kılıcı taşıyordu" cümlesi "Kaelen" yapılınca bunun düzeltme mi, yeni olay mı, yanlış hatırlama mı olduğunu program bilemez. İşaret yazarın "kritik" dediği bir işaretse kısaca sorar (F24, soru kuralları §6.1); değilse inceleme kuyruğuna bırakır (§9.3).
- **Metni silmek evren kaydını silmez.** İşaretli cümle silinince olay evrende kalır, "artık metne bağlı değil" listesinde görünür. Evren kaydını kaldırmak ayrı bir karardır ve etki önizlemesiyle yapılır.
- **Kes–yapıştır işareti taşır; kopyala–yapıştır yeni bir metin örneği yaratır.** Yeni örneğin aynı olaya mı yeni olaya mı bağlanacağı açık kalır. Dış editöre gidip gelen metinde işaret bulunamazsa "bağlantı belirsiz" denir; benzer cümleye sessizce yapıştırılmaz.
- Kayıt değişince işaretli cümle değişmez. Hangi değişikliğin cümleyi incelemeye açtığı §9.3'te tanımlıdır.

### 5.8 Komut paleti ve hızlı not

- `Ctrl+K` ile ya da boş bir satırın başında veya metin dışındayken `/` ile açılan komut paleti (cümle içinde "ve/veya" ya da "12/3" yazarken açılmaz): kayıt aç, yan panele al, hızlı not, iki mekân arası yolculuk süresi, takvim günü hesabı, yeni kayıt.
- Palet sonucu adla değil başka bir yerden bulunduysa altında soluk bir satır nereden bulunduğunu söyler ("lakabı: …", "önceki adı: …"); metinden bulunduysa aranan sözcük kalın olarak çevresiyle kısa bir parça görünür (K28). Her komutun yanında kısayolu yazar (§12.2).
- **Hızlı not** her ekrandan erişilir. Telefonda tek dokunuşla açılır, uzun form göstermez ve kaydedildiğini açıkça söyler.

### 5.9 Konu dosyaları ve kaldığın yere dönme

- **Konu dosyası** (kodda ve eski metinlerde "çalışma masası"): bir konu için oluşturulan alan ("Velkar isyanı": şehir planı, karakterler, tarih aralığı, kaynaklar, açık sorular, sahneler). Kayıtlar kopyalanmaz, dosya onlara bağlanır. Dosyanın düzeni, notları, seçili varsayım paketi (§3.11) ve "bugün burada neyi çözmeye çalışıyorum?" satırı korunur.
- **Şimdi (K27):** Genel bakış sayfasında kaldığın yerin altında durur. Başında **"Çalışıyorum:"** seçimi vardır: yazarın şu an üzerinde çalıştığı eser ya da seri ("Bütün evren" de olabilir). Bu seçim evrene yazılır ve cihazlar arasında eşitlenir; yalnız yazar değiştirince değişir; başka bir kitaba yazmak ya da son düzenlenen kayıt onu değiştirmez. Kart en çok üç öneri gösterir ve her birinin gerekçesini yazar: önemli işaretlenmiş, düşünülecek bir açık mesele ("Bu meseleyi önemli olarak işaretlemiştiniz."); eser, seri, sahne ya da kurgu hattında sonraya bırakılmış bir soru (başlangıç ve evren soruları hariç); en son çalışılan sahne. Seçili çalışma varsa ona bağlı olanlar önce gelir. Devam notu kaldığın yerde durduğu için burada tekrarlanmaz. Öneriler serbest metinden çıkarılmaz; "eserde sahne yok" gibi yokluktan iş üretilmez.
- **Kaldığın yere dönme:** son açık sahne, imleç, yan paneldeki kayıtlar, seçili tarih ve kısa bir "buradan devam" notu saklanır ve **cihazlar arasında eşitlenir**. Panel yerleşimi, yakınlaştırma ve pencere ölçüsü **cihaza özeldir** ve eşitlenmez. Bir cihazın açılması öbür cihazın çalışma alanını zorla değiştirmez. Daha geniş bir çalışma devri kartı F47'de öneridir.
- **Son çalışmanızda (K28, 20 Ekim):** "Kaldığınız yer" kartında, son çalışma oturumunun özeti durur: ne zaman ve ne kadar sürdüğü ("dün 21:40–23:10, 1 saat 30 dakika"), metni yazılan kayıtlar, yeni kayıtlar, bilgisi değişen kayıtlar ve çöp kutusuna taşınanların sayısı; adlar kayda götürür. Oturum, aralarında iki saatten uzun boşluk olmayan son değişikliklerdir. Özet yalnızca değişiklik geçmişinden derlenir; metnin içeriğinden anlam çıkarılmaz (K1). Yeni evrende bir şey yapılmadıysa görünmez.

### 5.10 Çalışma düzenleri

Aynı verinin farklı görünümleridir; veri kopyalanmaz.

| Düzen | Öne çıkanlar |
|---|---|
| Sahne yazma | Metin, dar bağlam paneli, hızlı not |
| Evren kayıtlarını düzenleme | Kayıt listesi, ilişkiler, harita |
| Tutarlılık inceleme | İnceleme kuyruğu, zaman çizelgesi, etkilenen kayıtlar |

Yazı merkezdedir (K24):
- **Evren açılınca yazma düzeni gelir.** Solda sabit bir gezinti çubuğu bulunur: Yaz, Genel bakış, Kayıtlar, Haritalar, Takvim, Grafikler ve Uyarılar; az kullanılan sayfalar (konu dosyaları, karar bekleyenler, şablonlar, henüz yazılmayanlar, çöp kutusu, değişiklik geçmişi, kayıtlı anlar, yedek) "Diğer" altında katlanır. Bu adlar kullanıcı seçimidir (19 Ekim); bu belgenin geri kalanında aynı sayfalar eski adlarıyla anılabilir: Masa = Genel bakış, Görünümler = Grafikler, inceleme kuyruğu = Uyarılar sayfası, açık meseleler sayfası = Karar bekleyenler, bahsedilen ama yazılmamış = Henüz yazılmayanlar (19 Ekim'den K29'a kadar "Eksik kayıtlar"), geçmiş = Değişiklik geçmişi, sürümler sayfası = Kayıtlı anlar.
- **Yaz** seçiliyken gezinti çubuğunda eserlerin ağacı (eser › bölüm › sahne) görünür; seriler bir başlık olarak kendi eserlerinin üstünde durur, serisiz eserler en altta. Yeni seri, eser, bölüm ve sahne buradan eklenir. Bir parça açıkken ağaçta yalnız onun eseri ve bölümü açık durur, öbür eser ve bölümler katlıdır ve yanlarındaki okla açılır; hiçbir parça açık değilken ağacın tamamı açıktır. Ağaç uzasa da ana gezinti görünür kalır (ağaç kendi içinde kayar). Seçili sahnenin metni ortada geniş ve okunaklı durur. Metnin üstünde **tek ince satır** bulunur: yol satırı, kelime sayacı, odak kipi, kapalıysa bağlam panelini açan düğme, sayfa rehberi (K25) ve **"Sahne ⋯" menüsü**; sahnenin bütün alanlarını açmak ve çöp kutusuna taşımak gibi seyrek işler başlıkta değil bu menüdedir. Biçim araç çubuğu soluk durur, üzerine gelince ya da odaklanınca belirginleşir (K30).
- **Bağlam paneli (K30):** sağda dar ve kapatılabilir panel dört sekmedir: **Bağlam**, **Plan**, **Süreklilik**, **Bilgi**; seçili sekme cihazda hatırlanır. *Bağlam* sekmesinin başında **"Bu sahne"** kartı sahnenin tarihini, mekânını, bakış açısını, anlatıcısını, odak karakterini ve sahnedekileri okunacak biçimde gösterir; kutular yalnız karttaki "Düzenle" ile açılır, boş sahnede açık gelir. Altında o anki bağlam (§5.5) durur. *Plan* sekmesinde **Sahne planı** vardır: sahnenin plan soruları (kim ne istiyor, ne engel oluyor, ne değişiyor, okur ne öğreniyor; Ek A) yerinde cevaplanır; boş sahnedeki başlama yardımında bir soruya tıklamak bu sekmeyi açar. Plan cevapları sahneyi "dolu" saymaz (§5.5). *Süreklilik* sekmesi sahnenin süreklilik defteridir (§5.6). *Bilgi* sekmesi bakış açısı karakterinin o anda bildiklerini ve okurun bilgisini (§5.5) gösterir. Gezinti çubuğunun altında kayıt, eşitleme ve yedek özeti durur (§10.8). Sahnenin bütün alanları kayıt sayfasındadır; yazma ekranından bir bağlantıyla açılır.
- **Yazma ekranının yardımcıları (K28):** metnin üstünde tıklanabilir **yol satırı** (Seri › Eser › Bölüm › Sahne). Metnin altında, kayıt göstergesinin yanında soluk tek satır **kelime sayacı**: sahnenin kelime sayısı ve bu cihazda bugün eklenen ("Bu sahne 1.240 kelime · bugün +312"); hedef, renk ve uyarı yoktur, günlük sayı cihaza özeldir ve eşitlenmez. **Odak kipi:** bir düğme, kısayol ya da komut paletiyle gezinti çubuğu, eser ağacı, bağlam paneli ve sıradaki adım satırı gizlenir, yalnız metin kalır; Esc ya da aynı düğme geri döndürür, seçim cihazda hatırlanır. **Boş sahnede başlama yardımı:** yeni ve boş bir sahnede metin alanında soluk, yazınca kaybolan yardım durur: okuma sırasında önceki sahnenin son paragrafı ("Önceki sahne şöyle bitti: …") ve sahne planının ilk üç sorusu (tıklanınca plan açılır). Yardım metne yazılmaz.
- Kayıt, harita ya da görünüm sayfasındayken gezinti çubuğunda ilgili öğe seçili kalır (K28).
- **İlk adımlar (K26, K27):** yeni bir evrende Yaz sayfasının üstünde dört adım sırayla gösterilir; sıradaki adım vurgulanır. Listenin başında **"Nasıl başlamak istersiniz?"** seçimi vardır: *bir sahneyle* (varsayılan: eser, sahne, metinde bağlantı, sahnenin tarihi ya da mekânı), *bir hikâye fikriyle* (fikri not almak, nottan eser oluşturmak, eserin çekirdek sorusu, ilk sahne), *bir karakterle* (karakter, isteği, karşıt güç: bir rakip/düşman ilişkisi ya da karşıt karakterin ilk sorusu, karakterin bulunduğu sahne) ve *bir dünyayla* (Dünya Pusulası'nda kuralı ya da bir evren kuralı kaydı, güç ve bedeli, bir mekân/şehir/ülke, o yerde geçen bir sahne ya da o yere bağlanan bir not). Program adımın yapıldığını kaydedilmiş veriden anlar; boş bir soru seti ya da sonraya bırakılmış soru adımı yapmış saymaz. Her adımın yanında **"Geç"** vardır: geçilen adım onay işareti almaz, "Geçildi" yazar; Dünya Pusulası sorusuna bağlı adımda geçmek soruyu sonraya bırakır, ilgisiz sayılan soru listeden çıkar. Liste her adım yapıldığında ya da ilgisiz sayıldığında kapanır. Seçilen yol, geçilen adımlar ve "Gizle" o cihazda evren başına hatırlanır ve eşitlenmez; adımların yapılmış olması veriden okunduğu için her cihazda aynıdır. "Bu adımlar neden?" yazarlık rehberini açar (§12.4). Seri planıyla başlama yolu seri kaydıyla birlikte gelir. **Yap:** her adımın yanındaki "Yap" kullanıcıyı işin yapılacağı yere götürür ve oradaki kutuyu açar ya da imleci oraya koyar (eser adı kutusu, ağaçta yeni sahne adı, metin, bağlam paneli, notun "Kayda dönüştür"ü, eserin ya da karakterin sorusu, Dünya Pusulası sorusu, ilişki ya da katılımcı ekleme, komut paleti); gereken kayıt yoksa bir önceki adımın yerine gider. Eser Yaz sayfasından oluşturulunca ilk sahnenin adı kutusu kendiliğinden açılır. Yaz sayfası dışında, liste gizlenmemiş ve bitmemişse, sayfanın üstünde tek satır **sıradaki adım** durur ("Yap", "Geç", bütün adımlar, gizle). Kullanıcı isteği, 20 Ekim.
- **İleri araçların tanıtılması (K28):** İlk adımlar bitince ya da gizlenince, bir araç kaydedilmiş veriye göre ilk kez anlamlı olduğunda Yaz dışında sıradaki adım satırının yerinde tek satır bir kez görünür: eserde 10 sahne → olay örgüsü masası; ikinci karakter → ağ; ilk tarihli sahne ya da olay → zaman çizelgesi; ilk mekân → haritalar; ikinci eser → seri. Satırda "Göster" ve "Bir daha gösterme" vardır. Aynı anda en çok bir tanıtım çıkar; kapatılan ya da gösterilen tanıtım cihazda hatırlanır ve bir daha çıkmaz.
- **Örnek evren (K28):** Evrenler sayfasında "Örnek evreni aç" uydurma *Hatıra İmparatorluğu* serisiyle dolu bir evreni ayrı bir evren olarak kurar: iki eser, bölümler ve kısa sahne metinleri, kayıtlar, ilişkiler, takvim, olası finaller, okuma yolu, kurgu hattı ve okurun bilgisi. Kullanıcının evrenlerine karışmaz, öbür evrenler gibi kaldırılır. İçerik programla gelen bir pakettir: kayıtlar ve metinleri içe aktarma yoluyla (§10.11) yazılır; içe aktarmanın taşımadığı seri düzeni, sahneler, ilişkiler, takvim, harita ve sorular ardından programın olağan değişiklikleriyle eklenir. Hepsi işlem günlüğünden geçer. Evrenler sayfasında, aynı adlı örnek evren yoksa "Örnek evreni aç" görünür (kullanıcı içeriği 20 Ekim'de onayladı).
- **Kayıt sayfasında** ad, tür, karar durumu, tarih, şablon alanları, kısa özet, metin ve ilişkiler açık durur; öbür bölümler türüne göre "Diğer bölümler" altında katlanır ve bir dokunuşla açılır.

Yazma ekranında bütün evrenin panelleri ve uyarıları bulunmaz.

---

## 6. Rehber, sorular ve açık meseleler

- **Soru kütüphanesi:** Her türün soru seti vardır (başlangıç seti: Ek A). Her soru **cevaplanabilir**, **sonraya bırakılabilir** ya da **ilgisiz** işaretlenebilir. Bir soru yeni bir kayıtla da cevaplanabilir ("İnsanlar neye inanıyor?" → inanç kaydı).
- **Önce üç soru (K28):** kayıt sayfasında her soru setinin öne çıkan üç sorusu açık durur (varsayılan setin ilk üçüdür; Şablonlar sayfasında değiştirilir); öbürleri "Daha fazla soru (n)" altında katlanır. Cevaplanmış ya da sonraya bırakılmış bir soru hiçbir zaman katlanmaz.
- **Yeni evren başlangıcı** isteğe bağlıdır ve atlanabilir: temel fikir, çatışma, karakter. Kullanıcı bunun yerine bir dinle, coğrafyayla ya da tarihle başlayabilir.
- **Dünya Pusulası:** beş temel soru (merkez çatışma, gündelik hayat, güç ve bedeli, kırılırsa her şeyi değiştiren kural, evrenin karakteri nasıl dönüştürdüğü) bir panelde durur. **Doluluk göstergesi yoktur.** Genel bakış sayfasında yalnızca kullanıcının *önemli* işaretlediği açık sorular öne çıkar.
- **Açık meseleler** ve **gerekçe defteri** (§4.6) boş alanları eksik saymadan anlamlı bir çalışma listesi verir. "Önce ihtiyacın olanı kur" ilkesi bunun gerekçesidir (K5).

### 6.1 Programın yazara sorduğu sorular

Bu, programın yazara ne zaman ve nasıl soru sorduğunun tek tanımıdır. Soru şu yerlerde doğar: bileşeni ayrı kayda ayırırken (§3.1), belge okunurken tutum (§3.6), fetihte alan bazında (§3.7), takvim değişikliğinde (§3.4), ek okunuşu tahmin edilemeyince (§5.1), kritik işaretli cümle değişince (§5.7, F24), ters birleştirmede (§10.3) ve yayımlanmış eserle çelişen değişiklikte (F18).

- **Her sorunun bir "şimdilik geç" karşılığı vardır.** Geçmek hiçbir şeyi bozmaz: ilgili değer *henüz karar vermedim* olarak kalır ve soru inceleme kuyruğuna (§9.3) "ertelendi" olarak düşer.
- **Yazarı yalnızca önizlemeli yapı işlemleri bekletir:** birleştirme, bölme, silme, geri yükleme ve takvim değişikliği. Bunlarda soru cevaplanmadan işlem uygulanmaz; vazgeçmek her zaman mümkündür.
- **Yazarken akış kesilmez.** Sahne yazma düzeninde (§5.10) sorular pencere açmaz; ekranın kenarında sayı olarak birikir, yazar istediğinde topluca cevaplar.
- **Aynı kök nedenden doğan sorular birlikte sorulur.** Bir fetih dört alan için soru açarsa hepsi tek ekranda ve toplu cevap seçeneğiyle gelir ("hepsinde eski uygulama sürüyor").
- Soru metninde mantık ya da programlama terimi kullanılmaz.

---

## 7. Görünümler

| Görünüm | Ne gösterir | Not |
|---|---|---|
| **Genel bakış** (eski adı Masa) | Kaldığın yer, son çalışmanın özeti ve devam notu, **Şimdi** kartı (K27), son düzenlenenler, önemli açık meseleler, eksik kayıtlar, hızlı not, Dünya Pusulası | "Eksik kayıtlar" (metinde anılıp henüz yazılmamış kayıtlar) bir hatırlatmadır, görev listesi değildir; sayı ya da uyarı rengiyle gösterilmez |
| **Kayıt sayfası** | Başlık, görsel, bileşenler, metin, ilişkiler (zamana göre), geri-atıflar, notlar, açık meseleler | Görseli olmayan kayıtta baş harf rozeti. **Boş alanlar gizlidir (K26):** tür, karar durumu, kısa özet ve metin her zaman görünür; değeri, başka kayıttan gelen varsayılanı ya da alan düzeyi kararı olmayan şablon alanları, evren tarihi (sahne ve olay dışında) ve okunuş/başka adlar/etiketler tek satırda "+ alan adı" düğmesi olur; boş görseller ve ilişkiler "Henüz eklenmedi: + Görsel · + İlişki" satırında durur. Tıklanan alan ya da bölüm açılır ve sayfa yeniden açılana dek açık kalır ("+ İlişki" ekleme formuyla açılır). Veri değişmez; yalnız görünüştür |
| **Ağ** | Seçili kaydın yakın bağlantıları. **Odak halkası (K30):** seçili kayıt ortada, doğrudan bağlıları ilk halkada (aynı türden bağlar yan yana), onların bağlıları dış halkalarda; yerleşim rastgele değildir, her açılışta aynıdır. Bağın türü (aile, dostluk ve bağlılık, düşmanlık, sahneler ve olaylar, diğer, metindeki bağlantı) renk, çizgi biçimi ve okunur etiketle ayrılır; etiket bağı merkezdeki kaydın gözünden adlandırır ("annesi"). Aynı iki kayıt arasındaki bağlar ayrı yaylarla çizilir. Yanda aynı bağlar türe göre gruplu **liste** olarak durur. **Tablo** görünümü kim kimin nesi olduğunu gösterir: satırdaki kaydın sütundakine ne olduğu hücrede yazar; hücre seçilince bağın tarihi, karar durumu ve rolü açılır. Sahne ve metin bağlantıları tabloya girmez; en çok bağı olan 16 kayıt gösterilir. Çizim ve tablo seçimi cihazda hatırlanır | Bütün evren isteğe bağlı açılır (serbest yerleşimle); ilişki türü, dönem, kayıt türü ve bakış açısıyla filtrelenir; süzgeçler tek bir çubukta, bağ türleri açılıp kapanan düğmelerle |
| **Soy ağacı** | Ebeveyn, eş, kardeş; çoklu evlilik, evlatlık, gayrimeşru çocuk, siyasi evlilik, soy içi evlilik farklı çizgilerle · isteğe bağlı **kişiler arası bağlar katmanı** (K29): ağaçtaki kişiler arasındaki sevgili, düşman, rakip, müttefik, usta–çırak gibi bağlar aile çizgilerinden ayrı biçimde (kesik çizgi, adıyla) gösterilir; katman açılıp kapanır, hangi bağların görüneceği seçilir; ağaçta olmayan kişi yalnız bu bağ için ağaca eklenmez | Çakışmasız çizim vaat edilmez; odaklanma, dal kapatma ve filtre sunulur |
| **Zaman çizelgesi** | Kesin tarihler noktayla, belirsizler bantla (kısa belirsiz aralık içi boş, kesik kenarlı nokta), göreli sıralar okla. **Şeritler (K30):** eserlere bağlı olmayan olaylar ve kayıtlar "Olaylar" şeridinde, her eserin sahneleri kendi şeridinde; aynı şeritte çakışan öğeler yazılarıyla birlikte alt satıra iner. Takvimin çağları arka planda bant olarak durur. **Kırık eksen:** hiçbir kaydın bulunmadığı uzun boşluk (bütün sürenin %12'sinden uzun) dar bir "≈" kırığına iner; kırık yalnız boşlukta olur, hiçbir kaydın süresi kısalmaz. Altta bütün zamanın **özet çizgisi**: sürüklenerek seçilen aralığa çizelge yakınlaşır (klavyede oklar kaydırır, + ve − daraltıp genişletir). **Tarih defteri:** aynı kayıtlar yıl yıl alt alta, kayıt olmayan yıllar tek satırla ("— 19 yıl kayıt yok —"), aynı eserde aynı tarihli sahneler tek kartta; dar ekranda kendiliğinden gelir, iki görünüm arasında elle de geçilir ve seçim cihazda hatırlanır | Çağlar, paralel takvimler, eser ya da kurgu hattına göre filtre; şeritler açılıp kapanır |
| **Neden–sonuç ağı** | Olaylar arasındaki *neden oldu / engelledi…* bağları | Maden kapandı → vergi düştü → maaş ödenemedi → garnizon dağıldı |
| **Takvim çarkı** | Mevsimler, bayramlar, mevsime bağlı olaylar | |
| **Olay örgüsü masası** (K27) | Bir eserin okuma sırası sütunlarda (bölümlere göre gruplu); satırlar yazarın seçtiği izler: dönüm noktaları (sahneye verilen "dönüm noktası" etiketi ve sahnenin anlattığı olay), kurgu hatları (rolüyle), okur soruları (montajdaki ipucu, yanıltmaca, açıklama; açıklanmayan soru "açık kalıyor"), sahnede bulunan karakterler (en çok görünen altısı, istenirse hepsi), sahnenin çalışma durumu | Yeni veri tutulmaz. Sahne sürüklenip başka bir sahnenin önüne bırakılır ya da bir öne/sonraya taşınır; bu §3.3 yerleştirmesidir, evren tarihini değiştirmez. Taşımadan sonra taşınan sahnenin götürdükleri (sırası, bölümü, taşıdığı soru işaretleri, hat yeri, ilk tanıtımı değişen adlar) yazılır ve taşıma geri alınabilir; iyi/kötü yargısı verilmez. Metni olmayan sahne "plan sahnesi"dir; masadan boş sahne eklenir, yerleşmemiş sahneler esere alınır. Grafikler altında ve eser sayfasındaki "Bölümler ve sahneler" bölümünden açılır. **Seri seçilince** sütunlar serinin bütün kitaplarının sahneleridir (önerilen okuma sırası, ek kitaplar sonda), başlıkta kitap ve bölüm; okur soruları her kitabın kendi montajından gelir ve aynı soru kitaplara yayılır; sahne kitaplar arasında da taşınır |
| **Bölüm × kayıt matrisi** | Bölümler × karakterler, eşyalar, sırlar | Katmanlar: fiziksel katılım, anılma, bakış açısı, bilgi edinme, olay etkisi, okura açıklanma. "Kaç sahnede görünüyor" ile "kaç sahnede konu oluyor" ayrı sayılır |
| **Yoğunluk ve boşluk** | Zaman çizelgesi ve haritada isteğe bağlı katman | Olay, sahne, kelime ve kayıt sayısı ayrı yoğunluklardır; altı sahnede anlatılan tek suikast altı olay sayılmaz. "Bu kapsamda güneyde kayıtlı olay yok" denir; denge önerisi üretilmez |
| **Bağlam karşılaştırma** | Aynı kaydın iki bağlamda yan yana görünümü (§5.2) | Farkın evren zamanından mı, bilgi katmanından mı, taslaktan mı geldiği gösterilir |
| **Kurgu hatları** | Hat başına sahne ve ipucu dizisi | |
| **Güç dengesi** | Topluluk × sahip / ihtiyaç / karşısına alamaz · makamlar, resmî ve fiilî güç · bağımlılık çemberi | Kişi ölünce hangi makam boşalır, kim hak iddia eder? Sonucu yazar yazar |
| **Akıllı listeler** | VE / VEYA / DEĞİL ile kaydedilebilir sorgular | Yalnızca yapılandırılmış alanlar ve ilişkiler üzerinden. Bilinmeyen ve çelişkili değerlerin davranışı §18 sorgu sözleşmesinde; sonuç "doğrulanmış 8, belirsiz 3" biçiminde verilebilir |
| **Sıradan bir gün** | Seçilen mekân, dönem ve statü için barınma, yemek, ulaşım, iş, ibadet, eğlence kayıtları | İki kişinin günü yan yana; anlatı üretilmez |
| **Karşılaştırmalı okuma** | İki kültürün ölüm anlayışı, üç şehrin yönetimi, bir karakterin farklı dönemleri yan yana | |
| **Gezinti** | Kullanıcının hazırladığı kayıt dizisi ("Başkentte bir gün") | Uzun aradan sonra evrene dönmek için |
| **Görsel pano** | Eskizler, kıyafetler, armalar, mimari örnekler | Görselin bir bölümüne not, iki tasarımı karşılaştırma, güncel görünümü işaretleme, eski çizimleri gelişim geçmişi olarak saklama |

---

## 8. Harita ve mekân

### 8.1 Ölçekler ve işaretleme

- **İç içe haritalar:** gezegen → kıta → ülke → şehir → bina → oda; başka boyutlar ve yeraltı. Bir mekânın farklı haritalardaki işaretleri birbirine bağlıdır; gezinti fiziksel kapsamayı kullanır (§3.7).
- **Evrensel görsel işaretleme:** Görsel yükleme, üstüne işaret koyma ve işareti bir kayda bağlama aynı bileşenle yapılır; haritalarda, kat planlarında, krokilerde ve karakter ya da eşya görsellerinde kullanılır. İlk harita sürümü bu bileşenden ibarettir.
- **İşaret kesinliği:** *kesin yer · yaklaşık bölge · yeri bilinmiyor*. Efsanevi bir şehir için koordinat gerekmez.
- **Harita uzayı:** Her haritanın kendi koordinat uzayı vardır; işaretler, bölgeler ve rotalar görselde değil bu uzayda saklanır. Uzay en-boy oranını korur (iki eksen ayrı ayrı 0–1'e indirgenmez), böylece ölçekli mesafe hesabı bozulmaz (§8.4). Görseller bu uzaya oturtulmuş katmanlardır: görsel değişince yalnızca oturtulması yenilenir, hiçbir işaret yeniden yazılmaz (§8.5). Eski haritalar, propaganda haritaları (§8.3) ve eskizler aynı uzaya üst üste bindirilebilir.
- Büyük harita görselleri parça parça (döşeme yöntemiyle) gösterilir (§10.12).
- **Harita ekranı (K30):** açık harita sayfanın bütün genişliğini ve yüksekliğini kaplar; başlık satırında haritanın adı, gösterdiği yer ve sayfa rehberi durur. İşaretleme araçları (gez ve seç, kesin yer, yaklaşık bölge, bölge çiz, yol çiz) sol kenarda yazılı ve dikey durur; yakınlaştırma ve "Sığdır" sağ altta, zaman kaydırıcısı (§8.2) sol altta, seçili aracın yönergesi üstte. Sağda kapatılabilen bir **çekmece** üç sekmedir: *İşaretler* (aranabilir işaret, bölge ve yol listesi, yeri bilinmeyenler, seçilen tarihte olanlar), *Katmanlar* (katmanlar ve hizalama, gösterilen kayıt türleri, bakış açısı, ölçekli geometri) ve *Künye* (§8.3; haritayı kaldırma da buradadır). Bir işaret seçilince çekmecede **yer kartı** açılır: kaydın türü ve kesinliği, kısa özeti, orada geçen sahne ve olaylar, öbür bağları (kayıtlı ilişkilerden) ve işarete değen yollar (haritadaki çizgilerden); altında işaretin ayarları. Haritanın altında **lejant** işaret ve çizgi anlamlarını, yeri bilinmeyenlerin sayısını söyler.

### 8.2 Katmanlar ve bölgeler

- **Katmanlar:** iklim, su, yollar, doğal kaynaklar, bölgeler, kayıt türleri (şehirler, hizipler, yaratıklar, inanç, dil, ticaret); her biri açılıp kapatılır.
- **Bölgeler** çokgen olarak çizilir ve örtüşebilir (tartışmalı topraklar). Hiçbir egemenliğe bağlı olmayan alanlar olabilir. Tartışmalı toprakta her tarafın iddiası ayrı kaydedilir; sınır kasabaları, kaçakçılık yolları ve kültür karışması bu bölgelere bağlanabilir. Bölgeler zamanla değişir (§3.5); **zaman kaydırıcısı** haritayı seçilen yıldaki hâliyle gösterir.

### 8.3 Haritalar da iddia taşır

Tüccar haritası, imparatorluk propagandası, eski harita aynı yerlere bağlıdır ama aynı doğrulukta değildir. Her haritanın tarihi, yapanı, amacı ve bilinen hataları tutulur (F17).

### 8.4 Üç çalışma kipi

Bir rota ya da erişim sorusu, eldeki bilgiye göre üç kipten biriyle cevaplanır. Hiçbiri ötekinin ön koşulu değildir.

| Kip | Gereken veri | Cevaplayabildiği | Cevaplamadığı |
|---|---|---|---|
| **Ölçekli geometri** | Ölçeği tanımlı harita, arazi türleri | Görselden mesafe, araziye göre süre, erişim konturları | — |
| **Kayıtlı süre ağı** | Yerler ve aralarında elle girilmiş mesafe ya da süreler | Ağ üzerindeki en kısa süre, varış günleri | Görselden mesafe |
| **Bağlantı krokisi** | Yalnızca hangi yerden hangisine geçilebildiği | Erişilebilirlik, aradaki duraklar | Mesafe ve süre (uydurulmaz) |

- Ölçeği tanımlanmamış bir görselden kilometre ya da süre üretilmez; ama aynı yerler arasındaki elle girilmiş süreler hesapta kullanılır. Ölçek birimi evrene özeldir (fersah, menzil).
- Rota süresi yalnızca uzunluktan oluşmaz: mevsim, ulaşım biçimi, geçiş izni, kapı saatleri ve kapasite gibi koşullar rotaya bağlanabilir. Koşullar yola çıkış anında değil, **ilgili noktaya varış anında** değerlendirilir; yola çıkışta geçerli bir izin sınıra varıldığında bitmiş olabilir. Ayrıntılı zamanlı geçitler F39'da öneridir.
- **Rota ve yolculuk ayrıdır** (§4.2). Harita üzerinden "burada kim vardı, ne oldu, yolculuğun hangi aşamasındaydılar?" sorulur.

### 8.5 Harita hizalama

Harita görseli değişince (yeniden çizim, kırpma, büyütme) görsel harita uzayına yeniden oturtulur; işaretler yerinde kalır (§8.1). Oturtma, görsel üzerinde ve uzayda eşleşen kontrol noktalarıyla yapılır:
- **2 nokta çifti:** taşıma, döndürme ve tek oranlı ölçek (benzerlik dönüşümü). Yeniden boyutlama ve genişletme için yeterlidir.
- **3 nokta çifti** (aynı doğru üzerinde olmayan): genel afin dönüşüm; eğik ya da farklı oranlı esneme de düzeltilir.
- **Daha fazla nokta:** en uygun dönüşüm hesaplanır ve her kontrol noktasının hatası gösterilir. Hatanın büyüdüğü yer haritanın yeniden çizildiği yerdir; oradaki işaretler ve bölgeler "gözden geçir" listesine girer.
- Sonuç önizlenir ve geri alınır. Coğrafyası yeniden çizilmiş haritada yazar işaretleri tek tek düzeltebilir; bu, işaretin harita uzayında taşınmasıdır ve kendi işlemidir.

### 8.6 Kat planı ve sahne yerleşimi

Kapılar, pencereler, katlar, görüşü kapatan unsurlar. Bir sahne için karakterlerin geçici konumları yerleştirilir; bu yerleşim binanın kalıcı planını değiştirmez. Eski sahne, kullandığı plan sürümünü korur. "Bunu duyabilir miydi?" yazarın kendi incelemesi içindir, program kesin yargı vermez (§15-6).

### 8.7 Tablet kalemi

Sayfayı kaydırma ile işaret taşıma birbirine karışmaz; kalem kipleri (seçme, çizme, taşıma) arasında görünür biçimde geçilir (§12.2).

---

## 9. Tutarlılık ve bakım

### 9.1 Kural tabanlı denetimler

Her denetim sonucu sonuç zarfıyla anlatılır (§2.3): hüküm (*açık çelişki · olası uyuşmazlık · sorun yok · bu kurala konu değil · denetlenemiyor*) ve güncellik ayrı gösterilir; "sorun yok" yalnızca belirtilen kurallar ve kapsam için geçerlidir. Her uyarı dayanağını gösterir: *"İki olay arasında 1 gün var. Seçilen rota için tanımlı en kısa süre 3 gün."* Bu cümle yalnızca o rota ve koşullar için geçerlidir; karakterin başka bir yolla gelemeyeceği çıkarılmaz (§2.2 kural 13).

| Denetim | Kural |
|---|---|
| Yaşam süresi | Doğumdan önce ya da ölümden sonra bir olayda **fiziksel olarak bulunma**. Kişisel kronoloji (F45, Öneri) tasarıma alınır ve açılırsa evren tarihi yerine kişinin yaşadığı sıra kullanılır. |
| Döngüsel tarih | Göreli tarihlerde A < B < C < A gibi imkânsız döngü |
| Konum ve rota | Aynı aralıkta, fiziksel kapsamayla birbirini içermeyen iki yerde bulunma (handa olmak ile aynı şehirde olmak, limandaki gemide olmak ile limanda olmak çelişmez; §3.7), ya da kayıtlı rota süresinden kısa sürede yer değiştirme. Tarihlerin hassasiyeti iki yeri ayırmaya yetmiyorsa sonuç "olası uyuşmazlık" olur (§3.4). |
| Eşya | Tek sahipli ya da tekil bir eşyanın aynı anda iki kişide bulunması, yok edildikten sonra kullanılması |
| Bilgi | Karakterin bir bilgiyi öğrenmeden önce ona göre davranması (yalnızca kullanıcının kurduğu bilgi kayıtları üzerinden) |
| Süreç | Bir olayın, bağlı süreç kuralının önkoşuluyla çelişmesi (§3.10) |
| Alternatifler | Birbirinin alternatifi diye bağlanmış iki kaydın ikisinin de kesinleşmiş olması (olası uyuşmazlık; K27, §3.6) |

- **Gerekçeli istisna:** İstisna bütün kaydı susturmaz; belirli kurala, tarih aralığına, olaya ya da varoluş biçimine (hayalet, ceset) bağlanır ve gerekçesi yazılır. "Bu çelişkiyi bilerek kabul ediyorum" (yazar tercihi) ile "bu kural burada uygulanamaz" (kapsam düzeltmesi) ayrıdır.
- **Kapsamlı kurallar:** Bir kural bir bölgeye, boyuta, türe, kültüre ya da kuruma bağlanır ve o kapsamdaki kayıtlara tek tek istisna girmeden uygulanır. Örnek: bir kültürde evliliğin çokluğu (§3.2). Zamanın farklı aktığı kapsamlar kural değil, zaman akışıdır (§3.4).
- **Kural çatışması bir sonuç olabilir:** "Evrensel → bölgesel → kurumsal → tekil" önceliği bazı alanlarda kullanılır, ama her zaman en alttaki kazanmaz. Tapınak hukuku ile şehir hukuku çatışıyorsa bu evrendeki bir sorundur; sistem "iki makam farklı karar veriyor" sonucunu gösterir.
- **Dirilme:** Bir türün dirilebilmesi her ölümden sonra dirildiği anlamına gelmez. Ölüm, bedensiz dönem, dirilme ve beden değişimi ayrı olaylardır; dirilme olayı yoksa uyarı verilir.
- **Teknik ile kurgusal sorun ayrıdır:** Verinin yapısını bozan hatalar (kopuk kod, eksik dosya, eşitleme çatışması) kurgu uyarılarından ayrı gösterilir. Yazar kurgu uyarısını çözmeden yazmaya devam eder.
- **Fikirler de denetlenir:** fikir durumundaki değerlerin uyarıları ayrı ve sessiz bir gruptadır, vazgeçilmiş değerler denetlenmez (K13, §3.6).
- Program serbest metindeki mantık hatalarını bulacağını vaat etmez.

### 9.2 Etki analizi

Bir olayın tarihi ya da katılımcıları değişince rapor üç grubu ayırır:
1. Doğrudan hesap nedeniyle değişen kayıtlar (çapalı tarihler, yaşlar).
2. Tanımlı bir bağımlılık nedeniyle incelenmesi gerekenler (neden–sonuç bağları, bilgi kayıtları, değişen değere bağlı metin işaretleri).
3. Yalnızca o kayıttan bahseden metinler. Bunlar bilgi olarak listelenir, incelemeye açılmaz.

"Kralın ölümünü iki yıl ileri al ama kızının taç giyme yaşı değişmesin" gibi koruma istekleri ve "kral daha geç öldü" ile "halk daha geç öldüğünü sanıyordu" ayrımı F04 ve F24 ile yapılır.

### 9.3 İnceleme kuyruğu

Bu, bir şeyin ne zaman "incelenmeli" olduğunun tek tanımıdır. Uyarılar ve denetim sonuçları da bu kuyruğa düşer.

**Ne açar?** Bir inceleme yalnızca belirli bir dayanağı değişince açılır:
- **Açık iddia işareti** (§5.7) yalnızca bağlı olduğu iddia ya da değer değişince açılır. Karakterin saç rengi değişince, yalnızca kılıç taşımaya bağlı işaretler açılmaz.
- **Sıradan bağlantı** (`[[Ad]]`) hiçbir zaman inceleme açmaz; etki analizinde 3. grupta listelenir.
- **Anlamı sınıflandırılmamış işaret** (yazar cümleyi kayda bağlamış ama hangi alana bağlı olduğunu söylememiş) kaydın kendisi silinince, birleştirilince ya da bölününce açılır; sıradan alan değişikliklerinde açılmaz. Yazar istediğinde işareti bir alana bağlayarak daraltabilir.
- Denetim sonuçları, kural ya da dayandıkları veri değişince açılır.

**Önem** program tarafından metinden anlaşılmaz; görünür ölçütlere dayanır: yazarın "kritik" işaretlediği işaretler, açık bağımlılıklar ve işlem türü (silme, birleştirme, tarih değişikliği). Yazarken sorulan soruların ertelenmesi §6.1'de tanımlıdır.

**Ne kapatır?** *metin düzeltildi · evren verisi düzeltildi · bu kullanım için kabul edildi (gerekçeyle) · yanlış bağlantı kaldırıldı*. **Ertelendi** bir kapanış değildir; kuyrukta ayrı görünür. Kabul edilmiş bir durum, onu ilgili kılan dayanak yeniden değişmedikçe tekrar açılmaz. "Bilerek açık bıraktım" denen alan bir daha eksiklik raporuna düşmez.

**Yük sınırı:** Denetimler yazarın o an yaptığı iş üzerinden öne çıkar; yolculuğu kontrol ederken saç rengi sorulmaz. Aynı kök nedenden gelen uyarılar tek iş olarak gösterilir.

### 9.4 Evren sağlık taraması

Kopuk bağlantıları, vazgeçilmiş kayıtlara giden bağlantıları, eksik görsel dosyalarını ve kod sorunlarını listeler. Bağlantısız bir fikir ya da tarihi belirsiz bir olay hata sayılmaz; istenirse ayrı bir bilgi listesinde gösterilir.

### 9.5 Birleştirme, bölme ve dönüşüm

- **Editoryal birleştirme** (yanlışlıkla iki kez açılmış kayıt): önizlemede korunacak kod, taşınacak bağlantılar ve ilişkiler, harita işaretleri, eski adlar (lakap olarak kalır), çelişen alanlar ve yayın durumuna etkiler gösterilir. Eski kod silinmez, yeni kayda yönlendirir; başka cihazdan gelen eski bağlantılar da doğru kayda varır. Geçmiş metinlerdeki ifade ve dönemsel ad korunur.
- **Evren içi birleşme, bölünme ve dönüşüm** (iki loncanın 450'de birleşmesi, hanedanın bölünmesi, geminin yeniden yapılması) bir evren olayıdır; ayrı düğmeyle yapılır. Eski kayıtların kodu ve geçmişi korunur, neyin devredildiği kaydedilir (F25).
- **Bölme:** Bir metin parçası tek işlemle yeni kayda dönüşür, eski yerinde bağlantısı kalır. Bileşen ayırırken belirsiz ilişkiler sorulur (§3.1).
- **Toplu düzenleme:** Arama sonuçlarında etiket, karar durumu ve yayın izni toplu değiştirilir.
- **Şablon değişikliği:** Alanın adını değiştirmek ile türünü değiştirmek ayrı işlemlerdir. Dönüştürülemeyen değerler silinmez, korunur ve listelenir. Alanların kodu adlarından bağımsızdır (§18 nicelik ve alan anlamı). Şablon değişikliği sürümlü bir işlemdir: her değer girildiği şema sürümünü taşır. Eşzamanlı şema değişikliğinin eşitlenmesi §10.3'tedir.

### 9.6 Sahneyi kaldırmak

Üç ayrı işlemdir: sahneyi metinden çıkarmak · sahnenin olay bağlantısını kaldırmak · olayı kanondan çıkarmak. Bir alışveriş sahnesi kitaptan çıkarılınca para kesesine kendiliğinden geri dönmez.

### 9.7 Sürümler ve deneme kopyaları

- **Adlandırılmış evren sürümü** ("Birinci kitabın yayımlanan hâli"): yeni fikirler üzerinde çalışılırken önceki eserin dayandığı bilgi sürümü bozulmaz.
- **Deneme kopyası:** Radikal bir değişikliği denemek için evrenin bağımsız kopyası açılır. Değişiklikler ana evrene önizlemeyle ve elle taşınır; otomatik birleştirme sonraki bir aşamadır. Deneme kopyası aynı evrenin bir dalıdır, ayrı bir evren değildir (K18). Küçük düşünce deneyleri için bütün evreni kopyalamak yerine varsayım paketleri kullanılır (§3.11).
- **Görsel fark:** Ana evren ile dal üst üste gösterilir; yalnızca dalda olan kayıtlar, dalda silinenler, yönü, türü ya da tarihi değişen ilişkiler ayrı renklerle. Karşılaştırma ortak başlangıç sürümüne göre yapılır; eski dal ana evrende sonradan düzeltilmiş bilgiyi sessizce geri getirmez.
- **Daldan seçerek aktarma:** Aktarma ekranı neyin doğrudan taşınabildiğini, neyin başka kayıt gerektirdiğini ve neyin yeniden yorumlanacağını gösterir. Bağımlılıklar sessizce budanmaz; kullanıcı bağımlılığı da alabilir, mevcut bir kayda eşleyebilir ya da açık bırakabilir.
- **Kural ve hesap sürümü:** Yayımlanmış eserin dayandığı veri ve kural sürümü saklanır; kural değişince eski eser yeni sonuçlarla yeniden yazılmaz.
- **Yayımlanmış eser kilidi:** Yayımlanan eserde okura sunulan iddialar korunur; çelişen değişiklikte program sorar (F18).

---

## 10. Eşitleme, cihazlar ve yedek

Bu bölüm eşitlemenin tek tanımıdır. §17'deki platform anlatımı ve kabul senaryoları buna bağlanır. Dosya düzeni K15'e göredir. Program tek yazar içindir (K18): eşitleme yalnızca kullanıcının kendi kurulumları arasındadır.

### 10.1 Temel

- **Önce cihaz (local-first):** Program internet olmadan tam çalışır. Veri önce cihazdaki veritabanına yazılır.
- **Her kurulumda evrenin bütün kayıtları ve metinleri vardır.** Tablette yazılan sahneye bilgisayarda kaldığın yerden devam edilir; bilgisayar tabletin değişikliklerini Drive'dan okuyup kendi kopyasına işler. Görseller ve ekler cihaz politikasına göre indirilir (§10.12).
- **Birden çok evren:** Her evren ayrı eşitlenir, ayrı yedeklenir ve Drive'da ayrı klasördedir. Bir kurulum hangi evrenleri taşıyacağını seçer. Bir evren **bu cihazdan kaldırılabilir** (kullanıcı isteği, 19 Ekim 2026): dosyası, deneme kopyaları ve bu cihazdaki ayarları silinir; Drive'daki kopyaya ve öbür cihazlara dokunulmaz, eşitlenmişse yeniden indirilir. Kaldırmadan önce sorulur ve soru kaybolacak olanı söyler (gönderilmemiş değişiklik sayısı, son yedeğin tarihi ya da yedeğin hiç olmadığı); evren yalnızca bu cihazdaysa ve yedeği yoksa ikinci kez sorulur. Evreni Drive dahil her yerden silmek tanımlı değildir.
- **Değişiklikler işlem olarak kaydedilir:** "kayıt oluştur, alan değiştir, metin parçası değiştir, ilişki ekle, iki kaydı birleştir" gibi. Her işlemin benzersiz kodu, yazan kurulumun kodu ve o kurulumun sıra numarası vardır. Her işlem, yapıldığı anda hangi değişiklikleri gördüğünü de taşır; çatışma tespiti buna dayanır. Kaydedilmiş bir işlem bir daha değiştirilmez ve silinmez. Aynı kurulumun aynı sıra numarasıyla farklı bir işlem gelirse (çatallanma) hiçbiri üzerine yazılmaz: o evrenin eşitlemesi durur ve kullanıcıya söylenir; öbür evrenlerin eşitlemesi ve yedekleri sürer.
- **İki katman:** Yapılandırılmış veri (kayıtlar, alanlar, ilişkiler, işlem grupları, birleştirme) programın kendi işlem günlüğünde tutulur; çünkü bu belgenin istediği anlamlar (gizli seçim yok, işlem grubu bütünlüğü, ters birleştirme, silme–düzenleme paketi) hazır eşitleme kütüphanelerinin varsayılan davranışı değildir. Uzun metin alanlarının (sahne, geçmiş) içi bir metin CRDT'siyle tutulur (TK2); onun değişiklikleri de aynı günlükte taşınır (K15).
- **Tablolar günlükten baştan kurulabilir; büyük evrende de kısa sürer.** Görünen tablolar günlükten türetilir ve gerektiğinde baştan kurulur: tablo yapısı değişen bir program güncellemesinde, evren yeni bir cihaza indirilince, yedekten geri yüklenince ve başka bir cihazdan daha önceye düşen bir işlem gelince. Baştan kurmada bir metin alanının bütün değişiklikleri tek seferde uygulanır; metnin okunuşu, bağlantıları ve çatışma kayıtları alan başına bir kez üretilir. Sonuç, değişiklikleri tek tek uygulamakla aynıdır. Bellekte yalnızca son kullanılan metinler tutulur; gerisi cihazın diskinde durur ve gerektiğinde okunur. **Anlık görüntü:** her 5.000 işlemde bir tabloların o anki hâli aynı dosyada saklanır (en son iki görüntü); başka cihazdan daha önceye düşen bir işlem gelince tablolar baştan değil, o işlemden önceki en yakın görüntüden kurulur ve yalnızca ondan sonraki işlemler uygulanır. Görüntü yalnızca hızlandırmadır: işlemden sonra alınmış görüntüler silinir, tablo yapısı değişince hepsi silinir, uygun görüntü yoksa baştan kurulur. Kullanıcı tablette bunun için fazladan disk alanını kabul etti. Hedef: seri büyüklüğünde (yüz binlerce işlem) bir evrenin dakikalar içinde kurulması ve tablette belleğin 4 GB'ın altında kalması.

### 10.2 Drive'daki düzen

- **Değişmez parça dosyaları (K15):** Her kurulum değişikliklerini kendi klasörüne küçük parça dosyalar olarak yazar (`<evren>/islemler/<kurulum>/<ilk sıra>-<son sıra>`). Bir parça yüklendikten sonra bir daha değişmez. Drive'da dosyanın sonuna ekleme yapılamadığı için büyüyen tek bir dosya her eşitlemede baştan yüklenirdi; parçalar bunu önler.
- Okuyan kurulum her parçayı bir kez indirir ve saklar; yeni parçaları Drive'ın değişiklik listesinden bulur. Hiçbir kurulum başka bir kurulumun klasörüne yazmaz; böylece aynı dosyanın üstüne yazma yarışı olmaz. Anlam çatışmaları §10.3'te ele alınır.
- **Bir işlem grubu (§10.4) tek parçada gönderilir.** Parça ya tamamen yüklenip görünür ya da hiç görünmez; "grubun yarısı ulaştı" durumu taşıma sırasında oluşmaz. Uzun süre gönderilmemiş çok sayıda değişiklik birkaç parçaya bölünür; bir grup bölünmez.
- Belirli aralıklarla bütün evrenin **sıkıştırılmış anlık görüntüsü** yazılır ve hangi işlemleri içerdiğini kaydeder. Yeni ya da uzun süre kapalı kalmış bir kurulum önce görüntüyü, sonra yalnızca sonraki parçaları indirir.
- **Temizlik yalnızca taşıma kopyalarını siler.** Eski parçalar, bütün **etkin** kurulumların aldığı doğrulanmış bir kontrol noktasına kadar ve o noktayı içeren bir anlık görüntü yazıldıktan sonra silinir (§10.5). Kayıt başına sürüm geçmişi (§10.8) ve dal karşılaştırmasının ortak başlangıcı (§9.7) anlık görüntüde yaşar; temizlik onları silmez. Sıkıştırma sırasında gelen yeni işlem kaybolmaz.
- **Klasörler (TK4):** Eşitleme dosyaları Drive'ın kullanıcıya görünmeyen uygulama klasöründe, dönemsel yedekler kullanıcının görebildiği ayrı bir klasörde durur (§10.10).
- **Eşitleme anlık değildir.** Drive'ın anlık değişiklik bildirimi bir sunucu gerektirdiği için program açılışta, pencereye dönüldüğünde ve açıkken birkaç dakikada bir Drive'ı yoklar. Arayüz "anlık eşitleme" vaadi vermez; son eşitleme zamanını gösterir.
- Aynı işlem iki kez gelirse bir kez uygulanır. Dosya sayısı bir hedef değil, güvenli saklamanın sonucudur.

### 10.3 Çatışma

**Tanım:** İki değişiklik, biri öbürünü görmeden aynı şeye dokunduysa çatışabilir. Cihazların internette olup olmaması belirleyici değildir: bilgisayar eski bir sürümü açıkken tablette değişiklik yapılır ve bilgisayar onu almadan kendi değişikliğini gönderirse, ikisi de çevrimiçi olduğu hâlde aynı eski duruma dayanırlar.

**Birleştirme değer türüne göre yapılır.** Program "son yazan kazanır" yaklaşımını hiçbir türde kullanmaz.

| Değer türü | Kendiliğinden birleşen | İnceleme isteyen |
|---|---|---|
| Uzun metin (geçmiş, sahne) | Farklı paragraflardaki değişiklikler | Aynı paragrafı ya da aralığı etkileyen eşzamanlı değişiklikler. Metin CRDT'si ikisini de kaybetmeden birleştirir; program bunu değişiklik geçmişinden tespit edip incelemeye açar ve ortak başlangıçla birlikte üç sürümü gösterir |
| Tek değer (doğum yılı, ad) | Farklı alanlardaki değişiklikler | Aynı alanın iki değeri; ikisi de saklanır |
| Küme (etiketler, üyelikler) | Eklemeler ve farklı öğelerin çıkarılması | Bir cihazın çıkardığı öğeye öbürünün bağ kurması |
| İlişki | Farklı ilişkiler | Türü değiştirilen ilişkiye eski türün koşuluyla yeni bağ eklenmesi |
| Sıralı liste (bölümdeki sahneler) | Farklı öğelerin taşınması (her öğe kendi sıra anahtarını taşır; liste konumu saklanmaz) | Aynı öğenin iki farklı yere taşınması |
| Şema (şablon, alan türü, kural, takvim) | Farklı şablonlardaki ya da alanlardaki değişiklikler | Aynı alanın iki cihazda farklı dönüştürülmesi; eski şemayla girilmiş ve yeni şemaya dönüşemeyen değer ("Yaş" sayıya çevrilirken tablette "yirmili yaşlarında" yazılması). Değer silinmez, girildiği şema sürümüyle korunur ve dönüşüm kuyruğuna düşer (§9.5) |
| Yapı işlemleri | — | Silme ile düzenleme (§10.6), bölme ile eşzamanlı ilişki ekleme, ters yönde iki birleştirme |

- **Ters birleştirme:** İki cihaz aynı iki kaydı ters yönde birleştirdiyse teknik temsilci kod kurallı biçimde seçilir (yönlendirme döngüsü oluşmaz); hangi adın, alanın ve gizlilik ayarının korunacağı yazara sorulur.
- **Çatışma çözülene kadar** her iki değer de görünür ve hesaplar bunlardan birini gizlice seçmez (§2.2 kural 15). Çatışan doğum tarihleriyle yaş koşullu gösterilir. Kullanıcı neyin kendiliğinden birleştiğini, neyin inceleme beklediğini ve hangi hesapların bu yüzden güvenilir olmadığını tek bir yerde görür.
- **Çözüm de bir işlemdir.** Hangi sürümler arasındaki çatışmayı giderdiğini bilir. Başka cihazda verilen çözüm eski bir cihaz tarafından yeniden dayatılmaz; sonradan gelen daha yeni bir değişikliğe eski çözüm körlemesine uygulanmaz.
- **Eşitlemeden sonra denetimler yeniden çalışır.** Farklı alanların birleşmesi de kurgu çelişkisi üretebilir (bir cihazda doğum 420'ye, öbüründe ölüm 415'e çekilmiş); bu açıklanır.

### 10.4 İşlem grupları

Kullanıcının tek anlamlı işlem olarak yaptığı değişiklikler (bir satış: para azalır, para artar, sahip değişir, teslim koşulu gerçekleşir; bir kişiyi iki kimliğe ayırmak; editoryal birleştirme) **bir işlem grubu** olarak yazılır ve eşitlenir.

- Grup tek parça dosyasında gönderilir (§10.2).
- Buna rağmen grubun bir kısmı ulaştıysa (bozuk dosya, eski istemci) diğer cihaz onu tamamlanmış evren durumu gibi hesaplara ya da yayına sokmaz; "eksik ulaştı" olarak bekletir.
- Geri alma grubu bütün olarak hedefler. Gruptaki bir alan sonradan başka bir işlemle değiştiyse geri alma eski değeri körlemesine yazmaz; neyin etkileneceğini somut olarak söyler ("bu satışı geri alırsan sonradan devredilen kılıç etkilenir").
- Bu, genel bir ekonomi yasası değildir. Vergi, hediye, kayıp ve büyü kendi açık kurallarına sahip olabilir; işlem grubu yalnızca bütünlüğü korur.

### 10.5 Kurulumlar ve cihaz yaşam döngüsü

- **Yazan birim kurulumdur, ürün değil.** Aynı bilgisayardaki iki tarayıcı profili ya da silinip yeniden kurulan uygulama ayrı kurulumlardır; her birinin kodu, adı ("Ofis bilgisayarı, Edge") ve son görülme zamanı vardır.
- **Aynı kurulumdaki sekmeler** tek bir yazıcıyı paylaşır: sıra numarası kurulum içinde tek bir yerden verilir, iki sekme aynı numarayı kullanamaz.
- **Etkin ve kullanım dışı:** Kullanıcı bir kurulumu "artık kullanılmıyor" diye işaretleyebilir (kayıp telefon, yeniden kurulmuş bilgisayar). Geçmişi silinmez; yalnızca temizlik için beklenen etkin kurulumlardan çıkar. Program uzun süredir görülmeyen kurulumu önerir, kendiliğinden kullanım dışı bırakmaz.
- **Kullanım dışı kurulum geri dönerse** en güncel kontrol noktasını alır, kendi gönderilmemiş işlerini ayrı bir alanda korur ve yeniden uzlaştırır (§10.6'daki çatışma paketiyle).

### 10.6 Silme ile düzenleme çatışması

Bilgisayarda bir karakter silindi; çevrimdışı tablette o karakter için üç sayfa yazıldı. İki beklenti birlikte korunur:
- Karakter, eski cihaz bağlandı diye **kendiliğinden geri gelmez**.
- Üç sayfa **kaybolmaz**. Kurtarılabilir bir **çatışma paketi** olarak sunulur; kullanıcı metni not olarak saklar, başka kayda taşır ya da karakteri açıkça geri yükler.

"Silinmiş kayıt geri gelmez" kuralı yalnızca eski eşitlemenin kendiliğinden canlandırması içindir. Çöp kutusundan **açık geri yükleme** her zaman mümkündür ve kendi işlemi olarak eşitlenir.

### 10.7 Sürümler ve güncelleme

Dört sürüm ayrıdır: **uygulama sürümü**, **veri biçimi sürümü**, **kural sürümü** ve **eşitleme protokolü sürümü**. Cihazlar aynı sürümü çalıştırmak zorunda değildir: her cihazdaki uygulama ayrı güncellenir; uzun süre güncellenmeyen tablet eski sürümle çalışabilir.

- **Anlaşılmayan veri korunur.** Eski uygulama yeni bir alan türünü ya da ilişki biçimini okuduğunda onu atmaz ve üzerine yanlış yazmaz. Güvenle düzenleyemediği kaydı salt okunur açar ve "bu kayıt için güncelleme gerekli" der. Yazmaya devam etmek isteyen kullanıcı, evren verisini bozmayan ayrı bir not alanına yazabilir.
- **Tablo yapısını değiştiren güncellemede evren baştan kurulur ve beklenir** (kullanıcı kararı, 19 Ekim 2026). Kurma sürerken ekranın üstünde "Program güncellendi; evren yeni sürüme hazırlanıyor · %40" yazan bir şerit ilerlemeyi gösterir; evren yeni bir cihaza indirilirken de aynı şerit görünür. Kısa süren kurmada şerit gösterilmez. Tabloları yerinde dönüştürmek, kurma süresi rahatsız edici olunca değerlendirilir.
- **Güncelleme yazıyı kesmez.** Kaydedilmemiş metin varken uygulama zorla yeniden yüklenmez. "Güncelleme hazır, yazın kaydedilince uygulanacak" denir.
- **Kaydedilmemiş yazı kaybolmaz (yerel taslak).** Editördeki yazı asıl kayda geçene kadar bu cihazda ayrıca bir kurtarma taslağında durur: yazarken kısa aralıklarla, sayfa gizlenirken ve kapanırken hemen. Taslak evren verisi değildir, eşitlenmez ve kendiliğinden uygulanmaz; asıl kayıt başarılı olunca silinir. Program aniden kapandıysa metin açılınca "kaydedilmemiş yazı bulundu" denir ve kaydedilmemiş hâli gösterilir. Yazar kurtarır (taslak, yazıldığı sürümün üzerine yapılmış değişiklik olarak birleşir; sonradan kaydedilen silinmez) ya da vazgeçer. Karar verilene kadar taslak saklanır; yeni yazı onu ezmez. Kayıt başarısızsa bu söylenir ve taslağın korunduğu belirtilir.
- **Veri biçimi dönüşümü** öncesinde yerel taslaklar ve gönderilmemiş işlemler güvenli bir kopyaya alınır; günlük sıkıştırması bekleyen işi kaybetmez.
- Kurtarma paketi ve yedek, hangi veri biçimi sürümüyle açılabildiğini taşır.
- Kullanıcıya programlama dili kullanılmaz: "veriler korundu, güncelleme bekliyor" ya da "bu kayıt için güncelleme gerekli" yeterlidir.

### 10.8 Görünen durum ve geri alma

- **Doğrulanabilir eşitleme durumları** her zaman görünür: *Bu cihaza kaydedildi · Drive'a gönderildi · Tablet / bilgisayar şu değişikliğe kadar aldı · Yedek doğrulandı*. Drive'a gönderilmiş olmak öbür cihazın aldığı anlamına gelmez; çevrimdışı bir cihaz için "bütün cihazlar güncel" yazılmaz.
- **Evren içindeki durum özeti** gezinti çubuğunun altında katlı durur. Başlığı en zayıf halkayı söyler ("Yalnız bu cihazda kayıtlı", "3 değişiklik gönderilecek", "Kaydedildi ve eşitlendi"); açılınca bu cihazdaki kayıt, Drive durumu ve son doğrulanan yedek ayrı satırlarda ve kendi eylemleriyle görünür. Eşitleme ile yedeğin farkı tek cümleyle söylenir. Yedek hiç yoksa ya da yedi günden eskiyse satır sarıdır; yazıyı kesen bir uyarı çıkmaz. Son doğrulanan yedeğin zamanı özetin kapalı başlığında da ve Genel bakışta da görünür ("Son yedek: dün 21:04 · doğrulandı"); yedek yoksa ya da yedi günden eskiyse yanında "Şimdi yedekle" düğmesi çıkar (K28).
- **Yalnızca bu cihazda olan değişiklikler** ayrıca görünür: "Son eşitlemeden beri 3 değişiklik yalnızca bu telefonda." Cihazın yerel verisi kaybolursa yalnızca Drive'a başarıyla gönderilmiş kısım geri gelir; gönderilmemiş iş uzak kopyada yoktur.
- **Google oturumu düşünce yazma durmaz.** Üst çubukta "eşitlemek için dokun" görünür; dokununca izin yenilenir ve biriken değişiklikler gönderilir. Windows uygulamasında saklı bağlantı varsa izin dokunmadan yenilenir. Oturum modeli TK3'tür.
- **Silmede "Geri al" şeridi (K29):** Çöp kutusuna giden ya da tersi yeni bir işlemle yapılabilen silmelerde (kayıt, sahne, ilişki, harita işareti, bir listeden çıkarma) onay sorusu sorulmaz; iş hemen yapılır ve birkaç saniye "Çöp kutusuna taşındı · Geri al" şeridi görünür. Şerit kapandıktan sonra da iş çöp kutusundan ya da değişiklik geçmişinden geri alınabilir. Onay sorusu yalnız geri dönüşü olmayan işlerde kalır: evreni bu cihazdan kaldırmak, çöp kutusunu boşaltmak, yedeği mevcut evrenin üzerine yüklemek. Bir şablon alanını silmek değerleri silmez (§3.1). Bir listeden öğe çıkarmak (düzey, durak, niyet, okuma yolu…) eski listenin yeniden yazılmasıyla geri alınır. Tersi için henüz bir işlemi olmayan küçük kaldırmalar (değişim, kayıttan görsel çıkarma, varsayım, kural örneği, uyarlama eşlemesi, kalıcı iz, süreç engeli, dair inanç) şimdilik onay sorar; tersi eklendikçe şeride geçer.
- **Geri almanın türleri:** yerel geri al · eşitlenmiş bir değişikliğin tersini yeni işlem olarak yapmak (başka cihazın sonraki doğru işlemleri silinmez) · eski bir yedeği önce ayrı bir **kurtarma alanında** açıp incelemek ve ancak sonra mevcut evrenin yerine koymak. Dışarı yayımlanmış bir wikinin kopyası geri al düğmesiyle geri çağrılamaz.
- **Çevrimdışı hazırlık:** "Bu evren bu cihazda tam hazır mı?" sorusu cevaplanır: metinler, haritalar, görseller ve ekler indirilmiş mi (cihaz politikası §10.12)? İndirilmemiş harita ile silinmiş harita aynı mesajı vermez.
- **Kayıt başına sürüm geçmişi** ve **çöp kutusu:** Silinen kayıt bağlantıları ve ilişkileriyle geri gelir.

### 10.9 Tarayıcı depolaması

Uygulama verisini kendi tarayıcı motorunun depolamasında tutar (TK1, TK6). Bu depolama tek başına güvence değildir: uygulamayı kaldırmak ya da aynı programı bir tarayıcı sekmesinde açmak ayrı bir depolama, yani ayrı bir kurulum demektir (§10.5). Asıl güvence Drive eşitlemesi ve yedektir; Windows uygulamasında buna bu bilgisayardaki günlük yedek eklenir (§10.10). Sınırı §10.8'de yazılıdır. Windows uygulaması kaldırılırken "uygulama verilerini sil" seçilirse ikinci bir uyarı bu bilgisayardaki bütün evrenlerin kalıcı olarak silineceğini söyler; varsayılan cevap Hayır'dır ve güncellemede sorulmaz. Depolama uygulamanın kimliğine ve yerel adresine bağlı olduğu için ikisi de değişmez.

### 10.10 Dönemsel yedek

Drive'da eşitlemeden ayrı, kullanıcının görebildiği bir klasöre alınır (TK4). Varsayılan: günlük yedek 30 gün, her ayın ilk yedeği bir yıl saklanır (K21); ayardan değiştirilebilir. Her evren ayrı yedeklenir. Her medya dosyası yedeklerde bir kez saklanır; aynı görsel her günlük yedekte yeniden kopyalanmaz (§10.12). Son başarılı yedek tarihi gösterilir; uygulama kapalıyken kaçan yedek bir sonraki açılışta alınır. Takvimde bir tarihin görünmesi yedeğin alındığını göstermez. Kullanıcı istediğinde elle de yedek alır. Yedek ancak geri indirilip açıldıktan, her değişiklik satırı okunup sayısı tuttuktan sonra **doğrulandı** sayılır. Doğrulanamayan yedek başarılı sayılmaz: hiçbir eski yedek silinmez, aynı günün önceki yedeği de yerinde kalır ve hata gösterilir. Bu cihazda olmadığı için yedeğe giremeyen görsellerin sayısı yazılır. Günlük yedeğin görselleri pakette değil, yedek klasörünün "medya" klasöründedir: yedek, evrenin Yedek sekmesindeki listeden açılabileceği gibi "Yedekten geri yükle" ile dosya olarak da seçilebilir; ikisinde de görseller bilinen yedek klasörlerinden (bu bilgisayardaki, bağlıysa Drive'daki) alınır. Bulunamayan ya da bozuk görseller sessizce atlanmaz; listesi verilir.

**Bu bilgisayardaki günlük yedek (K31).** Windows uygulaması aynı kurallarla her evrenin günlük yedeğini Belgeler klasöründeki "Dünya Atlası yedekleri" klasörüne de alır; internet ve Google gerekmez, Drive'a bağlı olmak da gerekmez. Program açıldıktan yarım dakika sonra ve açık kaldıkça yarım saatte bir, bugünün yedeği olmayan evrenlerin yedeği alınır. Görseller klasörün "medya" klasöründe bir kez durur. Saklama süresi Drive yedekleriyle aynı ayardır. Yalnız programın kendi aldığı günlük yedekler silinir: kullanıcının bu klasöre koyduğu başka dosyalara (elle alınmış tam yedekler dahil) dokunulmaz; aynı adlı bir dosyanın üzerine yazılmaz, yeni dosyanın adına sayı eklenir. Dosya önce geçici adla yazılır, diske işlenir, sonra yerine konur; elektrik kesilse de yarım yedek kalmaz. Program klasördeki yedeklerinin listesini klasörde tutar; liste silinir ya da bozulursa yedekler kendi içlerinden yeniden tanınır, bu yüzden klasör başka bir bilgisayara kopyalanınca da çalışır. Bu yedek bir evren için kapatılabilir. Program yalnızca bu klasöre yazar; başka hiçbir klasöre erişmez. Windows uygulaması kaldırılırken "uygulama verilerini sil" seçilse de bu klasör silinmez. Tarayıcıda bu yedek yoktur.

### 10.11 Dışa aktarma ve taşınabilir paket

- **Okunabilir dışa aktarma:** bağlantıları korunmuş Markdown (Obsidian uyumlu), PDF, EPUB. Neyi kaybettiği yazılır (Markdown okunur ama tarihli inançları kaybeder).
- **Taşınabilir evren paketi:** metinler, kodlar, ilişkiler, zaman aralıkları, medya, takvim, şablon ve kural sürümleri, veri biçimi sürümü ve bir açıklama dosyası. Kayıpsız geri yüklenir. Paket evrenin büyüklüğünden bağımsız olarak parça parça yazılır ve okunur; hazırlanırken yapılan değişiklikler pakete karışmaz. Geri yükleme hiçbir şey yazmadan önce paketin her değişiklik satırını okur ve sayısını denetler; tutmazsa paket açılmaz. Yarıda kesilen geri yükleme evren sayılmaz; aynı paket yeniden yüklenince baştan kurulur. Pakette bu cihazın kendi değişiklikleri varsa paket her zaman ayrı evren olarak açılır. Okunamayan ya da bozuk görsel geri yüklemeyi durdurmaz; eksik görsellerin listesi verilir. İçe aktarım önce ayrı bir alanda açılır ve "şu bağlantılar korundu, şu işaretler eşlenemedi" raporu verir (kurtarma provası). Elle seçilen bir yedek Google'ın dosya seçicisiyle açılır (TK4).
- **Markdown içe aktarımı:** Mevcut notlar ve Claude'daki prototipin verisi aşama 1'de içe alınabilir (A6, §14). İçe aktarım da önce ayrı alanda açılır ve rapor verir.
- **İçe aktarılan içerik temizlenir.** Paketteki ya da yapıştırılan biçimli metin gösterilmeden önce çalıştırılabilir içerikten arındırılır. Uygulama evrenin tamamını ve Google iznini tuttuğu için bu bir güvenlik kuralıdır.

### 10.12 Medya dosyaları

- Görseller, haritalar ve ekler içerikleriyle adlandırılmış değişmez dosyalardır: aynı dosya iki kez yüklenirse bir kez saklanır; değişen görsel yeni bir dosyadır (TK5).
- Kayıtlar ve metinler her kurulumda tamdır (§10.1); medya cihaz politikasına göre indirilir. Varsayılan: Windows ve tablette hepsi.
- "İndirilmemiş" ile "silinmiş" ayrı gösterilir (§10.8).
- Fotoğrafı çekilmiş eskizler ve görseller içe alınırken fotoğraf meta verisindeki konum bilgisi silinir.
- Yedeklerde her medya dosyası bir kez saklanır (§10.10).

---

## 11. Paylaşım ve yayın

**Durum:** Wiki şimdilik yok ve hiç yapılmayabilir (K20). Bu bölüm, kullanıcı ileride yayın isterse uygulanacak tasarımdır ve geliştirme sırasında (§14) yer almaz. Yayın kapsamı alanları (§3.6, §5.2) yine de veri modelinde baştan bulunur, çünkü sonradan eklemek pahalıdır.

### 11.1 Wiki

Salt okunur, kitap düzeninde (kapak, giriş, türlere göre içindekiler). Yayın seçimi bölüm ve blok bazındadır: bir karakterin tanıtımı yayımlanırken gerçek kimliği gizli kalabilir.

### 11.2 Ayrı yayın paketi

Wiki, ana veritabanını okura gönderip gizli alanları ekranda saklayarak yapılmaz. Yayın derlenirken yalnızca o yayın kapsamına açık verilerden **ayrı bir paket** üretilir. Arama dizini, özetler, bağlantı başlıkları, geri-atıflar, ağ ve soy ağacı, harita işaretleri, zaman çizelgesi, görseller, dosya adları, sayımlar ve izin verilen hesaplar bu paketten çalışır. Yayımlanan paket ayrı bir sürüm olarak saklanır. "Sızıntı imkânsız" gibi mutlak bir vaat verilmez; kapsam ve yayın öncesi kontroller aşağıda tanımlıdır.

- **Yayın iddialardan kurulur:** Okura açık anlatı her zaman gerçeğin alt kümesi değildir. Halkın kralın doğal öldüğüne inandığı bir evrende okura sunulan vakayiname bu yanlış iddiayı içerebilir. Yayın; seçilmiş iddialar, yazarın açık anlatımı ve okuma kapsamından oluşur.
- **Okura görünen kimlikler:** Yazarın bildiği tek kişi okur için iki ayrı kimlik olabilir (Kara Tilki ile saray kâtibi). Pakette her okur kimliğinin kendi adresi ve kodu olur; ortak bir bağlantı adresi, dosya adı ya da kod bu eşitliği açığa vurmaz. Eşitlik okura açıklandığı yayından itibaren pakete girer (§3.12).
- **Paket kodları türetilir.** İç kodlar oluşturulma zamanını içerebildiği için pakete hiç girmez. Paketteki bütün kodlar (kayıtların, okur kimliklerinin, dosyaların) yayın serisine özel gizli bir anahtarla iç kodlardan türetilir: baskılar arasında sabit kalır, bağlantılar kopmaz, ama iç koda geri götürülemez.
- **Yayın öncesi sızıntı taraması:** Gizli kapsamdaki bütün dizgeler (adlar, lakaplar, eski adlar, iç kodlar, dosya adları) paketteki her dosyada aranır: sayfalar, veri dosyaları, arama dizini, dosya adları ve görsel meta verisi. Eşleşme yayını durdurur; eşleşme açık bir eşadlı kayıttan geliyorsa yazara gösterilir ve yazar onaylar. Görsellerin içi okunamaz (K1); haritaya yazılmış gizli bir adı program göremez. Bu yüzden her görselin kendi yayın izni vardır ve varsayılanı kapalıdır.
- **Yayın mekanizması (TK7):** Program paketi bir zip dosyası olarak üretir; yükleme ayrı ve bilinçli bir adımdır. Uygulama yayın için bir GitHub ya da barındırma anahtarı tutmaz.
- **Gizli verinin pakete kaçması** bir hatadır; **okurun açık ipuçlarından doğru tahmin yapması** çoğu zaman hikâyenin amacıdır. İkisine aynı uyarı verilmez. Okurun aklı ve tahminleri denetlenemez.

### 11.3 Yayın önizlemesi ve okuma kapsamı

Okurun göreceği hâl yayımlamadan önce incelenir. "Bir eserin 8. bölümüne kadar" kapsamı iki farklı şey olabilir ve hangisi olduğu seçilir:
- **Okuma tercihi:** Paket bütün içeriği taşır; okur ileriyi görmemeyi seçer. İleri içerik teknik olarak pakettedir.
- **Teslim sınırı:** Paket yalnızca 8. bölüme kadar olan içeriği taşır. Gerçek gizlilik bu kiple sağlanır.

### 11.4 Yayın ve yazar alanının ayrılması

Wiki yapılırsa yazar uygulamasından ayrı bir kökende yayımlanır (A3). Köken kuralının tek tanımı §17.4'tedir.

### 11.5 Evren içi belge çıktısı

Mektup, gazete sayfası, ilan, seyahat izni, günlük, antlaşma, mezar yazısı. Metni kullanıcı yazar; program düzeni, mührü, tarihi ve bağlantılı kişileri ekleyerek sunar.

---

## 12. Görünüm ve giriş yöntemleri

### 12.1 Görünüm (K8)

- **Soft, temiz, narin:** açık renkli zemin, yumuşak renk yüzeyleri, ince çizgiler, bol boşluk, okunaklı yazı. Türler için soluk renkli küçük sekmeler: her tür grubunun (insanlar, yerler, kültür, işleyiş, zaman, anlatı) açık ve koyu temada sabit bir rengi vardır; tür rozeti, ağdaki düğüm, listeler ve komut paleti aynı rengi kullanır (K28). Tür yalnızca renkle ayırt edilmez, yanında bir simge ya da kısa ad bulunur. Kâğıt dokusu, çerçeveli kartlar, arşiv fişleri ve pusula motifi yalnızca kapakta, wikide ve evren içi belge çıktılarında. yazar.io'nun kimliği (gotik başlık, aynı renk dörtlüsü) kopyalanmaz. Koyu tema da vardır. **Program koyu temayla açılır**; "Eşitleme ve cihazlar" sayfasındaki Görünüm ayarından açık tema ya da cihazın ayarı seçilebilir. Seçim yalnızca o cihazda tutulur (K28, 20 Ekim).
- **Narin, silik değildir.** Yüzeyler ve süsler yumuşak olabilir; metin, seçim durumu, klavye odağı ve önemli kontroller açıkça seçilir. Ölçüt WCAG 2.2 AA'dır: normal metin için en az **4,5:1**, büyük metin için en az **3:1** kontrast. Odak ve kontrol sınırları da yeterince belirgindir. Bu ölçütler hem açık hem koyu temada sağlanır; bir otomatik sınama programın bütün yazı ve zemin renk çiftlerini ölçer (K28). 12 pikselden küçük italik açıklama yazısı kullanılmaz. Aynı düzey dokunma hedeflerini de kapsar: her dokunulabilir öğe en az 24×24 CSS piksel boyutundadır ya da yeterli aralıkla durur. Renk tek başına bilgi taşımaz.
- **Geçişler (K32):** pencere, menü, katlanan bölüm, kenardan gelen panel ve sayfa değişimi 150–200 milisaniyelik hafif bir kayma ve solmayla açılır; üzerine gelince renk değişimleri de yumuşaktır. Zıplama, büyüyüp küçülme gösterisi ya da uzun geçiş kullanılmaz; yazarken dikkat dağıtmamalıdır. Yazma ekranında sahneden sahneye geçerken bağlam paneli yerinde durur, yalnız yazar açınca kayarak gelir. Cihazın "animasyonları azalt" ayarı açıksa hiçbir geçiş oynamaz.
- Yazma ekranı sade kalır; yoğun dekor yalnızca kapakta, wikide ve boş ekranlarda kullanılır.
- **Çizimlerin ortak ilkeleri (K30):** çizim içindeki yazı en az 13 pikseldir. Bir anlam (bağ türü, kesinlik, belirsizlik) renkle birlikte çizgi biçimi ya da yazıyla da verilir. Her çizimin yazılı bir eşi vardır: liste, tablo ya da tarih defteri. Çizimlerdeki öğeler klavyeyle seçilir ve açılır. Ek çizim kütüphanesi kullanılmaz; yerleşim hesapları tarayıcıdan bağımsız, sınanabilir hesaplardır.

### 12.2 Giriş yöntemleri

- Fareyle üzerine gelmenin ve klavye kısayolunun her işlevinin dokunmatik bir karşılığı vardır. **Dokunup basılı tutmak tek yol değildir** (metin seçimiyle çakışabilir); görünür bir düğme ya da seçili öğe eylemi de aynı işi yapar.
- **Bağlantı kurmak** her cihazda bir düğmeyle de yapılır (§5.1).
- **Kısayollar görünür (K28):** komut paletinde her komutun yanında ve düğmelerin ipucunda kısayolu yazar. "Kısayollar" listesi komut paletinden ve metin dışındayken `?` tuşuyla açılır; Türkçe klavye notunu taşır (`[` = AltGr+8). Liste programın tanıdığı kısayollarla aynı kaynaktan üretilir.
- **Sürüklemenin alternatifi vardır:** küçük bir işareti tutturamayan kullanıcı "taşı" komutuyla ya da koordinat seçerek yerini değiştirebilir.
- **Kalem ve parmak ayrı davranabilir** (tarayıcının işaretçi olayları giriş türünü ayırt eder): kalem çizer ya da işaret taşır, parmak kaydırır. Bu, hedef cihazda bütün kalem, avuç ve düğme davranışlarının hatasız işleyeceği anlamına gelmez; kullanıcı kalemle seçme, çizme ve taşıma kipleri arasında görünür biçimde geçebilir.

### 12.3 Cihaza göre düzen

Ortak olan sahne, bağlam ve çalışma niyetidir; pencere genişliği, kaydırma, yakınlaştırma ve panel yerleşimi cihaza özeldir (§5.9). Tablette yapılan düzen değişikliği bilgisayarın masaüstü düzenini bozmaz. Cihazlar K16'daki sırayla ele alınır: önce Windows, sonra tablet.

| Cihaz | Öne çıkan kullanım |
|---|---|
| Windows 11 bilgisayar | Uzun yazma, klavye ve komut paleti, geniş ekranda yan panel |
| Galaxy Tab S11 Ultra | S Pen ile harita ve kroki, iki panel yan yana, okuma ve düzenleme; DeX'te bilgisayar düzeni |


### 12.4 Sayfa rehberi ve dil (K25)

- Her sayfanın (evrenler, eşitleme, yazma, masa, kayıtlar, kayıt sayfası, haritalar, takvim, inceleme, "Diğer" altındakiler ve her görünüm) başlığının yanında küçük bir **"?" düğmesi** bulunur. Düğme, o sayfanın rehberini sağdan açılan bir yan panelde gösterir; sayfa panelin yanında görünür kalır. Panel Esc, "Kapat" ya da yeniden "?" ile kapanır.
- Rehber dört kısımdır: sayfa ne işe yarar, ne zaman kullanılır, adım adım nasıl kullanılır, bilmeniz gerekenler. Rehberde programlama terimi geçmez; örnekler uydurmadır.
- **Yazarlık rehberi (K27):** sayfa rehberi düğmelerin nasıl kullanıldığını anlatır; yazarlık rehberi bir yazarlık işinin ne olduğunu, neden işe yaradığını ve ne zaman gerekmediğini. Programla gelen 24 konu aynı biçimde yan panelde açılır: nedir, neden işe yarar, ne zaman gerekmez, küçük bir adım; katlı olarak sorular, işe yarayan ve yanıltıcı örnek, takılırsanız, sınır; sonda başka konulara bağlantı. Üç yerden açılır: sayfa rehberinin "Bu işi neden yapıyorum?" kısmı (sayfaya uygun konular ve bütün konular), soru gruplarındaki "Bu sorular neden?" ve komut paleti. Rehber kullanıcının verisine bakmaz, veri yazmaz; yazarken kendiliğinden açılmaz. Metinlerin kaynağı `analiz/yazarlik-ve-roman-serisi-calisma-rehberi.md`'dir; örnekler uydurma bir seriden gelir.
- **Boş sayfalar (K28):** her sayfanın boş hâli bir cümleyle ne işe yaradığını söyler, tek bir ilk adım düğmesi (işi yapar) ve yazarlık rehberinde ilgili konuya bağ taşır; başlık "henüz yok" değil "ilk … ekleyin" der. Kart biçimli listelerin sonunda "+ Yeni …" kartı durur. Sayfa rehberindeki "Bu işi neden yapıyorum?" kısmı bütün sayfalarda en az bir konuya bağlanır.
- Kayıt sayfasında şablondaki sorular birden çok setten geliyorsa (eserde "Hikâye çekirdeği" ve "Bu kitabın görevi") ayrı başlıklarla gösterilir.
- **Hitap "siz"dir.** Açıklama, uyarı, boş durum ve hata metinleri ikinci çoğul kişiyle yazılır ("seçin, yazın"); düğme ve menü etiketleri kısa emir ya da ad olarak kalır ("Kaydet", "Yeni takvim"). Metinler doğal, kısa cümlelerle yazılır; terimler §0.5'teki anlamlarıyla kullanılır.
---

## 13. Kullanım akışları ve kabul senaryoları

Bunlar çalıştırılmış yazılım testleri değil, tasarımın hedeflediği davranışlardır. Her senaryo, davranışın tanımlandığı bölüme bağlanır. Kodlamadan önce akışlar çizilecektir. Kod başlayınca senaryolar otomatik testlere dönüşür; eşitleme senaryoları (§13.4) rastgele işlem dizileri ve rastgele teslim sırasıyla, bütün kurulumların aynı duruma ulaştığını sınar.

### 13.1 Temel akışlar

| # | Durum | Beklenen | Tanım |
|---|---|---|---|
| T1 | Telefonda fikir yakalama | Form açmadan hızlı not; kaydedildiği görülür | §5.8 |
| T2 | Notu karaktere dönüştürme | İçerik korunur, not ile kayıt bağlı kalır | §4.6 |
| T3 | Karakterin adını değiştirme | Bağlantılar korunur, eski adla da bulunur | §5.1 |
| T4 | Geçmişteki bir olayı düzeltme | Etki raporu çıkar, önceki sürüme dönülebilir | §9.2 |
| T5 | Bölüm yazarken bilgiye bakma | Yan panel ve bağlam paneli, metinden ayrılmadan | §5.4, §5.5 |
| T6 | Yanlışlıkla silme | Çöp kutusundan bağlantılarıyla geri gelir | §10.8 |
| T7 | Wiki yayımlama (K20 değişirse) | Önizleme yapılır; gizli kapsamda işaretli hiçbir veri ve gizli bir kaydın hiçbir adı, kodu ya da dosya adı pakette bulunmaz (sızıntı taramasıyla sınanır) | §11.2 |
| T8 | Bilgisayarı açınca dün kalınan yere dönme | Son sahne, imleç ve yan paneldeki kayıtlar geri gelir | §5.9 |
| T9 | Telefonda Türkçe klavyeyle yazarken bir ada bağlantı kurma | Klavyenin üstündeki Bağla düğmesiyle, sembol sayfasına geçmeden | §5.1 |
| T10 | Bir adı yazar düzeltmesiyle değiştirme | Ek uyumu önizlemesi ("Velkar'dan → Elin'den, 14 yer"); yazar onaylar | §5.1 |
| T11 | "kilic" diye arama | "Kılıç" ve "kılıcı" bulunur; eski adlar da sonuçta | §18 |
| T12 | Sahnede "Elin'in eli yaralandı" kaydı | Olay açmadan kaydedilir; sahne olayına bağlanır | §3.3, §5.6 |
| T13 | İnternetsiz açılış | Program açılır; yazma ve arama çalışır; son eşitleme zamanı görünür | §10.1 |
| T14 | Notları ve prototipi içeri alma | Ayrı alanda açılır, rapor verir; bağlantılar korunur | §10.11 |

### 13.2 Zaman, anlatı ve bilgi

| # | Durum | Beklenen | Tanım |
|---|---|---|---|
| Z1 | Geçmişe dönüş sahnesi başka bölüme taşınır | Evren tarihi değişmez; okuma sırası güncellenir; anlatı etki özeti çıkar | §3.3 |
| Z2 | Kralın ölüm tarihi değişir | Bağımlı kayıtlar gerekçesiyle incelemeye sunulur | §9.2 |
| Z3 | Sonraki sahnede ölü kraldan bahsedilir | Hata değil (rol "adı anılıyor") | §3.2 |
| Z4 | Mirasçı halkın gözünden açılır | Halkın inandığı bilgi gösterilir | §3.6 |
| Z5 | Deneme kopyasında kral yaşatılır | Sabit sürüm değişmez | §9.7 |
| Z6 | Prens ilk kitaptan on yıl sonra kral olur | Önceki kitaptaki tarihli prenslik bilgisiyle çelişmez | §3.5, F18 |
| Z7 | Takvim başlangıç eşlemesi bilinmiyor | Kesin dönüşüm uydurulmaz | §3.4 |
| Z8 | Mektup okunduktan sonra evren içinde sahteleştirilir | Eski okuyucunun inancı ve gördüğü sürüm korunur | §3.6 |
| Z9 | Bilinmeyen fail hakkında biri bir iddiaya inanır | Yazar gerçeği belirlemediyse "yanlış biliyor" denmez | §3.6 |
| Z10 | Aynı düello iki bakış açısından anlatılır | Yaralanma bir kez gerçekleşir | §2.2 kural 6 |
| Z11 | Para harcanan sahne kitaptan çıkarılır | Harcamayı kaldırmak ayrı işlemdir | §9.6 |
| Z12 | Bir olayı anlatan son paragraf silinir | Olay silinmez; "metne bağlı değil" görünür | §5.7 |
| Z13 | Kişi tek bir gün sarayda görülmüştür | Sonraki tarihlerde orada yaşıyor sayılmaz | §3.5 |
| Z14 | Zaman filtresi düz metin gömmesinde değişir | Paragraf kendiliğinden yeniden yazılmaz | §5.2 |
| Z15 | Saç rengi değişir; işaret yalnızca eşya taşımaya bağlı | İnceleme açılmaz | §9.3 |
| Z17 | Takvimin bir ayına beş gün eklenir | Önce etki önizlemesi; girilmiş ifadeler korunur, eksen yeniden hesaplanır; çapalı tarihlerin davranışı gösterilir | §3.4 |
| Z18 | Fey'de geçen bir sahnenin tarihi | Fey akışındaki tarih ana eksene oranla çevrilir; oran aralıksa sonuç da aralıktır | §3.4 |
| Z19 | Kara Tilki'nin Arven olduğu 8. bölümde açıklanır | Okur görünümünde 8. bölüme kadar iki ayrı kişi; yazar görünümünde tek kişi | §3.12, §3.6 |

### 13.3 Evren modeli ve hesaplar

| # | Durum | Beklenen | Tanım |
|---|---|---|---|
| D1 | Kılıç haberciye taşıtılır | Taşıyan değişir, sahip değişmez | §3.8 |
| D2 | İkinci ortak sahip eklenir | Tek sahiplik tanımlı değilse ilk sahibin hakkı kapanmaz | §3.8 |
| D3 | Şehir fethedilir, para alanı varsayılan | Para ve hukuk sessizce değişmez | §3.7 |
| D4 | İki kültür aynı alana farklı varsayılan getirir | Son eklenen sessizce kazanmaz | §3.7 |
| D5 | Karakterin lonca üyeliği girilmemiş | "Üye değil" sayılmaz; DEĞİL filtresinde "bilgi yok" grubunda görünür | §18 |
| D6 | Yazar tanrıların varlığını bilerek açık bırakır | Eksik ya da tutarsız sayılmaz | §3.6 |
| D7 | İki lonca evrende birleşir | Eski loncaların kodu ve geçmişi korunur | §9.5 |
| D8 | Birleşik tapınak sayfasına ikinci bina eklenir | Eski bağlantıların hedefi değişmez | §3.1 |
| D9 | Ok sayısı 5'ten 3'e düşer | Net fark −2; iki ok atıldığı kaydedilmez | §5.6 |
| D10 | Kapı önce kapalı, sonra açık | Açılma yöntemi uydurulmaz | §5.6 |
| D11 | Makam yeminle kazanılıyor; tören yeminden sonra kesilir | Kazanım ilgili kurala göre korunur | §3.10 |
| D12 | Haber bir günlük hatla ulaşabilir | Gönderme ve teslim kaydı yoksa "biliyor" denmez | §2.2 kural 7 |
| D13 | Aynı söylentiyi beş kişi aynı belgeden aktarır | Beş bağımsız kaynak sayılmaz | F08 |
| D14 | İki hesap köprünün zıt durumlarına dayanır | Sonuçlar tek senaryo gibi birleştirilmez | §2.2 kural 14 |
| D15 | Eksik rota ağında uygun yol bulunamaz | Evren genelinde imkânsız ilan edilmez | §2.2 kural 13 |
| D16 | Harita ölçeksiz, yol süreleri kayıtlı | Süre ağı sorguları çalışır; görselden mesafe uydurulmaz | §8.4 |
| D17 | Geçide varıldığında izin bitmiştir | Yola çıkıştaki geçerlilik yetmez | §8.4 |
| D18 | Hesap kuralı değişir | Eski sonucun dayanağı ve yayımlanmış sürüm korunur | §9.7 |
| D19 | Doğum tarihinin çözülmemiş iki değeri var | Yaş gizlice birinden hesaplanmaz | §2.2 kural 15 |
| D20 | "Lonca üyesi olmayanlar" sorgusunda bir dağ kaydı | "Konu dışı" grubunda kalır; "doğrulanmış hayır" sayılmaz | §3.6, §18 |
| D21 | Üye listesi eksiksiz beyan edilmiş; bir kişinin üyeliği "bilerek açık" | "Hayır" sayılmaz; beyan ekranında istisna olarak listelenir | §3.6 |
| D22 | Fikir durumundaki doğum yılı ölüm yılıyla çelişir | Uyarı sessiz grupta görünür, inceleme kuyruğunu doldurmaz | §3.6 |

### 13.4 Eşitleme, sürüm ve yedek

| # | Durum | Beklenen | Tanım |
|---|---|---|---|
| E1 | İki cihazda ilişkili tarihler değişir | Birleşme sonrası çelişki açıklanır, değer kaybolmaz | §10.3 |
| E2 | İki çevrimiçi cihaz aynı eski değeri değiştirir | İnternet var diye çatışma yok sayılmaz | §10.3 |
| E3 | İki cihaz aynı uzun metnin farklı paragraflarını değiştirir | İkisi de korunur | §10.3 |
| E4 | İki cihaz ters birleştirme yapar | Döngü, veri kaybı ya da sessiz kod değişimi olmaz | §10.3 |
| E5 | Anlık görüntü yazılırken telefon yeni işlem yükler | Yeni işlem kaybolmaz | §10.2 |
| E6 | Aylarca çevrimdışı kalan tablet geri gelir | Tekrarlar bir kez uygulanır, silinmiş kayıtlar kendiliğinden geri gelmez | §10.2, §10.6 |
| E7 | Telefon gönderdi, tablet çevrimdışı | "Tablet güncel" denmez | §10.8 |
| E8 | Eski telefon "kullanılmıyor" işaretlenir | Temizlik etkin kurulumlara göre yapılır; geçmiş kaybolmaz | §10.5 |
| E9 | Silinmiş kayda çevrimdışı cihazda metin yazılmış | Metin korunur, kayıt kendiliğinden etkinleşmez | §10.6 |
| E10 | Eski uygulama yeni alan türünü alır | Anlamadığını atmaz, üzerine yazmaz | §10.7 |
| E11 | Güncelleme sırasında kaydedilmemiş metin var | Zorla yeniden yükleme yok | §10.7 |
| E12 | Çok parçalı satış işleminin yarısı ulaşır | Tamamlanmış evren durumu sayılmaz | §10.4 |
| E13 | Yedekten geri yükleme | Kod, ilişki, metin, görsel, takvim ve kural sürümleri birlikte gelir | §10.11 |
| E14 | Bilgisayar "Yaş" alanını sayıya çevirirken çevrimdışı tablet o alana "yirmili yaşlarında" yazar | Değer korunur, dönüşüm kuyruğuna düşer | §10.3 |
| E15 | Bir satış işlem grubunun yüklenmesi yarıda kesilir | Parça hiç görünmez; öbür cihazda yarım satış oluşmaz | §10.2 |
| E16 | Aynı paragraf iki cihazda eşzamanlı düzenlenir | Hiçbir yazım kaybolmaz; incelemeye açılır; işaretler yerinde kalır | §10.3, §5.7 |

### 13.5 Yayın

| # | Durum | Beklenen | Tanım |
|---|---|---|---|
| Y1 | Gizli eş kimlikler okura ayrı gösterilir | Ortak adres ya da kodla eşitlik açığa çıkmaz | §11.2 |
| Y2 | Yazar uygulaması ya da wiki bir hesap adresinin alt yolunda çalışacak gibi kurulur | Yol ayrımı yalıtım sayılmaz; her biri kendi kökenindedir | §17.4 |
| Y3 | Gizli bir ad, pakette bir görselin dosya adında kalmış | Sızıntı taraması yayını durdurur | §11.2 |

### 13.6 Birleşik örnekler

Birden çok özelliğin birlikte doğru çalışmasını sınar.

**A. Taç giyme yarıda kesiliyor.** Kuzey geleneğinde yeminle hükümdarlık başlar; başkent hukukunda konseyin tescili gerekir; tören yeminden sonra, tescilden önce kesilir. Beklenen: tek bir "kral oldu/olmadı" sonucu yok, iki otoritenin farklı hükmü görünür (§3.10). Elin yemini duymadı, Kaelen duydu ama başkent kuralını bilmiyor, okur yemini gördü ama tescil koşulunu bilmiyor: evren durumu, karakter inancı ve okur bilgisi ayrı sonuç verir (§3.6). Hazırlıkta tüketilen kristal geri dönmez (§3.10). Sahne çıkarılırsa olay kalır (§9.6). "Aslında yemin edilmedi" geçmiş düzeltmesidir ve hukuki sonuçlar, inançlar ve yayımlanmış ifadeler incelemeye açılır; son paragrafı kısaltmak evreni değiştirmez (§9.2).

**B. Kuşatma hazırlığı.** 120 kişilik birliğin 30 okçusu ve savaşamayacak 10 üyesi var; örtüşme bilinmiyor. Hazır okçu 20–30 aralığındadır; "25" yazılmaz (§2.2 kural 16). Komutan en az 25 okçu istiyorsa program gereken bilgiyi gösterir: "savaşamayacak 10 kişide en fazla 5 okçu olmalı". Bir okçuya ad verilince birlik 121 olmaz (§3.8).

**C. Çevrimdışı tablet, silinen kayıt, eski sürüm.** Bilgisayarda yan karakter silindi; eski sürümle çalışan çevrimdışı tablette ona üç sayfa yazıldı. Beklenen: üç sayfa korunur ve çatışma paketi olarak sunulur, karakter kendiliğinden canlanmaz (§10.6); eski uygulama veriyi budamaz, güncellemede yerel taslak korunur (§10.7); sıkıştırma bekleyen işi kaybetmez (§10.2); bir cihazda verilen çözüm öbüründe yeniden dayatılmaz (§10.3).

**D. Velkar'ın suyu kesiliyor.** Ekonomi (suya bağlı mahalleler), antlaşma (su hakkı), siyasi yapı (antlaşmayı uygulayacak makam boş), inanç (kesintiyi bir yasağa bağlayan din), haber (sarayın bildiği ile halkın duyduğu) ve sahneler bir çalışma masasında birlikte kullanılır. Program sonuç ilan etmez, ilgili bilgileri bir araya getirir.

### 13.7 Öneri senaryoları

Bu senaryolar Öneri durumundaki fikirlere dayanır; o fikirler tasarıma alınmadıkça kabul ölçütü değildir.

| # | Durum | Beklenen | Fikir |
|---|---|---|---|
| Ö1 | Zaman yolcusu kendi doğumundan önceki yıla gelir | Seçili modelin kişisel kronolojisi kullanılır | F45 |
| Ö2 | Tek şifacı aynı öğlen iki plana atanmış | Çakışma görünür; öncelik kararı yazarındır | F36 |

---

## 14. Geliştirme sırası (kapsamı değil, sırayı gösterir)

Veri modelinin temel sözleşmeleri (§18) baştan kurulur. Modelin her şeyi baştan bitirdiği iddia edilmez; hedef, kodların korunması, sürümleme, veri kaybetmeden dönüşüm ve eski projelerin açılabilmesidir. Kodlama yalnızca kullanıcının açık onayıyla başlar (K9).

### 14.1 Aşamalar

| Aşama | İçerik |
|---|---|
| **0. Koddan önce** | §3 ayrımları · §18 sözleşmeleri · kullanım akışlarının çizimleri · açık kararlar (§1.2) · Windows'taki teknik deneyler ve kapattıkları TK kararları (§14.3) |
| **1a. Windows'ta yerel sürüm** | Birden çok evren, kayıtlar, serbest metin, bağlantılar (seçim kutusu, Bağla düğmesi, Türkçe ek modülü), arama (§18), hızlı not, görseller, temel ilişkiler, karar durumu ve varsayılan yorum, otomatik kaydetme, sürüm geçmişi, çöp kutusu, **ilk günden işlem günlüğü** (tek cihazda bile; eşitleme sonradan veri dönüşümü gerektirmeden eklenir), tarih saklama biçimi (§3.4) ve küçük tarih karşılaştırıcısı, sahne olayı, dosyaya tam yedek ve geri yükleme, Markdown ve prototip içe aktarımı (A6) |
| **1b. Drive** | Drive eşitlemesi (§10) ve dönemsel yedek. Aynı bilgisayardaki iki tarayıcı profili iki ayrı kurulum sayıldığı için (§10.5) eşitleme önce tek bilgisayarda sınanır |
| **2. Günlük kullanım** | Yan panel, özet kartı, komut paleti, düzenlenebilir şablonlar ve soru kütüphanesi, açık meseleler ve gerekçe defteri, eser / bölüm / sahne, durum geçmişinin saklanması, sahne bağlam paneli, basit zaman çizelgesi ve özel takvim tanımı; harita: yükle, işaretle, bağla; sağlık taraması, birleştirme ve bölme, inceleme kuyruğu |
| **3. Evreni inceleme** | Soy ağacı, filtreli ağ, durum geçmişi ekranları, bilgi katmanları ve bakış açısı filtresi, çağlar ve paralel takvimler, zaman akışları, tutarlılık denetimleri, etki analizi, neden–sonuç ağı, kurgu hatları, bölüm × kayıt matrisi, harita katmanları, bölgeler, rotalar ve yolculuklar, hizalama aracı |
| **4. Derinleşme** | Kültür, hukuk, siyasi yapı, ekonomi ve üretim, süreçler, haber yayılımı, ekoloji, teknoloji, dil ve isim üretici, motifler, sıradan bir gün, çalışma masaları ve varsayım paketleri, görsel panolar, gezinti ve karşılaştırma |
| **5. Sürümler ve çıktı** | Adlandırılmış sürümler, deneme kopyası, EPUB ve PDF, evren içi belge çıktıları. Wiki ve yayın yalnızca K20 değişirse |

Hesap araçlarının aşamalara dağılımı A12'de önerilmiştir.

### 14.2 Bir aşamanın bitmesi

Bir aşama, kullanıcının o sürümü kendi gerçek evreniyle **iki hafta her gün** kullanmasıyla biter (K16). Sonraki aşamanın içindeki sıra, bu kullanımda yaşanan takılmalara göre belirlenir; kapsam değişmez (K4). Aşama 1 ve 2'nin günlük kullanım ölçütleri T1–T14 senaryolarıdır (§13.1).

### 14.3 Cihaz sırası ve teknik deneyler

Özellik aşamalarından ayrı olarak cihazlar sırayla ele alınır (K16, K17). Her cihaz kendi deneyleriyle başlar; deneyler depo dışında, küçük deneme sayfalarıyla yapılır.

| Sıra | Cihaz | Deneyler | Kapattığı kararlar |
|---|---|---|---|
| 1 | Windows 11 | Yerel veritabanında büyük bir deneme evreni; iki tarayıcı profili arasında parça dosyalarıyla eşitleme; aynı paragrafın eşzamanlı düzenlenmesi ve işaretlerin korunması; Google girişi ve yenilenmesi; Drive klasörleri; yazım denetimi muafiyeti | TK1, TK2, TK3 (Windows kısmı), TK4, TK5 |
| 2 | Galaxy Tab S11 Ultra | APK kurulumu, uygulama içinde Google girişi ve yenilenmesi, kalem kipleri, kalıcı depolama, kurulumlar arasında eşitleme | TK3 (tablet kısmı), TK6 (APK kısmı) |

**Bilinen risk:** Google, uygulama içi pencerede girişe izin vermezse tablette giriş sistem tarayıcısı üzerinden yapılır; eşitlemenin oturum kısmı o noktada değişebilir. Bu, Windows aşamasını etkilemez.

---

## 15. Hesap araçları

Bu araçlar yapay zekâ kullanmaz; yalnızca kullanıcının girdiği yapılandırılmış veri ve tanımladığı kurallarla çalışır. Hepsi §2.2'deki ortak kurallara ve §18.2'deki kullanım sözleşmesine uyar.

**Çalışma biçimi:** Hesaplar arayüzü dondurmasın diye arka planda çalışır. Yazarken yalnızca açık kayıt ve yan panel hemen güncellenir; ağır hesaplar (harita konturları, üretim zinciri, görüş haritası) ilgili görünüm açılınca yapılır. Her sonuç hangi veri ve kural sürümüne ve **hangi varsayım paketine** (§3.11) ait olduğunu bilir; geç biten eski hesap ekrana "güncel" diye yerleşmez. Hüküm ve güncellik sonuç zarfıyla gösterilir (§2.3). Yeni eklenen veri (iki şehir arasında yeni yol) eski sonucun dayanağında olmasa da ilgili sorguları yeniden değerlendirtir. Bekleyen hesap metnin kaydını geciktirmez. Sayısal hız garantisi verilmez.

| # | Araç | Ne yapar | Sınırı |
|---|---|---|---|
| 1 | **Göreli kronoloji çözücü** | "Tufandan 80–120 yıl sonra, ama kralın ölümünden önce" gibi kısıtlardan olası tarih aralıklarını hesaplar. Tarih girilince bağlı aralıklar daralır; imkânsız kısıtta çelişen kısıt zincirini gösterir. | Desteklediği kısıt türlerini açıklar. Yıl çözünürlüğünde gün uydurmaz. Kopuk iki aralığı tek bantla birleştirmez. Aralık bandı olasılık değildir. Gösterdiği çelişki kümesinin en küçük olduğunu vaat etmez. Kısıtlar bir zamansal kısıt ağı olarak çözülür; çelişen kısıt zinciri ağdaki kapalı bir döngüdür. "Ya önce ya sonra" gibi seçmeli kısıtlar hesabı çok zorlaştırır; desteklenen kısıt türlerinin sınırlı olmasının nedeni budur. |
| 2 | **Rota ve erişim alanı** | §8.4'teki kiplerden eldeki veriye uygun olanla en kısa süreli yolu ve süreyi bulur; ölçekli geometri kipinde araziye ve mevsime göre 1., 2., 3. gün erişim konturlarını çizer. Ulaşım türüne göre farklı sonuç verir. | Kullandığı kipi, ölçeği, ulaşım biçimini ve mola varsayımını gösterir. Karakterin bildiği yollar içindeki en hızlı yol ile kayıtlı ağın en hızlısı ayrı gösterilir (F09). Sonuç kayıtlı ağ içindir (§2.2 kural 13). |
| 3 | **Haber yayılımı** | Tanımlı haberleşme kanallarıyla bir haberin her yere en erken ne zaman ulaşabileceğini hesaplar. Söylentinin yolda değişen sürümleri bağlanır. | "En erken 15. gün ulaşabilir" der, "bu kişi kesinlikle bilmiyor" demez. Erişim, teslim, okuma, inanma ve aktarma ayrıdır. |
| 4 | **Dil tarihi ve ad türetme** | Kök sözlük ve ses değişim kuralları (`A → B / bağlam`) ile antik addan dönemlere, lehçelere ve yabancı dillere tutarlı adlar türetir; hepsi aynı kayda bağlanır. | Her dönüşümü hangi kuralın yaptığını gösterir; örnekler kurallarla tutmalıdır. Kullanıcı seçmeden mevcut adları değiştirmez. Dil yeterliliği tek yüzde değildir. |
| 5 | **Üretim ve kaynak kesintisi** | Üretim reçeteleri, bölgelerin fazlası ve açığı, ticaret yolları kaydedilir. Kesinti girilince etkilenebilecek üretimler, kurumlar ve mahalleler zincir olarak gösterilir. | Neyin etkilenebileceğini gösterir, ne zaman ve ne kadar etkileneceğini değil; süre için stok, tüketim, gecikme ve ikame gerekir (F10). Girdi–çıktı farkını yalnızca tanımlı korunum kuralına göre sorar; madde yaratan fantastik üretimi engellemez. "Halk ayaklandı" yazarın kararıdır. |
| 6 | **Sahne yerleşimi, görüş ve ses** | Kat planında duvar, pencere, kapı, siper; karakterlerin bakış yönü ve görüş alanı, ışık kaynakları, sesin ulaşabileceği alan; sahne içi hareketler. | Görüş hattı "fark etti" demek değildir. Evrensel dB eşiği yoktur; arka plan gürültüsü ve ölçüm mesafesi girdidir. Basitleştirmenin neyi ihmal ettiği yazılır. |
| 7 | **Gökyüzü, ay evreleri, gelgit, iklim** | Yıl uzunluğu, eksen eğikliği, ay dönemleri girilir; herhangi bir tarih için evreler hesaplanır, çakışmalar aranır. | İki düzey: takvim döngüsü ya da açık parametreli fiziksel model (A9). Aynı evre tutulma değildir; üç dolunay geceyi gündüz yapmaz; gelgit kıyı ve derinlik ister. |
| 8 | **Soy, kalıtım ve veraset** | Soy içi evlilikte ortak ataları tek düğümde birleştiren soy ağacı; yazarın tanımladığı özelliklerin geçme olasılığı; seçilen veraset kuralıyla belirli yılda taht sırası. | Soybilim, biyolojik ebeveynlik, hukuki ebeveynlik ve veraset ayrıdır. Evlatlıkta biyolojik kalıtım hesaplanmaz. Çok genli özellikler gizli ebeveyn kanıtı sayılmaz. Hukuken varis olmak fiilen tahta çıkmak değildir. |
| 9 | **Kurgu montajı ve ipuçları** | Sahne sürüklenince okurun bir sırrı hangi sahnede öğrendiği yeniden hesaplanır; ipucu → yanıltmaca → açıklama izlenir; "son işaretli kullanım 15 sahne önce" ve karakter yokluk ısı haritası. | Uyarı yalnızca yazarın hedefine göre önem kazanır. Okurun zihnini ölçtüğünü iddia etmez; edebî kalite puanı vermez. |
| 10 | **Dal karşılaştırma ve aktarım** | §9.7'deki görsel fark ve seçerek aktarma. | Bağımlılık kaybı önizlenir; karşılaştırma ortak başlangıca göre yapılır. |
| 11 | **Hukuk ve statü kesişimi** | Kurallar "koşul → yasak/hak → yaptırım" olarak tanımlanır; fiilî uygulama ayrıca yazılır. Karakter bir mekâna girince ona uygulanan kurallar listelenir. | Çatışan yetkiler yan yana kalabilir (§9.1). Resmî karar ile uygulama ayrıdır. |
| 12 | **Küçük ayrıntıların sürekliliği** | Yara, yorgunluk (iyileşme süresiyle), para, iksir, ok gibi sayılabilir kaynaklar izlenir; sonraki sahnelerde güncel durum gösterilir. | §5.6'daki gözlem / net fark / olay ayrımına uyar. Değişimler evren olaylarına bağlıdır. |
| 13 | **Sonuçtan koşullara masası** | "Üçüncü akşam kaleye ulaşmalı, tüneli kullanamaz" gibi hedeflerden kayıtlı seçeneklerle uygun planları ve her birinin neyi değiştirdiğini gösterir (F03). | Yeni olanak uydurmaz. Sonuç §2.2 kural 13'teki üç türden biridir; çözüm bulunamaması evrende imkânsızlık değildir. |

---

## 16. Fikirler

Bu tablo her fikrin **tek durum kaynağıdır**. "Tasarım" durumundaki bir fikrin tanımı belirtilen bölümdedir; tabloda yalnızca kısa adı vardır. Tanımı yalnızca bu tabloda olan fikirler için tablo satırı tanımın kendisidir. Öneri durumundaki fikirler kodlanmaz. Yeni fikir girişi dondurulmuştur (K11).

### 16.1 F01–F35

| # | Fikir | Durum | Tanım |
|---|---|---|---|
| F01 | "Bunu nereden biliyoruz?" | Tasarım | §2.2 kural 3 |
| F02 | Bilinmeyen birinci sınıf bilgidir | Tasarım | §2.2 kural 4, §3.6, §3.7 |
| F03 | Sonuçtan koşullara çalışma masası | Tasarım | §15-13 |
| F04 | **Geçmişi değiştirirken korunacakları seçmek.** "Kralın ölümünü iki yıl ileri al ama kızının taç giyme yaşı değişmesin." Değişiklik masası hesapla değişenleri, sabit kararla çelişenleri ve yalnızca bahseden metinleri ayırır. | Tasarım | Bu satır |
| F05 | Başkasının bilgisine dair inanç | Tasarım | §3.6 |
| F06 | Kişi, beden, kimlik ve makam | Tasarım | §3.12 |
| F07 | **Kurumlar kararları nasıl uygular.** Bir emir için "verildi → gönderildi → ulaştı → kabul edildi → kaynak ayrıldı → uygulandı" aşamaları ve sorumluları; kim durdurabilir, kimin fiilî vetosu var. Kararı yazar kaydeder. | Tasarım | Bu satır, §3.10 |
| F08 | **Delil geçmişi ve soruşturma masası.** Bir mektubu gerçekte kim yazdı, kim yazmış görünüyor, kimde, hangi iddiaya delil. Kopya, tercüme ve sansürlü sürüm aynı belge ailesindedir. Kaynakların bağımsızlığı §3.9'dadır. | Tasarım | Bu satır, §3.9 |
| F09 | **Mümkün ile erişilebilir.** Geçit açık olabilir ama karakter onu bilmiyor, ücreti ödeyemiyor ya da mührü yok. Fiziksel erişim, izin, bilgi, kaynak ve seçilen eylem ayrı katmanlardır. | Tasarım | Bu satır |
| F10 | **Kesintiye dayanıklılık.** Depolar, kuyular, onarım kapasitesi, ikameler. Su kemeri kesilince hangi mahallenin hemen, hangisinin stok bitince etkileneceği; veri yoksa "bulunamıyor". "Birkaç gün dayanır" gibi aralıklar girilebilir. | Tasarım | Bu satır |
| F11 | **Geçmişin bugünkü izleri.** Bir olaydan bugün ne kaldı: mezarlık, semt adı, şarkı, vergi ayrıcalığı. Mekânda dönemlerin izleri katman olarak görünür. İzin gerçek kökeni ile anlatılan hikâyesi ayrıdır. | Tasarım | Bu satır |
| F12 | **Büyü neden her yerde kullanılmıyor.** "Yalanı ortaya çıkaran büyü var" denince mahkeme, diplomasi, ticaret gibi bağlı alanlar bir masada toplanır; her kullanım için maliyet, erişim, karşı önlem, yasak incelenir. Toplumsal hüküm verilmez. | Tasarım | Bu satır |
| F13 | **Okura sunulan açıklamalar.** Bir cinayet için üç açıklama açık tutulur; her sahne hangisini desteklemek ya da zayıflatmak için yazıldığıyla işaretlenir (yazarın niyeti). "Sürpriz" ve "gerilim" hedefleri ayrıdır. | Tasarım | Bu satır |
| F14 | Serbest yazıyı sonradan yapılandırmak | Tasarım | §5.7 |
| F15 | **Anlatı ve evren sözleşmesi.** "Büyünün kökeni açıklanmayacak", "rüyalardaki zaman kronolojiye eklenmez". Program bu kararları hatırlatır; bilinçli açık bırakılanı eksik saymaz. Her eser farklı sözleşme seçebilir. | Tasarım | Bu satır |
| F16 | **Kural atölyesi.** Koşul, kapsam, sonuç ve istisna seçilerek kural kurulur; ileri kullanıcı formül yazabilir (alan anlamı: §18). Her kural için örnek durumlar saklanır (geçmeli, uyarmalı, sınır durumu); kural değişince sonuçlar karşılaştırılır. Hazır paketler kopyalanıp değiştirilebilir. Formül dili kodlanmadan önce ayrı bir sözleşme ister (TK8). Formülsüz kısmın kullanım sözleşmesi: §16.1 sonundaki tablo. | Tasarım | Bu satır |
| F17 | Haritalar da iddia taşır | Tasarım | §8.3 |
| F18 | **Yayımlanmış eser kilidi.** Yayımlanan eserde okura sunulan iddialar (eser, baskı, anlatı yeri, evren zamanıyla) korunur. Çelişen değişiklikte program engellemez, sorar: *geçmişi düzelt · yeni olay · alternatif devamlılık · baskı düzeltmesi*. Güvenilmez anlatıcının sözü ile yazarın sabitlediği gerçek aynı kilidi taşımaz. | Tasarım | Bu satır |
| F19 | **Üç özet.** Ayırt etme satırı (seçicide aynı adlı iki kaydı ayırır), sahne hatırlatıcısı (o zamanki yara, amaç, eşya), okur tanıtımı (baskı ve okuma sınırına göre). Uzunluk sınırı dayatılmaz. Ayırt etme satırındaki sır yayına girmez. | Tasarım | Bu satır |
| F20 | **Anakronizm ve sözlük denetimi.** Yazar sözlüğü ve kapsamı seçer (saray hitapları, teknoloji adları, yasaklamak istediği modern ifadeler). Sonuç "bu sözcük seçili kuralla eşleşti" der. Teknolojinin icadı, bölgeye ulaşması, kişinin tanıması ve kelimenin dilde olması ayrı tarihlerdir. | Tasarım | Bu satır |
| F21 | Alt birimlerden toplama | Tasarım | §3.7 |
| F22 | Yoğunluk ve boşluk haritası | Tasarım | §7 |
| F23 | Bağlam karşılaştırma masası | Tasarım | §7, §5.2 |
| F24 | **Değişiklik niyeti.** Önemli tarihli bir değer değişirken ya da kritik bir işaretli cümle değişirken kısa seçenek: *eski kaydı düzelt · bu tarihten itibaren değiştir · taslakta dene · yalnızca bu kişinin inancını değiştir*. Normal yazımda pencere açılmaz. Değişiklik bir işlem grubudur (§10.4). | Tasarım | Bu satır |
| F25 | Evren içi birleşme, bölünme, dönüşüm | Tasarım | §9.5 |
| F26 | **Haklar, yetkiler, yükümlülükler.** Ormanın mülkü taçta, odun hakkı köylüde, av hakkı soyluda, koruma görevi tapınakta olabilir. Bir hak taraflar, konu, kapsam, süre, tanıyan otorite ve koşulla tutulur. "İzni var" ile "muhafızlar izni tanıyor" ayrıdır. | Tasarım | Bu satır |
| F27 | Plan, teşebbüs, yarıda kalma, sonuç | Tasarım | §3.10 |
| F28 | **Çelişen anlatılar için iddia dosyası.** Bir olay hakkında resmî kayıt, tanık, sahte mektup ve aile anlatısı yan yana; her birinin kaynağı ve hangi iddiayı desteklediği. Kaynakların bağımsızlığı §3.9'dadır. "Destek var · itiraz var · ikisi de · dayanak yok" görünümü. | Tasarım | Bu satır, §3.9 |
| F29 | Sahne içinde bağlam parçaları | Tasarım | §3.3 |
| F30 | Metin parçası ile kullanım yeri | Tasarım | §3.3 |
| F31 | **Açık verilere dayanan keşif soruları.** Yazar bir soru şablonu seçer, program yalnızca tanımlı ilişkilerden aday çıkarır: "Aynı eşya üzerinde çelişen hak iddiası olanlar kim?", "Aynı sırrın farklı sürümlerine inanan iki kişi hangi tarihlerde aynı yerde olabilir?" Sonuç "görüştüler" demez, "bu aralıkta karşılaşmaları mümkün" der. Aday bir sahne fikrine ya da açık soruya dönüştürülebilir. | Tasarım | Bu satır |
| F32 | **Bakım ve tekrarlar.** Bir büyü kapısının yapım bedeli kadar bakım sıklığı, uzmanı, malzemesi ve kesintideki davranışı tanımlanabilir; su kemeri, arşiv, sınır karakolu için de. Grev ya da ihanet icat edilmez. | Tasarım | Bu satır |
| F33 | **Bir sonraki yararlı soru.** "Bu sahnenin yolculuğunu çözmek istiyorum" denince program bu hesap için eksik olanı (ölçek ya da süre ağı, başlangıç, ulaşım biçimi) gösterir. "Üç hesapta kullanılıyor" der; bu bir önem puanı değildir. | Tasarım | Bu satır |
| F34 | Taşınabilir paket ve kurtarma provası | Tasarım | §10.11 |
| F35 | **Baskı ve uyarlama karşılaştırma.** Uyarlamada iki karakter tek karaktere indirgenebilir, olay sırası değişebilir. Yazar eşlemeleri tanımlar; sonraki değişiklikte etkilenebilecek eşlemeler listelenir. Hiçbir dal diğerini kendiliğinden güncellemez. | Tasarım | Bu satır |

**F16 kullanım sözleşmesi (formülsüz kısım, §18.2).** Seçmeli kural, hukuk kuralının kendisidir (§15-11): koşul ilişkiler, istisna "değil" koşulu, kapsam yer ya da sahip, sonuç yasak · hak · yükümlülük. Atölye buna örnek durumları ve karşılaştırmayı ekler.

| Soru | Cevap |
|---|---|
| Kullanıcı sorusu | "Bu kural benim düşündüğüm durumlarda uygulanıyor mu; kuralı değiştirince hangi durumların sonucu değişti?" |
| En az veri | Bir hukuk kuralı ve bir örnek: kişi, yer, isteğe bağlı tarih, beklenen sonuç (*uygulanmalı · uygulanmamalı · sınır durumu*: koşulu kayıtsız ya da zamanı belirsiz kalmalı). |
| Veri eksikse | Koşul kayıtlı değilse ya da tarih sınıra göre belirsizse sonuç "belirsiz"dir ve beklentiyle karşılaştırma "karar verilemiyor" der; kişi ya da yer silinmişse "hesaplanamadı". |
| Okuduğu | Hukuk kuralları, ilişkiler, yerlerin kapsaması ve bağlılığı, tarihler; kuralın bir önceki tanımı işlem günlüğünden. |
| Değiştirdiği | Yalnızca örnek kayıtları; yazar isterse kuralın örnekleriyle birlikte kopyası (kopya kaynağına bağlı kalmaz). |
| Yapmayacağı yorum | Konu ve yaptırım yazısından anlam çıkarmaz; beklentiyi tahmin etmez; kural değişince örneği ya da beklentiyi kendiliğinden değiştirmez. |
| Kabul örneği | "Lonca üyesi olmayanlara silah yasağı": üyeliği kayıtlı kişi için "uygulanmamalı" örneği beklendiği gibi; üyeliği kayıtsız kişi belirsiz. İstisna kaldırılınca aynı örnek "beklenenden farklı; son değişiklikten önce uygulanmıyordu" gösterir. |

### 16.2 F36–F47

F37 ve F40 tasarıma alındı (K23); tanımları §3.11 ve §3.8'dedir. Diğerleri **Öneri**dir (A13). Tasarıma alınan fikrin tanımı ilgili bölüme taşınır.

| # | Fikir | Kısaca |
|---|---|---|
| F36 | **Ortak kaynak ve plan çakışması masası** | Aynı kişi, eşya ya da kapasite iki planda aynı anda mı kullanılıyor? Tek şifacı öğlen hem sarayda hem cephede olamaz. Planlanan, ayrılmış ve gerçekleşmiş kullanım ayrıdır; alternatif taslaklardaki planlar birbiriyle çatıştırılmaz. Yalnızca yazarın izlemek istediği kıt kaynaklarda açılır; öncelik kararı yazarındır. Senaryo: §13.7. |
| F37 | **Birlikte geçerli varsayım paketleri** | **Tasarım** (K23): §3.11 |
| F38 | **Sonucun varsayıma duyarlılığı** | Sahnenin mümkün olması tek bir hassas sayıya mı dayanıyor? "Çıkış bir gün gecikirse feribot kaçıyor, varış üç gün sarkıyor." Sonuç "incelenen bütün koşullarda uygun / yalnızca şu koşullarda / uygun değil" diye verilir; yalnızca birkaç senaryo hesaplandıysa hepsinin tarandığı söylenmez. |
| F39 | **Zamanlı geçitler ve fırsat pencereleri** | Haftada iki gün çalışan gemi, gün batımında kapanan kapı, ay evresinde açılan geçit, gelgit yolu. Bekleme, kapasite ve varıştaki geçerlilik hesaplanır. En erken varış, en az masraf, en az aktarma gibi amaçlar tek gizli puana sıkıştırılmaz; risk yüzdesi uydurulmaz. |
| F40 | **Kalabalıkları toplu tutma** | **Tasarım** (K23): §3.8 |
| F41 | **Herkesin bilmesi ile herkesin birbirinin bildiğini bilmesi** | Aynı bilgi tek tek mi öğrenildi, açık toplantıda mı duyuruldu? Duyuruda içerik, gerçek katılımcılar, algılanan dinleyiciler ve istisnalar (kapı arkasındaki dinleyici, dili anlamayan üye) tutulur. Katılım anlama ve inanma değildir. Otomatik siyasi sonuç üretilmez. |
| F42 | **Seçim anında görünen seçenekler** | Solda yazarın bildiği olanaklar, sağda karakterin o anda bildiği ya da sandığı olanaklar; her birinin bedeli, gereken bilgisi ve erişimi. Karakter en verimli seçeneğe zorlanmaz; alternatifin varlığı kararın hatalı olduğunu kanıtlamaz. Yalnızca seçilen önemli kararlar için açılır. |
| F43 | **Beklenen izler ve yokluk kanıtı** | Bir olay gerçekleştiyse hangi izler beklenir; izin görülmemesi ne kadar anlamlı? "İz kaydı yok" ile "yer incelendi, iz görülmedi" ayrıdır; gözlem zamanı, kapsamı ve erişim sonucu etkiler. İnceleme yoksa sonuç bilinmeyendir. "Katil kesin X" diye bitmez. |
| F44 | **Kimliği belirsiz kişi ve nesneler için adaylar** | Üç sahnedeki maskeli kişi aynı mı? Geçici kimlik, gözlemler ve olası gerçek kimlikler ayrı tutulur; "aynı olabilir", "bu koşullarla aynı olamaz", "şu tanık aynı sanıyor" bağları kurulur. Tek aday kalınca bile otomatik birleşme yapılmaz. |
| F45 | **Kişisel kronoloji ve zaman yolculuğu** | 440'ta doğan kişi yetişkinken 430'a gelebilir. İsteğe bağlı modelde kişisel olay sırası, evren zamanı ve beden ayrı izlenir; zaman yolculuğu kuralı (tek değişmez geçmiş, dallanan devamlılık, yazarın modeli) seçilir. Amaç çelişkiyi susturmak değil, seçilen kuralın izin verdiği sıraları sınamaktır. Tasarıma alınırsa zaman akışı mekanizmasının (§3.4) bir kişiye uygulanmış hâli olarak tanımlanır. Senaryo: §13.7. |
| F46 | **Eskizden yapılandırılmış mekâna** | Tablette serbest çizilen kroki otomatik tanınmaz; yazar bir çizgiyi "duvar", "kapı", "su" olarak işaretler, kayıt bağlar, istenirse uzunluk verir. Ham çizim, açıklamalar ve sahne yerleşimi ayrı katmanlardır. Çizimden kapı silmek evrende kapının yıkılması değildir. A5'e bağlıdır. |
| F47 | **Cihazlar arasında çalışma devri** | "Kaldığın yere dönme"yi (§5.9) bir devir kartına genişletir: sahne ve imleç, çalışma amacı, seçili varsayımlar, açık karşılaştırma, kısa devam notu. Kart hangi değişiklik noktasına dayandığını bilir; yeni cihaz ilgili metni henüz almadıysa söyler. Aynı sahnenin başka cihazda açık olması bilgi olarak gösterilir; kilit yoktur. |

---

## 17. Platform ve cihazlar

### 17.1 Tek program, iki cihaz

Program tek bir web kodudur ve bir uygulama kabuğuyla (TK6) her cihaza ayrı bir uygulama olarak kurulur: kendi simgesiyle, kendi penceresinde, internetsiz de çalışır. İnternette yayımlanan bir adres yoktur. Cihazlar aynı sürümü çalıştırmak zorunda değildir (§10.7).

| Cihaz | Nasıl kurulur |
|---|---|
| Windows 11 bilgisayar | Depodaki "windows" sürüm sayfasından kurulum dosyası indirilip çalıştırılır; yeni sürüm aynı yolla üstüne kurulur. Veri silinmez |
| Galaxy Tab S11 Ultra (Android) | APK dosyası tablete indirilip kurulur (tablet aşamasında) |

Mağaza (Microsoft Store, Play Store) kullanılmaz. Kurulum dosyası imzasız olduğu için Windows ilk açılışta bir kez uyarı gösterir.

**Neden bağımsız bir uygulama?** Kullanıcının verisi üzerinde tam denetim (kendi cihazında ve kendi Drive'ında), internetsiz çalışma ve Drive ile kendi eşitleme protokolünü uygulayabilmek için.

### 17.3 Depo ve barındırma

- Kod ve tasarım belgeleri herkese açık `Darvolinnn/dunya-atlasi` deposundadır (K7). Depoda lisans dosyası yoktur; kodu başkası kullanamaz (K19).
- Kurulum dosyaları GitHub'da depodan derlenir ve deponun sürüm sayfasına konur. İçlerinde evren verisi ve sır yoktur; Google istemci kodu gizli değildir.
- Depoda yalnızca program kodu ve tasarım belgeleri olur. **Evren verisi, dışa aktarımlar ve gerçek evrenden ekran görüntüleri depoya girmez**; kullanıcının cihazlarında ve Drive'ında durur. Tasarım örnekleri uydurmadır (§0.3).
- Kod başlayınca depoya bir ajan talimat dosyası konur: bağlayıcı bölümler §0 ve §18'dir, Öneri kodlanmaz, depoya sır ve evren verisi girmez.
- Wiki şimdilik yoktur (K20).

### 17.4 Köken

Tarayıcı, yerel veriyi (yerel veritabanı, tarayıcı depolaması) adres klasörüne göre değil **kökene** (protokol ve alan adı) göre ayırır. Aynı kökende çalışan her sayfa o kökenin yerel verisini okuyabilir. Yazar uygulamasının yerel verisinde evrenin tamamı ve Google izni bulunur.

- **Yazar uygulaması kendine ait bir kökende çalışır** ve o kökeni başka hiçbir sayfayla paylaşmaz. Windows uygulamasının kökeni `http://localhost:41730`'dur: kabuk dosyaları bu bilgisayarda bu yerel adresten sunar ve kendi penceresi dışında hiçbir şey açmaz. Geliştirme sırasında tarayıcıda açılan `http://localhost:5173` ayrı bir köken, yani ayrı bir kurulumdur.
- Google projesinde izinli adresler bu kökenlerdir (TK3).
- Wiki yapılırsa yazar uygulamasından ayrı bir kökende yayımlanır (A3). Yol ayrımı (`/uygulama/` ile `/wiki/`) yalıtım sayılmaz.
- **Köken ilk gerçek kullanımdan önce kesinleşir.** Köken sonradan değişirse her cihazda kurulum ve yerel veritabanı sıfırdan başlar, Google'daki izinli adres ayarı güncellenir ve gönderilmemiş iş kaybolabilir.

---

## 18. Koddan önce yazılacak sözleşmeler

### 18.1 Veri sözleşmeleri

Önce anlam sözleşmeleri yazılır, veritabanı tabloları bunlardan çıkarılır. Her sözleşme dört soruyu cevaplar: *boş olabilir mi? · sonradan değişirse geçmişi etkiler mi? · hangi bağlamda geçerli? · kimin kararıyla kesinleşir?*

| Sözleşme | Kapsadığı | Cevaplaması gereken |
|---|---|---|
| **Kod ve kimlik** | Değişmeyen kod (cihazlar arası eşgüdüm gerektirmeden üretilir), adlar ve okunuş (dönem ve kimin bildiğiyle), birleştirme yönlendirmesi, çalışma sayfası üyeliği; kişi, kimlik ve beden ayrımı (§3.12) | Bir kayıt birden çok sayfada; adlar bağlamlı; yönlendirme döngüsüz; bir kişiyi kimliklere ayırmak ya da birleştirmek kodları bozmaz; iç kod yayın paketine girmez (§11.2) |
| **Tarihli durum** | Geçerlilik aralığı; sınır tarih, olay+fark ya da kısıt; iki biçimde saklanan tarih, takvim sürümü, zaman akışı (§3.4) | Tek bir zaman ifadesi; tarih ve olay aynı anda girilip çelişemez; karşılaştırma üç değerlidir |
| **Gözlem ve süren durum** | Kaydın anlık mı, aralık mı, sonraki değişikliğe kadar mı olduğu (§3.5) | Hangi alanlar ileri taşınır; gözlemden durum çıkarılmaz |
| **İddia ve tutum** | Tarihli, kaynaklı ve inanca açık değerlerin ortak yapısı: konu, özellik, değer, geçerlilik aralığı, katman (evrenin gerçeği ya da kimin inancı), karar durumu, kaynak, yayın kapsamı. Alan değerleri, ilişkiler, durum geçmişi ve bilgi durumu bu yapıda saklanır; metin, medya, düzen ve şablonlar bu yapıya girmez | Önerme, ileri sürme ve inanma ayrı kayıtlar; düz girilen değerin varsayılan yorumu K13 |
| **Kaynak sürümü** | Belgenin hangi sürümü, pasajı, hangi edinme olayıyla | Tek kaynak alanı yetmez |
| **Metin işaretlemesi** | İşaret, iddia, evren durumu, sürüm (§5.7) | Yer ile anlam ayrı |
| **Anlatı kullanım yeri** | Eser, baskı, sahne, metin örneği (§3.3) | Kopya ile taşıma ayrı |
| **Süreç** | Plan, adımlar, eşikler, sonuç kuralı (§3.10) | Hangi adım neyi doğurur; iptalde ne olur |
| **Nicelik ve alan anlamı** | Alan kimliği, değer türü, birim, hassasiyet, izin verilen işlemler | Aşağıda |
| **Sorgu ve olumsuzluk** | Bilinmeyen, çelişkili ve açıkça yanlış değerlerin VE/VEYA/DEĞİL içinde davranışı | Aşağıda |
| **Eksiksizlik beyanı** | Hangi ilişki, hangi zaman, hangi evren ya da dal, hangi kaynak durumu için "eksiksiz" | "430 konsey üyeleri eksiksiz" sonraki yılları kapsamaz; kapsam değişince beyan incelemeye düşer (§9.3) |
| **Türetilmiş sonuç** | Hesap, dayanakları (birden çok), kural sürümü, varsayım paketi, güncellik (sonuç zarfı §2.3) | Yokluk varsayımı ve varsayım paketi de dayanaktır |
| **Varsayım paketi** | Paketin içeriği, sürümü ve hangi sonuçların onunla hesaplandığı (§3.11) | Farklı araçların sonuçları aynı paketle mi hesaplandı (§2.2 kural 14) |
| **Bağlam bileşimi** | Kaynak sürümü, evren zamanı, bilgi katmanı ve yayın kapsamının birleşimi (§5.2) | Karışık bağlam görünümü nasıl etiketlenir |
| **İnceleme yaşam döngüsü** | Ne açar, ne kapatır, ne yeniden açar (§9.3) | Ertelemenin kapanış olmaması |
| **Yayın kapsamı** | Eser, baskı, okuma sınırı (tercih ya da teslim), okur kimlikleri, paket sürümü (§11) | "Gizli / açık" ikiliği yetmez |
| **Karar durumu** | Kayıt ve alan düzeyinde (§3.6) | Yalnızca kayıt düzeyi yetmez |
| **Eşitleme işlemi** | İşlem kodu, kurulum, sıra, gördüğü değişiklikler, parça dosyası, anlık görüntü, kontrol noktası (§10.1–§10.3) | Çatışma tespiti görmeye dayanır, çevrimdışılığa değil |
| **İşlem grubu** | Parçaları, tamamlanma durumu, geri almanın etkisi (§10.4) | Yarım grup ne gösterir |
| **Kurulum ve uygulama sürümü** | Kurulum kodu, etkinlik, dört sürüm, gönderilmemiş iş (§10.5, §10.7) | Kayıp kurulum, eski istemci, dönüşüm |
| **Şema sürümü** | Şablon, alan türü, kural ve takvim değişikliklerinin sürümü; her değerin girildiği şema sürümü (§9.5, §10.3) | Dönüşemeyen değer silinmez |
| **Medya** | İçerik adı, boyut, cihaz politikası, yayın izni (§10.12) | İndirilmemiş ile silinmiş ayrı |
| **Arama ve sıralama** | Türkçe harf kuralları, toleranslı arama, eski adlar | Aşağıda |
| **Kural ve formül dili** | F16'nın formül yazımı: izin verilen işlemler, alan anlamına bağlılık, hata davranışı, sürüm (TK8) | Aşağıda |

**Nicelik ve alan anlamı:**
- Mesafe, süre, miktar, oran, hız ve kapasite ayrı nicelik türleridir. "10" tek başına anlamsızdır: 10 gün, 10 saatlik emek, 10 kişi, 10 kullanım hakkı ve 10 para birimi farklı işlemlere izin verir.
- Ana akıştaki gün ile farklı bir zaman akışında yaşanan gün aynı birim sanılmaz (§3.4 zaman akışları).
- Para dönüşümü fiziksel birim dönüşümü değildir; döneme, yere ve işlem koşuluna bağlıdır.
- Hassasiyet korunur (§2.2 kural 16). Birimler ya da kapsamlar uyuşmazsa hesap durur ve nedenini söyler.
- Bir alanın anlamı görünen adına bağlı değildir: iki şablondaki "güç" alanı biri fiziksel kuvvet, öbürü siyasi etki olabilir. Alanın kodu, değer türü, birimi ve izin verilen işlemleri ayrıca tanımlıdır. Formül yazımı (F16) bu tanımları kullanır.
- Alt gruplar ve sayımlar kapsamlarıyla tutulur; örtüşmesi bilinmeyen alt gruplardan aralık çıkar, tek sayı çıkmaz (kalabalık: §3.8).

**Sorgu ve olumsuzluk:**
- Bir koşul için her kayıt beş gruptan birindedir: *doğrulanmış evet · doğrulanmış hayır · bilgi yok · çelişkili · konu dışı* (koşul o kayda uygulanamaz: bir dağın lonca üyeliği). Bilinmeyenin her türünün hangi gruba düştüğü §3.6'daki tablodadır. "Kuzey Loncası üyesi olmayanlar" sorgusu yalnızca "doğrulanmış hayır" grubunu verir; bilgi yok, çelişkili ve konu dışı gruplar ayrı gösterilir, sessizce dışlanmaz ya da eklenmez.
- Kullanıcı bunun yerine "üyelik kaydı bulunmayanlar" sorgusunu da seçebilir; bu, farklı ve açıkça adlandırılmış bir sorgudur.
- Arayüz mantık terimi kullanmaz: "üye olduğu doğrulanan", "üye olmadığı doğrulanan", "bilgisi girilmemiş", "çelişkili", "bu kayıt için geçerli değil".
- Eksiksiz beyan edilmiş bir kapsamda yalnızca *henüz düşünülmedi* durumundaki kayıtlar "hayır" sayılır; bilerek açık bırakılanlar ve evrende bilinmeyenler sayılmaz (§3.6). Kapsam dışında hiçbiri sayılmaz.
- Sayımlar "doğrulanmış 8, belirsiz 3" biçimindedir; yayına giden sayılar da bu ayrımı korur.

**Arama ve sıralama:**
- Büyük–küçük harf dönüşümü ve sıralama Türkçe kurallarla yapılır (I/ı ve İ/i doğru eşleşir); alfabetik sıra Türkçe alfabeye göredir.
- Arama Türkçe karakter kullanmadan yazılmış aramayı tolere eder: "kilic" "kılıç"ı, "sehir" "şehir"i bulur. Türkçe ek modülü (§5.1) çekimli biçimleri köke indirir.
- Uydurma adlardaki ä, é, ø gibi harfler için aksan duyarsız arama bir seçenektir ve varsayılan olarak açıktır.
- Eski adlar, lakaplar ve okunuşlar aramaya girer; sonuçta hangi addan bulunduğu gösterilir.
- Arama yalnızca yazarın kaydettiği veride çalışır; serbest metinden anlam çıkarmaz (K1).

**Kural ve formül dili (TK8):**
- **Kapsam.** Formül yalnızca hukuk kuralının "kimlere uygulanır" kısmını yazar (§15-11). Bir kural ya koşul listesini ya da formülü kullanır; formül yazılıysa liste kullanılmaz. Süreç kuralları ve öteki hesaplar formül kullanmaz.
- **Yapı taşları.** Formülde yalnızca şunlar bulunur; her biri değerlendirildiği kişi için *evet · hayır · belirsiz* verir:
  - *İlişki:* kişinin bir kayda kayıtlı ilişkisi, hukuk koşullarındaki ilişki adlarıyla: `üyesi [Kuzey Loncası]`, `kültüründen [Göçebeler]`, `türünden [...]`, `makamını yürüten [...]`, `hizmetinde [...]`, `orada yaşayan [...]`. Kayıtlı ilişki "evet"tir; kayıt yoksa sonuç "hayır" değil "belirsiz"dir, neden "kayıtlı değil" diye yazılır (§2.2 kural 4).
  - *Seçim alanı:* `{Rütbe} = "Subay"`; *evet / hayır alanı:* `{Mühürlü}`.
  - *Tarih alanı:* `{Doğum tarihi} < "400"`; sağdaki yazı evren tarihi olarak okunur (§3.4). Karşılaştırma tarih karşılaştırmasının üç değerli kuralıyla yapılır.
  - *Birimli sayı alanı:* `{Boy} >= 180 cm`. *Yaş:* `yaş >= 16 yıl`, kişinin doğum tarihinden ve kuralın değerlendirildiği tarihten hesaplanır.
  - *Bağlaçlar:* `ve`, `veya`, `değil` ve parantez. Öncelik: değil, sonra ve, sonra veya.
- **Alan anlamına bağlılık.** Alan ve kayıt adla yazılır, kodla saklanır; ad değişince formül bozulmaz, gösterimde güncel ad görünür. Aynı adı taşıyan iki alan ya da iki kayıt varsa formül kaydedilmez ve hangisinin kastedildiği seçtirilir. Alan, kişinin kendi şablonundan okunur; kişinin şablonunda o alan yoksa sonuç "belirsiz", neden "bu kayıt için geçerli değil"dir.
- **Birimli sayı alanı.** Şablona yeni bir alan türü eklenir: nicelik türü (uzunluk, kütle, süre, miktar, para, diğer), birim ve hassasiyet (ondalık basamak sayısı). Değer tek sayı ya da aralıktır ("170–180"); aralık karşılaştırmanın iki yanına düşerse sonuç "belirsiz"dir. Uzunluk ve kütle birimleri kendi içinde çevrilir; süre yalnızca dakika, saat, gün ve hafta arasında çevrilir (ay ve yıl takvime bağlıdır, çevrilmez). Para ve "diğer" çevrilmez, yalnızca aynı birimle karşılaştırılır. Birimler uyuşmazsa formül kaydedilmez; değer sonradan uyuşmaz hale gelirse hesap durur ve nedenini söyler (Nicelik ve alan anlamı, yukarıda).
- **Üç değerli sonuç.** "ve": biri hayırsa hayır, hepsi evetse evet, öteki durumlarda belirsiz. "veya": biri evetse evet, hepsi hayırsa hayır, öteki durumlarda belirsiz. "değil" evet ile hayırı değiştirir, belirsizi belirsiz bırakır. Boş, çelişkili (iki cihazda farklı) ya da bilinmeyen değer "hayır" sayılmaz, "belirsiz"dir; nedeni sonuçla birlikte gösterilir. Kural formülü "evet" verirse uygulanır, "hayır" verirse uygulanmaz, "belirsiz" verirse koşulu kayıtsız kural olarak listelenir (§15-11).
- **Hata davranışı.** Okunamayan formül kaydedilmez; hatanın yeri işaretlenir ve sade bir Türkçe açıklama verilir ("şu kelimeden sonra bir karşılaştırma bekleniyor"). Sonradan bozulan formül (alan silindi, alanın türü değişti, seçenek kaldırıldı, kayıt silindi) o kural için "hesaplanamadı" der ve nedenini yazar; program formülü kendiliğinden düzeltmez. Birleştirilen kayda giden bağ yönlendirmeyle sürer (§18.1 Kod ve kimlik).
- **Sürüm.** Her formül yazıldığı dil sürümüyle saklanır (ilk sürüm 1). Program bilmediği bir sürümü değerlendirmez, "bu formül daha yeni bir program sürümüyle yazılmış" der. Dil değişirse eski sürümler okunmaya devam eder.
- **Yapmadıkları.** Formül hesap yapmaz (toplama, çarpma yok), metin içinde arama yapmaz, kendi kendine kayıt değiştirmez ve serbest metinden anlam çıkarmaz (K1). Kural atölyesinin örnek durumları (F16) formüllü kuralda da aynı biçimde çalışır.

### 18.2 Özellik kullanım sözleşmesi

Her önemli özellik kodlanmadan önce şu yedi soruyu cevaplayan kısa bir sözleşme alır. Kullanıcı bunları görmez; tasarımı uygulayacak kişi görür. Amaç, zengin bir özelliğin belirli bir işi yapmak için istediği giriş yükünü küçük tutmaktır.

1. Cevapladığı kullanıcı sorusu
2. En az gereken veri
3. Veri eksikse gösterilecek sonuç
4. Okuduğu kayıtlar
5. Değiştirebileceği kayıtlar
6. Kendiliğinden yapmayacağı yorum
7. Kabul örneği

**Örnek: rota aracı (§15-2)**

| Soru | Cevap |
|---|---|
| Kullanıcı sorusu | "A'dan B'ye bu koşullarda en erken ne zaman varılır?" |
| En az veri | İki yer ve aralarında elle girilmiş bir süre. Harita gerekmez (§8.4 süre ağı). |
| Veri eksikse | "Kayıtlı ağda A'dan B'ye yol yok" ya da "şu bağlantının süresi girilmemiş"; evren genelinde imkânsız denmez. |
| Okuduğu | Mekânlar, rotalar, süreler, mevsim etkileri, ulaşım biçimleri; varsa ölçekli harita ve geçiş koşulları |
| Değiştirdiği | Hiçbir evren kaydını. Sonuç yalnızca yazar seçerse yolculuk ya da olay olarak eklenir (§2.2 kural 1). |
| Yapmayacağı yorum | Karakterin yolu bildiğini, kararı verdiğini ya da yetiştiğini varsaymaz; görselden ölçeksiz mesafe üretmez. |
| Kabul örneği | D15, D16, D17 (§13.3) |

Bu sözleşmeler, ilgili özellik tasarıma alınırken ya da kodlamadan önce yazılır ve özelliğin tanımının bulunduğu bölüme eklenir.

---

## Ek A. Soru kütüphanesinin başlangıç seti

Bunlar türlerin ilk soru setleridir. Hepsi isteğe bağlıdır; kullanıcı soruları düzenler, siler ve yenisini ekler (§4, §6). Bir soru yeni bir kayıtla da cevaplanabilir ("İnsanlar neye inanıyor?" → inanç kaydı). Kaynak: yazar.io görsel ve video incelemesi (tasarim-gecmisi.md, kaynak G).

**Dünya Pusulası** (§6)
1. Bu evrenin merkez çatışması ne? (kıtlık, inanç, iktidar, hayatta kalma, özgürlük, intikam…)
2. İnsanlar burada nasıl yaşıyor? (geçim, ritüeller, korkular, alışkanlıklar)
3. Güç kimde ve bedeli ne? (büyü, bilgi, para, soy…)
4. Hangi kural kırılırsa her şey değişir?
5. Bu evren karakteri nasıl dönüştürüyor?

**Yeni evren başlangıcı** (isteğe bağlı, §6): temel fikir (evreni farklı kılan tek kural) · çatışma (iki taraf) · ortadaki karakter.

**Karakter: temel altı soru**
1. En çok ne istiyor?
2. En büyük korkusu ne?
3. En büyük kusuru ne?
4. Ne saklıyor?
5. Sınırı nerede? (asla yapmayacağını düşündüğü şey)
6. Geçmişi onu nasıl değiştirdi?

**Karakter geçmişindeki her olay için:** Bu olay onda ne bıraktı (korku, özlem, öfke, utanç, inanç)? · Bugün neyi farklı yapıyor? · Kime karşı tavrı değişti? · Hangi yanlış sonuca vardı? · Hikâye bu yarayı nasıl sınayacak?

**Kötü alışkanlık:** alışkanlık · tetikleyici · kimi rahatsız ediyor · neyi gizliyor · karakter farkında mı · değişebilir mi.

**Karşıt karakter:** Ne istiyor? · Neden kendini haklı görüyor? · Neyi kaybetmekten korkuyor? · Hangi sınırı aşmaz? · Ana karakterle ortak yanı ne?

**İlişki:** Geçmişlerini ne bağlıyor (bir karşılaşma, ortak bir kayıp, çözülmemiş bir mesele)? · İki tarafın beklentisi ne? · Gerilim noktası ne (söylenmemiş bir söz, yanlış anlaşılmış bir karar, tutulmamış bir söz)?

**Mekân: gerçek hissettiren altı ayrıntı:** Nasıl kokuyor? · Nasıl ses çıkarıyor? · İnsanlar nasıl hareket ediyor? · Gece ne değişiyor? · Yerliler neyi normal buluyor? · Geçmişten hangi iz kaldı?

**Şehir lojistiği:** Su nereden geliyor? · Yemek nasıl geliyor? · Atık nereye gidiyor? · Gece nasıl işliyor? · Mahalleler neden farklı? · Şehri gerçekte kim yönetiyor?

**Siyasi varlık:** Taht kime geçiyor? · Hükümdarı kim sınırlıyor? · Para nereden geliyor? · Halk ne bekliyor? · Din ne kadar güçlü? · Zayıf noktası ne?

**Topluluk:** Neyi korur? · Ne ister? · Neden korkar?

**Büyü sistemi:** Kural (okurun anlayabileceği mantık) · Bedel (zaman, enerji, hafıza, sağlık, para…) · Sınır (kesinlikle yapamadığı şey) · isteğe bağlı: risk, sonuç, denge.

**Kültür:** Coğrafya onu nasıl şekillendiriyor (ulaşım, yemek, ticaret, korku)? · Gelenekler · Yasaklar ve tabular · Ayıp sayılanlar · Kutsal sayılanlar · Gündelik hayat: selam, sofra, para, inanç, çatışma.

**Dil ve adlar:** Ses paleti (tekrar eden heceler; sert ↔ akıcı; kısa ↔ uzun). Aynı kültürün karakter, şehir ve ülke adları bu seslerden türetilir.

**Haritasız evren büyütme:** Uzak yerlerden söz ettir · ticaret izleri bırak · farklı diller duyur · eski olayları an · söylentiler kullan.

**Evren kurma rehberi:** Kim hüküm sürüyor? (topluluk) · Büyünün bedeli ne? · İnsanlar neye inanıyor? (inanç)

**Hikâye çekirdeği** (eser; K27): Kim, ne istiyor? · Ona ne engel oluyor? · Başaramazsa ne kaybeder? · Okur hangi sorunun cevabını merak edecek? · Bu hikâye hangi soruyu soruyor? Yeni evren başlangıcındaki "Temel fikir" evrenin kuralını sorar; hikâyenin çekirdeği ondan ayrıdır.

**Bu kitabın görevi** (eser): Merkez sorusu ne? · Dengeyi bozan olay ne? · Doruk noktası ne? · Bu kitapta ne çözülüyor? · Ne açık kalıyor?

**Sahne planı** (sahne): Kim ne istiyor? · Ne engel oluyor? · Sahne sonunda ne değişiyor? · Okur ne öğreniyor? Sahnenin tarihi, mekânı, bakış açısı ve katılımcıları sahne alanlarıdır, burada sorulmaz.

**Kurgu hattı** (kurgu hattı): Bu hattın sorusu ne? · Şu anki durumu ne? · Olası karşılığı ne? · Bilerek açık mı kalacak?

**Karakterin bu kitaptaki yolu** (karakter ile eser arasındaki *eserin odak karakteri* bağı): Kitabın başında ne istiyor? · Kitabın sonunda ne istiyor? · Başlangıçtaki inancı ya da yanlış varsayımı ne? · Bu kitapta inancı nasıl sınanıyor? · Aldığı en zor karar ve vazgeçtiği seçenek ne? · Aştığı sınır, ödediği bedel ne? · İlişkilerinde ne değişiyor? · Sonraki kitaba hangi iç çatışmayı taşıyor? Bu sorular yeni bir kayıtla cevaplanmaz; en zor karar ve ödenen bedel sorularına yazılı cevabın yanında bir sahne ya da olay bağlanabilir (biri değişince öbürü korunur).

**Örnek (K27):** programla gelen her sorunun yanında "Örnek" uydurma seriden kısa bir cevap gösterir. Cevap alanına kopyalanmaz; yazarın metnini değiştirdiği ya da kendi yazdığı sorularda görünmez.

**Hazır türlerin soruları (K29):**
- **Eşya:** Kim yaptı, neden? · Şimdi kimde ve ona nasıl geçti? · Ne işe yarıyor; bedeli ya da kusuru ne? · İnsanlar onun hakkında ne anlatıyor? · Kaybolursa ne olur?
- **İnanç / mezhep:** Evreni nasıl açıklıyor? · İyi insan kimdir? · Ölümden sonra ne olur? · İbadeti kim yönetiyor, kurum nasıl geçiniyor? · Resmî öğreti ile halkın inandığı nerede ayrılıyor? · Kimlerle çatışıyor?
- **Canlı türü / bitki:** Nerede yaşıyor? · Ne yiyor, onu ne yiyor? · İnsanlar onu nasıl kullanıyor ya da ondan nasıl korunuyor? · Onu tehlikeli ya da değerli kılan ne? · Hakkında hangi yanlış inanç var?
- **Teknoloji / buluş:** Ne işe yarıyor? · Kim buldu, kim kullanabiliyor? · Neye mal oluyor (malzeme, bilgi, izin)? · Gündelik hayatı nasıl değiştirdi? · Bozulunca ya da kötüye kullanılınca ne olur?
- **Ritüel:** Ne zaman ve neden yapılıyor? · Kim yönetiyor, kim katılıyor? · Aşamaları neler? · Yapılmazsa ne olur? · Dışarıdan biri neyi tuhaf bulur?
- **Dönem / çağ:** Nasıl başladı, nasıl bitti? · O zaman kim güçlüydü? · İnsanlar bu dönemi bugün nasıl anıyor? · Bu dönemden kalan izler neler? · O dönemde neyi bilmiyorlardı?

**Serinin büyük planı** (seri): Serinin büyük sorusu ne? · Merkez çatışma ne? · Başlangıç dengesi ne? · İlk büyük kırılma ne? · Orta evrede ne değişiyor? · Bilerek cevapsız kalacaklar neler? Olası finaller bir soru değil, ayrı olay kayıtlarıdır.
