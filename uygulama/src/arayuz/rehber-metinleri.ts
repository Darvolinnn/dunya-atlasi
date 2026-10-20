// Sayfa rehberleri (§12.4, K25): her sayfanın başlığındaki "?" düğmesi bu metni yan panelde açar.
// Anahtarlar sayfa adlarıdır (Kabuk.tsx listeleri); ayrıca 'evrenler', 'esitleme' ve 'kayit'.

export interface SayfaRehberi {
  /** Panelin başlığı. */
  baslik: string;
  /** Sayfanın ne işe yaradığı; bir iki paragraf. */
  ne: string[];
  /** Hangi durumda bu sayfaya gelinir. */
  neZaman?: string;
  /** Sırayla yapılacaklar. */
  adimlar: string[];
  /** Bilmeye değer ayrıntılar. */
  ipuclari?: string[];
}

export const REHBERLER: Record<string, SayfaRehberi> = {
  evrenler: {
    baslik: 'Evrenler',
    ne: [
      'Programın giriş sayfası. Kurduğunuz her kurgu evreni burada bir kart olarak durur. Evren, bir hikâyenin ya da bir dizi hikâyenin geçtiği dünyanın bütünüdür: karakterleri, yerleri, olayları, haritaları, takvimi ve yazdığınız metinler hep bir evrenin içindedir.',
      'Evrenler birbirinden tamamen ayrıdır; birindeki kayıt ötekinde görünmez.',
    ],
    neZaman: 'Programı açtığınızda, yeni bir evrene başlarken ya da başka bir evrene geçmek istediğinizde.',
    adimlar: [
      '“Yeni evren”e basın, bir ad yazın ve “Oluştur”a basın. Adı sonradan değiştirebilirsiniz.',
      'Var olan bir evreni açmak için kartına basın. Evren açılınca doğrudan yazma sayfası (Yaz) gelir.',
      'Başka bir bilgisayardan aldığınız yedek dosyasını geri getirmek için “Yedekten geri yükle”yi kullanın.',
      'Obsidian gibi programlardaki Markdown notlarınızı almak için “İçe aktar”ı kullanın; içe alınanlar yeni ve ayrı bir evren olur.',
      'Bir evreni bu cihazdan kaldırmak için kartının köşesindeki “Kaldır”a basın. Evren Drive ile eşitlenmişse oradaki kopyası ve öbür cihazlarınız etkilenmez; yeniden indirebilirsiniz. Yalnızca bu cihazdaysa geri getirilemez; program bunu ve son yedeğin tarihini sorarken söyler.',
    ],
    ipuclari: [
      'Sağ üstteki “Eşitleme ve cihazlar” ile evrenlerinizi Google Drive üzerinden öbür cihazlarınızla eşitleyebilirsiniz.',
      'Hiçbir evren kendiliğinden silinmez; yedekten geri yükleme bile var olan evrene dokunmaz, ayrı bir evren açar.',
    ],
  },
  esitleme: {
    baslik: 'Eşitleme ve cihazlar',
    ne: [
      'Evrenlerinizi Google Drive üzerinden bilgisayarınız, tabletiniz ve telefonunuz arasında eşitlediğiniz sayfa. Program her şeyi önce bu cihaza kaydeder; Drive bağlıysa değişiklikler oraya da gönderilir ve öbür cihazlarınız onları oradan alır.',
      'Program Drive’da yalnızca kendi klasörünü görür; Drive’daki öteki dosyalarınıza erişemez.',
    ],
    neZaman: 'İlk kurulumda, yeni bir cihaz eklerken ya da bir evrenin Drive’a gidip gitmediğini görmek istediğinizde.',
    adimlar: [
      '“Google Drive” bölümünden bağlanın; açılan Google penceresinde hesabınızı seçip izin verin.',
      '“Bu cihaz” bölümünde cihaza tanınır bir ad verin (ör. “Ev bilgisayarı”). Öbür cihazlarda bu adla görünür.',
      '“Evrenler” listesinde her evren için “Drive ile eşitle” kutusunu işaretleyin. İşaretli olmayan evren yalnızca bu cihazda kalır.',
      'Başka bir cihazda oluşturduğunuz evren “Drive’da olup bu cihazda olmayan evrenler” altında görünür; buradan bu cihaza alabilirsiniz.',
    ],
    ipuclari: [
      'Google izni yaklaşık bir saat geçerlidir. Süresi dolunca ekranın üstünde “eşitlemek için tıklayın” uyarısı çıkar; bu arada yazmaya devam edebilirsiniz, hiçbir şey kaybolmaz.',
      'Aynı bilgisayardaki iki farklı tarayıcı ayrı cihaz sayılır.',
      'İki cihazda aynı şey farklı değiştirilirse program birini seçmez; Uyarılar sayfasında ikisini yan yana gösterir, siz seçersiniz.',
    ],
  },
  yaz: {
    baslik: 'Yaz',
    ne: [
      'Evrenin ana sayfası ve asıl yazı masanız. Romanlarınızı, öykülerinizi burada yazarsınız. Sol tarafta eserlerinizin ağacı durur: eser › bölüm › sahne.',
      'Bir sahne açıkken metin ortada, o sahnenin bağlamı sağdaki panelde görünür. Panelin dört sekmesi vardır: Bağlam (ne zaman, nerede, kimin gözünden, kimler orada ve o andaki durumları), Plan (sahne planının soruları), Süreklilik (sahnenin süreklilik defteri) ve Bilgi (bakış açısındaki karakterin ve okurun o anda bildikleri).',
    ],
    neZaman: 'Yazmaya oturduğunuz her an. Evren açılınca bu sayfa gelir.',
    adimlar: [
      'Yeni bir evrende sayfanın üstündeki “İlk adımlar” listesi sizi dört adımda yazmaya hazırlar; yaptıkça adımlar işaretlenir. İsterseniz “Gizle” ile kapatabilirsiniz.',
      'Henüz eseriniz yoksa romanınızın ya da öykünüzün adını yazıp “Eser oluştur”a basın.',
      'Soldaki ağaçta “+ Bölüm” ile bölüm, “+ Sahne” ile sahne ekleyin.',
      'Bir sahneye basıp yazmaya başlayın. Yazdıklarınız kendiliğinden kaydedilir.',
      'Metinde bir karakterin ya da yerin adını [[ ya da @ ile yazarsanız ona bağlantı kurulur; kayıt yoksa “fikir” olarak oluşturulur.',
      'Bağlam sekmesindeki “Bu sahne” kartı sahnenin tarihini, mekânını ve bakış açısını okunacak biçimde gösterir. Değiştirmek için karttaki “Düzenle”ye basın.',
      'Sağdaki bağlam panelini başlıktaki düğmeyle açıp × ile kapatabilirsiniz. Sahnenin bütün ayrıntıları ve çöp kutusuna taşıma, başlıktaki “Sahne ⋯” menüsündedir.',
    ],
    ipuclari: [
      'Kaldığınız yer hatırlanır; “Devam et” sizi son yazdığınız yere götürür.',
      'Bir sahne açıkken soldaki ağaçta yalnız onun eseri ve bölümü açık durur; öbürlerini yanlarındaki okla açabilirsiniz. Bağlam panelinde en son seçtiğiniz sekme de hatırlanır.',
      'Tarihi, mekânı ve sahnedekileri henüz girilmemiş bir sahnede bağlam paneli kapalı başlar; başlıkta “Bağlam ekle” görünür. Siz paneli bir kez açar ya da kapatırsanız bu seçim hatırlanır.',
      'Sahnenin evren tarihi girilmemişse panel kayıtları belirli bir ana göre süzemez; tarihi girdiğinizde o andaki durum gösterilir. Mekânı, bakış açısını ya da sahnedekileri girdiğinizde onların o andaki durumları da panelde toplanır.',
      'Bilgi sekmesindeki okurun bilgisi bölümü, okur için kaydettiğiniz bilgi yokken katlı durur. Okur için zaman evren tarihine göre değil, okuma sırasına göre ilerler.',
      'Soldaki çubuğun altındaki özet, yazınızın nerede güvende olduğunu söyler: bu cihazda kayıt, Drive ile eşitleme ve son yedek ayrı satırlardır. Eşitleme başka cihazlara taşır; yedek, geri dönebileceğiniz ayrı bir kopyadır.',
      'Ctrl+K komut paletini açar: herhangi bir sayfayı ya da kaydı adını yazarak bulabilirsiniz. İki yer arası yolculuk süresini ve takvim günü hesabını da buradan yaparsınız.',
      'Alt+N her ekranda hızlı not açar.',
    ],
  },
  masa: {
    baslik: 'Genel bakış',
    ne: [
      'Evrenin özet sayfası: nerede kaldığınızı, son neyle uğraştığınızı ve bekleyen düşüncelerinizi tek bakışta gösterir.',
      'Burada şunlar durur: kaldığınız yer ve devam notu, son düzenlenen kayıtlar, önemli açık meseleler, hızlı notlar, metinde adı geçip henüz yazılmamış kayıtlar ve Dünya Pusulası.',
    ],
    neZaman: 'Bir aradan sonra evrene döndüğünüzde ya da “şimdi ne yapsam” dediğinizde.',
    adimlar: [
      '“Kaldığınız yer” kartındaki “Devam et” ile en son yazdığınız yere dönün. İsterseniz kendinize bir “buradan devam” notu bırakın.',
      '“Son düzenlenenler” listesinden üzerinde çalıştığınız kayıtlara hızla geçin.',
      '“Hızlı notlar”a aklınıza geleni yazın; sonra bir notu kayda dönüştürebilirsiniz.',
      'Dünya Pusulası’ndaki beş temel soruyu (merkez çatışma, gündelik hayat, güç ve bedeli, her şeyi değiştiren kural, evrenin karakteri nasıl dönüştürdüğü) zamanla cevaplayın.',
    ],
    ipuclari: [
      'Evrenin adını bu sayfadaki “Adı değiştir” ile değiştirebilirsiniz.',
      'Hiçbir liste bir görev listesi değildir; boş bırakılan alanlar size borç gibi gösterilmez.',
    ],
  },
  kayitlar: {
    baslik: 'Kayıtlar',
    ne: [
      'Evrendeki her şeyin listesi. Karakter, yer, olay, topluluk, eşya, inanç, not… her biri bir kayıttır. Her kaydın kendi sayfası, metni, alanları ve ilişkileri vardır.',
    ],
    neZaman: 'Yeni bir karakter, yer ya da başka bir şey eklemek ya da var olan bir kaydı bulmak istediğinizde.',
    adimlar: [
      'Üstteki kutuya yeni kaydın adını yazın, türünü seçin ve “Oluştur”a basın.',
      'Arama kutusu ad, lakap, eski ad ve metin içinde arar.',
      'Listeyi son değişene, ada, türe ya da evren tarihine göre sıralayabilirsiniz.',
      'Bir yerin ya da topluluğun içindekileri görmek için “İçindekiler” süzgecini kullanın (ör. bir krallığın şehirleri, bir kültürden olanlar).',
      'Bir kayda basarak sayfasını açın.',
    ],
    ipuclari: [
      '“Vazgeçilenleri gizle” kutusu, artık kullanmadığınız fikirleri listeden çıkarır; silmez.',
      'Metin yazarken [[ ile anılan bir kayıt yoksa kendiliğinden “fikir” olarak oluşturulur; bu listede de görünür.',
    ],
  },
  kayit: {
    baslik: 'Kayıt sayfası',
    ne: [
      'Bir kaydın (karakter, yer, olay, sahne…) bütün bilgilerinin durduğu sayfa. Üstte adı, türü, karar durumu ve kısa özeti; altında metni, alanları, ilişkileri ve türe özgü bölümler vardır.',
      '“Karar durumu” bu kaydın kesinleşmiş mi, hâlâ fikir mi, yoksa vazgeçilmiş mi olduğunu söyler. Fikir durumundaki şeyler denetlenir ama sizi uyarılarla bunaltmaz.',
    ],
    neZaman: 'Bir kaydın ayrıntılarını yazmak, düzeltmek ya da başka kayıtlarla bağlamak istediğinizde.',
    adimlar: [
      'Türün şablonundaki alanları doldurun (ör. bir karakter için doğum tarihi, bir şehir için nüfus). Hepsini doldurmak zorunda değilsiniz.',
      '“İlişkiler” bölümünden aile, üyelik, sahiplik, düşmanlık gibi bağları kurun. İlişkilere tarih verebilirsiniz.',
      '“Zamanla değişenler” bölümüne unvan, ikamet, sahibi gibi zamanla değişen değerleri tarihleriyle yazın.',
      '“Diğer bölümler”i açarak işaretler, haklar, kimin ne bildiği, sorular ve türe özgü araçlara ulaşın.',
      '“Ağda göster” ya da “Soy ağacı” ile kaydı görünümlerde açın.',
    ],
    ipuclari: [
      '“Sürüm geçmişi” bu kayıttaki her değişikliği gösterir; metnin eski bir hâlini geri getirebilirsiniz.',
      '“Çöp kutusuna taşı” kaydı silmez; Çöp kutusu sayfasından geri getirebilirsiniz.',
      'Kaydın adını değiştirirseniz, metinlerdeki bağlantılarda adın değişip değişmeyeceği size sorulur.',
    ],
  },
  haritalar: {
    baslik: 'Haritalar',
    ne: [
      'Evreninizin haritalarını yüklediğiniz ve üzerlerine işaret koyduğunuz sayfa. Her işaret bir kayda (şehir, kale, nehir…) bağlanır; böylece haritadaki bir noktaya basınca o yerin sayfası açılır.',
      'Bölge (ör. bir krallığın toprakları) ve yol da çizebilir, haritayı belli bir tarihteki hâliyle görebilirsiniz.',
    ],
    neZaman: 'Coğrafyayı kurarken, bir yolculuğu planlarken ya da bir yerin nerede olduğunu hatırlamak istediğinizde.',
    adimlar: [
      '“Harita yükle” ile bir görsel seçin ve haritaya ad verin.',
      'Haritayı açın. Harita bütün alanı kaplar; araçlar sol kenardadır: “Kesin yer”, “Yaklaşık bölge”, “Bölge çiz” ya da “Yol çiz”i seçin.',
      'Haritaya basın ve işareti bir kayda bağlayın.',
      'Bir işarete basınca sağdaki çekmecede o yerin kartı açılır: kısa özeti, orada geçen sahneler, bağları ve oradan geçen yollar.',
      'Yeri bilinmeyen ama bu haritada olduğu bilinen yerleri (ör. efsanevi bir şehir) çekmecedeki “Yeri bilinmeyenler” listesine ekleyin.',
      'Zaman kaydırıcısıyla haritayı belli bir yıldaki hâliyle görün: o tarihte geçerli olmayan bölge ve yollar gizlenir, o tarihe denk gelen olaylar listelenir.',
    ],
    ipuclari: [
      'Sağdaki çekmecenin üç sekmesi vardır: İşaretler (aranabilir liste), Katmanlar ve Künye (haritayı kim, ne zaman, ne amaçla yaptı; haritayı kaldırma da buradadır). Çekmeceyi ✕ ile kapatınca harita genişler.',
      'Haritanın altındaki lejant işaretlerin ve çizgilerin anlamını gösterir. Sağ alttaki “Sığdır” haritayı ekrana bütünüyle sığdırır.',
      '“Katmanlar” ile eski bir haritayı ya da eskizi aynı haritanın üstüne bindirebilirsiniz. İşaretler görsele değil haritaya bağlı olduğundan görsel değişince yerinden oynamaz.',
      'Tartışmalı topraklarda her tarafın iddiasını ayrı bölge olarak çizin; “fiilî denetim” ile “iddia edilen” ayrımını yapabilirsiniz.',
      'Fotoğraflardaki konum bilgisi yüklenirken silinir.',
    ],
  },
  takvim: {
    baslik: 'Takvim',
    ne: [
      'Evreninizin zaman düzenini kurduğunuz sayfa: ay adları, yılın kaç gün sürdüğü, günün bölümleri, mevsimler ve çağlar. Olaylara ve sahnelere verdiğiniz tarihler bu takvime göre okunur ve sıralanır.',
      'Ana takvimin yanında başka kültürlerin kendi takvimlerini (paralel takvimler) ve zamanın farklı hızda aktığı yerleri (zaman akışları; ör. bir peri boyutu) de tanımlayabilirsiniz.',
    ],
    neZaman: 'Olaylara tarih vermeye başlamadan önce ya da evrene yeni bir takvim ya da farklı akan bir zaman eklemek istediğinizde.',
    adimlar: [
      '“Ana takvim”de yıl için kullanılan sözü (ör. “Yıl”) ve bir yılın gün sayısını yazın.',
      'Ayları sırayla ekleyip her ayın gün sayısını girin; ay eklerseniz yılın uzunluğu ayların toplamı olur.',
      'Gün bölümlerini virgülle yazın (ör. “sabah, öğle, akşam, gece”) ve mevsimleri hangi aylar arasında olduklarıyla ekleyin.',
      'Çağları (ör. “İkinci Çağ”) ilk yıllarının karşılığıyla tanımlayın.',
      '“Dene” kutusuna bir tarih yazıp takvimin onu nasıl okuduğunu görün, sonra kaydedin.',
    ],
    ipuclari: [
      'Bir paralel takvimin ana takvimle eşlemesini biliyorsanız girin; bilinmiyorsa program kesin bir dönüşüm uydurmaz.',
      'Zaman akışının oranı aralık olabilir (ör. akışta 1 gün = dışarıda 1–2 gün); sonuç da aralık olarak gösterilir.',
      'Takvimi sonradan değiştirmek eski tarihleri silmez; yazdığınız biçimleriyle korunurlar.',
    ],
  },
  inceleme: {
    baslik: 'Uyarılar',
    ne: [
      'Programın dikkatinize sunduğu her şeyin toplandığı sayfa: iki cihazda farklı yapılmış değişiklikler, bir değişikliğin etkilediği kayıtlar, tutarlılık uyarıları (ör. bir karakter öldükten sonra bir sahnede görünüyor) ve kopuk bağlantılar.',
      'Program yalnızca kaydettiğiniz tarihlere, ilişkilere ve sahne bilgilerine bakar; metninizi okuyup anlam çıkarmaz.',
    ],
    neZaman: 'Gezinti çubuğunda “Uyarılar”ın yanında bir sayı gördüğünüzde ya da bir yazma oturumunu bitirdiğinizde.',
    adimlar: [
      '“İki cihazda yapılan değişiklikler” varsa her biri için hangi hâlin kalacağını seçin.',
      '“Değişikliklerin etkisi”nde bir olayın tarihi değişince etkilenen sahne ve kayıtlara bakın; düzelttiyseniz “Düzelttim”e basın.',
      '“Tutarlılık denetimleri”nde her uyarıyı ya düzeltin, ya “Ertele”yin, ya da bir gerekçeyle “Bu hâliyle kabul et”in.',
      '“Sağlık taraması” kopuk bağlantıları ve eksik görselleri gösterir.',
    ],
    ipuclari: [
      'Bilerek kabul ettiğiniz bir çelişki (ör. bir hayalet ölümünden sonra görünüyor) bir daha uyarı olarak gelmez.',
      '“Sorun yok” demek, yalnızca o kural ve listelenen kayıtlar için sorun olmadığı anlamına gelir.',
    ],
  },
  masalar: {
    baslik: 'Konu dosyaları',
    ne: [
      'Belli bir konu üzerinde çalışmak için kurduğunuz dosyalar. Bir konu dosyasına ilgili kayıtları, bir tarih aralığını, haritaları ve notları toplarsınız; örneğin “Kuşatma” dosyasında kale, iki ordu, komutanlar ve o yılın olayları bir arada durur.',
      'Kayıtlar dosyaya kopyalanmaz, yalnızca bağlanır. Dosyadan çıkarmak kaydı silmez.',
      'Aynı sayfada varsayım paketleri de vardır: “köprü açık olsaydı” gibi küçük düşünce deneyleri. Bir pakette tuttuğunuz varsayımlar, siz istemedikçe evrene yazılmaz.',
    ],
    neZaman: 'Birçok kaydı birlikte düşünmeniz gereken bir konu ya da sahne dizisi üzerinde çalışırken.',
    adimlar: [
      'Yeni bir konu dosyası oluşturup ona bir ad verin.',
      '“Bugün burada neyi çözmeye çalışıyorum?” sorusuna kısa bir cevap yazın.',
      'İsterseniz bir tarih aralığı seçin; dosya bu aralıktaki olayları gösterir.',
      'Kayıtları ve haritaları dosyaya bağlayın, notlarınızı yazın.',
      'Bir varsayımı denemek için bir varsayım paketi oluşturup dosyaya seçin; hesaplar o varsayımlarla yapılır.',
    ],
    ipuclari: [
      'İki seçenekten yalnızca biri doğru olabiliyorsa (ör. köprü açık ya da kapalı) onları iki ayrı pakette tutun.',
      'Büyük bir “ya şöyle olsaydı” denemesi için Kayıtlı anlar sayfasındaki deneme kopyalarını kullanın.',
    ],
  },
  meseleler: {
    baslik: 'Karar bekleyenler',
    ne: [
      'Henüz karar vermediğiniz soruların ve verdiğiniz kararların gerekçelerinin durduğu sayfa.',
      '“Açık meseleler” sizin yazdığınız sorulardır (ör. “Büyü bedeli kimden alınıyor?”); boş alanlar burada sayılmaz. “Gerekçe defteri” ise verdiğiniz kararları nedenleriyle saklar (ör. “Büyü iyileştiremez, çünkü yaralar hikâyede ağırlığını korumalı”).',
    ],
    neZaman: 'Aklınıza bir soru takıldığında ya da önemli bir karar verdiğinizde.',
    adimlar: [
      'Yeni bir açık mesele yazın; önemliyse “Önemli” işaretleyin, Genel bakış sayfasında öne çıkar.',
      'Meseleler durumlarına göre gruplanır: “Düşünülecek”, “Kararlaştırıldı”, “Şu an gerekmiyor”. Karar verince meselenin durumunu değiştirin.',
      'Bir karar verdiğinizde nedeniyle birlikte gerekçe defterine yazın; aylar sonra “bunu neden böyle yapmıştım?” dediğinizde burada bulursunuz.',
    ],
  },
  sablonlar: {
    baslik: 'Şablonlar',
    ne: [
      'Her kayıt türünün (karakter, yer, olay…) hangi alanları ve hangi soruları olacağını belirlediğiniz sayfa. Örneğin karakter şablonuna “göz rengi” alanı eklerseniz bütün karakter sayfalarında bu alan görünür.',
    ],
    neZaman: 'Bir türün kayıtlarına hep aynı bilgiyi yazmak istediğinizde ya da bir türün size soracağı soruları değiştirmek istediğinizde.',
    adimlar: [
      'Üstten bir tür seçin.',
      '“Alan ekle” ile yeni alan ekleyin; adını, türünü (metin, sayı, tarih, seçenek…) ve isterseniz bir ipucu yazın.',
      'Sayı alanlarında ne ölçüldüğünü ve birimini seçebilirsiniz (ör. uzunluk, metre).',
      '“Soru ekle” ile türün sorularını yazın ya da “Kütüphaneden set ekle” ile hazır soru setleri ekleyin.',
      '“Şablonu kaydet”e basın.',
    ],
    ipuclari: [
      'Bir alanı şablondan kaldırmak kayıtlardaki değerleri silmez; o kayıtlarda “Şablonda olmayan alanlar” altında kalır.',
      '“Boşken varsayılan” ayarı, alan boşsa değerin başka bir kayıttan (ör. bağlı olduğu ülkeden) alınmasını sağlar.',
      'Beğenmediğiniz değişiklikleri “Varsayılana dön” ile geri alabilirsiniz.',
    ],
  },
  bahsedilen: {
    baslik: 'Henüz yazılmayanlar',
    ne: [
      'Metinlerinizde adını bağlantıyla andığınız ama kendi sayfasına henüz bir şey yazmadığınız kayıtlar. En çok anılan en üsttedir.',
      'Bu bir görev listesi değil, bir hatırlatmadır: belki bu kayıtların bir kısmı hiç yazılmayacak, o da olur.',
    ],
    neZaman: 'Evreninizde neyi derinleştirebileceğinize bakmak istediğinizde.',
    adimlar: [
      'Listeden bir kayda basıp sayfasını açın.',
      'Kısa bir özet ya da metin yazın; kayıt bu listeden çıkar.',
    ],
  },
  cop: {
    baslik: 'Çöp kutusu',
    ne: [
      'Sildiğiniz kayıtların durduğu yer. Programda hiçbir kayıt doğrudan yok olmaz; önce buraya gelir.',
      'Geri getirdiğiniz kayıt metni, ilişkileri ve bütün bilgileriyle döner.',
    ],
    neZaman: 'Yanlışlıkla sildiğiniz bir şeyi geri almak istediğinizde.',
    adimlar: [
      'Listeden kaydı bulun.',
      '“Geri getir”e basın.',
    ],
  },
  gecmis: {
    baslik: 'Değişiklik geçmişi',
    ne: [
      'Bu evrende yapılan her değişikliğin sırasıyla listesi: hangi kayıt oluşturuldu, hangi ilişki eklendi, hangi tarih değişti. En yenisi en üsttedir.',
    ],
    neZaman: 'Bir şeyin ne zaman değiştiğini ya da son çalışmanızda neler yaptığınızı görmek istediğinizde.',
    adimlar: [
      'Listeyi yukarıdan aşağı okuyun; her satırda değişikliğin ne olduğu ve ne zaman yapıldığı yazar.',
      'Bir kaydın metninin eski hâline dönmek için o kaydın sayfasındaki “Sürüm geçmişi”ni kullanın.',
    ],
  },
  surumler: {
    baslik: 'Kayıtlı anlar',
    ne: [
      'Evrenin belli bir anını saklamak ve büyük değişiklikleri güvenle denemek için üç araç:',
      'Adlandırılmış sürümler, evrenin bugünkü hâlini bir adla saklar (ör. “Birinci kitabın yayımlanan hâli”); sonra o hâli salt okunur açıp bugünle karşılaştırabilirsiniz. Deneme kopyaları, “kral yaşasaydı” gibi büyük bir değişikliği evreni bozmadan denemenizi sağlar. Yayımlar ise yayımlanmış bir eserin dayandığı bilgiyi saklar ve sonradan bu bilgiyle çelişen bir değişiklik yaparsanız sizi uyarır.',
    ],
    neZaman: 'Bir kitabı bitirdiğinizde ya da evrende büyük bir şeyi değiştirmeyi düşündüğünüzde.',
    adimlar: [
      'Bugünkü hâli saklamak için bir ad yazıp “Bu hâli adlandır”a basın.',
      'Bir değişikliği denemek için deneme kopyası açın; içinde istediğiniz gibi çalışın, ana evren değişmez.',
      'Beğendiğiniz değişiklikleri deneme kopyasından kayıt kayıt seçip ana evrene taşıyın.',
      'Bir eseri yayımladığınızda “Yayımlandı olarak işaretle” ile baskısını kaydedin.',
    ],
    ipuclari: [
      'Deneme kopyasındaki değişiklikler yalnızca bu cihazda tutulur; Drive ile eşitlenmez.',
      'Küçük düşünce deneyleri için konu dosyalarındaki varsayım paketleri yeterlidir.',
    ],
  },
  yedek: {
    baslik: 'Yedek',
    ne: [
      'Evreninizi dosyaya yedeklediğiniz ve başka biçimlerde dışa aktardığınız sayfa.',
      'Tam yedek, evrenin her şeyini (kayıtlar, metinler, ilişkiler, geçmiş, görseller) tek dosyaya yazar ve hiçbir şey kaybetmeden geri getirilebilir. Markdown çıktısı ise okumak ya da Obsidian gibi programlarda açmak içindir. Google Drive bağlıysa program her gün kendiliğinden de yedek alır.',
    ],
    neZaman: 'Düzenli olarak (ör. haftada bir), büyük bir değişiklikten önce ya da evreni başka bir yere taşımak istediğinizde.',
    adimlar: [
      '“Dosyaya tam yedek” ile yedeği indirin ve güvenli bir yerde (bellek, başka bir disk) saklayın.',
      'Geri getirmek için Evrenler sayfasındaki “Yedekten geri yükle”yi kullanın.',
      'Okumak için Markdown çıktısı alabilirsiniz; her kayıt bir dosya olur.',
      '“Drive’daki yedekler” bölümünde kendiliğinden alınan yedekleri ve ne kadar süre saklanacaklarını görün.',
    ],
    ipuclari: [
      'Yedekten geri yükleme var olan evrene dokunmaz; yedek ayrı bir evren olarak açılır.',
      'Markdown çıktısı her şeyi içermez; kayıpsız taşımak için her zaman tam yedeği kullanın.',
    ],
  },

  // Görünümler
  cizelge: {
    baslik: 'Zaman çizelgesi',
    ne: [
      'Evren tarihi verilmiş bütün kayıtları (olaylar, doğumlar, sahneler…) zaman sırasıyla gösterir. Eserlere bağlı olmayan olaylar “Olaylar” şeridinde, her eserin sahneleri kendi şeridindedir; çağlar arka planda renkli bant olarak durur.',
      'Kesin tarihler nokta, aralıklar ve yaklaşık tarihler bant, “şundan önce / sonra” gibi tarihler ok olarak çizilir. Bir olaya göre verilmiş tarihler (ör. “savaştan üç yıl sonra”) kesik çizgili bantla gösterilir.',
    ],
    neZaman: 'Olayların sırasını görmek, aralarındaki boşlukları ya da çakışmaları fark etmek istediğinizde.',
    adimlar: [
      'Üstteki düğmelerle şeritleri açıp kapatın; kayıt türü ya da zaman akışı seçin.',
      'Alttaki özet çizgisinde sürükleyerek bir aralık seçin; çizelge o aralığa yakınlaşır. “Bütün zamanı göster” geri döndürür.',
      'Bir kayda basarak sayfasını açın.',
    ],
    ipuclari: [
      'Hiç kayıt olmayan uzun aralıklar “≈” işaretiyle kısaltılır; böylece yüzyıllar sonraki kalabalık bir yıl da okunur kalır. Kısaltma yalnız boşluktadır, hiçbir kaydın süresi kısalmaz.',
      '“Tarih defteri” aynı kayıtları yıl yıl alt alta gösterir; aynı eserde aynı tarihli sahneler tek kartta toplanır. Dar ekranda kendiliğinden bu görünüm gelir.',
      'Tarih vermek için bir kaydın sayfasındaki “Evren tarihi” alanını kullanın.',
      '“Sıralamaya yerleşmeyenler”, takvime çevrilemeyen ya da çelişen tarihleri gösterir; yazdığınız hâliyle dururlar.',
    ],
  },
  ag: {
    baslik: 'Ağ',
    ne: [
      'Bir kaydın ilişkilerini (aile, dostluk, üyelik, düşmanlık…) gösterir. Seçili kayıt ortada durur, doğrudan bağlıları ilk halkada, onların bağlıları dış halkada. İsterseniz bütün evrenin ağını da açabilirsiniz.',
      'Bağın türü yalnız renkle değil çizgi biçimi ve yazıyla da ayrılır: aile düz kalın, düşmanlık kesik, sahneler noktalı çizgidir.',
    ],
    neZaman: 'Bir karakterin kimlerle bağlantılı olduğunu ya da toplulukların birbirine nasıl bağlandığını görmek istediğinizde.',
    adimlar: [
      'Bir merkez kayıt seçin ya da “Bütün evren”i açın.',
      'Uzaklığı seçin: yalnızca doğrudan bağlılar, iki adım ya da üç adım.',
      'İsterseniz metindeki bağlantıları ve vazgeçilen kayıtları da gösterin.',
      'Bir kayda basıp “Merkeze al” ile ağı ondan yeniden çizin ya da “Kaydı aç” ile sayfasına gidin.',
    ],
    ipuclari: [
      'Üstteki bağ türü düğmeleri o türden bağları çizimden gizler ya da geri getirir.',
      'Sağdaki “Liste olarak” aynı bağları yazıyla verir; bir ada basınca o kayıt seçilir.',
      '“Tablo” kim kimin nesi olduğunu bir tabloda gösterir: hücrede satırdaki kaydın sütundakine ne olduğu yazar. Bir hücreye basınca bağın ayrıntısı açılır. Çok kişili evrenlerde çizimden kolay okunur.',
    ],
  },
  soy: {
    baslik: 'Soy ağacı',
    ne: [
      'Ebeveyn, eş ve kardeş ilişkilerinden bir ailenin soy ağacını çizer. Evlatlık, evlilik dışı, siyasi evlilik ve soy içi evlilik ayrı çizgilerle gösterilir.',
    ],
    neZaman: 'Bir hanedanın ya da ailenin kuşaklarını görmek istediğinizde.',
    adimlar: [
      '“Kimin ailesi?” kutusundan bir kayıt seçin.',
      'Bir kayda basarak seçin; “Odağa al” ile ağacı ondan yeniden çizin.',
      'Kalabalık dalları “Dalı kapat” ile gizleyin, “Dalı aç” ile geri açın.',
    ],
    ipuclari: ['Ağaç, kayıt sayfalarındaki aile ilişkilerinden çizilir; yeni bir bağ eklemek için ilgili kaydın sayfasından ilişki ekleyin.', 'Büyük ailelerde çizgiler kesişebilir.'],
  },
  neden: {
    baslik: 'Neden–sonuç',
    ne: [
      'Olaylar arasındaki neden–sonuç bağlarını bir zincir olarak gösterir: “Maden kapandı → vergi düştü → maaş ödenemedi → garnizon dağıldı.”',
      'Yalnızca sizin açıkça kurduğunuz “yol açtı, kolaylaştırdı, engelledi, tepki olarak gerçekleşti” bağları çizilir. Aynı tarihte olmak neden bağı sayılmaz.',
    ],
    neZaman: 'Bir olayın neye yol açtığını ya da bir sonucun nereden geldiğini izlemek istediğinizde.',
    adimlar: [
      'Bir olay seçin.',
      'Uzaklığı seçerek kaç adım öteye kadar gösterileceğini belirleyin.',
      'Bağ eklemek için olayın kendi sayfasındaki ilişkileri kullanın.',
    ],
    ipuclari: ['Bir olayın tarihini değiştirmeyi düşünüyorsanız etki raporu, bu değişikliğin hangi olayları etkileyeceğini gösterir.'],
  },
  durumlar: {
    baslik: 'Durum geçmişi',
    ne: ['Bir özelliğin (unvan, ikamet, sahibi…) evrendeki bütün kayıtlarda zaman içinde aldığı değerleri şeritler hâlinde gösterir. Örneğin “Kral” unvanının yıllar içinde kimden kime geçtiğini görürsünüz.'],
    neZaman: 'Bir makamın, bir eşyanın ya da bir yerin el değiştirmesini izlemek istediğinizde.',
    adimlar: [
      'Üstten bir özellik seçin.',
      'İsterseniz bir tarih yazıp o tarihte kimde ne olduğuna bakın.',
    ],
    ipuclari: ['Değerler kayıt sayfalarındaki “Zamanla değişenler” bölümünden gelir.', '“Kayıtlı değer yok”, o tarihte bir değer olmadığı anlamına gelmez; yalnızca yazılmadığını gösterir.'],
  },
  yogunluk: {
    baslik: 'Yoğunluk ve boşluk',
    ne: [
      'Evrenin hangi dönemlerinde ve hangi yerlerinde çok şey olduğunu, hangilerinin boş kaldığını gösterir. Olay, sahne, kelime ve kayıt sayısı ayrı ayrı sayılabilir.',
      'Koyu renk yalnızca seçtiğiniz sayının çok olduğunu gösterir; bir denge ya da önem ölçüsü değildir.',
    ],
    neZaman: 'Hikâyenizin hangi dönemlerde yoğunlaştığını ya da haritanın hangi bölgelerine hiç değinmediğinizi görmek istediğinizde.',
    adimlar: [
      'Neyin sayılacağını (olay, sahne, kelime, kayıt) seçin.',
      'Başlangıç ve bitiş yılını, zaman adımını (yıl, on yıl, yüzyıl) seçin.',
      'İsterseniz bir eser, kayıt türü ya da harita seçin.',
      '“Sayımı göster”e basın; bir dilime basarak sayılan kayıtları görün.',
    ],
  },
  gokyuzu: {
    baslik: 'Gökyüzü',
    ne: [
      'Evreninizin aylarını, mevsimlerini ve gelgitlerini tanımlayıp herhangi bir tarihte gökyüzünün nasıl olduğunu hesaplatır: hangi ay dolunayda, hangi mevsim.',
      'Birden çok koşulun aynı güne denk geldiği tarihleri de arayabilirsiniz (ör. iki ayın birden dolunay olduğu kış geceleri).',
    ],
    neZaman: 'Bir sahnenin gecesinde ayın nasıl göründüğünü bilmek ya da önemli bir gök olayına uygun tarih aramak istediğinizde.',
    adimlar: [
      '“Gökyüzü tanımı”nda her ay için adını, dönemini (kaç günde bir dolunay olduğu) ve bilinen bir başlangıç tarihini girin.',
      'İsterseniz mevsimleri ve gelgit notlarını ekleyin, sonra “Tanımı kaydet”e basın.',
      '“Tarihteki gökyüzü” bölümüne bir tarih yazıp “Gökyüzünü göster”e basın.',
      '“Çakışma ara” ile bir tarih aralığında istediğiniz koşulların birlikte olduğu günleri bulun.',
    ],
    ipuclari: ['Tarihleri Takvim sayfasındaki ay adlarıyla yazın (ör. “12 Hasat 412”).'],
  },
  sozluk: {
    baslik: 'Sözlük denetimi',
    ne: [
      'Metinlerinizde belirli sözcüklerin geçtiği yerleri bulur. Örneğin döneme uymayan modern ifadeleri, sarayda kullanılması gereken hitapları ya da henüz icat edilmemiş bir teknolojinin adını yakalamak için kullanılır.',
      'Program yalnızca sizin yazdığınız sözcükleri arar; bir eşleşme hata değildir, yalnızca bakmanız için gösterilir.',
    ],
    neZaman: 'Bir bölümü bitirdikten sonra dil ve dönem tutarlılığını gözden geçirirken.',
    adimlar: [
      'Yeni bir sözlük oluşturun; adını ve türünü (yasaklı ifadeler, izinli hitaplar, teknoloji adları) seçin.',
      'Kapsamını seçin: bütün evren, bir eser, belli kayıt türleri ya da bir dönem.',
      'Aranacak sözcükleri ve sözcük öbeklerini girip kaydedin.',
      'Eşleşmeleri inceleyin; “Oraya git” ile metne gidin ya da “Bilerek bırakıldı” ile işaretleyin.',
    ],
  },
  sozlesme: {
    baslik: 'Anlatı sözleşmesi',
    ne: [
      'Anlatıyla ilgili bilinçli kararlarınızı madde madde yazdığınız sayfa. Örneğin “Büyü hiçbir zaman ayrıntısıyla anlatılmaz” ya da “Ölen karakter geri dönmez”.',
      'Evren maddeleri bütün eserlerde geçerlidir; bir eser kendi sayfasında bir maddeyi dışarıda bırakabilir. Maddeler yazarken size hatırlatılır.',
    ],
    neZaman: 'Bir esere başlarken ya da anlatı hakkında bir kural koyduğunuzda.',
    adimlar: [
      'Yeni bir madde yazın, türünü ve karar durumunu seçin.',
      'Kapsamını seçin: bütün evren ya da yalnızca belli eserler.',
      'İsterseniz maddeyi ilgili kayıtlara bağlayın; o kayıtlarla çalışırken madde hatırlatılır.',
    ],
    ipuclari: ['Madde eklemek tamamen isteğe bağlıdır; boş bir sözleşme eksik sayılmaz.'],
  },
  kosullar: {
    baslik: 'Sonuçtan koşullara',
    ne: [
      'Hikâyede bir yere belli bir sürede varılması gerekiyorsa, kayıtlı rotalardan bunu mümkün kılan yolculuk planlarını bulur. Örneğin “Elçi başkente en çok üç günde varmalı, dağ geçidi kapalı.”',
      'Program yeni bir yol ya da süre uydurmaz ve evrene bir şey yazmaz; yalnızca var olan rotalara bakar.',
    ],
    neZaman: 'Bir yolculuğun hikâyedeki zamanlamaya uyup uymadığını sınamak istediğinizde.',
    adimlar: [
      'Varılacak yeri ve en çok kaç günde varılması gerektiğini yazın.',
      'İsterseniz çıkış tarihini, koşulları (kış, atlı…) ve kullanılamayacak yolları ekleyin.',
      '“Planları bul”a basın.',
    ],
    ipuclari: ['Rotaları ve yolculuk sürelerini yer kayıtlarının sayfalarından ya da haritadan girersiniz.'],
  },
  kesif: {
    baslik: 'Keşif soruları',
    ne: [
      'Yazdığınız ilişki ve tarihlerden hikâye fikri çıkarabilecek olası durumları bulur. Örneğin aynı soruya farklı cevaplar veren iki kişinin hangi tarihlerde aynı yerde bulunabileceği ya da aynı şey üzerinde çelişen hak iddiaları olanlar.',
      'Sonuçlar olmuş şeyler değil, yalnızca olasılıklardır.',
    ],
    neZaman: 'Yeni sahne fikri ararken ya da karakterler arasında bir çatışma potansiyeli görmek istediğinizde.',
    adimlar: [
      'Bir soru şablonu seçin.',
      'Gerekirse ilgili soruyu seçip “Adayları göster”e basın.',
      'Beğendiğiniz bir adayı “Sahne fikri yap” ya da “Açık mesele yap” ile kaydedin.',
    ],
  },
  hatlar: {
    baslik: 'Kurgu hatları',
    ne: ['Hikâyenizdeki her olay örgüsünün (ör. “Taht kavgası”, “Elin’in intikamı”) hangi sahnelerde ilerlediğini sırasıyla gösterir.'],
    neZaman: 'Bir olay örgüsünün uzun süre unutulup unutulmadığını ya da nasıl ilerlediğini görmek istediğinizde.',
    adimlar: [
      'Kayıtlar sayfasında “Kurgu hattı” türünde bir kayıt oluşturun.',
      'Sahnelerin sayfasında “Bağlı olduğu kurgu hattı” ilişkisiyle sahneyi bu hatta bağlayın.',
      'Bu görünümde her hattın sahnelerini sırasıyla görün.',
    ],
  },
  orgu: {
    baslik: 'Olay örgüsü',
    ne: [
      'Bir eserin sahnelerini okuma sırasıyla yan yana dizer; altında seçtiğiniz izleri gösterir: dönüm noktaları, kurgu hatları, okur soruları (ipucu, yanıltmaca, açıklama), karakterler ve sahnelerin çalışma durumu.',
      'Yeni bir şey kaydetmez; bunların hepsi sahnelerin sayfalarında verdiğiniz bilgilerdir. Bir sahneyi sürükleyip başka yere bırakmak yalnızca okuma sırasını değiştirir, evrenin tarihini değiştirmez.',
    ],
    neZaman: 'Bir dönüm noktasını öne almak, iki hattın nerede kesiştiğini ya da bir sırrın hangi sahnede açıldığını aynı anda görmek istediğinizde.',
    adimlar: [
      'Bir eser seçin; sütunlar o eserin sahneleridir.',
      'Bir sahnenin adına tıklayın; altta ayrıntısı ve taşıma düğmeleri açılır. Sahneyi dönüm noktası olarak da buradan işaretleyebilirsiniz.',
      'Taşıdıktan sonra hangi ipucunun ya da açıklamanın yer değiştirdiği altta yazılır. Beğenmezseniz geri alabilirsiniz.',
    ],
  },
  matris: {
    baslik: 'Bölüm × kayıt',
    ne: [
      'Bir eserin bölümlerini ve kayıtlarını (karakterler, eşyalar, sırlar) bir tabloda karşılaştırır. Her hücre, o kaydın o bölümde kaç sahnede yer aldığını gösterir.',
      '“Görünüyor” sahnede bulunduğu, “konu oluyor” herhangi bir biçimde geçtiği sahnelerin sayısıdır.',
    ],
    neZaman: 'Bir karakterin uzun süre ortadan kaybolup kaybolmadığını ya da bir sırrın okura hangi bölümde açıklandığını görmek istediğinizde.',
    adimlar: [
      'Bir eser seçin.',
      'İsterseniz kayıt türünü süzün (ör. yalnızca karakterler).',
      'Tabloyu okuyun; bir satır bir kaydın bütün eser boyunca nerede durduğunu gösterir.',
    ],
  },
  gun: {
    baslik: 'Sıradan bir gün',
    ne: ['Seçtiğiniz bir yerde, belli bir dönemde ve toplumsal kesimde sıradan bir günün nasıl geçtiğini toplar: barınma, yemek, ulaşım, iş, ibadet, eğlence.'],
    neZaman: 'Bir sahneye gündelik hayat ayrıntısı katmak istediğinizde.',
    adimlar: [
      'Bir yer seçin; isterseniz dönem ve statü (ör. köylü, soylu) da seçin.',
      'Yerin ve onu kapsayan yerlerin (şehir, bölge, ülke) gündelik hayat kartları bir araya gelir.',
    ],
    ipuclari: ['Kartları yer sayfalarındaki “Gündelik hayat” bölümünden yazarsınız.'],
  },
  karsilastir: {
    baslik: 'Karşılaştırmalı okuma',
    ne: ['Birkaç kaydı yan yana sütunlarda okumanızı sağlar: üç şehrin yönetimi, iki kültürün ölüm anlayışı ya da bir karakterin farklı dönemleri. En çok altı sütun açılabilir.'],
    neZaman: 'Benzer şeyleri karşılaştırıp aralarındaki farkı ya da tutarsızlığı görmek istediğinizde.',
    adimlar: [
      '“Sütun ekle” ile kayıtları seçin; isterseniz her biri için bir tarih yazın.',
      '“Yan yana koy”a basın.',
    ],
    ipuclari: ['Aynı kaydı iki kez seçip farklı tarihler yazarsanız, bir karakterin iki dönemdeki hâlini karşılaştırabilirsiniz.'],
  },
  gezinti: {
    baslik: 'Gezintiler',
    ne: ['Kendi hazırladığınız kayıt dizileri, rehberli turlar gibi: “Başkentte bir gün”, “Savaşın özeti”. Adımları notlarıyla birlikte sırayla okursunuz.'],
    neZaman: 'Uzun bir aradan sonra evrene yeniden ısınmak ya da bir konuyu baştan sona hatırlamak istediğinizde.',
    adimlar: [
      'Yeni bir gezinti oluşturup ad verin.',
      'Kayıtları adım olarak ekleyin, sıralayın ve her adıma “burada neye bakılacak” notu yazın.',
      '“Gez”e basın; ileri geri ok tuşlarıyla adımlar arasında ilerleyin.',
    ],
  },
  pano: {
    baslik: 'Görsel panolar',
    ne: ['Eskizler, kıyafetler, armalar, mimari örnekler gibi görselleri bir arada topladığınız panolar. Görselin bir noktasına not yazabilir, iki tasarımı karşılaştırabilir, hangisinin güncel olduğunu işaretleyebilirsiniz.'],
    neZaman: 'Bir kültürün görsel dünyasını ya da bir karakterin görünüşünü toplu görmek istediğinizde.',
    adimlar: [
      'Yeni bir pano oluşturun.',
      'Görselleri kayıtların görsellerinden seçin ya da dosyadan ekleyin.',
      'Bir görsele başlık verin, “Güncel görünüm” ya da “Eski çizim” olarak işaretleyin.',
      'Görselin bir noktasına not eklemek için o noktaya basın.',
    ],
    ipuclari: ['Dosyadan eklenen görsel hiçbir kayda bağlanmaz.'],
  },
};
