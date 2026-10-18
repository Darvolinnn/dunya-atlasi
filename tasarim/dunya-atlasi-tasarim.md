# Dünya Atlası: Tasarım

**Sürüm 5 · 18 Ekim 2026 · Aşama: tasarım.** Program kodu yazılmadı. Kullanıcı "geç" demeden tasarım aşaması kapanmaz (K9).

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

Belgedeki adlar (Velkar, Kaelen, Elin, Kuzey Kalesi…) yalnızca davranışı anlatmak için uydurulmuş örneklerdir. Belge herkese açık bir GitHub deposunda durur; kullanıcının gerçek evreninden içerik, sır ya da ekran görüntüsü buraya konmaz.

### 0.4 Konu dizini

| Davranış | Tek tanımın yeri |
|---|---|
| Kararlar ve açık kararlar | §1 |
| Ortak hesap ve kayıt kuralları | §2.2 |
| Kayıt, tür, bileşen, çalışma sayfası | §3.1 |
| Bağlantı, ilişki, katılım rolü | §3.2 |
| Eser, bölüm, sahne, olay; sahne taşıma | §3.3 |
| Tarih biçimleri, takvim, mevsim | §3.4 |
| Durum geçmişi, gözlem ve süren durum | §3.5 |
| Karar durumu, bilgi katmanları, inanç | §3.6 |
| Fiziksel kapsama, siyasi bağlılık, kültür; varsayılan değerler | §3.7 |
| Eşya, sahiplik, makam, kafile | §3.8 |
| Evren içi belge | §3.9 |
| Süreçler, adımlar ve eşikler | §3.10 |
| Kalabalık ve toplu kayıtlar | §16-F40 (Öneri) |
| Bağlantı yazma, Türkçe ekler | §5.1 |
| Gömme ve bağlam | §5.2 |
| Süreklilik defteri, net fark | §5.6 |
| Metin işaretleme | §5.7 |
| Harita kipleri (geometri, süre ağı, kroki) | §8.4 |
| Denetim sonuç düzeyleri | §9.1 |
| İnceleme kuyruğu: ne açar, ne kapatır | §9.3 |
| Eşitleme, çatışma, cihazlar, sürüm uyumu | §10 |
| Yedek, kurtarma, dışa aktarma | §10.8–§10.11 |
| Yayın paketi ve yayın güvenliği | §11 |
| Görünüm, kontrast, giriş yöntemleri | §12 |
| Kabul senaryoları | §13 |
| Hesap araçları | §15 |
| Fikirler F01–F47 ve durumları | §16 |
| Platform ve cihaz kurulumu | §17 |
| Veri sözleşmeleri, özellik kullanım sözleşmesi | §18 |

---

## 1. Kararlar

### 1.1 Kullanıcı kararları

| # | Karar | Tarih |
|---|---|---|
| K1 | **Programda yapay zekâ yoktur.** İçeriği kullanıcı yazar. Arama, filtreleme, hesap ve denetim yalnızca kullanıcının kaydettiği yapılandırılmış veri ve tanımladığı kurallarla çalışır. Program serbest metinden anlam çıkarmış gibi davranmaz. | 18 Ekim |
| K2 | **Eşitleme ve yedek Google Drive üzerinden yapılır ve ayrı işlevlerdir.** Eşitleme cihazları güncel tutar; dönemsel yedek geri dönülebilir kopyalar saklar. Ayrıntı §10. | 18 Ekim |
| K3 | **Cihazlar:** Windows 11 bilgisayar, Samsung Galaxy Tab S11 Ultra (Android) ve iPhone aynı evrende çalışır; bir cihazda başlanan işe öbüründe devam edilir. | 18 Ekim |
| K4 | **Tasarım, geliştirme maliyeti kaygısıyla daraltılmaz.** Geliştirme sırası (§14) yalnızca sırayı belirler. | 18 Ekim |
| K5 | **Program yazarlık yöntemi dayatmaz.** Hiçbir alan zorunlu değildir; kullanıcı önce serbestçe yazar, ayrıntıyı ihtiyaç duydukça açar. | 18 Ekim |
| K6 | **Özellik seçiminin ölçütü:** "Bu özellik evrenimi kurarken hangi işimi kolaylaştırıyor?" Rakiplerden farklılaşmak tek başına gerekçe değildir. | 18 Ekim |
| K7 | **Kod ve tasarım belgeleri GitHub'da tutulur.** Depo: `Darvolinnn/dunya-atlasi` (herkese açık). Program GitHub Pages'te, ana ekrana eklenebilen bir web uygulaması (PWA) olarak yayımlanır. Evren verisi depoya girmez (§17.3). | 18 Ekim |
| K8 | **Görünüm: soft, temiz, narin; sade kartlar.** Parşömen ve arşiv dokusu yalnızca kapakta, wikide ve evren içi belge çıktılarında. Ayrıntı §12. | 18 Ekim |
| K9 | **Tasarım aşaması kullanıcı "geç" demeden kapanmaz.** O zamana kadar depoya yalnızca tasarım belgeleri girer. | 18 Ekim |
| K10 | **Tasarım belgesi yalnızca güncel davranışı anlatır;** geçmiş ayrı tutulur (§0.2). | 18 Ekim |

### 1.2 Açık kararlar

Her satırda tasarımın önerisi yazılıdır. Kullanıcı karar verene kadar öneri kesinleşmiş sayılmaz; ilgili bölümler öneriye göre yazılmıştır ve kararla birlikte güncellenir.

| # | Soru | Öneri | Etkilediği yer |
|---|---|---|---|
| A1 | Drive'da eşitleme biçimi: (a) her kurulum kendi değişiklik dosyasına yazar, herkes hepsini okur; (b) tek ortak veritabanı dosyası | (a) ve anlık görüntüler | §10.2 |
| A2 | Dönemsel yedeğin sıklığı ve saklama süresi | Günlük yedek, 30 gün; her ayın ilk yedeği bir yıl | §10.10 |
| A3 | Wiki nerede yayımlansın: GitHub Pages, Drive'da paylaşılan klasör ya da yalnızca dosya | GitHub Pages, **yazar uygulamasından ayrı bir kökende (origin)** | §11.4 |
| A4 | Yazar sayfası gerekli mi? | Ayrı modül yerine wiki kapağında isteğe bağlı "Hakkında / Önsöz" alanı | §11 |
| A5 | Harita çizimi: yalnızca yüklenen görseller mi, çizim aracı da mı? | Önce yükleme ve işaretleme; bölge çizimi aşama 3'te; serbest çizim için F46 değerlendirilir | §8 |
| A6 | Claude'daki prototipin akıbeti | Program hazır olana kadar karalama defteri; verisinin aktarılabilirliği aktarım yazılırken sınanır, şimdiden kayıpsız sayılmaz | — |
| A7 | Hesap sonucu evrene ne zaman yazılır? | Hesap kendi görünümünde yenilenir; evrene yalnızca yazarın seçtiği sonuç, olay ya da karar olarak girer | §2.2 kural 1 |
| A8 | Hangi alanlar varsayılan olarak "eksiksiz" sayılır? | Hiçbiri; kullanıcı belirli bir liste, zaman ve kapsam için söyler | §18 Eksiksizlik |
| A9 | Doğal fizik modelleri (gökyüzü, gelgit, ses) | İsteğe bağlı paketler; fantastik kurallar kendi kapsamlarıyla | §15 |
| A10 | Okur görünümü hangi eser ve baskıya ait? | Her yayının açık sürümü ve okuma kapsamı olur | §11 |
| A11 | Bütün araçların ortak davranışı hangi fikirler olsun? | F01, F02, F03, F05, F14 | §16 |
| A12 | Hesap araçlarının sırası | Göreli kronoloji ve süreklilik aşama 3; rota, haber, soy/veraset, kurgu montajı aşama 4; dil tarihi, üretim, hukuk, gökyüzü, sahne yerleşimi aşama 4–5 | §14, §15 |
| A13 | F36–F47 önerilerinden hangileri tasarıma alınsın? | Önce F37 (ortak varsayımlar), F47 (çalışma devri), F40 (toplu kayıtlar); diğerleri sonra | §16 |

---

## 2. İlkeler ve ortak kurallar

### 2.1 Temel ilkeler

- **Tek kaynak:** Bir bilgi tek yerde tutulur, her ekranda o kaynaktan gösterilir. Bir ebeveyn ilişkisi karakter sayfasında, soy ağacında ve ağ görünümünde aynı ilişki kaydından gelir.
- **Değişmeyen kimlik:** Her kaydın adından bağımsız, hiç değişmeyen bir kimliği vardır. Ad, tür ya da konum değişse de bağlantılar kopmaz.
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
9. **Kimlik, ad ve rol ayrıdır.** Ad değişince bağlantı bozulmaz; aynı ad farklı kimlikleri birleştirmez.
10. **Modelin kapsamı görünür.** Eksik veriyle tam bilgi varmış gibi sonuç verilmez. Denetim hangi eksik bilgi yüzünden durduğunu söyler.
11. **Yayın ayrı bir kapsamdır.** Bakış açısı seçmek yayın izni vermez. Yayımlanmış sürüm, dayandığı veri ve kural sürümüyle saklanır (§11).
12. **Uyarı yazarlık yasası değildir.** "15 sahnedir anılmadı" bir bilgidir, "unutuldu" yargısı değildir. Uyarının önemi yazarın tanımladığı hedefe bağlıdır. Yazarın kaydettiği olay, bir modelle çelişiyor diye silinmez ya da engellenmez; çelişki gösterilir ve açıklama yazara bırakılır.
13. **Model içinde bulunamamak, dünyada imkânsız olmak değildir.** Bir arama ya da çözücü üç sonuçtan birini verir: *tanımlı model içinde çözüm bulundu · aranan kayıtlı seçeneklerde çözüm bulunamadı · eksiksiz ilan edilmiş model ve desteklenen kısıtlar içinde çelişki kanıtlandı*. Hesap bitmediyse bu ayrı bir durumdur ("hesaplanıyor"). Kayıtlı olmayan bir olanağın var olamayacağı ilan edilmez; gerekirse "bu sonuç için henüz tanımlanmamış bir olanak ya da koşul değişikliği gerekir" denir.
14. **Ayrı ayrı mümkün olan sonuçlar birlikte mümkün olmayabilir.** Her sonuç, hangi varsayımlar altında hesaplandığını taşır (§18 Ortak varsayımlar). Farklı varsayımlarla bulunmuş sonuçlar aynı sahnede birlikte kullanılınca bu görünür olur; program onları tek bir tutarlı senaryo gibi sunmaz. Tarih aralıkları da yalnızca özettir: aralarındaki kısıtlar korunur, her tarih çifti kendiliğinden geçerli sayılmaz.
15. **Gizli seçim yoktur.** Bir alanın iki çözülmemiş değeri varsa (eşitleme çatışması, çelişen kaynaklar, çoklu varsayılan), hesap bunlardan birini görünmez biçimde seçmez; sonucu koşullu ya da belirsiz verir ve hangi değeri kullandığını söyler. "Son eklenen kazanır" gibi gizli kurallar yoktur.
16. **Sahte kesinlik üretilmez.** "Yaklaşık iki günlük yiyecek"ten "47 saat 18 dakika" çıkmaz. Aralığın ortası beklenen değer sayılmaz; belirsizlik olasılık yüzdesine ancak tanımlı bir olasılık modeli varsa çevrilir.

---

## 3. Kavram modeli

### 3.1 Kayıt, tür, bileşen ve çalışma sayfası

- **Kayıt:** kimlik, ad, eski adlar ve lakaplar, kısa özet, serbest metin, etiketler, görseller, karar durumu, oluşturulma ve düzenlenme bilgisi.
- **Tür:** kaydın ana niteliği (karakter, mekân, siyasi varlık, topluluk…). Tür değiştirilebilir; bağlantılar korunur. Yeni şablona uymayan alanlar silinmez, **"Eski türden aktarılan alanlar"** başlığı altında kalır.
- **Bileşen:** bir kayda eklenebilen modüler alan paketi (duyusal detaylar, Korur / İster / Korkar, kat planı, yaşam süresi…). Bir tür, varsayılan bileşenlerin listesidir; kullanıcı başka bileşen de ekler.
- **Ayrı kayıt mı, bileşen mi?** Ölçüt: *"Biri değiştiğinde ya da ortadan kalktığında diğeri bağımsız devam edebiliyor mu?"* Tapınak binası, rahip topluluğu ve inanç üç ayrı kayıttır ve ilişkiyle bağlanır; bina yıkılsa da inanç yaşar. Bileşenler yalnızca aynı varlığın farklı yönlerini taşır.
- **Birleşik çalışma sayfası:** Birden çok kayıt tek bir sayfada kartlar olarak birlikte düzenlenebilir ("Güneş Tapınağı" sayfasında bina, tarikat ve inanç). Sayfa bir çalışma düzenidir, yeni bir varlık değildir. Üyeleri rol ve zamanla tanımlanır; bir kayıt birden çok sayfada yer alabilir.
- **Bağlantı hedefi sessizce seçilmez.** Yapılandırılmış bir alan (sahnenin mekânı, karakterin dini) yalnızca uygun türdeki adayları daraltır. Tek aday varsa görünür biçimde önerilir; birden çoksa yazar seçer ya da bağlantıyı bilerek "genel sayfa" bırakır. Genel bağlantı yalnızca sayfaya götürür, "bu binada bulundu" gibi bir dünya iddiası üretmez. Seçicide "Bina / Örgüt / İnanç / Genel sayfa" seçenekleri görünür; yeni sözdizimi ezberletilmez. Sayfaya sonradan üye eklenince eski bağlantıların hedefi değişmez.
- **Sonradan ayırma:** Tek kayda yazılmış bir bileşen "ayrı kayda ayır" ile yeni kayda taşınır. Açıkça o bileşene bağlı ilişkiler taşınır; hedefi belirsiz ilişkiler ("Tapınağa borçlu": binaya mı, rahiplere mi?) önizlemede kullanıcıya sorulur.
- **Tür tanımı ile tekil örnek:** "Gümüş ejderhalar" ile "Avar adlı ejderha" ayrı kayıtlardır. Tekil örnek tür tanımından ortak özellikleri gösterir, kendi istisnalarını ayrıca tutar.

### 3.2 Bağlantı, ilişki ve katılım rolü

| Kavram | Nasıl oluşur | Anlamı |
|---|---|---|
| **Bağlantı** | Metne `[[Ad]]` yazmak | "Bu metin şu kayıttan bahsediyor." Geri-atıf panelinde görünür. Başka bir anlam taşımaz. |
| **İlişki** | Kullanıcı açıkça kurar | İki kayıt arasında tipli, yönlü ve zamana bağlı bağ (ebeveyn, üye, düşman, sahibi…). |
| **Katılım rolü** | Sahne ya da olaya kayıt eklerken seçilir | Kaydın o sahne ya da olaydaki rolü. |

**İlişki türünün dört özelliği:** *yön* (A→B), *ters yönden okunuş* ("A, B'ye borçlu" ↔ "B, A'dan alacaklı"), *karşılıklılık kuralı* (karşılığı kendiliğinden oluşur mu) ve *çokluk sınırı* (bir kişinin kaç eşi olabilir). Örnekler: karşılıklı (eş, kardeş, müttefik); farklı adlı karşılık (ebeveyn ↔ çocuk, usta ↔ çırak); karşılığı kendiliğinden oluşmayan (güvenir, nefret eder). Miktar, vade, kefil gibi ayrıntı gerekince ilişki kendi kimliği olan bir kayda dönüşür.

**İlişkinin zamanı ve geçmişi:** başlangıç, bitiş ve dönüm noktaları (ilk karşılaşma, güven kazanma, kırılma, ihanet, barışma). İlişki kaydı ayrıca **ortak geçmiş**, **A'nın beklentisi**, **B'nin beklentisi**, **gerilim noktası**, **söylenmeyenler** ve **açık mesele** tutabilir.

**Katılım rolleri:**
- Sahnede: *bulunuyor · adı anılıyor · hatırlanıyor · hakkında haber alınıyor*.
- Olayda: *başlatan · emri veren · katılan · tanık · zarar gören · sonradan öğrenen*.
- Zaman ve konum denetimleri yalnızca **fiziksel olarak bulunan** kayıtları değerlendirir. Ölmüş bir kraldan sonraki sahnede söz edilmesi hata değildir; ölünün bedeninin cenazede bulunması canlı katılım sayılmaz.
- Bir kişinin sahnede bulunması bir kayıttır; envanterinin ya da durumunun değişmesi ayrı bir olay etkisidir.

### 3.3 Eser, bölüm, sahne ve olay

| Kavram | Anlamı | Örnek |
|---|---|---|
| **Eser** | Aynı evrende geçen roman, öykü ya da taslak | *Kuzey Seferi* |
| **Bölüm** | Sahnelerin eser içindeki sırası (sunum bilgisi) | 8. bölüm |
| **Sahne** | Anlatı parçası; varsayılan evren tarihi, mekânı ve bakış açısı vardır | Kuşatmanın bir askerin gözünden anlatılması |
| **Olay** | Evrende gerçekleşen şey | Kalenin 412'de düşmesi |
| **Düzenleme geçmişi** | Yazarın yaptığı değişiklikler | Sahnenin bugün 5. bölüme taşınması |

- Bir evrende birden çok eser olabilir. Dünya kayıtları ortaktır; her eserin kendi bölümleri, sahneleri ve açık meseleleri vardır.
- Bağlantılar bölüm numarasına değil, sahne ve olay kimliklerine dayanır.
- **Sahne başka bölüme taşınınca:** evren tarihi değişmez. Değişebilecek olanlar okura sunulan sıraya bağlı şeylerdir: okurun bir bilgiyi öğrenme sırası, adların ve kavramların ilk tanıtıldığı yer, önceki tanıtıma dayanan göndermeler ve yazarın işaretlediği hazırlık–karşılık bağları. Taşımadan sonra bunları listeleyen kısa bir **anlatı etki özeti** çıkar; özet yalnızca açık işaretlere dayanır.
- "Okur bunu biliyor mu?" sorusu **eser ve okuma sırası** belirtilerek cevaplanır. Birinci kitapta açıklanan sır, aynı evrendeki başka kitabı ilk okuyan için hâlâ sır olabilir.
- **Sahne içinde bağlam parçaları:** Bir paragraf (geçmişe dönüş, okunan mektup, öbür cephe) kendi tarihini, yerini ve bakış açısını alabilir. Yan panel imlecin bulunduğu parçanın bağlamını gösterir. Bağlam boş da bırakılabilir. **Anlatıcı** ile **odak karakter** ayrıdır. Yazar veri modeline uysun diye sahneyi bölmek zorunda kalmaz.
- **Metin ile kullanım yeri ayrıdır:** Bir efsane metni romanda, yan kitapta ve wikide kullanılabilir. Kaynak metin, kullanım örneği ve baskıya sabitlenmiş kopya ayrıdır. Taşımak, kopyalamak, ortak kaynağa bağlamak ve bağımsız türev oluşturmak ayrı işlemlerdir.

### 3.4 Evren zamanı ve takvim

**Tarih biçimleri:** *kesin* (Yıl 412, Hasat'ın 12. günü) · *yaklaşık* (yaklaşık 300 yıl önce) · *aralık* (410–415) · *göreli* (X olayından önce/sonra) · *çapalı* (X olayından +14 gün; X'in tarihi değişince kayar) · *bilinmiyor*. Göreli tarihlerin sayıya çevrilmesi gerekmez. Zaman çizelgesi belirsiz tarihleri aralık bandı ya da göreli sıra olarak gösterir ve kesin tarihlerden görsel olarak ayırır.

**Takvim:** Her dünya kendi takvimini tanımlar: yıl uzunluğu, mevsimler, aylar (ad ve gün sayısıyla), hafta, bayramlar ve özel günler. Bir dünyada birden çok takvim olabilir; aynı olay paralel tarihlerle gösterilir. Çağlar ve negatif yıllar ("Kuruluş öncesi") desteklenir. Tarihlerin saklanma biçimi baştan özel takvime göre tasarlanır.

- **Dönüşüm her zaman tek tarih vermez.** Takvimler arası eşleme eksikse ya da kayıt "üçüncü hükümdarın yedinci kışı" diyorsa sonuç aralık, birkaç olasılık ya da "eşlenemiyor" olur. Kesin dönüşüm uydurulmaz.
- **Göreli ifadenin dayanağı sabittir.** "300 yıl önce" hangi olaya, sahneye ya da tarihli anlatıma göre söylendiyse ona bağlanır; uygulamanın bugününe göre kaymaz.
- **Mevsimin etkileri:** Bir mevsime toplumsal etkiler bağlanabilir: savaş mevsimi, hasat, denizin kapandığı aylar. Bu etkiler rota sürelerinde ve üretim hesaplarında kullanılabilir (§15).
- **Yaş:** Doğum tarihi biliniyorsa karakterin her olaydaki yaşı hesaplanır ve hangi dünya tarihine bakıldığı yazılır. Doğum tarihinin çözülmemiş iki değeri varsa yaş koşullu gösterilir (§2.2 kural 15).

### 3.5 Durum geçmişi

Kalenin sahibi, unvan, ikamet, üyelik ve ilişkiler zamanla değişir. Bu alanlar **geçerlilik aralığıyla** saklanır:

```
Unvan: [ Çırak (412 – 418), Lonca Ustası (418 – …) ]
Sahibi (Kuzey Kalesi): [ Aldren Krallığı (… – 430), Varos (430 – …) ]
```

- Aralıklar **evren zamanına** bağlanır, bölüm numarasına bağlanmaz. Yan panel bir sahne açıkken kaydı o sahnenin evren tarihindeki durumuyla gösterir; sahnenin tarihi girilmemişse bunu söyler.
- **Aralığın sınırı** kesin tarih, yaklaşık tarih, aralık, bir olaya göre fark ya da yalnızca önce–sonra olabilir. Sınır bir olaya bağlanırsa olayın tarihi değişince kendiliğinden kayar ("Kuzey Valisi: Velkar Kuşatması'ndan → İsyan'a kadar"). Olaya bağlamak zorunlu değildir. Program gizli "zaman çapası" olayları oluşturmaz; dayanak her zaman görünür.
- **Neden ile aynı tarih ayrıdır:** "Kuşatma yüzünden el değiştirdi" ile "aynı yıl el değiştirdi" farklı kayıtlardır.
- **Evrendeki değişim ile düzenleme ayrıdır:** Kalenin 430'da el değiştirmesi evren olayıdır; yanlış girilmiş bir tarihi bugün düzeltmek değildir.
- **Dört zaman ayrılır:** olayın evren tarihi, bir kişinin onu öğrenme tarihi, okura sunulma sırası (eser ve baskıya göre) ve yazarın düzenleme tarihi.
- **Gözlem ile süren durum ayrıdır.** "420'de sarayda görüldü" tek bir anın gözlemidir; kişinin sonraki yıllarda sarayda yaşadığı anlamına gelmez. "420'den sonraki değişikliğe kadar ikametgâhı saray" ise süren durumdur. Her kayıt hangisi olduğunu taşır (anlık · aralık · sonraki değişikliğe kadar). Alanlar kendiliğinden ileri taşınmaz; ileri taşınan alanlar şablonda açıkça işaretlenir.

### 3.6 Karar durumu ve bilgi katmanları

**Yazarın karar durumu:** *fikir · kesinleşmiş · vazgeçilmiş*. Vazgeçilen fikirler silinmez; normal aramada istenirse gizlenir. Durum alan düzeyinde de tutulur: karakterin adı kesinleşmiş, doğum yılı hâlâ fikir olabilir. Kayıt düzeyindeki etiket yalnızca genel iş düzeni içindir. "Yazar karar verdi", "evrende doğru sanılıyor", "okura açıklandı" ve "hesaptan çıktı" aynı onay değildir.

**Bilgi katmanları** tek bir "taslak / kanon" alanında birleştirilmez:

| Katman | Örnek |
|---|---|
| Evrenin gerçeği | Kralı kardeşi öldürdü. |
| Halkın / bir grubun inancı | Kralın hastalıktan öldüğü sanılıyor. |
| Bir karakterin bilgisi | Prenses gerçeği sonra öğreniyor. |
| Okura açıklanan bilgi | Katil, *Kuzey Seferi*'nin 8. bölümünde açığa çıkıyor. |

- **Bilgi durumu.** Arayüzde kısa liste görünür: *bilmiyor · yanlış biliyor · şüpheleniyor · biliyor ama saklıyor · biliyor*. Altta üç ayrı eksen tutulur: *inanç derecesi* (inanıyor, şüpheleniyor, reddediyor), *gerçekle uyumu* (yalnızca yazar gerçeği belirlediyse hesaplanır; belirlemediyse "yanlış biliyor" çıkarılmaz) ve *saklama* (kime karşı saklıyor).
- **Belge okununca:** Bir karakter sahnede evren içi bir belgeyi okuyunca panel belgedeki işaretli iddiaları listeler ve tutumu sorar: *inandı · reddetti · kararsız · anlamadı · yalnızca bir kısmını okudu · atla*. Tutum **okunan belge sürümüne** bağlanır. Mektup sonradan sahteleştirilirse eski okuyucunun inancı değişmez. Üç işlem ayrıdır: *yazar düzeltmesi* ("yanlış kaydetmişim"), *evren içi değişiklik* ("mektup 431'de değiştirildi"), *yeni öğrenme* ("Kaelen 432'de yeni nüshayı gördü").
- Bir belgenin bir iddiayı ileri sürmesi ile bir kişinin ona inanması ayrı kayıtlardır.
- **Bilgi kaynağı:** *gördü · birinden duydu · belge okudu · çıkarım yaptı*. Böylece "bunu nereden biliyordu?" cevaplanır.
- **Bakış açısı filtresi** soy ağacında, ağda, haritada ve zaman çizelgesinde de çalışır. Gerçeği yalnızca gizlemez, o grubun inandığı alternatifi gösterir (halk görünümünde gizli kardeşler "kuzen" görünür).
- **İnancın da zamanı vardır:** Her bilgi durumu başlangıç ve bitişiyle tutulur; sınırlar olaya bağlanabilir.
- **Soru ile cevap aynı türden olmalı:** "Ölüm nedeni", "fail" ve "kasıt" ayrı iddialardır.
- **Başkasının bilgisine dair inanç** ("vezir, prensesin bilmediğini sanıyor") yalnızca kullanıcının seçtiği sırlar ve kişiler için açılır (F05).
- **Grup bilgisi:** "Konsey biliyor" bütün üyelerin bildiği anlamına gelmeyebilir; toplantıda olanlar, sonradan öğrenenler ve dışarıda bırakılanlar ayrılabilir.
- **Bilinmeyenin türleri:** *henüz düşünülmedi · yazar bilerek açık bıraktı · evrende bilinmiyor · kaynaklar çelişiyor · bu kayıt için geçersiz*. Program gizli bir "doğru değer" istemez. Her türün varsayılanlarla ve sorgularla nasıl davrandığı §3.7 ve §18'de tanımlıdır.
- Bu alanlar yalnızca önemli bilgiler için doldurulur; hiçbiri zorunlu değildir.

### 3.7 Kapsama, bağlılık, kültür ve varsayılan değerler

Mekân ile siyasi varlık ayrı kayıt türleridir. **Bölge** bir mekândır (coğrafi alan). **Krallık** bir siyasi varlıktır: kontrol ettiği arazi, iddia ettiği arazi ve yönetim merkezi ayrı, tarihli ilişkilerdir. Sürgündeki krallığın hiç arazisi olmayabilir; sınır değişince krallığın kimliği ve geçmişi değişmez. İkisi bir çalışma sayfasında birlikte düzenlenebilir (§3.1); bu, kimliklerini birleştirmez.

| İlişki | Örnek | Değişir mi? |
|---|---|---|
| **Fiziksel kapsama** | Oda ⊂ Han ⊂ Mahalle ⊂ Şehir ⊂ Bölge | Nadiren; gemi, göçebe kampı, yürüyen kale gibi hareketli mekânlarda değişir |
| **Siyasi bağlılık** | Şehir → Krallık (egemenlik, idari bağ) | Fetihle değişir |
| **Kültürel aidiyet** | Şehrin halkı → Kuzey kültürü (birden çok olabilir) | Yavaş değişir |

- **Geçişli sorgu:** Üst bölge seçilince alt birimlerdeki kayıtlar da sonuca girer; hangi ilişki üzerinden gezileceği seçilir.
- **Hareketli mekân:** Kapsama, yerel koordinat ve dünyadaki konum ayrı bağlanır; masanın kamaraya göre yeri sabitken dünya konumu değişebilir.
- **Alt birimlerden toplananlar:** Şehir sayfası, mahallelerinde yazılmış üretim, inanç, topluluk ve açık meseleleri kaynaklarıyla salt okunur olarak toplar. Aynı lonca üç mahalleye bağlıysa üç lonca sayılmaz. "Bu şehirde kayıtlı gördüklerimiz" ile "şehrin özelliği" ayrıdır. Şehirden miras alınan değer yeniden yukarı toplanıp kanıt sayılmaz.
- Aynı ülkenin içindeki sınıflar, bölgeler ve inanç toplulukları farklı kültürel özellikler taşıyabilir.

**Varsayılan değerler.** Bu, bir alan boşken ne gösterileceğinin tek tanımıdır.

- Yalnızca şablonda "varsayılan alabilir" diye işaretlenen alanlar başka bir kayıttan varsayılan alır. Her alanın hangi eksenden aldığı şablonda yazılıdır: iklim ve doğa fiziksel kapsamadan; resmî para, vergi, hukuk ve resmî takvim siyasi bağlılıktan; dil, hitap, gelenek ve mimari kültürel aidiyetten. Şehrin koordinatı kendisine aittir.
- **Beş değer türü ayrıdır:** açıkça girilmiş değer · boşken gösterilen varsayılan · çevrede yaygın uygulama · resmî kural · fiilen uygulanmış değişiklik.
- **Varsayılan bir öneridir, kayıt değildir.** Arayüz kaynağını gösterir: *"Bölge varsayılanı: Kuzeyce"*. Varsayılanı değer olarak kabul etmek açık bir kullanıcı işlemidir. Şablon formundaki hazır seçenek de kişinin evrende o dili bildiğinin dayanağı değildir.
- **Birden çok kaynak:** Bir alan birden çok kaynaktan varsayılan alıyorsa (iki kültür iki farklı dil, iki otorite iki farklı resmî takvim) program şu durumları ayırır: *birlikte geçerli* (iki dil de konuşulur) · *kapsamları farklı* (biri sarayda, biri pazarda) · *öncelik kullanıcı tarafından belirlenmiş* · *çatışma çözülmemiş*. Çözülmemiş çatışmada iki değer de gösterilir; eklenme sırası hiçbir şeyi belirlemez.
- **Bilinmeyen türlerine göre davranış:**

| Alanın durumu | Varsayılan gösterilir mi? | Hesapta kullanılır mı? |
|---|---|---|
| Boş, henüz düşünülmedi | Evet, öneri olarak | Yalnızca "varsayımla" etiketli tahminlerde |
| Yazar bilerek açık bıraktı | Hayır | Hayır; hesap "bilerek açık" der |
| Evrende bilinmiyor | Hayır | Hayır |
| Kaynaklar çelişiyor | Çelişen değerler gösterilir | Koşullu sonuç |
| Bu kayıt için geçersiz | Hayır | Hayır |
| "Bilinmiyor" girilmiş | Hayır; üstten değer gelmez | Hayır |

- **Fetih ve siyasi değişiklik:** Bir şehrin siyasi bağlılığı değişince konumu değişmez; para birimi, mahkemesi, dili ya da dini de o gün kendiliğinden değişmez. Program, eski yönetimden varsayılan olarak gelen alanları (para, vergi, hukuk, resmî takvim) listeler ve **her alan için ayrı** sorar: *eski uygulama sürüyor · yeni uygulama şu tarihte başladı · ikisi birlikte geçerli · henüz karar vermedim*. Önceki değer varsayımsa dayanağı "varsayım" olarak kalır. Vergi hemen, mahkeme iki yıl sonra, para yirmi yılda değişebilir; resmî para ile pazarda kullanılan para farklı olabilir.

### 3.8 Eşya, sahiplik, makam ve kafile

- **Eşya** için ayrı tutulanlar: *sahibi · elinde bulunduranı · konumu · durumu* (sağlam, kırık, kayıp, yok edilmiş). Hepsinin geçmişi vardır (§3.5). Kılıcı bir haberciye vermek taşıyanı değiştirir, sahibini değiştirmez.
- **Sahiplik:** Eşya açıkça "tek sahipli" işaretlendiyse yeni sahip girilince önceki sahip o tarihten itibaren düşer. Aksi hâlde sahiplik iddiası, hukuken tanınan hak, fiilî kontrol, taşıma ve kullanım hakkı ayrı tutulur; ortak mülk, hisseli gemi, rehin ve rakip mirasçılar mümkündür. Haklar için F26.
- **Tekil ve bölünebilir:** Kılıç gibi tekil nesne ile yüz çuval tahıl gibi bölünebilir miktar aynı envanter davranışına zorlanmaz. Miktarların anlamı §18 nicelik sözleşmesindedir.
- **Makam ile kişi ayrıdır:** Kuzey Valiliği kalıcı bir makam kaydıdır; belirli tarihlerde farklı kişiler yürütür. Makamın nasıl kazanıldığı §3.10'daki süreç kuralıyla tanımlanır.
- **Kafile:** Geçici grup kaydı. Üyelerin katılma ve ayrılma zamanları tutulur; kafile hareket ettiğinde yalnızca o sırada grupta olanlar onunla birlikte gösterilir.

### 3.9 Evren içi belge ve araştırma kaynağı

| | Araştırma kaynağı (dünya dışı) | Evren içi belge |
|---|---|---|
| Örnek | Ortaçağ limanları üzerine makale | Liman defteri, mektup, antlaşma, ilan |
| Alanlar | Bağlantı, sayfa, alıntı, yorum, ilgili kayıtlar | Yazarı, tarihi, alıcısı, kimin erişebildiği, sürümleri, **içerdiği iddialar** |

"Belgede ne yazıyor?" ile "gerçekte ne oldu?" ayrıdır; propaganda ya da güvenilmez anlatıcının sözü evrenin kesin bilgisine dönüşmez. Kopya, tercüme ve sansürlü sürüm aynı belge ailesine bağlanır (F08). Belgeler istenirse görsel bir şablonla sunulur (§11).

### 3.10 Süreçler, adımlar ve eşikler

Taç giyme, kuşatma, ritüel, antlaşma, yolculuk ve büyü uygulaması gibi süreçler için:

- **Plan, başlama, adımlar, yarıda kalma ve sonuç ayrı kayıtlardır.** Eksik adım "olmadı" sayılmaz; bilinmiyor olabilir.
- **Bir sürecin sonucu, ilgili kurumun ya da kuralın açık tanımına bağlıdır.** Program evrensel bir kural koymaz. Bir gelenekte makam yeminle, ötekinde taçla, üçüncüsünde konseyin tesciliyle kazanılır. Tören yarıda kalsa da hukuki aşama tamamlanmış olabilir.
- Süreç kuralı şunları tanımlayabilir: başlangıç koşulları, önemli adımlar, her adımın etkisi ve **geri dönülmez eşikler**. Büyünün bedeli hazırlıkta, etkisi tamamlanınca doğabilir; iptalde bedel iade edilmeyebilir. Hepsini kullanıcı açık kuralla belirler.
- **Çatışan otoriteler:** İki kural farklı sonuç veriyorsa (Kuzey geleneğine göre kral, başkent hukukuna göre tescil eksik) program tek bir "oldu/olmadı" sonucuna zorlamaz. Bu dünya içindeki bir anlaşmazlıktır; yazar hangi hükmün fiilen uygulandığını ayrıca kaydedebilir.
- **Olay kaydı ile uygulanabilirliği ayrıdır.** Yazar "mühürsüz elçi kapıdan geçti" yazabilir; program bunu silmez. Geçiş kuralı mühür istiyorsa çelişki ya da açıklama ihtiyacı gösterir. "Nöbetçi kandırıldı" gibi açıklamalar kendiliğinden üretilmez.
- Süreçte tüketilen kaynak, süreç tamamlanmadı diye kendiliğinden geri dönmez; iadeyi kural ya da yazar belirler.

---

## 4. Kayıt türleri

Her tür bir **varsayılan bileşen listesi** ve bir **soru kütüphanesi** ile gelir. Sorular yalnızca öneridir (§6). Kullanıcı türleri ve şablonları düzenler, yeni tür ekler.

### 4.1 İnsanlar, gruplar ve siyasi yapılar

| Tür | Öne çıkan alanlar (hepsi isteğe bağlı) |
|---|---|
| **Karakter** | İstek, korku, kusur, sır, sınır, geçmişin etkisi · kötü alışkanlık (tetikleyici, kimi rahatsız ettiği, neyi gizlediği) · bildiği diller ve düzeyi · **karar geçmişi**: seçenekler, seçim, gerekçe, kaybettiği, sonradan ne düşündüğü · **söylediği ile yaptığı** · görseller (yaş, dönem, kıyafete göre). Kişilik puanı zorunlu değildir. |
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
| **Eser** | Bölümler, sahneler, okuma sırası, açık meseleler, sabit başvuru sürümü (§9.7), anlatı sözleşmesi (F15) |
| **Bölüm** | Sıra, sahneler |
| **Sahne** | Evren tarihi, mekân, bakış açısı, anlatıcı ve odak karakter, bağlam parçaları (§3.3), katılımcılar ve rolleri · süreklilik defteri (§5.6) · geçici sahne yerleşimi |
| **Kurgu hattı** | Gizem, siyasi mücadele, ilişki ya da hedef · bağlı sahneler · ipuçları (*planlandı · metne yerleştirildi · karşılığı verildi · vazgeçildi*) · "son bağlantılı sahne sekiz sahne önceydi" gibi somut bilgiler. Tempo yargısı verilmez. |
| **Motif / simge** | Görünüşü, anlamı, kimin nasıl yorumladığı (kültüre ve döneme göre), geçtiği sahneler · eşyanın gerçek geçmişi ile anlatılan efsanesi ayrı |
| **Not** | Şablon (sahne fikri, karakter notu, dünya notu, araştırma) · iliştirildiği kayıtlar · her zaman özel · tek dokunuşla kayda dönüşür ve bağ korunur |
| **Açık mesele** | Soru, bağlı kayıt ya da sahne · *düşünülecek · kararlaştırıldı · şu an gerekmiyor* · önemli olarak işaretlenebilir |
| **Karar kaydı** | Soru, düşünülen seçenekler, seçilen çözüm, gerekçe, etkilenen kayıtlar. Örnek: *"Büyü iyileştiremez, çünkü yaralar hikâyede ağırlığını korumalı."* |

---

## 5. Yazma deneyimi

### 5.1 Bağlantı yazma

- `[[` yazılınca küçük bir **seçim kutusu** açılır. Kullanıcı mevcut bir kaydı seçer ya da türü ve özetiyle yeni kayıt oluşturur. Yeni kayıt **fikir** durumunda doğar ve "Bahsedilen ama yazılmamış" listesine düşer.
- **Kısayol sözdizimi:** görünen metin için `[[Kayıt|görünen metin]]`; yeni kayıt için `[[Ad::Tür::özet]]`. `|` yalnızca görünen metin içindir; `#` blok bağlantısına ayrılmıştır.
- **Türkçe ekler:** `[[Velkar]]'dan` ya da `[[Kaelen]]'in` yazıldığında ek bağlantının görünümüne dahil edilir. Program cümledeki ekleri kendiliğinden değiştirmez. Bağlantının hedefi ile görünen ifade ayrı tutulur.
- **Çekimli biçimden kök bulma:** `[[kuzey kılıcıyla]]` yazılınca program Türkçe ek kurallarıyla (ünsüz yumuşaması, ünlü düşmesi dahil) kök adaylarını çıkarır. Tek ve güçlü eşleşme varsa öneri yapar; birden çok aday varsa kısa seçim gösterir. Görünen metin değişmez. Bir yerin eski ya da yabancı adı da aynı kayda bağlanır (§15-4).
- Ad değişince bütün bağlantılar korunur. Eski adlar ve lakaplar aramada bulunur. Aynı adlı iki kayıt türleri, özetleri ya da bağlı oldukları yerle ayırt edilir (F19 kimlik satırı).

### 5.2 Gömme ve bağlam

`![[Kayıt#Bölüm]]` başka bir kaydın belirli bir bölümünü metnin içinde gösterir. Gömme, bölümün değişmeyen kimliğine bağlanır; başlık değişse de bozulmaz.

**Dört bağımsız bağlam** gösterimi belirler: *içeriğin hangi sürümü* (güncel ya da sabitlenmiş), *hangi dünya tarihi*, *kimin bilgisi* ve *hangi yayın kapsamı*. Çoğu bulunduğu yerden (sahneden) devralınır; değiştirilen ya da sabitlenen bağlam görünür. Bu dört bağlam bütün görünümlerde (yan panel, bağlam karşılaştırma, yayın önizlemesi) aynı anlamdadır.

**Bağlamların birleşimi:**
- Bağlamlar farklı kaynaklardan seçildiyse (eski baskının metni ile yeni taslağın dünya bilgisi) görünüm bunu açıkça yazar: "karşılaştırma görünümü, eski baskının kendisi değil".
- **Düz metin ile yapılandırılmış blok ayrıdır.** Yapılandırılmış bir alandan üretilen kart (Velkar'ın yönetimi) dünya tarihine göre değişir: 410'daki sahnede o yılın, 430'dakinde o yılın yönetimini gösterir. Düz yazılmış bir paragraf ("Velkar 430'da Varos'a bağlıdır") tarih değişince kendiliğinden yeniden yazılmaz; yalnızca yazarın hazırladığı başka bir sürüm ya da blok seçilebilir.

Sık kullanılan kipler: **güncel kaynağı izle** · **bu sürümü sabitle** · **sahnenin bağlamıyla göster**.

Bakış açısı filtresi yayın izni vermez. Wikide yalnızca açıkça "okura açık" işaretlenmiş bloklar ve alanlar çıkar; program etiketsiz serbest metindeki gizli cümleleri ayıklayamaz (§11).

### 5.3 Özet kartı

Bir bağlantının üzerine gelince küçük kart açılır: görsel, tür, kimlik satırı ve ana alanlar. Dokunmatik cihazlarda kart dokunup basılı tutunca da açılır, ama bu tek yol değildir: seçili bağlantının yanında görünen bir bilgi düğmesi de aynı kartı açar (§12.2).

### 5.4 Yan panel

Bir bölüm ya da not açıkken başka bir kayıt yan panelde açılır; birden çok kayıt sekme olarak tutulur. Telefonda yan panel yerine alttan açılan kart kullanılır.

### 5.5 Sahne bağlam paneli

Açık sahnenin (ya da imlecin bulunduğu bağlam parçasının) evren tarihine, mekânına ve bakış açısına göre salt okunur olarak toplar:
- Katılımcıların o tarihteki durumu (unvan, yaş, taşıdıkları eşyalar).
- Mekânın duyuları ve o zamanki kullanım hâli.
- İlgili kültürün gündelik kuralları, tabuları ve hitapları; karaktere uygulanan hukuk kuralları.
- Bakış açısı karakterinin o anda bildikleri ve eriştiği haberler.
- Tarih girilmemişse bunu açıkça söyler.

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
- Değişimler sahnelere değil **evren olaylarına** bağlanır. Aynı olay iki sahnede anlatılıyorsa değişim bir kez uygulanır; sahne silinince harcama geri gelmez (§9.6).

### 5.7 Metin işaretleme (serbest yazıyı sonradan yapılandırma)

Bir cümle seçilip bir iddiaya, dünya durumuna ya da olaya bağlanabilir ("Sarnıcın anahtarı o gece Elin'deydi" → anahtar kaydı, taşıyan, olay zamanı). Her cümlenin işaretlenmesi gerekmez.

- **Dört şey ayrıdır:** metindeki işaret · işaretlenen iddia · bağlı dünya durumu ya da olay · bunların sürümü. Aynı iddia üç sahnede anılabilir; tek cümle iki iddiaya bağlanabilir; işaretler kısmen üst üste gelebilir.
- İşaret, metin düzenlendikçe yerinde kalır (karakter sırasına değil metnin yapısına bağlıdır). **Yerini korumak, anlamını korumak değildir:** "Elin kılıcı taşıyordu" cümlesi "Kaelen" yapılınca bunun düzeltme mi, yeni olay mı, yanlış hatırlama mı olduğunu program bilemez. İşaret yazarın "kritik" dediği bir işaretse kısaca sorar (F24); değilse inceleme kuyruğuna bırakır (§9.3).
- **Metni silmek dünya kaydını silmez.** İşaretli cümle silinince olay evrende kalır, "artık metne bağlı değil" listesinde görünür. Dünya kaydını kaldırmak ayrı bir karardır ve etki önizlemesiyle yapılır.
- **Kes–yapıştır işareti taşır; kopyala–yapıştır yeni bir metin örneği yaratır.** Yeni örneğin aynı olaya mı yeni olaya mı bağlanacağı açık kalır. Dış editöre gidip gelen metinde işaret bulunamazsa "bağlantı belirsiz" denir; benzer cümleye sessizce yapıştırılmaz.
- Kayıt değişince işaretli cümle değişmez. Hangi değişikliğin cümleyi incelemeye açtığı §9.3'te tanımlıdır.

### 5.8 Komut paleti ve hızlı not

- `Ctrl+K` ya da `/` ile komut paleti: kayıt aç, yan panele al, hızlı not, iki mekân arası yolculuk süresi, takvim günü hesabı, yeni kayıt.
- **Hızlı not** her ekrandan erişilir. Telefonda tek dokunuşla açılır, uzun form göstermez ve kaydedildiğini açıkça söyler.

### 5.9 Çalışma masaları ve kaldığın yere dönme

- **Çalışma masası:** bir konu için oluşturulan alan ("Velkar isyanı": şehir planı, karakterler, tarih aralığı, kaynaklar, açık sorular, sahneler). Kayıtlar kopyalanmaz, masa onlara bağlanır. Masanın düzeni, notları, seçili varsayımları ve "bugün burada neyi çözmeye çalışıyorum?" satırı korunur.
- **Kaldığın yere dönme:** son açık sahne, imleç, yan paneldeki kayıtlar, seçili tarih ve kısa bir "buradan devam" notu saklanır ve **cihazlar arasında eşitlenir**. Panel yerleşimi, yakınlaştırma ve pencere ölçüsü **cihaza özeldir** ve eşitlenmez. Bir cihazın açılması öbür cihazın çalışma alanını zorla değiştirmez. Daha geniş bir çalışma devri kartı F47'de öneridir.

### 5.10 Çalışma düzenleri

Aynı verinin farklı görünümleridir; veri kopyalanmaz.

| Düzen | Öne çıkanlar |
|---|---|
| Evren kayıtlarını düzenleme | Kayıt listesi, ilişkiler, harita |
| Sahne yazma | Metin, dar bağlam paneli, hızlı not |
| Tutarlılık inceleme | İnceleme kuyruğu, zaman çizelgesi, etkilenen kayıtlar |

Yazma ekranında bütün evrenin panelleri ve uyarıları bulunmaz.

---

## 6. Rehber, sorular ve açık meseleler

- **Soru kütüphanesi:** Her türün soru seti vardır (görsellerden çıkan listeler: [tasarim.md §2.10](tasarim.md)). Her soru **cevaplanabilir**, **sonraya bırakılabilir** ya da **ilgisiz** işaretlenebilir. Bir soru yeni bir kayıtla da cevaplanabilir ("İnsanlar neye inanıyor?" → inanç kaydı).
- **Yeni dünya başlangıcı** isteğe bağlıdır ve atlanabilir: temel fikir, çatışma, karakter. Kullanıcı bunun yerine bir dinle, coğrafyayla ya da tarihle başlayabilir.
- **Dünya Pusulası:** beş temel soru (merkez çatışma, gündelik hayat, güç ve bedeli, kırılırsa her şeyi değiştiren kural, dünyanın karakteri nasıl dönüştürdüğü) bir panelde durur. **Doluluk göstergesi yoktur.** Masada yalnızca kullanıcının *önemli* işaretlediği açık sorular öne çıkar.
- **Açık meseleler** ve **karar defteri** (§4.6) boş alanları eksik saymadan anlamlı bir çalışma listesi verir. "Önce ihtiyacın olanı kur" ilkesi bunun gerekçesidir (K5).

---

## 7. Görünümler

| Görünüm | Ne gösterir | Not |
|---|---|---|
| **Masa** | Son düzenlenenler, önemli açık meseleler, bahsedilen ama yazılmamış sayfalar, hızlı not, kaldığın yer | |
| **Kayıt sayfası** | Başlık, görsel, bileşenler, metin, ilişkiler (zamana göre), geri-atıflar, notlar, açık meseleler | Görseli olmayan kayıtta baş harf rozeti |
| **Ağ** | Seçili kaydın yakın bağlantıları | Bütün evren isteğe bağlı açılır; ilişki türü, dönem, kayıt türü ve bakış açısıyla filtrelenir |
| **Soy ağacı** | Ebeveyn, eş, kardeş; çoklu evlilik, evlatlık, gayrimeşru çocuk, siyasi evlilik, soy içi evlilik farklı çizgilerle | Çakışmasız çizim vaat edilmez; odaklanma, dal kapatma ve filtre sunulur |
| **Zaman çizelgesi** | Kesin tarihler noktayla, belirsizler bantla, göreli sıralar okla | Çağlar, paralel takvimler, eser ya da kurgu hattına göre filtre |
| **Neden–sonuç ağı** | Olaylar arasındaki *neden oldu / engelledi…* bağları | Maden kapandı → vergi düştü → maaş ödenemedi → garnizon dağıldı |
| **Takvim çarkı** | Mevsimler, bayramlar, mevsime bağlı olaylar | |
| **Bölüm × kayıt matrisi** | Bölümler × karakterler, eşyalar, sırlar | Katmanlar: fiziksel katılım, anılma, bakış açısı, bilgi edinme, olay etkisi, okura açıklanma. "Kaç sahnede görünüyor" ile "kaç sahnede konu oluyor" ayrı sayılır |
| **Yoğunluk ve boşluk** | Zaman çizelgesi ve haritada isteğe bağlı katman | Olay, sahne, kelime ve kayıt sayısı ayrı yoğunluklardır; altı sahnede anlatılan tek suikast altı olay sayılmaz. "Bu kapsamda güneyde kayıtlı olay yok" denir; denge önerisi üretilmez |
| **Bağlam karşılaştırma** | Aynı kaydın iki bağlamda yan yana görünümü (§5.2) | Farkın dünya zamanından mı, bilgi katmanından mı, taslaktan mı geldiği gösterilir |
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
- **Koordinatlar oransal (0–1) saklanır;** görsel yeniden boyutlanınca işaretler yerinde kalır. Kırpma ya da yeniden çizimde hizalama aracı kullanılır (§8.5).

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

- Ölçeği tanımlanmamış bir görselden kilometre ya da süre üretilmez; ama aynı yerler arasındaki elle girilmiş süreler hesapta kullanılır. Ölçek birimi dünyaya özeldir (fersah, menzil).
- Rota süresi yalnızca uzunluktan oluşmaz: mevsim, ulaşım biçimi, geçiş izni, kapı saatleri ve kapasite gibi koşullar rotaya bağlanabilir. Koşullar yola çıkış anında değil, **ilgili noktaya varış anında** değerlendirilir; yola çıkışta geçerli bir izin sınıra varıldığında bitmiş olabilir. Ayrıntılı zamanlı geçitler F39'da öneridir.
- **Rota ve yolculuk ayrıdır** (§4.2). Harita üzerinden "burada kim vardı, ne oldu, yolculuğun hangi aşamasındaydılar?" sorulur.

### 8.5 Harita hizalama

Harita görseli değişince eski işaretler yeni görsele taşınır:
- **2 nokta çifti:** taşıma, döndürme ve tek oranlı ölçek (benzerlik dönüşümü). Yeniden boyutlama ve genişletme için yeterlidir.
- **3 nokta çifti** (aynı doğru üzerinde olmayan): genel afin dönüşüm; eğik ya da farklı oranlı esneme de düzeltilir.
- Sonuç önizlenir ve geri alınır. Coğrafyası yeniden çizilmiş haritada işaretler tek tek düzeltilir. Bütün katmanlar aynı güvenle taşınmış sayılmaz: hangi işaretlerin ve bölgelerin yeniden gözden geçirilmesi gerektiği listelenir.

### 8.6 Kat planı ve sahne yerleşimi

Kapılar, pencereler, katlar, görüşü kapatan unsurlar. Bir sahne için karakterlerin geçici konumları yerleştirilir; bu yerleşim binanın kalıcı planını değiştirmez. Eski sahne, kullandığı plan sürümünü korur. "Bunu duyabilir miydi?" yazarın kendi incelemesi içindir, program kesin yargı vermez (§15-6).

### 8.7 Tablet kalemi

Sayfayı kaydırma ile işaret taşıma birbirine karışmaz; kalem kipleri (seçme, çizme, taşıma) arasında görünür biçimde geçilir (§12.2).

---

## 9. Tutarlılık ve bakım

### 9.1 Kural tabanlı denetimler

Her denetim sonucu şu durumlardan biridir: **Açık çelişki** · **Olası uyuşmazlık** · **Denetlenemiyor** (gereken veri eksik; hangisi olduğu söylenir) · **Kontrol edildi, sorun yok** · **Bu kurala konu değil** · **Henüz çalıştırılmadı** · **Sonuç eski veriye ait**. Boş uyarı paneli "her şey doğrulandı" anlamına gelmez; "sorun yok" yalnızca belirtilen kurallar ve kapsam için geçerlidir. Her uyarı dayanağını gösterir: *"İki olay arasında 1 gün var. Seçilen rota için tanımlı en kısa süre 3 gün."* Bu cümle yalnızca o rota ve koşullar için geçerlidir; karakterin başka bir yolla gelemeyeceği çıkarılmaz (§2.2 kural 13).

| Denetim | Kural |
|---|---|
| Yaşam süresi | Doğumdan önce ya da ölümden sonra bir olayda **fiziksel olarak bulunma**. Kişisel kronoloji modeli (F45) açıksa dünya tarihi yerine kişinin yaşadığı sıra kullanılır. |
| Döngüsel tarih | Göreli tarihlerde A < B < C < A gibi imkânsız döngü |
| Konum ve rota | Aynı aralıkta iki yerde bulunma, ya da kayıtlı rota süresinden kısa sürede yer değiştirme. Tarih gün düzeyindeyse sonuç "olası" olur. |
| Eşya | Tek sahipli ya da tekil bir eşyanın aynı anda iki kişide bulunması, yok edildikten sonra kullanılması |
| Bilgi | Karakterin bir bilgiyi öğrenmeden önce ona göre davranması (yalnızca kullanıcının kurduğu bilgi kayıtları üzerinden) |
| Süreç | Bir olayın, bağlı süreç kuralının önkoşuluyla çelişmesi (§3.10) |

- **Gerekçeli istisna:** İstisna bütün kaydı susturmaz; belirli kurala, tarih aralığına, olaya ya da varoluş biçimine (hayalet, ceset) bağlanır ve gerekçesi yazılır. "Bu çelişkiyi bilerek kabul ediyorum" (yazar tercihi) ile "bu kural burada uygulanamaz" (kapsam düzeltmesi) ayrıdır.
- **Kapsamlı kurallar:** Bir kural bir bölgeye, boyuta, türe ya da kuruma bağlanır. "Fey Boyutu'nda geçen 10 gün dışarıda 1 gün" kuralı o boyuttaki sahnelere tek tek istisna girmeden uygulanır. Oranın yönü yazıyla belirtilir; oran değişiyorsa geçiş tarihleri girilir; o boyuttan geçen kişinin takvim yaşı ile yaşadığı süre ayrılır.
- **Kural çatışması bir sonuç olabilir:** "Evrensel → bölgesel → kurumsal → tekil" önceliği bazı alanlarda kullanılır, ama her zaman en alttaki kazanmaz. Tapınak hukuku ile şehir hukuku çatışıyorsa bu dünyadaki bir sorundur; sistem "iki makam farklı karar veriyor" sonucunu gösterir.
- **Dirilme:** Bir türün dirilebilmesi her ölümden sonra dirildiği anlamına gelmez. Ölüm, bedensiz dönem, dirilme ve beden değişimi ayrı olaylardır; dirilme olayı yoksa uyarı verilir.
- **Teknik ile kurgusal sorun ayrıdır:** Verinin yapısını bozan hatalar (kopuk kimlik, eksik dosya, eşitleme çatışması) kurgu uyarılarından ayrı gösterilir. Yazar kurgu uyarısını çözmeden yazmaya devam eder.
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

**Önem** program tarafından metinden anlaşılmaz; görünür ölçütlere dayanır: yazarın "kritik" işaretlediği işaretler, açık bağımlılıklar ve işlem türü (silme, birleştirme, tarih değişikliği). Yazarken sorulan sorular toplu incelemeye bırakılabilir.

**Ne kapatır?** *metin düzeltildi · dünya verisi düzeltildi · bu kullanım için kabul edildi (gerekçeyle) · yanlış bağlantı kaldırıldı*. **Ertelendi** bir kapanış değildir; kuyrukta ayrı görünür. Kabul edilmiş bir durum, onu ilgili kılan dayanak yeniden değişmedikçe tekrar açılmaz. "Bilerek açık bıraktım" denen alan bir daha eksiklik raporuna düşmez.

**Yük sınırı:** Denetimler yazarın o an yaptığı iş üzerinden öne çıkar; yolculuğu kontrol ederken saç rengi sorulmaz. Aynı kök nedenden gelen uyarılar tek iş olarak gösterilir.

### 9.4 Evren sağlık taraması

Kopuk bağlantıları, vazgeçilmiş kayıtlara giden bağlantıları, eksik görsel dosyalarını ve kimlik sorunlarını listeler. Bağlantısız bir fikir ya da tarihi belirsiz bir olay hata sayılmaz; istenirse ayrı bir bilgi listesinde gösterilir.

### 9.5 Birleştirme, bölme ve dönüşüm

- **Editoryal birleştirme** (yanlışlıkla iki kez açılmış kayıt): önizlemede korunacak kimlik, taşınacak bağlantılar ve ilişkiler, harita işaretleri, eski adlar (lakap olarak kalır), çelişen alanlar ve yayın durumuna etkiler gösterilir. Eski kimlik silinmez, yeni kayda yönlendirir; başka cihazdan gelen eski bağlantılar da doğru kayda varır. Geçmiş metinlerdeki ifade ve dönemsel ad korunur.
- **Evren içi birleşme, bölünme ve dönüşüm** (iki loncanın 450'de birleşmesi, hanedanın bölünmesi, geminin yeniden yapılması) bir evren olayıdır; ayrı düğmeyle yapılır. Eski kayıtların kimliği ve geçmişi korunur, neyin devredildiği kaydedilir (F25).
- **Bölme:** Bir metin parçası tek işlemle yeni kayda dönüşür, eski yerinde bağlantısı kalır. Bileşen ayırırken belirsiz ilişkiler sorulur (§3.1).
- **Toplu düzenleme:** Arama sonuçlarında etiket, karar durumu ve yayın izni toplu değiştirilir.
- **Şablon değişikliği:** Alanın adını değiştirmek ile türünü değiştirmek ayrı işlemlerdir. Dönüştürülemeyen değerler silinmez, korunur ve listelenir. Alanların kimliği adlarından bağımsızdır (§18 nicelik ve alan anlamı).

### 9.6 Sahneyi kaldırmak

Üç ayrı işlemdir: sahneyi metinden çıkarmak · sahnenin olay bağlantısını kaldırmak · olayı kanondan çıkarmak. Bir alışveriş sahnesi kitaptan çıkarılınca para kesesine kendiliğinden geri dönmez.

### 9.7 Sürümler ve deneme kopyaları

- **Adlandırılmış evren sürümü** ("Birinci kitabın yayımlanan hâli"): yeni fikirler üzerinde çalışılırken önceki eserin dayandığı bilgi sürümü bozulmaz.
- **Deneme kopyası:** Radikal bir değişikliği denemek için evrenin bağımsız kopyası açılır. Değişiklikler ana evrene önizlemeyle ve elle taşınır; otomatik birleştirme sonraki bir aşamadır. Küçük düşünce deneyleri için bütün evreni kopyalamak yerine varsayım paketleri (F37) önerilmektedir.
- **Görsel fark:** Ana evren ile dal üst üste gösterilir; yalnızca dalda olan kayıtlar, dalda silinenler, yönü, türü ya da tarihi değişen ilişkiler ayrı renklerle. Karşılaştırma ortak başlangıç sürümüne göre yapılır; eski dal ana evrende sonradan düzeltilmiş bilgiyi sessizce geri getirmez.
- **Daldan seçerek aktarma:** Aktarma ekranı neyin doğrudan taşınabildiğini, neyin başka kayıt gerektirdiğini ve neyin yeniden yorumlanacağını gösterir. Bağımlılıklar sessizce budanmaz; kullanıcı bağımlılığı da alabilir, mevcut bir kayda eşleyebilir ya da açık bırakabilir.
- **Kural ve hesap sürümü:** Yayımlanmış eserin dayandığı veri ve kural sürümü saklanır; kural değişince eski eser yeni sonuçlarla yeniden yazılmaz.
- **Yayımlanmış eser kilidi:** Yayımlanan eserde okura sunulan iddialar korunur; çelişen değişiklikte program sorar (F18).

---

## 10. Eşitleme, cihazlar ve yedek

Bu bölüm eşitlemenin tek tanımıdır. §17'deki platform anlatımı ve kabul senaryoları buna bağlanır. Dosya düzeni A1'de önerilen (a) seçeneğine göre yazılmıştır.

### 10.1 Temel

- **Önce cihaz (local-first):** Program internet olmadan tam çalışır. Veri önce cihazdaki veritabanına yazılır.
- **Her kurulumda evrenin tamamı vardır.** Tablette yazılan sahneye bilgisayarda kaldığın yerden devam edilir; bilgisayar tabletin değişikliklerini Drive'dan okuyup kendi kopyasına işler.
- **Değişiklikler işlem olarak kaydedilir:** "kayıt oluştur, alan değiştir, metin parçası değiştir, ilişki ekle, iki kaydı birleştir" gibi. Her işlemin benzersiz kimliği, yazan kurulumun kimliği ve o kurulumun sıra numarası vardır. Her işlem, yapıldığı anda hangi değişiklikleri gördüğünü de taşır; çatışma tespiti buna dayanır.

### 10.2 Drive'daki düzen

- Drive'daki uygulama klasöründe **her kurulumun yalnızca kendisinin yazdığı bir değişiklik dosyası** vardır; bütün kurulumlar bütün dosyaları okur. Bu düzen iki cihazın aynı dosyanın üstüne yazma yarışını ortadan kaldırır. Anlam çatışmalarını çözmez; onlar §10.3'te ele alınır.
- Belirli aralıklarla bütün evrenin **sıkıştırılmış anlık görüntüsü** yazılır ve hangi işlemleri içerdiğini kaydeder. Yeni ya da uzun süre kapalı kalmış bir kurulum önce görüntüyü, sonra yalnızca sonraki işlemleri indirir.
- **Hiçbir kurulum başka bir kurulumun dosyasını boşaltmaz.** Eski işlemler yalnızca bütün **etkin** kurulumların aldığı doğrulanmış bir kontrol noktasına kadar temizlenir (§10.5). Sıkıştırma sırasında gelen yeni işlem kaybolmaz.
- Aynı işlem iki kez gelirse bir kez uygulanır. Dosya sayısı bir hedef değil, güvenli saklamanın sonucudur.

### 10.3 Çatışma

**Tanım:** İki değişiklik, biri öbürünü görmeden aynı şeye dokunduysa çatışabilir. Cihazların internette olup olmaması belirleyici değildir: bilgisayar eski bir sürümü açıkken tablette değişiklik yapılır ve bilgisayar onu almadan kendi değişikliğini gönderirse, ikisi de çevrimiçi olduğu hâlde aynı eski duruma dayanırlar.

**Birleştirme değer türüne göre yapılır.** Program "son yazan kazanır" yaklaşımını hiçbir türde kullanmaz.

| Değer türü | Kendiliğinden birleşen | İnceleme isteyen |
|---|---|---|
| Uzun metin (geçmiş, sahne) | Farklı paragraflardaki değişiklikler | Aynı paragrafı ya da aralığı etkileyen değişiklikler; ortak başlangıçla birlikte üç sürüm gösterilir |
| Tek değer (doğum yılı, ad) | Farklı alanlardaki değişiklikler | Aynı alanın iki değeri; ikisi de saklanır |
| Küme (etiketler, üyelikler) | Eklemeler ve farklı öğelerin çıkarılması | Bir cihazın çıkardığı öğeye öbürünün bağ kurması |
| İlişki | Farklı ilişkiler | Türü değiştirilen ilişkiye eski türün koşuluyla yeni bağ eklenmesi |
| Sıralı liste (bölümdeki sahneler) | Farklı öğelerin taşınması | Aynı öğenin iki farklı yere taşınması |
| Yapı işlemleri | — | Silme ile düzenleme (§10.6), bölme ile eşzamanlı ilişki ekleme, ters yönde iki birleştirme |

- **Ters birleştirme:** İki cihaz aynı iki kaydı ters yönde birleştirdiyse teknik temsilci kimlik kurallı biçimde seçilir (yönlendirme döngüsü oluşmaz); hangi adın, alanın ve gizlilik ayarının korunacağı yazara sorulur.
- **Çatışma çözülene kadar** her iki değer de görünür ve hesaplar bunlardan birini gizlice seçmez (§2.2 kural 15). Çatışan doğum tarihleriyle yaş koşullu gösterilir. Kullanıcı neyin kendiliğinden birleştiğini, neyin inceleme beklediğini ve hangi hesapların bu yüzden güvenilir olmadığını tek bir yerde görür.
- **Çözüm de bir işlemdir.** Hangi sürümler arasındaki çatışmayı giderdiğini bilir. Başka cihazda verilen çözüm eski bir cihaz tarafından yeniden dayatılmaz; sonradan gelen daha yeni bir değişikliğe eski çözüm körlemesine uygulanmaz.
- **Eşitlemeden sonra denetimler yeniden çalışır.** Farklı alanların birleşmesi de kurgu çelişkisi üretebilir (bir cihazda doğum 420'ye, öbüründe ölüm 415'e çekilmiş); bu açıklanır.

### 10.4 İşlem grupları

Kullanıcının tek anlamlı işlem olarak yaptığı değişiklikler (bir satış: para azalır, para artar, sahip değişir, teslim koşulu gerçekleşir; bir kişiyi iki kimliğe ayırmak; editoryal birleştirme) **bir işlem grubu** olarak yazılır ve eşitlenir.

- Grubun bir kısmı ulaştıysa diğer cihaz onu tamamlanmış dünya durumu gibi hesaplara ya da yayına sokmaz; "eksik ulaştı" olarak bekletir.
- Geri alma grubu bütün olarak hedefler. Gruptaki bir alan sonradan başka bir işlemle değiştiyse geri alma eski değeri körlemesine yazmaz; neyin etkileneceğini somut olarak söyler ("bu satışı geri alırsan sonradan devredilen kılıç etkilenir").
- Bu, genel bir ekonomi yasası değildir. Vergi, hediye, kayıp ve büyü kendi açık kurallarına sahip olabilir; işlem grubu yalnızca bütünlüğü korur.

### 10.5 Kurulumlar ve cihaz yaşam döngüsü

- **Yazan birim kurulumdur, ürün değil.** Aynı bilgisayardaki iki tarayıcı profili ya da silinip yeniden kurulan uygulama ayrı kurulumlardır; her birinin kimliği, adı ("Ofis bilgisayarı, Edge") ve son görülme zamanı vardır.
- **Aynı kurulumdaki sekmeler** tek bir yazıcıyı paylaşır: sıra numarası kurulum içinde tek bir yerden verilir, iki sekme aynı numarayı kullanamaz.
- **Etkin ve kullanım dışı:** Kullanıcı bir kurulumu "artık kullanılmıyor" diye işaretleyebilir (kayıp telefon, yeniden kurulmuş bilgisayar). Geçmişi silinmez; yalnızca temizlik için beklenen etkin kurulumlardan çıkar. Program uzun süredir görülmeyen kurulumu önerir, kendiliğinden kullanım dışı bırakmaz.
- **Kullanım dışı kurulum geri dönerse** en güncel kontrol noktasını alır, kendi gönderilmemiş işlerini ayrı bir alanda korur ve yeniden uzlaştırır (§10.6'daki çatışma paketiyle).

### 10.6 Silme ile düzenleme çatışması

Bilgisayarda bir karakter silindi; çevrimdışı tablette o karakter için üç sayfa yazıldı. İki beklenti birlikte korunur:
- Karakter, eski cihaz bağlandı diye **kendiliğinden geri gelmez**.
- Üç sayfa **kaybolmaz**. Kurtarılabilir bir **çatışma paketi** olarak sunulur; kullanıcı metni not olarak saklar, başka kayda taşır ya da karakteri açıkça geri yükler.

"Silinmiş kayıt geri gelmez" kuralı yalnızca eski eşitlemenin kendiliğinden canlandırması içindir. Çöp kutusundan **açık geri yükleme** her zaman mümkündür ve kendi işlemi olarak eşitlenir.

### 10.7 Sürümler ve güncelleme

Dört sürüm ayrıdır: **uygulama sürümü**, **veri biçimi sürümü**, **kural sürümü** ve **eşitleme protokolü sürümü**. Aynı adresi açmak aynı sürümü çalıştırmak demek değildir: bir PWA güncellemesi indirilir, bekler ve ancak sonra etkinleşir; uzun süre çevrimdışı kalan tablet eski sürümle çalışabilir.

- **Anlaşılmayan veri korunur.** Eski uygulama yeni bir alan türünü ya da ilişki biçimini okuduğunda onu atmaz ve üzerine yanlış yazmaz. Güvenle düzenleyemediği kaydı salt okunur açar ve "bu kayıt için güncelleme gerekli" der. Yazmaya devam etmek isteyen kullanıcı, dünya verisini bozmayan ayrı bir not alanına yazabilir.
- **Güncelleme yazıyı kesmez.** Kaydedilmemiş metin varken uygulama zorla yeniden yüklenmez. "Güncelleme hazır, yazın kaydedilince uygulanacak" denir.
- **Veri biçimi dönüşümü** öncesinde yerel taslaklar ve gönderilmemiş işlemler güvenli bir kopyaya alınır; günlük sıkıştırması bekleyen işi kaybetmez.
- Kurtarma paketi ve yedek, hangi veri biçimi sürümüyle açılabildiğini taşır.
- Kullanıcıya programlama dili kullanılmaz: "veriler korundu, güncelleme bekliyor" ya da "bu kayıt için güncelleme gerekli" yeterlidir.

### 10.8 Görünen durum ve geri alma

- **Doğrulanabilir kayıt durumları** her zaman görünür: *Bu cihaza kaydedildi · Drive'a gönderildi · Tablet / bilgisayar / iPhone şu değişikliğe kadar aldı · Yedek doğrulandı*. Drive'a gönderilmiş olmak öbür cihazın aldığı anlamına gelmez; çevrimdışı bir cihaz için "bütün cihazlar güncel" yazılmaz.
- **Yalnızca bu cihazda olan değişiklikler** ayrıca görünür: "Son eşitlemeden beri 3 değişiklik yalnızca bu telefonda." Cihazın yerel verisi kaybolursa yalnızca Drive'a başarıyla gönderilmiş kısım geri gelir; gönderilmemiş iş uzak kopyada yoktur.
- **Google oturumu düşünce yazma durmaz.** Üst çubukta "eşitlemek için dokun" görünür; dokununca izin yenilenir ve biriken değişiklikler gönderilir. Kesin oturum modeli kodlamada seçilir.
- **Geri almanın türleri:** yerel geri al · eşitlenmiş bir değişikliğin tersini yeni işlem olarak yapmak (başka cihazın sonraki doğru işlemleri silinmez) · eski bir yedeği önce ayrı bir **kurtarma alanında** açıp incelemek ve ancak sonra mevcut evrenin yerine koymak. Dışarı yayımlanmış bir wikinin kopyası geri al düğmesiyle geri çağrılamaz.
- **Çevrimdışı hazırlık:** "Bu dünya bu cihazda tam hazır mı?" sorusu cevaplanır: metinler, haritalar, görseller ve ekler indirilmiş mi? İndirilmemiş harita ile silinmiş harita aynı mesajı vermez.
- **Kayıt başına sürüm geçmişi** ve **çöp kutusu:** Silinen kayıt bağlantıları ve ilişkileriyle geri gelir.

### 10.9 Tarayıcı depolaması

Tarayıcı depolaması tek başına güvence değildir: iPhone'daki Safari bazı koşullarda site verisini silebilir. Ana ekrana eklendiğinde kalıcı depolama izni istenir; bu da koşulsuz garanti değildir. Asıl güvence Drive eşitlemesi ve yedektir; sınırı §10.8'de yazılıdır.

### 10.10 Dönemsel yedek

Drive'da eşitlemeden ayrı bir klasöre alınır. Sıklık ve saklama süresi ayardır (öneri A2). Son başarılı yedek tarihi gösterilir; uygulama kapalıyken kaçan yedek bir sonraki açılışta alınır. Takvimde bir tarihin görünmesi yedeğin alındığını göstermez. Kullanıcı istediğinde elle de yedek alır.

### 10.11 Dışa aktarma ve taşınabilir paket

- **Okunabilir dışa aktarma:** bağlantıları korunmuş Markdown (Obsidian uyumlu), PDF, EPUB. Neyi kaybettiği yazılır (Markdown okunur ama tarihli inançları kaybeder).
- **Taşınabilir dünya paketi:** metinler, kimlikler, ilişkiler, zaman aralıkları, medya, takvim, şablon ve kural sürümleri, veri biçimi sürümü ve bir açıklama dosyası. Kayıpsız geri yüklenir. İçe aktarım önce ayrı bir alanda açılır ve "şu bağlantılar korundu, şu işaretler eşlenemedi" raporu verir (kurtarma provası).

---

## 11. Paylaşım ve yayın

### 11.1 Wiki

Salt okunur, kitap düzeninde (kapak, giriş, türlere göre içindekiler). Yayın seçimi bölüm ve blok bazındadır: bir karakterin tanıtımı yayımlanırken gerçek kimliği gizli kalabilir.

### 11.2 Ayrı yayın paketi

Wiki, ana veritabanını okura gönderip gizli alanları ekranda saklayarak yapılmaz. Yayın derlenirken yalnızca o yayın kapsamına açık verilerden **ayrı bir paket** üretilir. Arama dizini, özetler, bağlantı başlıkları, geri-atıflar, ağ ve soy ağacı, harita işaretleri, zaman çizelgesi, görseller, dosya adları, sayımlar ve izin verilen hesaplar bu paketten çalışır. Yayımlanan paket ayrı bir sürüm olarak saklanır. "Sızıntı imkânsız" gibi mutlak bir vaat verilmez; kapsam ve yayın öncesi kontroller tanımlıdır.

- **Yayın iddialardan kurulur:** Okura açık anlatı her zaman gerçeğin alt kümesi değildir. Halkın kralın doğal öldüğüne inandığı bir dünyada okura sunulan vakayiname bu yanlış iddiayı içerebilir. Yayın; seçilmiş iddialar, yazarın açık anlatımı ve okuma kapsamından oluşur.
- **Okura görünen kimlikler:** Yazarın bildiği tek kişi okur için iki ayrı kimlik olabilir (Kara Tilki ile saray kâtibi). Pakette her okur kimliğinin kendi adresi ve kodu olur; ortak bir bağlantı adresi, dosya adı ya da kimlik kodu bu eşitliği açığa vurmaz. Eşitlik okura açıklandığı yayından itibaren pakete girer.
- **Gizli verinin pakete kaçması** bir hatadır; **okurun açık ipuçlarından doğru tahmin yapması** çoğu zaman hikâyenin amacıdır. İkisine aynı uyarı verilmez. Okurun aklı ve tahminleri denetlenemez.

### 11.3 Yayın önizlemesi ve okuma kapsamı

Okurun göreceği hâl yayımlamadan önce incelenir. "Bir eserin 8. bölümüne kadar" kapsamı iki farklı şey olabilir ve hangisi olduğu seçilir:
- **Okuma tercihi:** Paket bütün içeriği taşır; okur ileriyi görmemeyi seçer. İleri içerik teknik olarak pakettedir.
- **Teslim sınırı:** Paket yalnızca 8. bölüme kadar olan içeriği taşır. Gerçek gizlilik bu kiple sağlanır.

### 11.4 Yayın ve yazar alanının ayrılması

Tarayıcı, yerel veriyi (IndexedDB, Web Storage) adres klasörüne göre değil **kökene (origin)** göre ayırır. GitHub Pages'te aynı hesabın `/dunya-atlasi/` ve `/wiki/` yolları aynı kökendedir; bu yüzden yol ayrımı yazarın yerel verisini yalıtmaz. Okurun cihazında yazarın verisi zaten bulunmaz; risk, yazarın kendi tarayıcısında aynı kökenden çalışan başka bir sayfadır. Bu yüzden wiki, yazar uygulamasından **ayrı bir kökende** yayımlanır (öneri A3; örneğin ayrı bir alan adı ya da alt alan adı).

### 11.5 Evren içi belge çıktısı

Mektup, gazete sayfası, ilan, seyahat izni, günlük, antlaşma, mezar yazısı. Metni kullanıcı yazar; program düzeni, mührü, tarihi ve bağlantılı kişileri ekleyerek sunar.

---

## 12. Görünüm ve giriş yöntemleri

### 12.1 Görünüm (K8)

- **Soft, temiz, narin:** açık renkli zemin, yumuşak renk yüzeyleri, ince çizgiler, bol boşluk, okunaklı yazı. Türler için soluk renkli küçük sekmeler. Kâğıt dokusu, çerçeveli kartlar, arşiv fişleri ve pusula motifi yalnızca kapakta, wikide ve evren içi belge çıktılarında. yazar.io'nun kimliği (gotik başlık, aynı renk dörtlüsü) kopyalanmaz. Koyu tema da vardır.
- **Narin, silik değildir.** Yüzeyler ve süsler yumuşak olabilir; metin, seçim durumu, klavye odağı ve önemli kontroller açıkça seçilir. Ölçüt WCAG 2.2 AA'dır: normal metin için en az **4,5:1**, büyük metin için en az **3:1** kontrast. Odak ve kontrol sınırları da yeterince belirgindir. Bu ölçütler hem açık hem koyu temada sağlanır.
- Yazma ekranı sade kalır; yoğun dekor yalnızca kapakta, wikide ve boş ekranlarda kullanılır.

### 12.2 Giriş yöntemleri

- Fareyle üzerine gelmenin ve klavye kısayolunun her işlevinin dokunmatik bir karşılığı vardır. **Dokunup basılı tutmak tek yol değildir** (metin seçimiyle çakışabilir); görünür bir düğme ya da seçili öğe eylemi de aynı işi yapar.
- **Sürüklemenin alternatifi vardır:** küçük bir işareti tutturamayan kullanıcı "taşı" komutuyla ya da koordinat seçerek yerini değiştirebilir.
- **Kalem ve parmak ayrı davranabilir** (tarayıcının işaretçi olayları giriş türünü ayırt eder): kalem çizer ya da işaret taşır, parmak kaydırır. Bu, hedef cihazda bütün kalem, avuç ve düğme davranışlarının hatasız işleyeceği anlamına gelmez; kullanıcı kalemle seçme, çizme ve taşıma kipleri arasında görünür biçimde geçebilir.

### 12.3 Cihaza göre düzen

Ortak olan sahne, bağlam ve çalışma niyetidir; pencere genişliği, kaydırma, yakınlaştırma ve panel yerleşimi cihaza özeldir (§5.9). Telefonda alınan hızlı not bilgisayarın masaüstü düzenini bozmaz. Masaüstü panelleri telefona sıkıştırılmaz. Ayrıntılar: [tasarim.md §2.8–2.9](tasarim.md).

| Cihaz | Öne çıkan kullanım |
|---|---|
| Windows 11 bilgisayar | Uzun yazma, klavye ve komut paleti, geniş ekranda yan panel |
| Galaxy Tab S11 Ultra | S Pen ile harita ve kroki, iki panel yan yana, okuma ve düzenleme; DeX'te bilgisayar düzeni |
| iPhone | Hızlı not, arama, sahne okuma, kayıt düzeltme; yan panel yerine alttan açılan kart |

---

## 13. Kullanım akışları ve kabul senaryoları

Bunlar çalıştırılmış yazılım testleri değil, tasarımın hedeflediği davranışlardır. Her senaryo, davranışın tanımlandığı bölüme bağlanır. Kodlamadan önce akışlar çizilecektir.

### 13.1 Temel akışlar

| # | Durum | Beklenen | Tanım |
|---|---|---|---|
| T1 | Telefonda fikir yakalama | Form açmadan hızlı not; kaydedildiği görülür | §5.8 |
| T2 | Notu karaktere dönüştürme | İçerik korunur, not ile kayıt bağlı kalır | §4.6 |
| T3 | Karakterin adını değiştirme | Bağlantılar korunur, eski adla da bulunur | §5.1 |
| T4 | Geçmişteki bir olayı düzeltme | Etki raporu çıkar, önceki sürüme dönülebilir | §9.2 |
| T5 | Bölüm yazarken bilgiye bakma | Yan panel ve bağlam paneli, metinden ayrılmadan | §5.4, §5.5 |
| T6 | Yanlışlıkla silme | Çöp kutusundan bağlantılarıyla geri gelir | §10.8 |
| T7 | Wiki yayımlama | Önizleme yapılır, gizli bilgi hiçbir görünüme sızmaz | §11 |

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
| Z16 | Zaman yolcusu kendi doğumundan önceki yıla gelir | Seçili modelin kişisel kronolojisi kullanılır | §9.1, F45 |

### 13.3 Dünya modeli ve hesaplar

| # | Durum | Beklenen | Tanım |
|---|---|---|---|
| D1 | Kılıç haberciye taşıtılır | Taşıyan değişir, sahip değişmez | §3.8 |
| D2 | İkinci ortak sahip eklenir | Tek sahiplik tanımlı değilse ilk sahibin hakkı kapanmaz | §3.8 |
| D3 | Şehir fethedilir, para alanı varsayılan | Para ve hukuk sessizce değişmez | §3.7 |
| D4 | İki kültür aynı alana farklı varsayılan getirir | Son eklenen sessizce kazanmaz | §3.7 |
| D5 | Karakterin lonca üyeliği girilmemiş | "Üye değil" sayılmaz; DEĞİL filtresinde "bilgi yok" grubunda görünür | §18 |
| D6 | Yazar tanrıların varlığını bilerek açık bırakır | Eksik ya da tutarsız sayılmaz | §3.6 |
| D7 | İki lonca evrende birleşir | Eski loncaların kimliği ve geçmişi korunur | §9.5 |
| D8 | Birleşik tapınak sayfasına ikinci bina eklenir | Eski bağlantıların hedefi değişmez | §3.1 |
| D9 | Ok sayısı 5'ten 3'e düşer | Net fark −2; iki ok atıldığı kaydedilmez | §5.6 |
| D10 | Kapı önce kapalı, sonra açık | Açılma yöntemi uydurulmaz | §5.6 |
| D11 | Makam yeminle kazanılıyor; tören yeminden sonra kesilir | Kazanım ilgili kurala göre korunur | §3.10 |
| D12 | Haber bir günlük hatla ulaşabilir | Gönderme ve teslim kaydı yoksa "biliyor" denmez | §2.2 kural 7 |
| D13 | Aynı söylentiyi beş kişi aynı belgeden aktarır | Beş bağımsız kaynak sayılmaz | F08 |
| D14 | İki hesap köprünün zıt durumlarına dayanır | Sonuçlar tek senaryo gibi birleştirilmez | §2.2 kural 14 |
| D15 | Eksik rota ağında uygun yol bulunamaz | Dünya genelinde imkânsız ilan edilmez | §2.2 kural 13 |
| D16 | Harita ölçeksiz, yol süreleri kayıtlı | Süre ağı sorguları çalışır; görselden mesafe uydurulmaz | §8.4 |
| D17 | Geçide varıldığında izin bitmiştir | Yola çıkıştaki geçerlilik yetmez | §8.4 |
| D18 | Hesap kuralı değişir | Eski sonucun dayanağı ve yayımlanmış sürüm korunur | §9.7 |
| D19 | Doğum tarihinin çözülmemiş iki değeri var | Yaş gizlice birinden hesaplanmaz | §2.2 kural 15 |

### 13.4 Eşitleme, sürüm ve yedek

| # | Durum | Beklenen | Tanım |
|---|---|---|---|
| E1 | İki cihazda ilişkili tarihler değişir | Birleşme sonrası çelişki açıklanır, değer kaybolmaz | §10.3 |
| E2 | İki çevrimiçi cihaz aynı eski değeri değiştirir | İnternet var diye çatışma yok sayılmaz | §10.3 |
| E3 | İki cihaz aynı uzun metnin farklı paragraflarını değiştirir | İkisi de korunur | §10.3 |
| E4 | İki cihaz ters birleştirme yapar | Döngü, veri kaybı ya da sessiz kimlik değişimi olmaz | §10.3 |
| E5 | Anlık görüntü yazılırken telefon yeni işlem yükler | Yeni işlem kaybolmaz | §10.2 |
| E6 | Aylarca çevrimdışı kalan tablet geri gelir | Tekrarlar bir kez uygulanır, silinmiş kayıtlar kendiliğinden geri gelmez | §10.2, §10.6 |
| E7 | Telefon gönderdi, tablet çevrimdışı | "Tablet güncel" denmez | §10.8 |
| E8 | Eski telefon "kullanılmıyor" işaretlenir | Temizlik etkin kurulumlara göre yapılır; geçmiş kaybolmaz | §10.5 |
| E9 | Silinmiş kayda çevrimdışı cihazda metin yazılmış | Metin korunur, kayıt kendiliğinden etkinleşmez | §10.6 |
| E10 | Eski uygulama yeni alan türünü alır | Anlamadığını atmaz, üzerine yazmaz | §10.7 |
| E11 | Güncelleme sırasında kaydedilmemiş metin var | Zorla yeniden yükleme yok | §10.7 |
| E12 | Çok parçalı satış işleminin yarısı ulaşır | Tamamlanmış dünya durumu sayılmaz | §10.4 |
| E13 | Yedekten geri yükleme | Kimlik, ilişki, metin, görsel, takvim ve kural sürümleri birlikte gelir | §10.11 |

### 13.5 Yayın

| # | Durum | Beklenen | Tanım |
|---|---|---|---|
| Y1 | Gizli eş kimlikler okura ayrı gösterilir | Ortak adres ya da kodla eşitlik açığa çıkmaz | §11.2 |
| Y2 | Yazar alanı ile wiki aynı alan adında farklı yollarda | Yol ayrımı yalıtım sayılmaz; ayrı köken kullanılır | §11.4 |

### 13.6 Birleşik örnekler

Birden çok özelliğin birlikte doğru çalışmasını sınar.

**A. Taç giyme yarıda kesiliyor.** Kuzey geleneğinde yeminle hükümdarlık başlar; başkent hukukunda konseyin tescili gerekir; tören yeminden sonra, tescilden önce kesilir. Beklenen: tek bir "kral oldu/olmadı" sonucu yok, iki otoritenin farklı hükmü görünür (§3.10). Elin yemini duymadı, Kaelen duydu ama başkent kuralını bilmiyor, okur yemini gördü ama tescil koşulunu bilmiyor: dünya durumu, karakter inancı ve okur bilgisi ayrı sonuç verir (§3.6). Hazırlıkta tüketilen kristal geri dönmez (§3.10). Sahne çıkarılırsa olay kalır (§9.6). "Aslında yemin edilmedi" geçmiş düzeltmesidir ve hukuki sonuçlar, inançlar ve yayımlanmış ifadeler incelemeye açılır; son paragrafı kısaltmak dünyayı değiştirmez (§9.2).

**B. Kuşatma hazırlığı.** 120 kişilik birliğin 30 okçusu ve savaşamayacak 10 üyesi var; örtüşme bilinmiyor. Hazır okçu 20–30 aralığındadır; "25" yazılmaz (§2.2 kural 16). Komutan en az 25 okçu istiyorsa program gereken bilgiyi gösterir: "savaşamayacak 10 kişide en fazla 5 okçu olmalı". Bir okçuya ad verilince birlik 121 olmaz (F40). Tek şifacı iki plana atanmışsa bu görünür (F36).

**C. Çevrimdışı tablet, silinen kayıt, eski sürüm.** Bilgisayarda yan karakter silindi; eski sürümle çalışan çevrimdışı tablette ona üç sayfa yazıldı. Beklenen: üç sayfa korunur ve çatışma paketi olarak sunulur, karakter kendiliğinden canlanmaz (§10.6); eski uygulama veriyi budamaz, güncellemede yerel taslak korunur (§10.7); sıkıştırma bekleyen işi kaybetmez (§10.2); bir cihazda verilen çözüm öbüründe yeniden dayatılmaz (§10.3).

**D. Velkar'ın suyu kesiliyor.** Ekonomi (suya bağlı mahalleler), antlaşma (su hakkı), siyasi yapı (antlaşmayı uygulayacak makam boş), inanç (kesintiyi bir yasağa bağlayan din), haber (sarayın bildiği ile halkın duyduğu) ve sahneler bir çalışma masasında birlikte kullanılır. Program sonuç ilan etmez, ilgili bilgileri bir araya getirir.

---

## 14. Geliştirme sırası (kapsamı değil, sırayı gösterir)

Veri modelinin temel sözleşmeleri (§18) baştan kurulur. Modelin her şeyi baştan bitirdiği iddia edilmez; hedef, kimliklerin korunması, sürümleme, veri kaybetmeden dönüşüm ve eski projelerin açılabilmesidir.

| Aşama | İçerik |
|---|---|
| **0. Koddan önce** | §3 ayrımları · §18 sözleşmeleri · kullanım akışlarının çizimleri · açık kararlar (§1.2) |
| **1. İlk çalışan sürüm** | Kayıtlar, serbest metin, bağlantılar (seçim kutusu, Türkçe ekler), arama (eski adlar dahil), hızlı not, görseller, temel ilişkiler, karar durumu, otomatik kayıt, sürüm geçmişi, çöp kutusu, önce cihaz, **Drive eşitlemesi (§10) ve yedek**, sürüm uyumu, tam yedek ve geri yükleme |
| **2. Günlük kullanım** | Yan panel, özet kartı, komut paleti, düzenlenebilir şablonlar ve soru kütüphanesi, açık meseleler ve karar defteri, basit zaman çizelgesi, eser / bölüm / sahne, sahne bağlam paneli, harita: yükle, işaretle, bağla; sağlık taraması, birleştirme ve bölme, inceleme kuyruğu |
| **3. Evreni inceleme** | Soy ağacı, filtreli ağ, durum geçmişi ekranları, bilgi katmanları ve bakış açısı filtresi, özel takvim ve çağlar, tutarlılık denetimleri, etki analizi, neden–sonuç ağı, kurgu hatları, bölüm × kayıt matrisi, harita katmanları, bölgeler, rotalar ve yolculuklar, hizalama aracı |
| **4. Derinleşme** | Kültür, hukuk, siyasi yapı, ekonomi ve üretim, süreçler, haber yayılımı, ekoloji, teknoloji, dil ve isim üretici, motifler, sıradan bir gün, çalışma masaları, görsel panolar, gezinti ve karşılaştırma |
| **5. Paylaşım** | Wiki ve yayın önizlemesi, evren içi belge çıktıları, EPUB ve PDF, adlandırılmış sürümler, deneme kopyası, (istenirse) yazar sayfası |

Hesap araçlarının aşamalara dağılımı A12'de önerilmiştir.

---

## 15. Hesap araçları

Bu araçlar yapay zekâ kullanmaz; yalnızca kullanıcının girdiği yapılandırılmış veri ve tanımladığı kurallarla çalışır. Hepsi §2.2'deki ortak kurallara ve §18.2'deki kullanım sözleşmesine uyar.

**Çalışma biçimi:** Hesaplar arayüzü dondurmasın diye arka planda çalışır. Yazarken yalnızca açık kayıt ve yan panel hemen güncellenir; ağır hesaplar (harita konturları, üretim zinciri, görüş haritası) ilgili görünüm açılınca yapılır. Her sonuç hangi veri ve kural sürümüne ve **hangi varsayım paketine** ait olduğunu bilir; geç biten eski hesap ekrana "güncel" diye yerleşmez. Durumlar *hesaplanıyor · önceki sonuç · güncel* olarak görünür. Yeni eklenen veri (iki şehir arasında yeni yol) eski sonucun dayanağında olmasa da ilgili sorguları yeniden değerlendirtir. Bekleyen hesap metnin kaydını geciktirmez. Sayısal hız garantisi verilmez.

| # | Araç | Ne yapar | Sınırı |
|---|---|---|---|
| 1 | **Göreli kronoloji çözücü** | "Tufandan 80–120 yıl sonra, ama kralın ölümünden önce" gibi kısıtlardan olası tarih aralıklarını hesaplar. Tarih girilince bağlı aralıklar daralır; imkânsız kısıtta çelişen kısıt zincirini gösterir. | Desteklediği kısıt türlerini açıklar. Yıl çözünürlüğünde gün uydurmaz. Kopuk iki aralığı tek bantla birleştirmez. Aralık bandı olasılık değildir. Gösterdiği çelişki kümesinin en küçük olduğunu vaat etmez. |
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
| 13 | **Sonuçtan koşullara masası** | "Üçüncü akşam kaleye ulaşmalı, tüneli kullanamaz" gibi hedeflerden kayıtlı seçeneklerle uygun planları ve her birinin neyi değiştirdiğini gösterir (F03). | Yeni olanak uydurmaz. Sonuç §2.2 kural 13'teki üç türden biridir; çözüm bulunamaması dünyada imkânsızlık değildir. |

---

## 16. Fikirler

Bu tablo her fikrin **tek durum kaynağıdır**. "Tasarım" durumundaki bir fikrin tanımı belirtilen bölümdedir; tabloda yalnızca kısa adı vardır. Tanımı yalnızca bu tabloda olan fikirler için tablo satırı tanımın kendisidir. Öneri durumundaki fikirler kodlanmaz.

### 16.1 F01–F35

| # | Fikir | Durum | Tanım |
|---|---|---|---|
| F01 | "Bunu nereden biliyoruz?" | Tasarım | §2.2 kural 3 |
| F02 | Bilinmeyen birinci sınıf bilgidir | Tasarım | §2.2 kural 4, §3.6, §3.7 |
| F03 | Sonuçtan koşullara çalışma masası | Tasarım | §15-13 |
| F04 | **Geçmişi değiştirirken korunacakları seçmek.** "Kralın ölümünü iki yıl ileri al ama kızının taç giyme yaşı değişmesin." Değişiklik masası hesapla değişenleri, sabit kararla çelişenleri ve yalnızca bahseden metinleri ayırır. | Tasarım | Bu satır |
| F05 | Başkasının bilgisine dair inanç | Tasarım | §3.6 |
| F06 | **Kişi, beden, kimlik ve makam.** "Kara Tilki" bir kimliktir; onu Arven kullanır, sonra başkası devralabilir. Tanık iki kimliği ayrı kişi sanabilir. Kimlik açığa çıkınca eski metindeki adlar değişmez; yazar görünümünde birleşir, okur görünümünde açıklama anına kadar ayrı kalır (yayın: §11.2). | Tasarım | Bu satır |
| F07 | **Kurumlar kararları nasıl uygular.** Bir emir için "verildi → gönderildi → ulaştı → kabul edildi → kaynak ayrıldı → uygulandı" aşamaları ve sorumluları; kim durdurabilir, kimin fiilî vetosu var. Kararı yazar kaydeder. | Tasarım | Bu satır, §3.10 |
| F08 | **Delil geçmişi ve soruşturma masası.** Bir mektubu gerçekte kim yazdı, kim yazmış görünüyor, kimde, hangi iddiaya delil. Kopya, tercüme ve sansürlü sürüm aynı belge ailesindedir. Aynı söylentiyi beş kişinin aktarması beş bağımsız kanıt değildir. | Tasarım | Bu satır |
| F09 | **Mümkün ile erişilebilir.** Geçit açık olabilir ama karakter onu bilmiyor, ücreti ödeyemiyor ya da mührü yok. Fiziksel erişim, izin, bilgi, kaynak ve seçilen eylem ayrı katmanlardır. | Tasarım | Bu satır |
| F10 | **Kesintiye dayanıklılık.** Depolar, kuyular, onarım kapasitesi, ikameler. Su kemeri kesilince hangi mahallenin hemen, hangisinin stok bitince etkileneceği; veri yoksa "bulunamıyor". "Birkaç gün dayanır" gibi aralıklar girilebilir. | Tasarım | Bu satır |
| F11 | **Geçmişin bugünkü izleri.** Bir olaydan bugün ne kaldı: mezarlık, semt adı, şarkı, vergi ayrıcalığı. Mekânda dönemlerin izleri katman olarak görünür. İzin gerçek kökeni ile anlatılan hikâyesi ayrıdır. | Tasarım | Bu satır |
| F12 | **Büyü neden her yerde kullanılmıyor.** "Yalanı ortaya çıkaran büyü var" denince mahkeme, diplomasi, ticaret gibi bağlı alanlar bir masada toplanır; her kullanım için maliyet, erişim, karşı önlem, yasak incelenir. Toplumsal hüküm verilmez. | Tasarım | Bu satır |
| F13 | **Okura sunulan açıklamalar.** Bir cinayet için üç açıklama açık tutulur; her sahne hangisini desteklemek ya da zayıflatmak için yazıldığıyla işaretlenir (yazarın niyeti). "Sürpriz" ve "gerilim" hedefleri ayrıdır. | Tasarım | Bu satır |
| F14 | Serbest yazıyı sonradan yapılandırmak | Tasarım | §5.7 |
| F15 | **Anlatı ve dünya sözleşmesi.** "Büyünün kökeni açıklanmayacak", "rüyalardaki zaman kronolojiye eklenmez". Program bu kararları hatırlatır; bilinçli açık bırakılanı eksik saymaz. Her eser farklı sözleşme seçebilir. | Tasarım | Bu satır |
| F16 | **Kural atölyesi.** Koşul, kapsam, sonuç ve istisna seçilerek kural kurulur; ileri kullanıcı formül yazabilir (alan anlamı: §18). Her kural için örnek durumlar saklanır (geçmeli, uyarmalı, sınır durumu); kural değişince sonuçlar karşılaştırılır. Hazır paketler kopyalanıp değiştirilebilir. | Tasarım | Bu satır |
| F17 | Haritalar da iddia taşır | Tasarım | §8.3 |
| F18 | **Yayımlanmış eser kilidi.** Yayımlanan eserde okura sunulan iddialar (eser, baskı, anlatı yeri, dünya zamanıyla) korunur. Çelişen değişiklikte program engellemez, sorar: *geçmişi düzelt · yeni olay · alternatif devamlılık · baskı düzeltmesi*. Güvenilmez anlatıcının sözü ile yazarın sabitlediği gerçek aynı kilidi taşımaz. | Tasarım | Bu satır |
| F19 | **Üç özet.** Kimlik satırı (seçicide aynı adlı iki kaydı ayırır), sahne hatırlatıcısı (o zamanki yara, amaç, eşya), okur tanıtımı (baskı ve okuma sınırına göre). Uzunluk sınırı dayatılmaz. Kimlik satırındaki sır yayına girmez. | Tasarım | Bu satır |
| F20 | **Anakronizm ve sözlük denetimi.** Yazar sözlüğü ve kapsamı seçer (saray hitapları, teknoloji adları, yasaklamak istediği modern ifadeler). Sonuç "bu sözcük seçili kuralla eşleşti" der. Teknolojinin icadı, bölgeye ulaşması, kişinin tanıması ve kelimenin dilde olması ayrı tarihlerdir. | Tasarım | Bu satır |
| F21 | Alt birimlerden toplama | Tasarım | §3.7 |
| F22 | Yoğunluk ve boşluk haritası | Tasarım | §7 |
| F23 | Bağlam karşılaştırma masası | Tasarım | §7, §5.2 |
| F24 | **Değişiklik niyeti.** Önemli tarihli bir değer değişirken ya da kritik bir işaretli cümle değişirken kısa seçenek: *eski kaydı düzelt · bu tarihten itibaren değiştir · taslakta dene · yalnızca bu kişinin inancını değiştir*. Normal yazımda pencere açılmaz. Değişiklik bir işlem grubudur (§10.4). | Tasarım | Bu satır |
| F25 | Dünya içi birleşme, bölünme, dönüşüm | Tasarım | §9.5 |
| F26 | **Haklar, yetkiler, yükümlülükler.** Ormanın mülkü taçta, odun hakkı köylüde, av hakkı soyluda, koruma görevi tapınakta olabilir. Bir hak taraflar, konu, kapsam, süre, tanıyan otorite ve koşulla tutulur. "İzni var" ile "muhafızlar izni tanıyor" ayrıdır. | Tasarım | Bu satır |
| F27 | Plan, teşebbüs, yarıda kalma, sonuç | Tasarım | §3.10 |
| F28 | **Çelişen anlatılar için iddia dosyası.** Bir olay hakkında resmî kayıt, tanık, sahte mektup ve aile anlatısı yan yana; her birinin kaynağı ve hangi iddiayı desteklediği. Aynı kaynaktan kopyalanan iki metin iki tanık sayılmaz. "Destek var · itiraz var · ikisi de · dayanak yok" görünümü. | Tasarım | Bu satır |
| F29 | Sahne içinde bağlam parçaları | Tasarım | §3.3 |
| F30 | Metin parçası ile kullanım yeri | Tasarım | §3.3 |
| F31 | **Açık verilere dayanan keşif soruları.** Yazar bir soru şablonu seçer, program yalnızca tanımlı ilişkilerden aday çıkarır: "Aynı eşya üzerinde çelişen hak iddiası olanlar kim?", "Aynı sırrın farklı sürümlerine inanan iki kişi hangi tarihlerde aynı yerde olabilir?" Sonuç "görüştüler" demez, "bu aralıkta karşılaşmaları mümkün" der. Aday bir sahne fikrine ya da açık soruya dönüştürülebilir. | Tasarım | Bu satır |
| F32 | **Bakım ve tekrarlar.** Bir büyü kapısının yapım bedeli kadar bakım sıklığı, uzmanı, malzemesi ve kesintideki davranışı tanımlanabilir; su kemeri, arşiv, sınır karakolu için de. Grev ya da ihanet icat edilmez. | Tasarım | Bu satır |
| F33 | **Bir sonraki yararlı soru.** "Bu sahnenin yolculuğunu çözmek istiyorum" denince program bu hesap için eksik olanı (ölçek ya da süre ağı, başlangıç, ulaşım biçimi) gösterir. "Üç hesapta kullanılıyor" der; bu bir önem puanı değildir. | Tasarım | Bu satır |
| F34 | Taşınabilir paket ve kurtarma provası | Tasarım | §10.11 |
| F35 | **Baskı ve uyarlama karşılaştırma.** Uyarlamada iki karakter tek karaktere indirgenebilir, olay sırası değişebilir. Yazar eşlemeleri tanımlar; sonraki değişiklikte etkilenebilecek eşlemeler listelenir. Hiçbir dal diğerini kendiliğinden güncellemez. | Tasarım | Bu satır |

### 16.2 F36–F47

Hepsi **Öneri**dir (A13). Tasarıma alınan fikrin tanımı ilgili bölüme taşınır.

| # | Fikir | Kısaca |
|---|---|---|
| F36 | **Ortak kaynak ve plan çakışması masası** | Aynı kişi, eşya ya da kapasite iki planda aynı anda mı kullanılıyor? Tek şifacı öğlen hem sarayda hem cephede olamaz. Planlanan, ayrılmış ve gerçekleşmiş kullanım ayrıdır; alternatif taslaklardaki planlar birbiriyle çatıştırılmaz. Yalnızca yazarın izlemek istediği kıt kaynaklarda açılır; öncelik kararı yazarındır. |
| F37 | **Birlikte geçerli varsayım paketleri** | Bir masada "köprü açık", "haberci yola çıkmadı" gibi varsayımlar seçilir; rota, haber, hukuk ve sahne bağlamı aynı paketi kullanır. Başka paketle çıkan sonuç yan yana karşılaştırılır. Varsayım kanona kullanıcı istemeden yazılmaz; "henüz karar vermedim" ile "iki seçenekten biri doğru" ayrıdır. Bütün evreni kopyalamadan küçük düşünce deneyleri için. |
| F38 | **Sonucun varsayıma duyarlılığı** | Sahnenin mümkün olması tek bir hassas sayıya mı dayanıyor? "Çıkış bir gün gecikirse feribot kaçıyor, varış üç gün sarkıyor." Sonuç "incelenen bütün koşullarda uygun / yalnızca şu koşullarda / uygun değil" diye verilir; yalnızca birkaç senaryo hesaplandıysa hepsinin tarandığı söylenmez. |
| F39 | **Zamanlı geçitler ve fırsat pencereleri** | Haftada iki gün çalışan gemi, gün batımında kapanan kapı, ay evresinde açılan geçit, gelgit yolu. Bekleme, kapasite ve varıştaki geçerlilik hesaplanır. En erken varış, en az masraf, en az aktarma gibi amaçlar tek gizli puana sıkıştırılmaz; risk yüzdesi uydurulmaz. |
| F40 | **Kalabalıkları toplu tutma** | Ordu, mürettebat, göçmen grubu toplu kayıt olarak tutulur; yaklaşık miktarlar ve tarihli gözlemler kullanılır. Alt grupların örtüşmesi ayrı bilgidir (30 okçu, 10 yaralı → hazır okçu 20–30). Bir üyeye ad vermek toplamı artırmaz; katılma, ayrılma ve ölüm gerçek değişikliktir. Bireylerin aynı inancı paylaştığı varsayılmaz. |
| F41 | **Herkesin bilmesi ile herkesin birbirinin bildiğini bilmesi** | Aynı bilgi tek tek mi öğrenildi, açık toplantıda mı duyuruldu? Duyuruda içerik, gerçek katılımcılar, algılanan dinleyiciler ve istisnalar (kapı arkasındaki dinleyici, dili anlamayan üye) tutulur. Katılım anlama ve inanma değildir. Otomatik siyasi sonuç üretilmez. |
| F42 | **Karar anında görünen seçenekler** | Solda yazarın bildiği olanaklar, sağda karakterin o anda bildiği ya da sandığı olanaklar; her birinin bedeli, gereken bilgisi ve erişimi. Karakter en verimli seçeneğe zorlanmaz; alternatifin varlığı kararın hatalı olduğunu kanıtlamaz. Yalnızca seçilen önemli kararlar için açılır. |
| F43 | **Beklenen izler ve yokluk kanıtı** | Bir olay gerçekleştiyse hangi izler beklenir; izin görülmemesi ne kadar anlamlı? "İz kaydı yok" ile "yer incelendi, iz görülmedi" ayrıdır; gözlem zamanı, kapsamı ve erişim sonucu etkiler. İnceleme yoksa sonuç bilinmeyendir. "Katil kesin X" diye bitmez. |
| F44 | **Kimliği belirsiz kişi ve nesneler için adaylar** | Üç sahnedeki maskeli kişi aynı mı? Geçici kimlik, gözlemler ve olası gerçek kimlikler ayrı tutulur; "aynı olabilir", "bu koşullarla aynı olamaz", "şu tanık aynı sanıyor" bağları kurulur. Tek aday kalınca bile otomatik birleşme yapılmaz. |
| F45 | **Kişisel kronoloji ve zaman yolculuğu** | 440'ta doğan kişi yetişkinken 430'a gelebilir. İsteğe bağlı modelde kişisel olay sırası, dünya zamanı ve beden ayrı izlenir; zaman yolculuğu kuralı (tek değişmez geçmiş, dallanan devamlılık, yazarın modeli) seçilir. Amaç çelişkiyi susturmak değil, seçilen kuralın izin verdiği sıraları sınamaktır. |
| F46 | **Eskizden yapılandırılmış mekâna** | Tablette serbest çizilen kroki otomatik tanınmaz; yazar bir çizgiyi "duvar", "kapı", "su" olarak işaretler, kayıt bağlar, istenirse uzunluk verir. Ham çizim, açıklamalar ve sahne yerleşimi ayrı katmanlardır. Çizimden kapı silmek evrende kapının yıkılması değildir. A5'e bağlıdır. |
| F47 | **Cihazlar arasında çalışma devri** | "Kaldığın yere dönme"yi (§5.9) bir devir kartına genişletir: sahne ve imleç, çalışma amacı, seçili varsayımlar, açık karşılaştırma, kısa devam notu. Kart hangi değişiklik noktasına dayandığını bilir; yeni cihaz ilgili metni henüz almadıysa söyler. Aynı sahnenin başka cihazda açık olması bilgi olarak gösterilir; kilit yoktur. |

---

## 17. Platform ve cihazlar

### 17.1 Tek program, üç cihaz

Program tek bir web uygulamasıdır (PWA, K7). Aynı adres üç cihazda açılır ve "uygulama olarak yüklenir"; yüklendikten sonra kendi simgesiyle, kendi penceresinde, internetsiz de çalışır. Aynı adres her an aynı sürümü çalıştırmak demek değildir (§10.7).

| Cihaz | Nasıl kurulur |
|---|---|
| Windows 11 bilgisayar | Edge ya da Chrome'da adres çubuğundaki "Uygulamayı yükle" |
| Galaxy Tab S11 Ultra (Android) | Chrome ya da Samsung Internet'te "Ana ekrana ekle / Yükle" |
| iPhone | Safari'de Paylaş → "Ana Ekrana Ekle" |

Ayrı Windows, Android ve App Store uygulamaları yazmak gerekmez; App Store yolu ayrıca yıllık Apple geliştirici üyeliği ister. İleride aynı program, veri modeli değişmeden, bir uygulama kabuğuna konabilir; bu açık bir seçenektir, karar değildir.

**Neden bağımsız bir web uygulaması?** Kullanıcının verisi üzerinde tam denetim (kendi cihazında ve kendi Drive'ında), internetsiz çalışma ve Drive ile kendi eşitleme protokolünü uygulayabilmek için. Claude'daki prototip bu davranışları sağlamıyor; bu, Claude sayfalarının hiçbir dış hizmete bağlanamadığı anlamına gelmez.

### 17.2 iPhone'a özel durumlar

- **Bu PWA için** iPhone'da uygulama kapalıyken düzenli arka plan eşitlemesi garanti edilmez. Eşitleme uygulama açılınca ve açıkken yapılır; açılışta son eşitleme zamanı görünür. (Yerel iOS uygulamalarının arka plan görevleri vardır; bu bir PWA'ya aynı güvenceyi vermez.)
- Safari'nin site verisini silebilmesi ve Drive'ın bunu ne ölçüde karşıladığı §10.8–§10.9'dadır.
- Google izninin yenilenmesi yazmayı kesmez (§10.8).

### 17.3 Depo ve yayın

- Kod ve tasarım belgeleri `Darvolinnn/dunya-atlasi` deposundadır (K7).
- GitHub'ın ücretsiz planında GitHub Pages herkese açık depo ister (bazı ücretli planlar özel depodan da yayına izin verir). Depo görünürlüğü ile sitenin görünürlüğü ayrı şeylerdir.
- Depoda yalnızca program kodu ve tasarım belgeleri olur. **Evren verisi, dışa aktarımlar ve gerçek evrenden ekran görüntüleri depoya girmez**; kullanıcının cihazlarında ve Drive'ında durur. Tasarım örnekleri uydurmadır (§0.3).
- Wiki ayrı bir yayın paketidir ve yazar uygulamasından ayrı kökende yayımlanır (§11.4, A3).

---

## 18. Koddan önce yazılacak sözleşmeler

### 18.1 Veri sözleşmeleri

Önce anlam sözleşmeleri yazılır, veritabanı tabloları bunlardan çıkarılır. Her sözleşme dört soruyu cevaplar: *boş olabilir mi? · sonradan değişirse geçmişi etkiler mi? · hangi bağlamda geçerli? · kimin kararıyla kesinleşir?*

| Sözleşme | Kapsadığı | Cevaplaması gereken |
|---|---|---|
| **Kimlik** | Değişmeyen kimlik, adlar (dönem ve kimin bildiğiyle), birleştirme yönlendirmesi, çalışma sayfası üyeliği | Bir kayıt birden çok sayfada; adlar bağlamlı; yönlendirme döngüsüz |
| **Tarihli durum** | Geçerlilik aralığı; sınır tarih, olay+fark ya da kısıt | Tek bir zaman ifadesi; tarih ve olay aynı anda girilip çelişemez |
| **Gözlem ve süren durum** | Kaydın anlık mı, aralık mı, sonraki değişikliğe kadar mı olduğu (§3.5) | Hangi alanlar ileri taşınır; gözlemden durum çıkarılmaz |
| **İddia ve tutum** | Önerme; kimin ileri sürdüğü; kimin hangi tutumla inandığı | Önerme, ileri sürme ve inanma ayrı kayıtlar |
| **Kaynak sürümü** | Belgenin hangi sürümü, pasajı, hangi edinme olayıyla | Tek kaynak alanı yetmez |
| **Metin işaretlemesi** | İşaret, iddia, dünya durumu, sürüm (§5.7) | Yer ile anlam ayrı |
| **Anlatı kullanım yeri** | Eser, baskı, sahne, metin örneği (§3.3) | Kopya ile taşıma ayrı |
| **Süreç** | Plan, adımlar, eşikler, sonuç kuralı (§3.10) | Hangi adım neyi doğurur; iptalde ne olur |
| **Nicelik ve alan anlamı** | Alan kimliği, değer türü, birim, hassasiyet, izin verilen işlemler | Aşağıda |
| **Sorgu ve olumsuzluk** | Bilinmeyen, çelişkili ve açıkça yanlış değerlerin VE/VEYA/DEĞİL içinde davranışı | Aşağıda |
| **Eksiksizlik beyanı** | Hangi ilişki, hangi zaman, hangi dünya ya da dal, hangi kaynak durumu için "eksiksiz" | "430 konsey üyeleri eksiksiz" sonraki yılları kapsamaz; kapsam değişince beyan incelemeye düşer (§9.3) |
| **Türetilmiş sonuç** | Hesap, dayanakları (birden çok), kural sürümü, varsayım paketi, güncellik | Yokluk varsayımı ve varsayım paketi de dayanaktır |
| **Ortak varsayımlar** | Bir sonucun hangi alternatif varsayımlar altında geçerli olduğu | Farklı araçların sonuçları aynı koşullarda birlikte geçerli mi (§2.2 kural 14) |
| **Bağlam bileşimi** | Kaynak sürümü, dünya zamanı, bilgi katmanı ve yayın kapsamının birleşimi (§5.2) | Karışık bağlam görünümü nasıl etiketlenir |
| **İnceleme yaşam döngüsü** | Ne açar, ne kapatır, ne yeniden açar (§9.3) | Ertelemenin kapanış olmaması |
| **Yayın kapsamı** | Eser, baskı, okuma sınırı (tercih ya da teslim), okur kimlikleri, paket sürümü (§11) | "Gizli / açık" ikiliği yetmez |
| **Karar durumu** | Kayıt ve alan düzeyinde (§3.6) | Yalnızca kayıt düzeyi yetmez |
| **Eşitleme işlemi** | İşlem kimliği, kurulum, sıra, gördüğü değişiklikler, anlık görüntü, kontrol noktası (§10.1–§10.3) | Çatışma tespiti görmeye dayanır, çevrimdışılığa değil |
| **İşlem grubu** | Parçaları, tamamlanma durumu, geri almanın etkisi (§10.4) | Yarım grup ne gösterir |
| **Kurulum ve uygulama sürümü** | Kurulum kimliği, etkinlik, dört sürüm, gönderilmemiş iş (§10.5, §10.7) | Kayıp kurulum, eski istemci, dönüşüm |

**Nicelik ve alan anlamı:**
- Mesafe, süre, miktar, oran, hız ve kapasite ayrı nicelik türleridir. "10" tek başına anlamsızdır: 10 gün, 10 saatlik emek, 10 kişi, 10 kullanım hakkı ve 10 para birimi farklı işlemlere izin verir.
- Dünya günü ile farklı zaman akışında yaşanan gün aynı birim sanılmaz (§9.1 kapsamlı kurallar).
- Para dönüşümü fiziksel birim dönüşümü değildir; döneme, yere ve işlem koşuluna bağlıdır.
- Hassasiyet korunur (§2.2 kural 16). Birimler ya da kapsamlar uyuşmazsa hesap durur ve nedenini söyler.
- Bir alanın anlamı görünen adına bağlı değildir: iki şablondaki "güç" alanı biri fiziksel kuvvet, öbürü siyasi etki olabilir. Alanın kimliği, değer türü, birimi ve izin verilen işlemleri ayrıca tanımlıdır. Formül yazımı (F16) bu tanımları kullanır.
- Alt gruplar ve sayımlar kapsamlarıyla tutulur; örtüşmesi bilinmeyen alt gruplardan aralık çıkar, tek sayı çıkmaz.

**Sorgu ve olumsuzluk:**
- Bir koşul için her kayıt dört gruptan birindedir: *doğrulanmış evet · doğrulanmış hayır · bilgi yok · çelişkili*. "Kuzey Loncası üyesi olmayanlar" sorgusu yalnızca "doğrulanmış hayır" grubunu verir; bilgi yok ve çelişkili gruplar ayrı gösterilir, sessizce dışlanmaz ya da eklenmez.
- Kullanıcı bunun yerine "üyelik kaydı bulunmayanlar" sorgusunu da seçebilir; bu, farklı ve açıkça adlandırılmış bir sorgudur.
- Arayüz mantık terimi kullanmaz: "üye olduğu doğrulanan", "üye olmadığı doğrulanan", "bilgisi girilmemiş", "çelişkili".
- Eksiksiz beyan edilmiş bir kapsamda "bilgi yok" grubu "hayır" sayılır; kapsam dışında sayılmaz.
- Sayımlar "doğrulanmış 8, belirsiz 3" biçimindedir; yayına giden sayılar da bu ayrımı korur.

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
| Veri eksikse | "Kayıtlı ağda A'dan B'ye yol yok" ya da "şu bağlantının süresi girilmemiş"; dünya genelinde imkânsız denmez. |
| Okuduğu | Mekânlar, rotalar, süreler, mevsim etkileri, ulaşım biçimleri; varsa ölçekli harita ve geçiş koşulları |
| Değiştirdiği | Hiçbir dünya kaydını. Sonuç yalnızca yazar seçerse yolculuk ya da olay olarak eklenir (§2.2 kural 1). |
| Yapmayacağı yorum | Karakterin yolu bildiğini, kararı verdiğini ya da yetiştiğini varsaymaz; görselden ölçeksiz mesafe üretmez. |
| Kabul örneği | D15, D16, D17 (§13.3) |

Bu sözleşmeler, ilgili özellik tasarıma alınırken ya da kodlamadan önce yazılır ve özelliğin tanımının bulunduğu bölüme eklenir.
