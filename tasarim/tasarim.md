# Dünya Atlası: Kaynak İncelemesi (yazar.io görselleri ve videoları)

> **Güncel ve bütünleşik tasarım:** [dunya-atlasi-tasarim.md](dunya-atlasi-tasarim.md). Bu dosya görsel ve video incelemesinin ayrıntılı kaydı olarak kalır; çelişen yerlerde bütünleşik tasarım geçerlidir.

Bu doküman, yazacağımız dünya kurma programının tasarımını topluyor. Gönderdiğin her yeni video ve fotoğraf, önce aşağıdaki **Kaynaklar** bölümüne işleniyor, çıkarımları da ilgili bölüme ekleniyor. Kod, tasarım netleşince yazılacak.

Mevcut prototip ([Dünya Atlası](https://claude.ai/artifact/J7dzxaZed3SYb8y2iid6sW)) yalnızca bir başlangıç noktası. Tasarım onu bağlamıyor.

## Kısaca

Gönderdiğin malzemeden çıkan program, üç parçanın birleşimi:

1. **Bağlantılı bir arşiv:** kayıtlar, tipli ilişkiler, geri-atıflar, soy ağacı, zaman çizelgesi ve özel takvim. Bunun büyük kısmı yazar.io'da da var.
2. **Soru soran bir rehber:** her kayıt türü kendi soru kütüphanesiyle gelir. Yeni bir dünya "fikir, çatışma, karakter" ile başlar. Program boş form doldurtmaz, soruları ihtiyaç oldukça açar ("Önce hikâye, dünya peşinden gelir").
3. **Katmanlı bir harita:** bölgeler, belirsiz sınırlar, rotalar ve yolculuk süreleri, olayların izleri ve zaman kaydırıcısı. Gönderdiğin videoların yarısı haritayı anlatıyor ama yazar.io'da harita aracı yok. **Bizim en net farkımız burası.**

---

## 1. Temel ilkeler

1. **Her şey birbirine bağlı.** Karakter, mekân, grup, eşya ve lore ayrı listeler değil, tek bir ağın düğümleri. Bir sayfaya bağlanan her şey o sayfada kendiliğinden görünür.
2. **Yalnızca kayıt değil, düşünme aracı.** yazar.io'nun ikinci ve üçüncü serileri dünya kurmayı sorularla anlatıyor ("İyi bir dünya bir soruyla başlar"). Program boş form yerine doğru soruları sormalı.
3. **Önce yazar için, sonra okur için.** Notlar ve taslaklar özel kalır. İstenirse dünya, salt okunur bir wiki olarak paylaşılır.
4. **Her cihazda aynı dünya.** Bilgisayar, tablet ve iPhone (tarayıcı) arasında eşitleme şart.
5. **Elle tutulur bir his.** Kartlar, arşiv fişleri, sekmeli dosyalar ve el notları. Arayüz bir yazarın masası gibi hissettirmeli.

---

## 2. Özellikler ve çıkarımlar

### 2.1 Bağlantılı dünya (ağ görünümü)
*Kaynak: Seri A / 2*

**Gördüğümüz:** Her kayıt bir kart. Kartın üstünde tür etiketi (KARAKTER, MEKÂN, TOPLULUK, EŞYA, ARŞİV KAYDI 014), altında ad ve bir gravür görseli var. Kartlar ortadaki pusula etrafında çizgilerle birbirine bağlanıyor. Çizgilerin üzerinde ilişkinin türünü gösteren küçük simgeler duruyor (kale, insanlar, kitap). Vaat edilen iki şey: "İlişkiler otomatik görünür" ve "Dünya parçaları tek yerde birleşir".

**Bizde:**
- Her kayıt için **kart görünümü**: tür etiketi, ad, görsel, kısa özet.
- **Ağ görünümü**: seçili kaydın çevresindeki bağlantıları kart olarak gösteren etkileşimli bir harita. Kartlar sürüklenebilir, tıklayınca sayfaya gidilir.
- Bağlantılar iki yoldan oluşur: metindeki `[[Ad]]` (prototipte var) ve aşağıdaki **tipli ilişkiler**.
- Arşiv havası için kayıtlara otomatik bir **arşiv numarası** verilir (ör. "Arşiv Kaydı 014").

### 2.2 Wiki olarak yayınlama
*Kaynak: Seri A / 3, A / 7*

**Gördüğümüz:** Dünya, tek bir linkle (`yazar.io/wiki/evrenim`) herkese açık, salt okunur bir wikiye dönüşüyor. Açık bir kitap gibi tasarlanmış: solda içindekiler (Karakterler, Mekânlar, Lore; her birinin yanında küçük bir görsel), sağda bir giriş sayfası ("Dünya Kurmak Anlam Kurmaktır").

**Bizde:**
- Dünya başına bir **"Yayınla"** düğmesi ve salt okunur bir okur görünümü.
- Okur görünümü **kitap düzeninde** olur: kapak ve giriş yazısı, türlere göre içindekiler, okunaklı sayfalar.
- **Neyin yayınlanacağı kayıt bazında seçilir.** Spoiler ya da taslak kayıtlar gizli kalır. Bu, görsellerde yok ama yazar için gerekli.

### 2.3 Soy ağacı ve karakter ilişkileri
*Kaynak: Seri A / 4*

**Gördüğümüz:** Portreli bir aile ağacı. Arthen (baba) ve Lysandra (anne) arasında bir hane arması duruyor. Altlarında Kaelen, Elara ve Daeron var; aralarında "kardeş" okları görülüyor. Elara'nın altında eş ilişkileri (Lorian ve Mirella, ortada bir kalp) ve bir çocuk (Alden) var. Vaat: "Anne, baba, eş ve kardeş ilişkilerini bir bakışta takip et. Karmaşayı düzenli bir yapıya dönüştür."

**Bizde:**
- **Tipli ilişkiler**: iki kayıt arasında türü olan bir bağ (ebeveyn/çocuk, eş, kardeş; ayrıca dost, düşman, usta/çırak, üye/lider ve serbest metin).
- Her ilişkinin **karşılığı kendiliğinden oluşur**. A, B'nin babasıysa B de A'nın çocuğu olarak görünür.
- **Soy ağacı görünümü**: portreli düğümler, kuşaklara göre dizilmiş. İsteğe bağlı olarak bir hane ya da arma kaydına bağlanır.
- İlişkiler zamana bağlanabilir (ör. "412'de evlendiler"). Böylece zaman çizelgesiyle birleşir.

### 2.4 Yazar kartı
*Kaynak: Seri A / 5*

**Gördüğümüz:** Bir profil vitrini: yuvarlak görsel, ad, unvan ("Fantastik Yazar"), kısa bir söz, sosyal medya simgeleri, ardından Kitaplarım, Blog Yazılarım, Dünyalarım ve Destekle bağlantıları. Altta kitap kapakları ve `yazar.io/miraa` linki var.

**Bizde:** Kişisel kullanım için önceliği düşük. Wiki yayını gelince, yayınlanan dünyaların toplandığı basit bir **yazar sayfası** olarak eklenebilir. *Karar senin (bkz. Açık sorular).*

### 2.5 Notlar
*Kaynak: Seri A / 6*

**Gördüğümüz:** Üç çeşit not var. Raptiyeli "Sahne Fikri" fişi bir madde listesi ("Eski liman kasabası, Kayıp mektup…"). Spiralli "Karakter Notu" alan–değer biçiminde (Adı, Geçmiş, Hedefi, Korkusu). Ataşlı "Dünya Notu" ise kısa bir paragraf. Vaatler: "Araştırmalarını kaybetme", "Notlar çalışma alanında sana özel kalsın", "Aklına geleni anında yakala."

**Bizde:**
- Her ekrandan açılabilen bir **hızlı not**. Telefonda tek dokunuşla açılır.
- Not şablonları: sahne fikri, karakter notu, dünya notu, araştırma (link ya da görsel).
- Notlar **her zaman özeldir** ve wikide yayınlanmaz.
- Bir not, bir ya da birkaç kayda **iliştirilebilir**. Notun içindeki fikir sonradan tek tıkla gerçek bir kayda dönüştürülebilir.
- Karakter notundaki **Hedef / Korku / Geçmiş** alanları karakter şablonuna da girer.

### 2.6 Dünya kurma soruları ("Dünya Pusulası")
*Kaynak: Seri B (5 soru), Seri C / 2*

**Gördüğümüz:** "İyi bir dünya bir soruyla başlar" fikri ve beş temel soru:
1. **Bu dünyanın merkez çatışması ne?** Seçenekler: kıtlık, inanç, iktidar, hayatta kalma, özgürlük, intikam. ("Gerilim yön verir, çatışma tonu belirler.")
2. **İnsanlar bu dünyada nasıl yaşıyor?** Geçim biçimi, ritüeller, korkular, alışkanlıklar. Örnekler: sabah pazarı, akşam ritüeli, ortak sofra. ("Ayrıntı inandırıcılık kurar.")
3. **Güç kimde ve bedeli ne?** Güç kaynakları: büyü, bilgi, para, soy. ("Güç ücretsiz değildir; bedel gerilimi büyütür.")
4. **Hangi kural kırılırsa her şey değişir?** Yasak bir büyü, bozulan bir antlaşma ya da çöken bir denge.
5. **Bu dünya karakterini nasıl dönüştürüyor?** ("Dünya, karakterle tamamlanır.")

**Bizde:**
- Her dünyanın ana sayfasında bu beş soruyu taşıyan bir **Dünya Pusulası** paneli bulunur. Yanıtlar kayıtlara bağlantı içerebilir.
- Çatışma ve güç sorularında **seçilebilir etiketler** vardır (kıtlık/inanç/iktidar…, büyü/bilgi/para/soy). Bunlar dünyayı filtrelemeye de yarar.
- **Doluluk göstergesi:** hangi soruların yanıtsız kaldığı görünür.
- Sorular düzenlenebilir. Kullanıcı kendi sorusunu da ekleyebilir.

### 2.7 Türe göre rehber alanlar
*Kaynak: Seri C / 3, 4, 5, 6*

| Tür | Görseldeki ilke | Bizdeki karşılığı |
|---|---|---|
| Mekân | "Mekânlar yalnızca dekor değildir." Kararları ve hikâyenin hissini değiştirir. Görselde kat planı (Salon, Avlu, Kiler, Oda) ve şehir haritası var. | "Karakterlerin kararlarını nasıl etkiliyor?" alanı. **Kat planı ya da harita görseli** yükleme. İleride görselin üzerine işaretlenip bağlanabilen noktalar eklenebilir. |
| Topluluk / Grup | "Toplulukların bir arzusu olmalı. Her düzen bir şeyi korur, bir şeyi ister, bir şeyden korkar. Kültür buradan doğar." Görselde sancak, mühür ve "Arşiv No. IV-17" var. | Sabit **Korur / İster / Korkar** alanları. Grup için **sancak veya arma** görseli. |
| Büyü / Güç sistemi | "Sınır yoksa etki de yoktur." Çarkın dilimleri: Sınır, Maliyet, Risk, Sonuç, Kural, Denge. Bir de **Kural / Kısıt / Etki** tablosu var. | Büyü sistemi şablonu: bu altı alan ve satır eklenebilen kural tablosu (kural, kısıtın gücü, etkinin gücü). |
| Genel | "Dünyanı büyüt ama izini kaybetme." Renkli sekmeli dosya kartları (Karakterler, Mekânlar, Lore) ve aralarında bir "Bağlantılar" fişi. | Türler **renkli sekmelerle** ayrılır. Kart üzerinde maddeli kısa özellikler ("Gezgin, eski haritacı çırağı, meraklı ve inatçı") gösterilir. |

### 2.8 Görsel kimlik
*Kaynak: tüm görseller*

**Gördüğümüz:** Eskitilmiş krem bir parşömen zemin üzerinde gotik (blackletter) başlıklar ve sade, modern bir gövde yazısı kullanılıyor. Sağ kenarda yırtık kâğıt katmanları var: lacivert yıldız haritası, yosun yeşili dağlar, eski harita ve kiremit kırmızısı. Altın rengi pusula gülleri ve ince altın çizgiler aksan olarak kullanılıyor. Gravür tarzı illüstrasyonlarda kale, kalyon ve portreler görülüyor. İnce çift çerçeveli kartlar, daktilo ve el yazısıyla yazılmış fişler, mum mühürler, raptiye ve ataşlar da var.

**Bizde (öneri):**
- **Atmosfer** buradan alınır: kâğıt dokusu, çerçeveli kartlar, arşiv fişleri, türler için renkli sekmeler, pusula motifi.
- yazar.io'nun kimliğini **kopyalamayız**. Gotik başlık ve aynı renk dörtlüsü onların markası. Kendi başlık fontumuzu ve paletimizi seçeriz.
- Yoğun dekor yalnızca kapak, wiki ve boş ekranlarda kullanılır. Yazma ekranı sade ve okunaklı kalır, çünkü uzun süre orada çalışılacak.
- Koyu tema da olur: lacivert yıldız haritası zemini doğal bir gece modu verir.
- **Kayıtlara görsel eklenebilmeli**, çünkü görsellerdeki her kartta bir resim var (portre, mekân, arma).

### 2.9 yazar.io'nun gerçek arayüzü
*Kaynak: Video 1 ("Bir dünya kurmak kolay… Dünyanı kur. Dağılmadan.")*

**Gördüğümüz:** Bu video tanıtım görsellerinden farklı olarak ürünün kendi arayüzünü gösteriyor. Krem bir zemin üzerinde beyaz, hafif gölgeli kartlar var. Her kartta küçük renkli bir nokta ve tür adı (Karakter, Mekân, Topluluk, Lore, Not), serif yazıyla kayıt adı (Kaan Tuna, Mira, Selvi Ayaz, Tuz Limanı, Akkule, Ayna Loncası, Yedi Mühür, Bölüm 5) ve sağ üstte baş harf rozeti (K, M, S) bulunuyor. Kartlar ince çizgilerle bağlanıyor. Yanlarında yapışkan notlar ve kâğıt harita parçaları duruyor. Altta yıllı bir zaman çizelgesi uzanıyor (Kuruluş, Büyük Yangın, Kuzey Seferi, Taç Giyme).

**Bizde:**
- Gerçek ürün, reklam görsellerinden çok daha **sade**: parşömen dekoru yok, temiz kartlar var. Bu, 2.8'deki "yazma ekranı sade kalsın" önerisini destekliyor.
- **Görseli olmayan kayıtlar için baş harf rozeti** kullanılır. Böylece her kart yine de tanınır.
- **"Bölüm"** de bir kayıt türü olarak görünüyor. Hikâyenin bölümleri dünya kayıtlarına bağlanabilir (bkz. 2.14).
- Ağ, harita ve zaman çizelgesi **aynı tuvalde** yan yana duruyor. Uzun vadede tek bir "masa" görünümü hedeflenebilir.

### 2.10 Soru kütüphanesi (türe göre rehber sorular)
*Kaynak: Görsel seri D (13 kare), Video 2 ("5 soru: Kaydet, sonra dön")*

Neredeyse bütün yeni görseller, belirli bir kayıt türü için sorulması gereken soruların listesi. Bu, programın merkezinde bir **soru kütüphanesi** olması gerektiğini gösteriyor. Her kayıt türü kendi soru setiyle gelir. Sorular zorunlu bir form değildir: isteğe bağlı kartlar olarak görünür, cevaplanınca kaydın bir bölümü olur.

**Karakter: temel altı soru** ("İyi bir karakter ne istediği ve neden korktuğuyla hatırlanır.")
1. En çok ne istiyor? (hikâye boyunca peşinden gideceği arzu)
2. En büyük korkusu ne?
3. En büyük kusuru ne?
4. Ne saklıyor? (sır)
5. Sınırı nerede? (asla yapmayacağını düşündüğü şey)
6. Geçmişi onu nasıl değiştirdi?

**Karakter geçmişi** (Yaygın hata: geçmişi kronolojik bir özgeçmiş gibi doldurmak.) Geçmişteki her olay için şu sorular sorulur:
1. Bu olay onda ne bıraktı? (korku, özlem, öfke, utanç, inanç)
2. Bugün neyi farklı yapıyor?
3. Kime karşı tavrı değişti?
4. Hangi yanlış sonuca vardı?
5. Hikâye bu yarayı nasıl sınayacak?
→ **Tasarım çıkarımı:** Karakterin geçmişi düz bir metin değil, **zaman çizelgesindeki olaylara bağlı "izler"** olarak tutulur. Her iz bir olaya, bir duyguya ve bugünkü bir davranışa bağlanır.

**Kötü alışkanlık:** alışkanlık, tetikleyici (ne zaman ortaya çıkıyor), kimi rahatsız ediyor, neyi gizliyor, karakter farkında mı, değişebilir mi.

**Kötü karakter / karşıt güç:** ne istiyor, neden kendini haklı görüyor, neyi kaybetmekten korkuyor, hangi sınırı aşmaz, ana karakterle ortak yanı ne ("aynı ihtiyacın farklı sonuçları").

**İlişki** (5 karenin 2–4'ü geldi):
1. Geçmişlerini birbirine bağla: bir karşılaşma, ortak bir kayıp ya da çözülmemiş bir mesele.
2. İki tarafın beklentisini yaz: aynı olay iki karakter için aynı anlama gelmek zorunda değil.
3. Bir gerilim noktası belirle: söylenmemiş bir söz, yanlış anlaşılmış bir karar ya da tutulmamış bir söz.
→ **Tasarım çıkarımı:** İlişki yalnızca bir çizgi değil, **kendi sayfası olan bir kayıt**. İçinde ortak geçmiş, A'nın gözünden, B'nin gözünden ve gerilim noktası alanları bulunur.

**Mekân: gerçek hissettiren altı detay** (duyular): nasıl kokuyor, nasıl ses çıkarıyor, insanlar nasıl hareket ediyor, gece ne değişiyor, yerliler neyi normal buluyor, hangi iz geçmişten kaldı.

**Şehir: çoğu zaman unutulan lojistik:** su nereden geliyor, yemek nasıl geliyor, atık nereye gidiyor, gece nasıl işliyor, mahalleler neden farklı, şehri gerçekte kim yönetiyor.

**Krallık** ("Sadece kralı düşünme"): taht kime geçiyor, kralı kim sınırlıyor, para nereden geliyor, halk ne bekliyor, din ne kadar güçlü, krallığın zayıf noktası ne.

**Büyü sistemi** (üç temel unsur): **Kural** (okurun anlayabileceği bir mantık), **Bedel** (zaman, enerji, hafıza, sağlık, para…), **Sınır** (kesinlikle yapamadığı şey). Video 3 bunu bir terazi olarak anlatıyor: bir kefede güç, diğerinde bedel. Bedel örnekleri: 01 yorgunluk (enerji çubuğu), 02 nadir kaynak (haritada aranan bir taş), 03 sonuç (kullanım → etki → sonuç zinciri).
→ 2.7'deki altı alanlı (sınır, maliyet, risk, sonuç, kural, denge) şablon bu üçlüyle sadeleştirilir: önce **kural / bedel / sınır**, diğerleri isteğe bağlı.

**Dünyayı harita olmadan büyütmek:** uzak yerlerden söz ettir, ticaret izleri bırak, farklı diller duyur, eski olayları an, söylentiler kullan.
→ **Tasarım çıkarımı:** Bir kayda **"bahsedilen ama gidilmeyen"** etiketi verilebilir. Masadaki "Bahsedilen ama yazılmamış sayfalar" paneli (prototipte var) bu fikre çok yakın.

**Dünya kurma rehberi** (Video 2, beş sorunun üçü okunabildi): Kim hüküm sürüyor? (Topluluklar), Büyünün bedeli ne? (Lore), İnsanlar neye inanıyor? (İnançlar). Her soru kartının altında bir **kategori etiketi** var ve kartlar "Kaydet, sıradaki bölümde lazım olacak" diye bitiyor.
→ **Tasarım çıkarımı:** Bir soruya verilen cevap, **etiketlediği türde yeni bir kayıt olarak kaydedilebilir.** "İnsanlar neye inanıyor?" sorusunun cevabı bir İnanç kaydına dönüşür. "İnanç" ayrı bir kayıt türü olarak eklenmeli.

### 2.11 Harita: bölgeler, sınırlar, yollar ve izler
*Kaynak: Video 4 (sınırlar), Video 5 (mesafe ve yolculuk), Video 6 (felaketten sonra)*

yazar.io'nun kendi videolarından üçü haritayı anlatıyor, ama ürünün harita aracı yok. Bu, **bizim en net farkımız** olabilir.

- **Belirsiz sınırlar** (Video 4: Aldren ile Varos): Kurgu dünyasında sınırlar kesin olmak zorunda değil. Bir nehir, bir dağ sırası ya da geniş bir orman doğal bir sınır olabilir. İki taraf aynı toprağın kendisine ait olduğunu düşünebilir. Bu belirsizlik kendiliğinden hikâye üretir: sınır kasabaları (Köprübaşı), kültürlerin karışması, yasak bir geçit, bir antlaşma taşı, kayıp bir kervan.
  → Haritada **örtüşebilen bölgeler** çizilir. Her bölge bir topluluk ya da krallık kaydına bağlanır. Haritaya düşülen **işaretler** (yasak geçit, antlaşma taşı) da kayıttır.
- **Mesafe ile yolculuk farklıdır** (Video 5: Aldra'dan Velmor'a kuş uçuşu 40 km, ama 3 günlük yolculuk): Dağlar, kötü yollar ve nehir geçişleri yolu uzatır. Terazinin bir kefesinde uzaklık, diğerinde yolculuk durur: yolun hali, seyahat biçimi ve yolda ne olduğu.
  → İki mekân arasında **rota** kaydı tutulur: kuş uçuşu mesafe, yolculuk süresi, yolun hali, seyahat biçimi, yol üstündeki duraklar ve tehlikeler. Bir karakter yolculuğu zaman çizelgesine düşer.
- **Olayın izleri** (Video 6: Kül Vadisi Felaketi, Yıl 312): Felaket bitmiş olabilir ama izleri kalır. Terk edilmiş şehirler, başka bölgelere göç eden insanlar, devam eden korkular ve yasak bölgeler bunlara örnek. Haritanın üstünde 312'den "bugün"e uzanan bir **zaman kaydırıcısı** var. Ekranda "Arşiv Kaydı No. 0312" kartı açılıyor.
  → Olay kayıtlarında bir **"Etkileri"** bölümü olur ve her etki bir mekâna ya da topluluğa bağlanır. Harita, **zaman kaydırıcısıyla** seçilen yıldaki hâliyle gösterilebilir.

### 2.12 Takvim ve mevsimler
*Kaynak: Video 7 ("Kurgu evrenini planla")*

**Gördüğümüz:** Kurgu dünyası 12 aylık bir takvimi kullanmak zorunda değil. Videoda 360 günlük bir yıl, dört mevsime bölünmüş bir çark olarak çiziliyor: Hasat 65 gün, Kış 110 gün, Bahar 70 gün, Yaz 115 gün. Mevsim uzunlukları hayatı doğrudan etkiliyor: savaş zamanı, kısa bir hasat dönemi. Belirli bir gün (Fener Günü) yılda bir kez geliyor. Haritada insanlar mevsime göre yer değiştiriyor (yazlık ve kışlık). "Takvim değiştiğinde dünya da değişmeye başlıyor."

**Bizde:**
- Her dünya kendi **takvimini** tanımlar: yılın uzunluğu, mevsimler ve aylar (adları ve gün sayıları), haftalar, bayramlar ve özel günler.
- Zaman çizelgesi bu takvimi kullanır. Tarihler "Yıl 312, Hasat'ın 12. günü" gibi yazılabilir.
- **Takvim çarkı** görünümü: mevsimler, bayramlar ve o mevsime bağlı olaylar.
- Mevsime bağlı göç ve yol durumu, harita ve rota kayıtlarıyla birleşir.

### 2.13 Güç dengesi
*Kaynak: Video 8, Görsel D (krallık)*

**Gördüğümüz:** "Kim en güçlü?" diye bir sıralama yapmak yerine bir tablo kuruluyor. Satırlarda güçler var (taç, dağ ülkesi, orman halkı). Sütunlar: **sahip** (neye sahip), **ihtiyaç** (neye ihtiyaç duyuyor), **karşısına alamaz** (kimi karşısına alamaz). Haritada büyük krallığın ordusu dağ ülkesinin madenlerine bağımlı, yani tamamen bağımsız değil. Sonunda güçler birbirine bağımlı bir çember oluşturuyor ve ortada bir terazi duruyor.

**Bizde:**
- Dünyanın topluluk ve krallıkları için bir **güç dengesi tablosu**: her satır bir topluluk, sütunlar sahip / ihtiyaç / karşısına alamaz. Hücreler başka kayıtlara bağlanabilir (bir maden, bir ordu, bir inanç).
- Tablodan bir **bağımlılık çemberi** çizilir: kim kime muhtaç?
- Grup şablonundaki Korur / İster / Korkar alanları (2.7) ile birleşir.

### 2.14 Önce hikâye
*Kaynak: Video 9 ("Worldbuilding yaparken en sık yaptığım hata")*

**Gördüğümüz:** En sık yapılan hata, hikâyeden önce her şeyi çözmeye çalışmak: şehrin adı, tarihi, dini, ekonomisi, haritada nerede durduğu, iklimi, ordusu, lehçesi, para birimi… Sonunda insan "dünya kurmak yerine ayrıntıların içinde kayboluyor". Çözüm olarak "Kendime not" deniyor: önce hikâyede gerekeni kur. Videoda 1. Bölüm'den Final'e uzanan bir patika çiziliyor. Dünya unsurları (ad, tarih, inanç, ekonomi, harita) ancak bir bölüm onlara ihtiyaç duyduğunda patikanın yanında beliriyor. "Önce hikâye. Dünya peşinden gelir."

**Bizde (önemli bir ilke):**
- Program **boş alan doldurtmamalı.** Sorular ve alanlar isteğe bağlı olur ve yalnızca gerektiğinde açılır. Bu, 2.10'daki soru kütüphanesinin nasıl sunulacağını da belirler.
- **Hikâye / Bölüm** türü eklenir. Her bölüm, içinde geçen karakter, mekân ve olaylara bağlanır.
- **Hikâye patikası** görünümü: bölümler sırayla dizilir, her bölümün yanında o bölümün ihtiyaç duyduğu dünya kayıtları görünür.
- Henüz yazılmamış ama bir bölümün ihtiyaç duyduğu sayfalar "yapılacaklar" olarak öne çıkar.

### 2.15 Kültür: coğrafya, tabular, küçük detaylar ve isimler
*Kaynak: Video 10–13*

- **Önce coğrafya, sonra kültür** (Video 10): Kültür kurarken önce o halkın nerede yaşadığına bakılıyor. Dağda ve kıyıda yaşayan iki halk; ulaşım (patika ile tekne), yemek (peynir ile balık), ticaret ve korku (çığ ile deniz canavarı) bakımından farklılaşıyor. Harita dört **katman** olarak düşünülüyor: iklim, su, yollar, doğal kaynaklar. Bir kale yanlış yere konunca üstü çiziliyor; yollar ancak coğrafyaya uyunca yerine oturuyor. "Önce coğrafya. Sonra kültür."
  → Harita **açılıp kapanabilen katmanlarla** tutulur (iklim, su, yollar, kaynaklar, bölgeler). Bir topluluk ya da kültür kaydı, yaşadığı bölgeye bağlanır. Kayıtta "coğrafya bunu nasıl şekillendiriyor?" sorusu sorulur: ulaşım, yemek, ticaret, korku.
- **Yasaklar ve tabular** (Video 11): Bir kültürü, insanların ne yaptığından çok **neyi ayıp gördükleri ve hangi davranıştan korktukları** tanımlıyor. Örnek olarak bazı toplumlarda yasak bir tepe, bazılarında ölünün adını anmanın yasak olması veriliyor. Köyün haritası üzerinde iki katman var: **gelenekler** (noktalı çizgi) ve **yasaklar** (kesik çizgiyle çevrili alan). İki kavram ayrılıyor: *ayıp* ve *kutsal*.
  → Kültür şablonuna **Gelenekler**, **Yasaklar ve tabular**, **Ayıp sayılanlar** ve **Kutsal sayılanlar** bölümleri eklenir. Yasak bir yer, haritada bir işaret olarak bu kayda bağlanır.
- **Gündelik hayatın küçük detayları** (Video 12): Dünyayı gerçek kılan şey büyük olaylar değil, küçük detaylar: selamlaşma, sofra, inanç, para ve gündelik bir çatışma. Bunlar hikâyenin etrafında bir çark gibi dizilip "dünyaya ağırlık kazandırıyor". Bir kasaba planında sıradan bir sorunun sabahtan akşama nasıl çözüldüğü izleniyor.
  → Kültür kaydına **"Gündelik hayat" kartları** eklenir: selam, sofra, para, inanç, çatışma. Seri B / 2'deki "İnsanlar nasıl yaşıyor?" sorusuyla birleşir.
- **İsim oluşturma** (Video 13): İsimler rastgele harflerden (Xqzvürtak) değil, **kültürün ses karakterinden** doğuyor. Bir kültürün sesi iki eksende düşünülüyor: **sert ↔ akıcı** ve **kısa ↔ uzun**. Tekrar eden heceler (k, ar, -is) seçiliyor ve aynı kültürün karakteri, şehri ve ülkesi bu seslerden türetiliyor: Merkis (karakter), Velkar (şehir), Arvanis (ülke). "İsim güzel dursun değil, o kültüre ait dursun."
  → Her kültür ya da dil kaydında bir **ses paleti** tutulur: hece listesi, sert/akıcı ve kısa/uzun ayarı. Bu paletten **isim önerileri** üretilir ve yeni kayıt açarken önerilir. Sözlük türüyle birleşir.

### 2.16 Yeni bir dünyaya başlamak: fikir, çatışma, karakter
*Kaynak: Video 14 ("Bir kurgu evrenine başlarken")*

**Gördüğümüz:** "Her şey birden değil." Şehirler, hizipler, yaratıklar ve tarih bekleyebilir. Başlangıç üç adımda kuruluyor:
1. **Temel fikir:** örnek kural olarak "ışıktan bir nehir" adayı ikiye bölüyor.
2. **Çatışma:** nehrin iki yakasında iki karşıt taraf var (kırmızı üçgen ve mavi hilal).
3. **Karakter:** tam ortaya, nehrin üstüne bir karakter yerleştiriliyor.

"Gerisi bu üç şeyin etrafında şekillenir." Ardından şehirler (Kerevan, Yelova, Tuzhal, Demirgeçit, Aşlıkan) ve yollar ekleniyor. Haritanın altında katman düğmeleri var: Şehirler, Hizipler, Yaratıklar, Tarih, İnanç, Büyü, Dil, Ticaret. Ölçek "100 fersah" olarak yazılmış.

**Bizde:**
- **Yeni dünya sihirbazı** tam olarak bu üç adımı sorar: temel fikir (dünyayı farklı kılan tek kural), çatışma (iki taraf) ve ortadaki karakter. Üç cevap birer kayıt olarak oluşur ve birbirine bağlanır. Böylece kullanıcı boş bir sayfayla değil, küçük bir ağla başlar.
- Dünya Pusulası (2.6) bu üç cevabın üzerine kurulur. Diğer sorular sonra, ihtiyaç oldukça açılır (2.14 ile uyumlu).
- Haritanın alt çubuğundaki katmanlar, bizim kayıt türlerimizle birebir eşleşebilir: şehirler, hizipler, yaratıklar, tarih, inanç, büyü, dil, ticaret. Bir katmanı açınca o türdeki kayıtların haritadaki yerleri görünür.
- Haritanın **ölçek birimi** dünyaya özeldir (fersah, menzil, gün). Rota hesapları (2.11) bu birimi kullanır.

---

## 3. Veri modeli (taslak)

- **Dünya:** ad, tanıtım, kapak görseli, Dünya Pusulası yanıtları, yayın ayarı.
- **Kayıt:** tür, ad, özet, metin, alanlar (türün şablonundan gelir), cevaplanan sorular, etiketler, görseller, tarih (dünyanın takvimiyle), arşiv numarası, *yayınlansın mı*. Türler: karakter, mekân, topluluk/krallık, kültür, ırk, eşya, büyü sistemi, inanç, lore, sözlük/dil, olay, bölüm.
- **Ses paleti** (kültür ya da dil kaydında): heceler, sert/akıcı, kısa/uzun.
- **İlişki:** kimden, kime, tür (karşılığı otomatik), ortak geçmiş, iki tarafın beklentisi, gerilim noktası, tarih.
- **Not:** şablon (sahne / karakter / dünya / araştırma), içerik, iliştirildiği kayıtlar. Her zaman özel.
- **Tür şablonu:** türün alanları ve soru kütüphanesi. Kullanıcı düzenleyebilir.
- **Harita:** görsel ya da çizim, üzerinde bölgeler (çokgen, örtüşebilir, kayda bağlı), işaretler (kayda bağlı) ve rotalar.
- **Rota:** iki mekân, mesafe, yolculuk süresi, yolun hali, seyahat biçimi, duraklar.
- **Takvim:** yıl uzunluğu, mevsimler ve aylar, özel günler.
- **Güç dengesi:** topluluk × (sahip, ihtiyaç, karşısına alamaz).

## 4. Ekranlar

1. **Masa:** dünya seçimi, son düzenlenenler, Dünya Pusulası, yazılmamış sayfalar, hızlı not.
2. **Kayıt sayfası:** kart başlığı, görsel, bilgi kutusu, metin, ilişkiler, geri-atıflar, iliştirilmiş notlar.
3. **Ağ görünümü**
4. **Soy ağacı**
5. **Zaman çizelgesi** (prototipte var)
6. **Notlar panosu**
7. **Wiki / okur görünümü**
8. **Harita:** bölgeler, işaretler, rotalar ve zaman kaydırıcısı.
9. **Takvim çarkı**
10. **Güç dengesi tablosu**
11. **Hikâye patikası:** bölümler ve ihtiyaç duydukları kayıtlar.
12. **Ayarlar:** tür şablonları ve soru kütüphanesi, takvim, dışa aktarma, yayın.

## 5. Önceliklendirme (öneri, ikinci malzeme grubundan sonra güncellendi)

- **Sürüm 1, temel:** kayıtlar, bağlantılar, geri-atıflar, arama, zaman çizelgesi, eşitleme (prototipte var). Bunlara görsel ekleme, tipli ilişkiler, **tür şablonları ve soru kütüphanesi**, hızlı notlar ve bölüm türü eklenir.
- **Sürüm 2, görünümler:** Dünya Pusulası, soy ağacı, ağ görünümü, hikâye patikası, özel takvim.
- **Sürüm 3, harita:** harita yükleme ya da çizme, bölgeler, işaretler, rotalar, zaman kaydırıcısı.
- **Sürüm 4, paylaşım:** güç dengesi tablosu, wiki yayını, yazar sayfası.

## 6. Açık sorular

1. Görsel kimlik yazar.io'ya ne kadar yakın olsun? Seçenekler: reklamlardaki parşömen havası, ürünün kendi sade kart görünümü ya da bize özgü bir tarz.
2. Yazar kartı (profil vitrini) gerekli mi?
3. Wiki herkese açık mı olsun, yoksa yalnızca link verdiğin kişilere mi?
4. Harita ne kadar önemli? Gönderdiğin 14 videonun yedisi haritayla ilgili. Harita aracını Sürüm 3'ten öne alalım mı?
5. Haritayı kendin mi çizmek istersin, yoksa başka bir yerde çizdiğin bir görseli yükleyip üstüne bölge ve işaret koymak yeter mi?

---

## Kaynaklar

| Seri | Görsel | Konu |
|---|---|---|
| A: "yazar.io'nun öne çıkan 5 özelliği" (7 kare) | IMG_9595–9601 | Kapak; Bağlantılı Dünya; Wiki; Soyağacı; Yazar Kartı; Notlar; Kapanış ("Dünyanı kur. Düzenle. Paylaş.") |
| B: Dünya kurma soruları (5 kare, 2–5 gönderildi) | IMG_9602–9605 | Merkez çatışma; gündelik hayat; güç ve bedeli; kırılan kural; karakterin dönüşümü |
| C: Dünya kurma ilkeleri (6 kare, 2–6 gönderildi) | IMG_9606–9610 | Soruyla başlamak; mekânlar; topluluklar; sınır ve etki; izini kaybetme |

| D: Soru kartları (13 kare) | IMG_9578, 9583–9594 | Karakter (altı soru, geçmiş yazma hatası, kötü alışkanlık, kötü karakter); ilişki (2–4/5); mekân duyuları; şehir lojistiği; krallık; büyü sisteminin üç unsuru; haritasız dünya büyütme |

**Videolar** (Instagram Reels, 720×1280, sesli; kareler 3 saniyede bir çıkarılarak incelendi; ses dökümleri: [video-sesleri.md](video-sesleri.md))

| No | Dosya | Süre | Konu |
|---|---|---|---|
| 1 | 9fb2f193 | 18 sn | yazar.io arayüzü: kartlar, bağlantılar, zaman çizelgesi ("Dünyanı kur. Dağılmadan.") |
| 2 | ff8d506f | 25 sn | "Dünya kurarken sorman gereken 5 soru": kategori etiketli soru kartları |
| 3 | 93e629c9 | 35 sn | Büyü sistemi: güç ve bedel terazisi, yorgunluk, nadir kaynak, sonuç |
| 4 | fca8052a | 43 sn | Belirsiz sınırlar: Aldren ve Varos, sınır kasabaları, yasak geçit |
| 5 | 14f76247 | 33 sn | Mesafe ile yolculuk: 40 km ama 3 gün |
| 6 | f9c92fb1 | 38 sn | Felaketten sonra: Kül Vadisi, göç, yasak bölge, zaman kaydırıcısı |
| 7 | 842de710 | 44 sn | Özel takvim: 360 günlük yıl, mevsim çarkı, Fener Günü |
| 8 | b3f4e970 | 33 sn | Güç dengeleri: sahip / ihtiyaç / karşısına alamaz |
| 9 | a6a07241 | 33 sn | "Önce hikâye, dünya peşinden gelir." |
| 10 | 16d23156 | 37 sn | Önce coğrafya: dağ ve kıyı, harita katmanları |
| 11 | 220536d8 | 33 sn | Yasaklar ve tabular: ayıp ve kutsal, gelenek ve yasak katmanları |
| 12 | 26e1bfcb | 34 sn | Küçük detaylar: selam, sofra, inanç, para |
| 13 | b5fc636e | 34 sn | İsim oluşturma: ses paleti (Merkis, Velkar, Arvanis) |
| 14 | f6775906 | 30 sn | Başlangıç: temel fikir, çatışma, karakter; harita katman çubuğu |

*Toplam 29 görsel ve 14 video incelendi (2026-10-18). Kullanıcı bu turdaki malzemenin bittiğini söyledi.*
