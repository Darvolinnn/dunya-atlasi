// Yazarlık rehberi (K27): programla gelen, değiştirilemeyen konu metinleri. Kaynak:
// analiz/yazarlik-ve-roman-serisi-calisma-rehberi.md §B; o belge değişince bu dosya yeniden üretilir.
// Örnekler uydurma bir seriden gelir (Hatıra İmparatorluğu). Kullanıcının verisine bakmaz.

export interface YazarlikKonusu {
  no: number; baslik: string;
  ne: string[]; neden: string[]; gerekmez?: string[]; kucukAdim: string[];
  sorular?: string[]; ornek?: string[]; yaniltici?: string[]; takilirsaniz?: string[]; sonraki?: string[]; sinir?: string[];
}

export const YAZARLIK_KONULARI: YazarlikKonusu[] = [
  {
    "no": 1,
    "baslik": "İlk fikri yakalamak",
    "ne": [
      "Henüz biçimlenmemiş bir düşünceyi kaybetmeden kaydetmek. Bir görüntü, bir soru, bir cümle, bir ses olabilir."
    ],
    "neden": [
      "Fikirler çoğu zaman yanlış anda gelir. Kaydedilmeyen fikir kaybolur; kaydedilen fikir sonradan başka fikirlerle buluşur."
    ],
    "gerekmez": [
      "Fikriniz zaten bir sahne olarak kafanızdaysa doğrudan sahneyi yazın."
    ],
    "kucukAdim": [
      "Aklınıza ilk gelen şeyi, başlık koymadan, tek cümleyle not alın. Düzeltmeyin."
    ],
    "sorular": [
      "Bu fikirde sizi en çok ne meraklandırıyor?",
      "Bu bir kişi mi, bir yer mi, bir kural mı, bir olay mı, yoksa bir his mi?",
      "Bu fikirden vazgeçmeniz gerekse en son neyi bırakırdınız?"
    ],
    "ornek": [
      "\"Bir memur, arşivde kendi çocukluğuna ait bir anının resmî olarak silindiğini fark ediyor.\""
    ],
    "yaniltici": [
      "\"Epik bir fantastik seri, 5 kitap, karanlık ton, büyük savaşlar.\" Bu bir fikir değil, bir ambalaj tarifidir; içinde kimse bir şey yaşamıyor."
    ],
    "takilirsaniz": [
      "Hiç fikriniz yoksa bir hafta boyunca sizi kızdıran, şaşırtan ya da merak ettiren üç şeyi not alın. Bunlardan biri \"ya bu kural olsaydı?\" sorusuna dönüşebilir."
    ],
    "sonraki": [
      "Fikrin içinde kim etkileniyor? (Konu 5) · Fikir nerede bir çatışma doğuruyor? (Konu 4)"
    ],
    "sinir": [
      "Bazı yazarlar fikri yazmaya başlayınca bulur; not almadan doğrudan yazmak da bir yöntemdir."
    ]
  },
  {
    "no": 2,
    "baslik": "Hikâyenin çekirdeği (tek cümlelik özet)",
    "ne": [
      "Hikâyenin kim, ne ister, ne engel olur, ne tehlikede sorularına bir iki cümlelik cevabı. İngilizce yazarlık kitaplarında buna logline ya da premise denir; burada hikâye çekirdeği diyoruz."
    ],
    "neden": [
      "Uzun bir kitapta kaybolduğunuzda \"bu kitap neyin hikâyesiydi?\" sorusuna dönebileceğiniz bir pusula olur. Bir sahnenin gerekli olup olmadığını tartarken de işe yarar."
    ],
    "gerekmez": [
      "Keşfederek yazıyorsanız çekirdeği ilk taslaktan sonra yazmak daha kolaydır. Çok bakış açılı, birden çok merkezi olan romanlar tek cümleye sığmayabilir; o zaman her bakış açısı için ayrı bir cümle yazın."
    ],
    "kucukAdim": [
      "Şu kalıbı doldurun, kalıbı sonra atın: \"[Kişi], [istediği şey] için [engel] ile karşı karşıya kalır; başaramazsa [kaybedeceği şey].\""
    ],
    "sorular": [
      "Bu hikâyeyi başka benzer hikâyelerden ayıran durum ne?",
      "Okur kitap boyunca hangi sorunun cevabını merak edecek?",
      "Denge hangi olayla bozuluyor?"
    ],
    "ornek": [
      "\"Anıların vergi olarak toplandığı bir imparatorlukta genç bir arşiv memuru, kayıp kardeşinin izini sürerken devletin bir isyanın anısını halkın belleğinden sildiğini keşfeder; gerçeği açıklarsa kardeşini, susarsa kendini kaybedecektir.\""
    ],
    "yaniltici": [
      "\"Bu bir kimlik, bellek ve özgürlük hikâyesi.\" Bu tema (Konu 3) ve kimin ne yaptığını söylemiyor."
    ],
    "takilirsaniz": [
      "Çekirdek yazamıyorsanız iki şeyden biri eksiktir: ya kişi ya engel. Hangisinin daha bulanık olduğunu kendinize sorun ve oraya gidin (Konu 4 ya da 5)."
    ],
    "sonraki": [
      "Çatışma motoru (Konu 4) · İlk sahne (Konu 14)"
    ],
    "sinir": [
      "Çekirdek bir sözleşme değil, bir taslaktır. İlk taslaktan sonra değişmesi normaldir."
    ]
  },
  {
    "no": 3,
    "baslik": "Çekirdek, tema ve olay özeti farklı şeylerdir",
    "ne": [
      "Üç ayrı soru:",
      "Çekirdek · Soru: Kim, ne ister, ne engel olur? · Örnek (Hatıra İmparatorluğu): \"Arşiv memuru kayıp kardeşini ararken silinmiş isyanı bulur.\"",
      "Tema · Soru: Hikâye hangi meseleyi tartışıyor? · Örnek (Hatıra İmparatorluğu): \"Anılarımız alınırsa kimliğimiz korunur mu?\"",
      "Olay özeti · Soru: Sırasıyla ne oluyor? · Örnek (Hatıra İmparatorluğu): \"Yasak dosyayı bulur, kardeşinin izini sürer, Hafıza Divanı'yla karşılaşır.\""
    ],
    "neden": [
      "Üçünü aynı cümlede çözmeye çalışan yazar ya vaaz verir (\"bu kitap belleğin önemini anlatıyor\") ya da yalnızca olay sayar. Ayrı tutmak, sahnelerin temayı göstermesine izin verir."
    ],
    "gerekmez": [
      "Temanızı bilmiyorsanız sorun değildir. Tema çoğu zaman ilk taslaktan sonra fark edilir: \"Meğer hep bunu yazıyormuşum.\""
    ],
    "kucukAdim": [
      "Çekirdeğinizi yazdıysanız altına tek satır ekleyin: \"Bu hikâye şunu soruyor: …?\" Soru biçiminde yazın; cevap vermeyin."
    ],
    "ornek": [
      "Tema soru olarak: \"Bir halkı korumak için onun belleğini silmek meşru olabilir mi?\" Kitap iki tarafı da ciddiye alır."
    ],
    "yaniltici": [
      "Tema hüküm olarak: \"Devlet kötüdür.\" Bu durumda karşıt güç karikatürleşir (Konu 7)."
    ],
    "takilirsaniz": [
      "Temayı zorlamayın. Karakterin en zor kararını yazın (Konu 5); tema genellikle orada saklıdır."
    ],
    "sonraki": [
      "Karşıt güç (Konu 7) · Serinin büyük sorusu (Konu 10)"
    ],
    "sinir": [
      "Bazı türlerde (macera, komedi, polisiye) tema arka planda kalabilir; bu bir eksiklik değildir."
    ]
  },
  {
    "no": 4,
    "baslik": "Merkez çatışma ve çatışma motoru",
    "ne": [
      "Merkez çatışma, hikâyedeki en büyük karşıtlıktır. Çatışma motoru ise bu karşıtlığı sürekli yeniden üreten yapıdır: biri sorunu çözmeye çalıştıkça yeni sorunlar doğuran düzen."
    ],
    "neden": [
      "Tek bir olay (\"kral öldü\") birkaç bölüm taşır. Bir motor (\"veraset kuralı belirsiz ve üç aile de haklı\") bir seriyi taşır. Seri yazmak istiyorsanız motor, olaydan daha önemlidir."
    ],
    "gerekmez": [
      "Kısa öykülerde ve tek bir olay etrafında dönen romanlarda tek bir çatışma yeter."
    ],
    "kucukAdim": [
      "İki cümle yazın: \"[A] şunu istiyor: … [B] şunu istiyor: … İkisi aynı anda olamaz, çünkü …\""
    ],
    "sorular": [
      "Bu çatışmayı dünyanın hangi kurumu ya da kuralı sürekli üretiyor?",
      "Kim neyi kaybedebilir?",
      "Biri sorunu çözmeye çalışırsa hangi yeni sorun doğar?",
      "Çatışmanın türü ne: kişiye karşı kişi, topluma, kuruma, doğaya, bir kurala, kendi inancına karşı? Birkaçı birden olabilir."
    ],
    "ornek": [
      "\"Hafıza Divanı halkın acı anılarını vergi olarak topluyor ve iddiasına göre bu sayede şehirde savaş çıkmıyor. Anıları geri vermek savaşı geri getirebilir; vermemek insanları kimliksiz bırakıyor. Kim gerçeği açıklarsa ya kaosa ya da baskıya hizmet ediyor.\" Bu motor üç kitap boyunca yeni kararlar üretir."
    ],
    "yaniltici": [
      "\"Kötü imparator dünyayı ele geçirmek istiyor, kahraman onu durdurmalı.\" Tek bir kişi yenilince motor durur; ikinci kitap için yeni bir kötü gerekir."
    ],
    "takilirsaniz": [
      "Karşı tarafın da haklı olduğu bir yer bulun. Haklı karşıtlık motor üretir; haksız karşıtlık yalnızca engel üretir."
    ],
    "sonraki": [
      "Karakterin isteği (Konu 5) · Dünya kuralının bedeli (Konu 9)"
    ],
    "sinir": [
      "\"Çatışma\" her zaman kavga demek değildir. Sessiz bir aile romanında çatışma iki kardeşin bir evi farklı hatırlaması olabilir."
    ]
  },
  {
    "no": 5,
    "baslik": "Karakterin isteği, ihtiyacı ve bedeli",
    "ne": [
      "Davranış üreten üç soru:",
      "İstek: Karakter şu an ne istiyor? Gözle görülebilir bir hedef.",
      "İç gerilim: Bu isteğin altında hangi korku, ihtiyaç ya da yanlış inanç var?",
      "Bedel: Hedefe ulaşmak için neyi feda etmeye hazır, neyi değil?"
    ],
    "neden": [
      "Uzun bir biyografi (\"1. yaşında şuraya taşındı…\") karakteri tanıtır ama hareket ettirmez. İstek ve bedel ise her sahnede bir karar doğurur."
    ],
    "gerekmez": [
      "Yan karakterlerin çoğu için tek satırlık bir istek yeter. Her karakterin gizli bir yarası olması gerekmez."
    ],
    "kucukAdim": [
      "Ana karakteriniz için tek soruya cevap verin: \"Şu an, hikâyenin başında, en çok ne istiyor?\" Somut olsun: \"mutlu olmak\" değil, \"kardeşinin dosyasını bulmak\"."
    ],
    "sorular": [
      "Bu isteğin altında ne yatıyor? (korku, suçluluk, sevgi, öfke)",
      "Hangi varsayımı yanlış ya da eksik olabilir?",
      "Hangi sınırı aşmak istemiyor? Hangi olay onu bu sınıra zorlayacak?",
      "Başlangıçtaki hâli ile sondaki hâli arasında ne fark olabilir?"
    ],
    "ornek": [
      "Lale (arşiv memuru) kardeşi Deniz'in dosyasını bulmak istiyor (istek). Deniz kaybolduğu gece onunla kavga ettiği için kendini suçlu hissediyor (iç gerilim). Yanlış inancı: \"Devlet kayıtları yalan söylemez, yalnızca eksik olabilir.\" Sınırı: başkasının anısını çalmamak. Bedel: kitabın ortasında Deniz'e ulaşmak için bir yabancının anı dosyasını çalmak zorunda kalıyor."
    ],
    "yaniltici": [
      "\"Lale cesur, zeki ve inatçıdır; mavi gözleri vardır; çocukluğu zor geçmiştir.\" Bunlar sıfat; hiçbiri bir sahnede ne yapacağını söylemiyor."
    ],
    "takilirsaniz": [
      "İsteği bulamıyorsanız karakteri bir sahneye koyun ve ona bir şey verin, sonra elinden alın. Neyi geri almak için çabaladığına bakın."
    ],
    "sonraki": [
      "Karşıt güç (Konu 7) · İç ve dış çatışma (Konu 6)"
    ],
    "sinir": [
      "Karakter değişmek zorunda değildir. İnancını koruyup çevresini değiştiren, trajik biçimde kötüleşen ya da hiç değişmeyen karakterler de güçlü romanlar taşır."
    ]
  },
  {
    "no": 6,
    "baslik": "İç çatışma ve dış çatışma",
    "ne": [
      "Dış çatışma karakterle dünya arasındadır (dosyayı saklayan devlet). İç çatışma karakterin kendi içindedir (kardeşini bulma isteği ile kurallara bağlılığı)."
    ],
    "neden": [
      "İkisi aynı sahnede birbirini sıkıştırdığında sahne canlanır. Yalnızca dış çatışma macera üretir; yalnızca iç çatışma düşünce üretir; ikisi birlikte karar üretir."
    ],
    "gerekmez": [
      "Bazı türlerde (hafif macera, bazı polisiyeler) iç çatışma sade kalabilir."
    ],
    "kucukAdim": [
      "Ana karakteriniz için tek cümle: \"Dışarıdaki engel …; içindeki engel …\""
    ],
    "ornek": [
      "Dış: Arşivin gece kilitleri. İç: Lale kuralları çiğnerse annesinin ona öğrettiği tek şeyi, dürüstlüğü, kaybedecek. Sahne: Kilit açık bırakılmış; içeri girmek için tek yapması gereken yalan söylemek."
    ],
    "yaniltici": [
      "İç çatışma hiçbir sahnede karara dönüşmüyor, yalnızca iç sesle anlatılıyor: \"Lale bir kez daha ne yapması gerektiğini düşündü.\""
    ],
    "takilirsaniz": [
      "İç çatışmayı bulmak için \"Karakter neyi yaparsa kendinden utanır?\" diye sorun."
    ],
    "sonraki": [
      "Sahnede amaç–engel–sonuç (Konu 14) · Karakter ilişkileri (Konu 8)"
    ],
    "sinir": [
      "Her sahnede iki çatışmanın da bulunması gerekmez."
    ]
  },
  {
    "no": 7,
    "baslik": "Karşıt güç: kötü karakter şart değil",
    "ne": [
      "Karakterin isteğinin önünde duran güç. Bir kişi olabilir, ama bir kurum, bir kural, doğa, toplum, başka bir haklı insan ya da karakterin kendi inancı da olabilir."
    ],
    "neden": [
      "Karşıt gücün kendi mantığı varsa engeller tahmin edilemez ve adil olur. \"Kötü olduğu için kötülük yapan\" karşıt güç, okurun ilgisini çabuk kaybeder."
    ],
    "gerekmez": [
      "Karşıt güç doğaysa (fırtına, kıtlık) ona bir \"bakış açısı\" vermek gerekmez; ama kurallarını bilmek gerekir."
    ],
    "kucukAdim": [
      "Karşıt güç bir kişi ya da kurumsa tek soru: \"Neden kendini haklı görüyor?\""
    ],
    "sorular": [
      "Ne istiyor? Neyi kaybetmekten korkuyor?",
      "Hangi sınırı aşmaz?",
      "Ana karakterle ortak yanı ne?",
      "Ana karakterle aynı durumda olsa ne yapardı?"
    ],
    "ornek": [
      "Hafıza Divanı'nın başkâtibi Orhun, yirmi yıl önceki iç savaşta ailesini kaybetmiştir. Anı vergisinin acıyı azalttığına ve yeni bir savaşı önlediğine gerçekten inanır. Lale'nin kardeşini o silmiştir, çünkü Deniz isyancıların anılarını geri dağıtıyordu. Orhun'un sınırı: çocukların anılarına dokunmamak."
    ],
    "yaniltici": [
      "\"Orhun güç sarhoşu bir zalimdir ve Lale'den nefret eder.\" Neden nefret ettiği, neyi koruduğu yok."
    ],
    "takilirsaniz": [
      "Karşıt gücü hikâyenin kahramanı yapıp aynı olayları onun gözünden üç cümleyle anlatın."
    ],
    "sonraki": [
      "Çatışma motoru (Konu 4) · Sırlar (Konu 17)"
    ],
    "sinir": [
      "\"Kahraman\" ve \"karşıt güç\" ayrımı her romanda keskin değildir; çok bakış açılı romanlarda iki tarafın da hikâyesi anlatılabilir."
    ]
  },
  {
    "no": 8,
    "baslik": "Karakter ilişkileri ve çıkar çatışmaları",
    "ne": [
      "İki karakter arasındaki bağın geçmişi, iki tarafın beklentisi ve gerilim noktası."
    ],
    "neden": [
      "Romanın en akılda kalan sahneleri çoğu zaman iki kişinin arasında geçer. İlişkideki söylenmemiş bir şey, kitabın sonuna kadar gerilim taşıyabilir."
    ],
    "gerekmez": [
      "Her karakter çifti için değil; yalnızca hikâyeyi taşıyan iki üç ilişki için."
    ],
    "kucukAdim": [
      "En önemli ilişki için: \"A, B'den ne bekliyor? B, A'dan ne bekliyor? Bu iki beklenti nerede çatışıyor?\""
    ],
    "ornek": [
      "Lale ve Deniz: Lale, Deniz'in eve dönmesini ve \"her şeyin eskisi gibi olmasını\" bekliyor. Deniz, Lale'nin artık eskisi gibi olmadığını, yani isyancı olduğunu kabul etmesini bekliyor. Söylenmemiş şey: kavga ettikleri gece Deniz ona gerçeği söylemeye gelmişti."
    ],
    "yaniltici": [
      "\"Lale ve Deniz birbirini çok sever.\" Gerilim yok."
    ],
    "takilirsaniz": [
      "İki karakteri aynı odaya kapatıp ikisinin de birbirine söylemek istemediği tek bir cümleyi yazın."
    ],
    "sonraki": [
      "Sahne (Konu 14) · Kurgu hatları (Konu 15)"
    ],
    "sinir": [
      "İlişki ağını eksiksiz doldurmak hedef değildir."
    ]
  },
  {
    "no": 9,
    "baslik": "Dünyanın temel kuralı, bedeli ve sınırı",
    "ne": [
      "Dünyanızı farklı kılan kural (büyü, teknoloji, toplumsal düzen) ve bu kuralın bedeli, sınırı ve yan sonuçları."
    ],
    "neden": [
      "Bedeli olmayan bir güç her sorunu çözer ve gerilimi öldürür. Bedel ve sınır, karakterlere zor kararlar verdirir."
    ],
    "gerekmez": [
      "Gerçekçi bir dünyada geçen romanlarda kural zaten bilinen dünyadır. Yine de \"bu kasabada kim kimi tanır\" gibi toplumsal kurallar aynı işi görür."
    ],
    "kucukAdim": [
      "Üç satır: Kural: … Bedel: … Yapamadığı şey: …"
    ],
    "sorular": [
      "Bu kural kimin işine yarıyor, kimin canını yakıyor?",
      "Gündelik hayatta nasıl görünür (selamlaşma, ticaret, cezalar)?",
      "Bu kural kırılırsa ne olur?"
    ],
    "ornek": [
      "Kural: Anılar bir kâtibin dokunuşuyla bedenden alınıp mühürlü şişelerde saklanabilir.",
      "Bedel: Alınan anının etrafındaki duygular da silinir. Kayıp bir çocuğu unutan anne, neden üzgün olduğunu bilmeden üzgün kalır.",
      "Sınır: Anı geri verilebilir ama ancak alındığı kişiye; başkasına konursa yabancı bir rüya gibi kalır. Bu yüzden \"anıları halka geri vermek\", Divan'ın arşivindeki şişeleri sahiplerine dağıtmak demektir. Lale'nin bir yabancının anısını görmesi (aşağıda) onu yaşamak değil, rüya gibi izlemektir.",
      "Yan sonuç: Zenginler acı anılarını vergi diye gönüllü verir; yoksullar zorla verir. Anı kaçakçılığı bir yeraltı ekonomisidir."
    ],
    "yaniltici": [
      "\"Kâtipler anılarla her şeyi yapabilir.\" Sınır yok; her sorun bir kâtiple çözülür."
    ],
    "takilirsaniz": [
      "Kuralı bir sahnede bir karakterin başına getirin: \"Bugün vergi günü; Lale hangi anısını verecek?\""
    ],
    "sonraki": [
      "Dünya inşasını önceliklendirme (Konu 19) · Çatışma motoru (Konu 4)"
    ],
    "sinir": [
      "Bazı yazarlar büyüyü bilinçli olarak gizemli bırakır (\"yumuşak\" büyü). Bu durumda kurallar okura değil yalnızca size görünür olabilir, ya da hiç yazılmaz."
    ]
  },
  {
    "no": 10,
    "baslik": "Serinin büyük sorusu ve olası finali",
    "ne": [
      "Bir kitapta çözülmeyecek kadar büyük olan soru ve onun olası cevabı."
    ],
    "neden": [
      "Seriyi bir arada tutan şey aynı karakterler değil, aynı soruya farklı açılardan dönmektir. Büyük soru bilinirse her kitap ona bir parça katar; bilinmezse seri \"bir sonraki macera\"ya dönüşür."
    ],
    "gerekmez": [
      "Birbirinden bağımsız okunacak, aynı evrende geçen romanlar (antoloji tipi) için gerekmez. Tek kitap yazıyorsanız gerekmez."
    ],
    "kucukAdim": [
      "Tek soru: \"Seri boyunca okur hangi soruyu taşıyacak?\" Cevabı bilmiyorsanız iki olası cevap yazın."
    ],
    "sorular": [
      "Dört satırlık iskelet:",
      "Başlangıç dengesi: Seri başladığında dünya nasıl işliyor?",
      "İlk büyük kırılma: Hangi olay bu dengeyi geri dönülmez biçimde bozuyor?",
      "Orta evre: Hedef nasıl dönüşüyor? Karakterlerin istediği şey nasıl değişiyor?",
      "Son hesaplaşma / yeni denge: Serinin sonunda dünya nasıl?"
    ],
    "ornek": [
      "Büyük soru: İnsanların belleği siyasi ve ekonomik bir kaynağa dönüştüğünde özgürlük mümkün mü?",
      "Başlangıç dengesi: Anı vergisi barışı sağlıyor gibi görünüyor; bedelini yoksullar ödüyor.",
      "İlk kırılma: Lale silinmiş isyanın anılarını bulup kardeşi aracılığıyla halka ulaştırıyor (1. kitabın sonu).",
      "Orta evre: İsyan büyüyor; Lale artık kardeşini değil, geri verilen anıların doğurduğu öfkeyi yönetmek zorunda (2. kitap).",
      "Olası final A: Anı vergisi kaldırılır; şehir uzun bir hesaplaşma dönemine girer. Olası final B: Lale vergiyi kaldırmak yerine onu halka devreder: herkes neyi unutacağına kendi karar verir. Henüz karar verilmedi."
    ],
    "yaniltici": [
      "\"1. kitap: kardeşini bulur. 2. kitap: isyan. 3. kitap: büyük savaş.\" Bunlar olaylar; büyük soru yok, dolayısıyla neden bu üç kitabın aynı seride olduğu belli değil."
    ],
    "takilirsaniz": [
      "Finali değil son görüntüyü düşünün: son sayfada Lale nerede, ne yapıyor? Görüntüden geriye doğru gidin."
    ],
    "sonraki": [
      "Kitapların ayrı görevleri (Konu 11) · Sırlar ve karşılıklar (Konu 17)"
    ],
    "sinir": [
      "Final değişebilir ve değişmesi normaldir. Birçok seri yazarı ikinci kitabın ortasında finalini değiştirir."
    ]
  },
  {
    "no": 11,
    "baslik": "Kitapların ayrı görevleri",
    "ne": [
      "Serinin her kitabının kendi sorusu, kendi doruk noktası ve kendi kapanışı."
    ],
    "neden": [
      "Her kitap tek başına bir okuma deneyimi olmalı. Bütün yükü son kitaba bırakmak, ilk kitabı uzun bir ön söze çevirir."
    ],
    "gerekmez": [
      "Tek bir uzun romanı bölümlere ayırarak yayımlıyorsanız (bir kitabın üç cildi) her cildin ayrı bir kapanışa ihtiyacı yoktur; ama yine de bir duraklama noktası gerekir."
    ],
    "kucukAdim": [
      "Her kitap için tek satır: \"Bu kitabın sonunda ne çözülüyor, ne açık kalıyor?\""
    ],
    "sorular": [
      "Her kitap için:",
      "Bu kitabın merkez sorusu ne?",
      "Tetikleyici olay ne?",
      "Doruk noktası ne?",
      "Okur hangi sırrı bu kitapta öğreniyor?",
      "Serinin büyük sorusu bu kitapta nasıl değişiyor?"
    ],
    "ornek": [
      "Kitap: I — Unutulanlar · Merkez sorusu: Deniz'e ne oldu? · Kapanan: Deniz yaşıyor; isyancılarla. Anısını Orhun silmiş. · Açık kalan: Silinen isyanın ne olduğu",
      "Kitap: II — Hatırlayanlar · Merkez sorusu: Geri verilen anılar halka ne yapacak? · Kapanan: İsyanın yönü ve Lale'nin sorumluluğu belirleniyor · Açık kalan: Vergi yerine ne kurulacak",
      "Kitap: III — Son Hatıra · Merkez sorusu: Bellek kimin olmalı? · Kapanan: Serinin büyük sorusu somut bir karara bağlanıyor · Açık kalan: İsteğe göre bilinçli bir açık uç"
    ],
    "yaniltici": [
      "I. kitabın sonunda Deniz'in ne olduğu da açıklanmıyor; \"ikinci kitapta öğreneceksiniz\" deniyor. Okur kendini aldatılmış hisseder."
    ],
    "takilirsaniz": [
      "Her kitabın son sahnesini birer cümleyle yazın. Kapanış eksikse orada görünür."
    ],
    "sonraki": [
      "İlk kitabın dönüm noktaları (Konu 12) · Okuma sırası (Konu 18)"
    ],
    "sinir": [
      "Bazı seriler bilinçli olarak kitaptan kitaba asılı biter (gerilim romanlarında yaygın). Bu bir seçimdir; bilerek yapıldığında işe yarar."
    ]
  },
  {
    "no": 12,
    "baslik": "İlk kitabın dönüm noktaları",
    "ne": [
      "Kitabın büyük omurgasını oluşturan beş on olay. Sahnelerden önce gelen iskelet."
    ],
    "neden": [
      "Yüzlerce sahne yazmadan önce kitabın nereden nereye gittiğini görmenizi sağlar. Dönüm noktaları belliyse arada yazılan sahneler yolunu bulur."
    ],
    "gerekmez": [
      "Keşfederek yazıyorsanız dönüm noktalarını ilk taslaktan sonra, revizyon için çıkarın (Konu 21)."
    ],
    "kucukAdim": [
      "Yalnızca üç nokta yazın: başlangıç, orta (her şeyin değiştiği an) ve son."
    ],
    "sorular": [
      "Sık kullanılan sekiz durak (hepsi isteğe bağlıdır):",
      "Açılış durumu: Karakterin gündelik hayatı ve temel gerilimi.",
      "Tetikleyici olay: Dengeyi bozan şey.",
      "İlk önemli seçim: Karakter artık seyirci kalamıyor.",
      "İlk başarısızlık ya da yanlış başarı: Sorun sanıldığından farklı çıkıyor.",
      "Orta noktada değişim: Yeni bilgi, yeni yön ya da yeni bedel.",
      "Krizin derinleşmesi: Seçenekler daralıyor.",
      "Doruk noktası: En önemli karşılaşma ya da karar.",
      "Sonuç: Bu kitaptaki değişim ve varsa sonraki kitaba kalan soru.",
      "Bunlar üç perdeli yapının, dört bölümlü yapının ve benzer yöntemlerin ortak paydasıdır. Bir yöntemi tam olarak izlemek gerekmez."
    ],
    "ornek": [
      "Lale vergi gününde kendi anısını teslim ederken Deniz'in adını kayıtlarda bulamaz.",
      "Gece vardiyasında Deniz'in silinmiş dosyasının mühür izini bulur.",
      "Kuralı çiğneyip mühürlü şişeyi kaçırır.",
      "Şişede Deniz'in değil, bir yabancının anısı vardır: silinmiş bir isyan.",
      "Orta nokta: Lale kendi çocukluk anılarından birinin de silinmiş olduğunu fark eder: o isyanda annesi oradaydı.",
      "Orhun arşive gece denetimi getirir; Lale'nin yardımcısı yakalanır.",
      "Lale Deniz'i isyancıların arasında bulur; Deniz arşivdeki isyan şişelerini sahiplerine geri dağıtmak ister, Lale ise yalnızca kardeşini kurtarmak.",
      "Lale arşivin mühür defterini isyancılara verir; şişeler sahiplerini bulmaya başlar. Deniz'i kurtarır ama artık devletin aradığı kişidir."
    ],
    "yaniltici": [
      "Sekiz durak sırayla dolduruldu ama karakter hiçbirinde karar vermiyor; olaylar yalnızca başına geliyor (Konu 13)."
    ],
    "takilirsaniz": [
      "Ortadan başlayın. Orta noktadaki değişim çoğu zaman kitabın kalbidir; başını ve sonunu ondan türetin."
    ],
    "sonraki": [
      "Nedensellik (Konu 13) · Sahne (Konu 14)"
    ],
    "sinir": [
      "Edebi romanlarda, deneysel yapılarda ve bazı aile romanlarında dramatik yükseliş beklenmez. Durakları zorlamayın."
    ]
  },
  {
    "no": 13,
    "baslik": "Olaylar arası nedensellik",
    "ne": [
      "\"A oldu, sonra B oldu\" yerine \"A yüzünden B oldu\" ya da \"A, B'yi imkânsız kıldı\"."
    ],
    "neden": [
      "Neden–sonuç zinciri okura \"bu hikâye bir yere gidiyor\" duygusu verir. Olaylar yalnızca art arda gelirse rastlantı gibi görünür."
    ],
    "gerekmez": [
      "Yapısı bilinçli olarak parçalı ya da rastlantıya dayalı romanlarda."
    ],
    "kucukAdim": [
      "Dönüm noktalarınızın arasına \"bu yüzden\" ya da \"ama\" yazın. \"Ve sonra\" yazmak zorunda kaldığınız yer zayıf halkadır."
    ],
    "ornek": [
      "Lale şişeyi kaçırdı → bu yüzden Orhun gece denetimi getirdi → bu yüzden yardımcısı yakalandı → ama yakalanan yardımcı Deniz'in yerini biliyordu → bu yüzden Lale ondan önce davranmak zorunda."
    ],
    "yaniltici": [
      "Lale şişeyi kaçırdı. Sonra şehirde bir yangın çıktı. Sonra Deniz'le karşılaştı. Yangın hiçbir şeye bağlı değil."
    ],
    "takilirsaniz": [
      "Zincirdeki boş halkada karakterin bir kararı eksiktir. \"Bu noktada karakter ne seçti?\" diye sorun."
    ],
    "sonraki": [
      "Sahne (Konu 14) · Revizyon (Konu 21)"
    ],
    "sinir": [
      "Nedensellik denetimi bir rehber sorusudur, hüküm değildir."
    ]
  },
  {
    "no": 14,
    "baslik": "Sahnede amaç, engel, sonuç",
    "ne": [
      "Çoğu işleyen sahnenin üç parçası vardır: Kim ne istiyor? Ne engel oluyor? Sahne sonunda ne değişti?"
    ],
    "neden": [
      "Sahnenin neden orada olduğunu bilirseniz uzunluğunu, nerede başlayıp nerede bitmesi gerektiğini de bilirsiniz."
    ],
    "gerekmez": [
      "Atmosfer, ritim, gözlem, nefes alma ya da komedi sahneleri başka işlere hizmet eder. Bir sahnede \"değişim\" olmak zorunda değildir; ama sahnenin ne işe yaradığını bilmek her zaman yardımcı olur."
    ],
    "kucukAdim": [
      "Yazmaya başlamadan iki dakika: üç soruya birer satır. Cevaplayamıyorsanız yine de yazmaya başlayın; cevap yazarken çıkabilir."
    ],
    "sorular": [
      "Sahne kimin gözünden? Neden onun?",
      "Sahnenin sonunda okur neyi biliyor ki başında bilmiyordu?",
      "Hangi bilgi okurdan saklanıyor?",
      "Bir önceki sahne bu sahneyi nasıl mümkün kıldı?"
    ],
    "ornek": [
      "Yer: Başkent arşivi, vergi günü.",
      "Amaç: Lale, Deniz'le ilgili bir kayıt bulmak istiyor.",
      "Engel: Dosya resmî kayıtlardan silinmiş.",
      "Değişim: Lale kendi çocukluğuna ait bir anının da eksik olduğunu fark ediyor.",
      "Okur öğreniyor: Devlet arşivinde anı silme uygulaması var.",
      "Sonraki sahne için olasılık: Dosyayı silen kâtibin izini sürmek."
    ],
    "yaniltici": [
      "\"Lale arşive gider. Etrafı tarif edilir. Bir arkadaşıyla konuşur. Eve döner.\" Hiçbir şey değişmiyor, hiçbir şey istenmiyor."
    ],
    "takilirsaniz": [
      "Sahneyi karşı tarafın gözünden bir paragrafla yazın. Engel netleşir."
    ],
    "sonraki": [
      "Kurgu hatları (Konu 15) · Bakış açısı (Konu 16)"
    ],
    "sinir": [
      "\"Her sahne bir değişim içermeli\" kuralı birçok yazarlık kitabında geçer ama bir kural değil, bir sınama sorusudur."
    ]
  },
  {
    "no": 15,
    "baslik": "Kurgu hatları ve alt olay örgüleri",
    "ne": [
      "Birçok sahne (ve kitap) boyunca ilerleyen bir mesele: bir gizem, bir ilişki, bir siyasi mücadele, bir hedef."
    ],
    "neden": [
      "Uzun romanda bir meseleyi unutmak kolaydır. Hat, \"bu konu en son ne zaman ilerledi?\" sorusunu cevaplar."
    ],
    "gerekmez": [
      "Tek hatlı kısa romanlarda."
    ],
    "kucukAdim": [
      "Kitabınızdaki üç meseleyi adlandırın: ana hat ve iki yan hat."
    ],
    "sorular": [
      "Her hat için: merkez sorusu, kapsadığı karakterler, başlangıcı, dönüm noktaları, şu anki durumu, olası karşılığı."
    ],
    "ornek": [
      "Ana hat — Deniz'in izi: Deniz nerede? (I. kitapta kapanıyor)",
      "Yan hat — Silinmiş isyan: O gece ne oldu? (I'de açılıyor, II'de cevaplanıyor)",
      "Yan hat — Lale ile Orhun: Orhun Lale'nin annesini tanıyor muydu? (üç kitaba yayılıyor)"
    ],
    "yaniltici": [
      "Her karaktere ayrı bir \"hat\" açıp yirmi hat kurmak. Hat sayısı bir başarı ölçüsü değildir."
    ],
    "takilirsaniz": [
      "Bir hat uzun süredir ilerlemiyorsa iki seçenek var: bir sahnede ona dokunun ya da hattı bilinçli olarak askıya alın. İkisi de geçerli."
    ],
    "sonraki": [
      "Sırlar ve karşılıklar (Konu 17) · Devam kitabı (Konu 22)"
    ],
    "sinir": [
      "Hatlar her zaman kapanmak zorunda değildir; bilinçli belirsizlik de bir sonuçtur."
    ]
  },
  {
    "no": 16,
    "baslik": "Bakış açısı, anlatıcı ve okurun bilgisi",
    "ne": [
      "Sahneyi kimin gözünden gördüğümüz (bakış açısı), kimin anlattığı (anlatıcı), sahnenin kimin etrafında döndüğü (odak karakter) ve okurun ne bildiği ayrı şeylerdir."
    ],
    "neden": [
      "Gerilim çoğu zaman bilgi farkından doğar: okur bir şey bilir, karakter bilmez (ya da tersi). Bu farkı bilerek kurmak, gizemi ve dramatik ironiyi yönetmenizi sağlar."
    ],
    "gerekmez": [
      "Tek bakış açılı, olayları sırayla anlatan romanlarda ayrıntılı takibe gerek yoktur."
    ],
    "kucukAdim": [
      "Her sahne için tek kelime: \"Kimin gözünden?\""
    ],
    "sorular": [
      "Bu karakter bu anda neyi biliyor, neyi yanlış biliyor?",
      "Okur bu anda ondan fazlasını mı biliyor?",
      "Anlatıcı güvenilir mi? (Güvenilmez anlatıcı evrenin gerçeğini değiştirmez; yalnızca onun anlatısını değiştirir.)"
    ],
    "ornek": [
      "II. kitapta Orhun'un bakış açısından bir sahne: okur, Orhun'un Lale'nin annesini tanıdığını öğrenir. Lale bunu bilmiyor. Sonraki Lale sahnelerinde okur, Lale'nin Orhun'a güvendiği her anı gerilimle okur."
    ],
    "yaniltici": [
      "Bakış açısı aynı sahnede habersizce kişiden kişiye atlıyor; okur kimin ne bildiğini kaybediyor."
    ],
    "takilirsaniz": [
      "Önemli bir sırrı seçin ve üç sütun yazın: Lale biliyor mu? Orhun biliyor mu? Okur biliyor mu? Her bölüm için."
    ],
    "sonraki": [
      "Sırlar (Konu 17) · Okuma sırası (Konu 18)"
    ],
    "sinir": [
      "Her bilgi parçasını takip etmek gerekmez; yalnızca önemli sırları izleyin."
    ]
  },
  {
    "no": 17,
    "baslik": "Sırlar, hazırlık ve karşılık",
    "ne": [
      "Hazırlık (ipucu), okurun ileride anlam kazanacak bir şeyi görmesidir. Karşılık, o şeyin anlamının ortaya çıkmasıdır. İngilizce yazarlıkta foreshadowing ve payoff denir."
    ],
    "neden": [
      "Karşılığı verilmiş bir hazırlık okura \"yazar her şeyi düşünmüş\" duygusunu verir. Karşılığı verilmemiş bir hazırlık ise bir söz gibidir; tutulmazsa okur fark eder."
    ],
    "gerekmez": [
      "Her ayrıntının bir karşılığı olmak zorunda değildir; dünya hissi için konmuş ayrıntılar da vardır."
    ],
    "kucukAdim": [
      "Kitabınızda sakladığınız en büyük sırrı yazın. Okurun bunu tahmin edebilmesi için daha önce gördüğü bir şey var mı?"
    ],
    "ornek": [
      "I. kitabın 1. sahnesinde Lale'nin annesinin elinde mührü kırık bir şişe vardır; Lale bunu bir hatıra eşyası sanır (hazırlık). II. kitapta bu şişenin silinmiş isyanın ilk anısı olduğu ortaya çıkar (karşılık)."
    ],
    "yaniltici": [
      "Doruk noktasında Lale'nin daha önce hiç bahsedilmeyen bir yeteneği ortaya çıkıyor ve sorunu çözüyor. Hazırlık yok; okur hile yapıldığını hisseder."
    ],
    "takilirsaniz": [
      "Karşılıktan geriye gidin: doruk noktasında ne ortaya çıkıyorsa onun bir iz bıraktığı üç yer bulun."
    ],
    "sonraki": [
      "Okuma sırası (Konu 18) · Devam kitabı (Konu 22)"
    ],
    "sinir": [
      "Çok fazla ipucu sırrı açık eder; çok az ipucu sürprizi haksız kılar. Dengeyi program söyleyemez; ilk okurlar söyler."
    ]
  },
  {
    "no": 18,
    "baslik": "Okuma sırası ile kronoloji farkı",
    "ne": [
      "Okurun olayları öğrendiği sıra ile olayların evrende gerçekleştiği sıra farklı olabilir: geçmişe dönüşler, öncül romanlar, paralel zamanlı kitaplar."
    ],
    "neden": [
      "Bu farkı bilinçli kullanırsanız gizem kurarsınız. Bilinçsizce karıştırırsanız tutarsızlık doğar: bir karakter henüz yaşanmamış bir olaydan söz eder."
    ],
    "gerekmez": [
      "Olayları sırayla anlatan tek kitaplık romanlarda."
    ],
    "kucukAdim": [
      "Geçmişe dönüş sahneleriniz için ayrı tarih girin. Sahnenin bölümdeki yeri ile evren tarihini karıştırmayın."
    ],
    "ornek": [
      "Seri bittikten sonra Hatıra İmparatorluğu için bir öncül novella: İlk Vergi, anı vergisinin kurulduğu yılları anlatıyor. Evren kronolojisinde en başta, yayın sırasında en sonda. Novellayı önce okuyan biri için Orhun'un geçmişi sır değildir; seriyi önce okuyan için II. kitaba kadar sırdır."
    ],
    "yaniltici": [
      "\"Okur 1. kitapta bunu öğrendi, demek ki herkes biliyor.\" Öncülü önce okuyan okur için durum farklıdır."
    ],
    "takilirsaniz": [
      "Zaman çizelgesi görünümünü açıp sahneleri evren tarihine göre görün; sonra eser ağacında okuma sırasına göre. İki listeyi yan yana koymak çoğu karışıklığı çözer."
    ],
    "sonraki": [
      "Sırlar (Konu 17) · Devam kitabı (Konu 22)"
    ],
    "sinir": [
      "Karmaşık okuma sıraları okuru yorabilir; bilerek ve az kullanın."
    ]
  },
  {
    "no": 19,
    "baslik": "Dünya inşasını önceliklendirmek",
    "ne": [
      "Dünya bilgisini üç kümeye ayırmak:",
      "Şimdi gerekli: İlk kitabın olaylarını tutarlı yazmak için bilinmesi gerekenler.",
      "Sonra gerekebilir: İleriki kitaplar ya da genel tutarlılık için.",
      "Merak alanı: Keyif için kurduğunuz ayrıntılar."
    ],
    "neden": [
      "Dünya kurmak keyiflidir ve sonsuzdur; yazmayı erteletebilir. Önceliklendirme, keyfi korurken taslağın ilerlemesini sağlar."
    ],
    "gerekmez": [
      "Dünya kurmanın kendisi amacınızsa (roman yazmadan bir evren kurmak) bu ayrıma gerek yoktur. O da meşru bir uğraştır."
    ],
    "kucukAdim": [
      "Yazdığınız sahnede \"bunu bilmeden devam edemiyorum\" dediğiniz tek şeyi bulun. Yalnızca onu kurun."
    ],
    "sorular": [
      "Bu olayın gerçekleşebilmesi için hangi siyasi kural bilinmeli?",
      "Karakterin kaçması için hangi yol, sınır önemli?",
      "Hangi bilgiyi sizin bilmeniz şart, hangisini okurdan saklayabilirsiniz?"
    ],
    "ornek": [
      "Şimdi: Anı vergisinin nasıl alındığı, arşivin düzeni, Hafıza Divanı'nın yetkisi.",
      "Sonra: İsyanın tam tarihi, komşu ülkelerin anı vergisine bakışı.",
      "Merak: Kâtip loncasının kuruluş efsanesi, mühür şişelerinin cam ustaları."
    ],
    "yaniltici": [
      "İlk sahneyi yazmadan önce on iki eyaletin hanedan ağacını, para sistemini ve dilini kurmak."
    ],
    "takilirsaniz": [
      "Bir sayfa dünya bilgisi yazdıktan sonra kendinize sorun: \"Bunu hangi sahnede kullanacağım?\" Cevap yoksa merak alanına koyup yazmaya dönün."
    ],
    "sonraki": [
      "İlk taslak (Konu 20) · Dünyanın kuralı (Konu 9)"
    ],
    "sinir": [
      "Bazı yazarlar için dünyayı önce kurmak yazmanın kendisidir. Bu rehber bunu yanlış saymaz; yalnızca yazmayı engellemesin diye bir araç sunar."
    ]
  },
  {
    "no": 20,
    "baslik": "İlk taslak ve keşfederek yazmak",
    "ne": [
      "İlk taslak, kitabın var olduğunu kanıtlayan kaba sürümdür. Keşfederek yazmak (discovery writing), planı yazarken bulmaktır."
    ],
    "neden": [
      "Düzeltilecek bir taslak, kusursuz bir plandan değerlidir. Birçok yazar ne yazdığını ancak yazınca anlar."
    ],
    "kucukAdim": [
      "Bugün bir sahnenin tamamını yazın, düzeltmeden. Bilmediğiniz şeyleri köşeli parantezle bırakın: \"[şehrin adı]\", \"[burada bir kavga olacak]\"."
    ],
    "sorular": [
      "Günlük ya da haftalık küçük bir hedef koyun (sahne sayısı ya da süre; kelime sayısı herkese uymaz).",
      "Takıldığınız sahneyi atlayıp sonrakini yazmak serbesttir.",
      "Taslak sırasında fark ettiğiniz değişiklikleri geri dönüp düzeltmek yerine not alın: \"Buradan sonra Orhun'un kız kardeşi var sayıyorum.\""
    ],
    "ornek": [
      "Lale'nin Deniz'i bulduğu sahneyi yazarken Deniz'in isyancı olduğunu yazarken fark ettiniz; planınızda yoktu. Notu alıp devam ediyorsunuz: \"Deniz isyancı; I. kitabın 3. bölümüne ipucu ekle.\" Revizyonda ekliyorsunuz."
    ],
    "yaniltici": [
      "Her yeni fikirde başa dönüp ilk bölümü yeniden yazmak. Taslak hiç bitmez."
    ],
    "takilirsaniz": [
      "Yazamıyorsanız sahneyi diyalog olarak yazın, sadece konuşmalar. Ya da sahnenin en kötü olası sürümünü bilerek yazın."
    ],
    "sonraki": [
      "Revizyon (Konu 21) · Ara verip geri dönme (Konu 23)"
    ],
    "sinir": [
      "Bazı yazarlar ancak cümleyi düzelterek ilerleyebilir; \"önce kaba taslak\" herkese uymaz."
    ]
  },
  {
    "no": 21,
    "baslik": "Revizyon ve sürüm karşılaştırma",
    "ne": [
      "Yazılmış metni farklı gözlerle yeniden okumak. Beş katman vardır; her turda birine odaklanmak işi kolaylaştırır:",
      "Büyük yapı: Merkez çatışma, nedensellik, dönüm noktaları.",
      "Karakter: İstekler anlaşılır mı, kararların sonucu var mı, sesler ayrı mı?",
      "Dünya tutarlılığı: Tarih, mekân, kim neyi ne zaman biliyor, kuralların sınırları.",
      "Sahne düzeyi: Sahne işlevi, tempo, tekrar, giriş ve çıkış.",
      "Cümle düzeyi: Dil, ritim, açıklama yükü, imla."
    ],
    "neden": [
      "Her şeyi aynı anda düzeltmeye çalışmak yorar ve büyük sorunları cümle cilasının altında saklar. Büyükten küçüğe gitmek, cilaladığınız sahneyi sonra silmenizi önler."
    ],
    "kucukAdim": [
      "İlk taslağı bitirince bir sayfaya şunu yazın: \"Bu kitap aslında neyin hikâyesi çıktı?\" Planla karşılaştırın."
    ],
    "ornek": [
      "tur (yapı): Orta noktadaki keşfin (Lale'nin annesi) daha önce hiç hazırlanmadığını fark ediyorsunuz → 1. sahneye kırık mühürlü şişeyi ekliyorsunuz. 2. tur (dünya): Tutarlılık denetimi, Deniz'in 5. bölümde arşivde bulunduğunu ama aynı tarihte şehir dışında olduğunu söylüyor → birini düzeltiyorsunuz."
    ],
    "yaniltici": [
      "Yapı sorunları çözülmeden ilk bölümün cümlelerini on kez cilalamak."
    ],
    "takilirsaniz": [
      "Metni yazdırın ya da başka bir cihazda okuyun; yazdığınız yerden okumak hataları gizler."
    ],
    "sonraki": [
      "Devam kitabı (Konu 22) · Alternatif taslaklar (Konu 24)"
    ],
    "sinir": [
      "Revizyonun sonu yoktur; \"yeterince iyi\" kararını siz verirsiniz."
    ]
  },
  {
    "no": 22,
    "baslik": "Devam kitabına geçiş",
    "ne": [
      "Bir kitap bitince, seriye ne kaldığını görmek: açık hatlar, verilmiş ama tutulmamış sözler, değişen dünya."
    ],
    "neden": [
      "İkinci kitaba başlarken birinci kitabın ayrıntıları bellekten silinir. Bir \"devir kaydı\" bu kaybı önler."
    ],
    "gerekmez": [
      "Tek kitaplık projelerde."
    ],
    "kucukAdim": [
      "Dört başlık altına birer liste:",
      "Kapanmamış kurgu hatları.",
      "Karşılığı verilmemiş ipuçları.",
      "Kalıcı olarak değişen şeyler (ölümler, kırılan ilişkiler, yıkılan yerler).",
      "Yeni kitabın ilk doğal çatışması nereden doğabilir?"
    ],
    "ornek": [
      "Açık hat: Silinmiş isyanın asıl nedeni. Lale ile Orhun.",
      "Karşılığı bekleyen ipucu: annenin kırık şişesi.",
      "Değişen: Lale artık aranan bir kaçak; Deniz isyancıların lideri; anı dağıtımı başladı.",
      "İlk çatışma: Geri verilen anılar insanları barıştırmıyor, öfkelendiriyor. Lale bunun sorumluluğunu taşıyor mu?"
    ],
    "yaniltici": [
      "II. kitaba, I. kitabın olaylarını özetleyen otuz sayfalık bir girişle başlamak."
    ],
    "takilirsaniz": [
      "I. kitabın son sahnesini, II. kitabın ilk sahnesinin karakterinin gözünden yeniden yazın."
    ],
    "sonraki": [
      "Kitabın görevi (Konu 11) · Ara verip geri dönme (Konu 23)"
    ],
    "sinir": [
      "Her açık hat bir sonraki kitapta kapanmak zorunda değildir."
    ]
  },
  {
    "no": 23,
    "baslik": "Ara verip geri dönmek",
    "ne": [
      "Günler, haftalar ya da aylar sonra projeye dönerken nereden devam edeceğinizi bulmak."
    ],
    "neden": [
      "Uzun projelerde en büyük tehlike boş sayfa değil, \"nerede kalmıştım?\" sorusudur. Cevap hemen bulunmazsa proje sessizce bırakılır."
    ],
    "kucukAdim": [
      "Her çalışmanın sonunda bir cümlelik devam notu bırakın: \"Yarın: Deniz'le karşılaşma sahnesi; Lale'nin ona kızgınlığını göstermeye başla.\""
    ],
    "ornek": [
      "Üç ay sonra açtığınızda ekranda: \"Son çalışmanız: Unutulanlar, 3. bölüm, 'Arşivde karşılaşma'. Devam notunuz: 'Arşivcinin neden yardım ettiğini netleştir.'\" Bir tıkla sahneye dönüyorsunuz."
    ],
    "yaniltici": [
      "Not bırakmadan çıkmak; döndüğünüzde bütün kitabı baştan okumak zorunda kalmak."
    ],
    "takilirsaniz": [
      "Uzun bir aradan sonra yazmak yerine önce okuyun: yalnızca son iki sahneyi."
    ],
    "sonraki": [
      "İlk taslak (Konu 20) · Revizyon (Konu 21)"
    ]
  },
  {
    "no": 24,
    "baslik": "Çelişen fikirler ve alternatif taslaklar",
    "ne": [
      "Aynı soruya iki olası cevabınız varken ikisini de korumak ve sonra seçmek."
    ],
    "neden": [
      "Erken seçmek, daha iyi olan seçeneği kaybettirebilir. Hiç seçmemek ise taslağı durdurur. İkisini de kaydedip birini şimdilik seçmek, yazmayı sürdürmenizi sağlar."
    ],
    "gerekmez": [
      "Seçenekler arasındaki fark küçükse; hemen seçin."
    ],
    "kucukAdim": [
      "İki seçeneği yan yana yazın; birini \"şimdilik bununla yazıyorum\" diye işaretleyin."
    ],
    "ornek": [
      "Olası final A (vergi kaldırılır) ve B (vergi halka devredilir). İkisi de fikir durumunda olay kaydı. II. kitabın ortasında B'yi seçiyorsunuz: B kesinleşmiş, A vazgeçilmiş. A silinmez; bir gerekçe kaydı neden B'yi seçtiğinizi tutar: \"A, Lale'nin kararını küçültüyordu.\""
    ],
    "yaniltici": [
      "İki finalden ikisine de hazırlık yapıp ikisini de metne yerleştirmek; okur hangisinin geçerli olduğunu anlamaz."
    ],
    "takilirsaniz": [
      "Hangi seçeneğin daha zor bir karar doğurduğuna bakın. Zor karar genellikle daha iyi sahnedir."
    ],
    "sonraki": [
      "Serinin finali (Konu 10) · Revizyon (Konu 21)"
    ],
    "sinir": [
      "Bazı romanlar iki olasılığı bilinçli olarak açık bırakır."
    ]
  }
];
