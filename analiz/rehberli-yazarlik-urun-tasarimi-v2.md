# Rehberli yazarlık: ürün tasarımı (v2)

> **Belge türü:** Tasarım önerisi; bağlayıcı değil, kullanıcı onaylamadı, kod yazılmadı.
>
> **Bu belge neyi anlatır:** ekranlar, rehberden çalışmaya geçiş, paketler ve kullanıcı kararları. Kavramların ve veri davranışının **tek tanımı** [veri ve kavram modeli](roman-serisi-veri-ve-kavram-modeli.md)'ndedir (aşağıda "Model §n"). Senaryolar: [yaratıcı çalışma akışları v2](yaratici-calisma-akislari-v2.md). Değişiklik gerekçeleri: [revizyon analizi](rehberli-yazarlik-revizyon-analizi.md). İçerik kaynağı: [yazarlık rehberi](yazarlik-ve-roman-serisi-calisma-rehberi.md).
>
> Kaynak etiketleri Model'deki gibidir: **[main]**, **[#5]**, **[tasarım]**, **[öneri]**.

---

## 0. Özet

**Eksik olan:** Program yazara ne soracağını biliyor; cevapların bir roman ve seri **planına** nasıl dönüştüğünü göstermiyor.

**Çözümün üç katmanı:**

| Katman | Soru | Ne sunar |
|---|---|---|
| **Öğrenme** | Bu yazarlık işi nedir, neden, nasıl başlanır? | Yazarlık rehberi, "Neden?" ve "Örnek", rehberden ilgili ekrana bağlantı (§2) |
| **Planlama** | Fikirler, alternatifler, olay örgüsü, karakter gelişimi ve kitaplar arası süreklilik nasıl düzenlenir? | Seri sayfası (§5), olay örgüsü masası (§6), kitap sonunda açık olanlar (Model §7), karakterin kitaptaki yolu (Model §8) |
| **Üretim** | Plan sahneye, metne ve düzeltmeye nasıl bağlanır? | Plan sahnesi → metin, sahne planı paneli (§4), çalışma durumları (Model §9), Şimdi kartı (§3) |

**Yeni veri gerektirmeyenler:** rehber metinleri, "Neden?/Örnek", yeni soru setleri, olay örgüsü masasının ilk sürümü (var olan kayıt ve ilişkileri birleştirir), kitap sonunda açık olanlar.

**Yeni veri gerektirenler:** `seri` türü ve eserin ağaçta seri altına yerleşmesi; `alternatif` ve `eser_odagi` ilişkileri; ilişkiye soru bağlanabilmesi; etkin çalışma ayarı; çalışma durumu alanları.

## 1. İlk adımlar (K26'nın genişletilmesi)

K26 [#5] korunur: dört adım, Yaz sayfasının üstünde, zorunlu değil. Eklenen tek şey **yol seçimi** [öneri]. Adım durumları ve dayanakları Model §2'dedir.

```text
┌─ İlk adımlar ─────────────────────────────────────────── [Gizle] ─┐
│ Nasıl başlamak istersiniz?                                         │
│ (•) Bir sahneyle  ( ) Bir hikâye fikriyle  ( ) Bir karakterle      │
│ ( ) Bir dünyayla  ( ) Seri planıyla                                │
│                                                                    │
│  ✓ Bir eser oluşturun                                              │
│  ▸ İlk sahneyi ekleyin                         [Sahne ekle]  Geç   │
│  · Metinde bir kayda bağlanın                                      │
│  ◦ Sahneye tarih ya da mekân verin                 Geçildi         │
│                                                                    │
│  Bu adımlar neden? ›                                               │
└────────────────────────────────────────────────────────────────────┘
  ✓ yapıldı   ▸ sıradaki   · başlanmadı   ◦ geçildi (onay işareti yok)
```

| Yol | Adımlar (dayanaklar Model §2.1) |
|---|---|
| Bir sahneyle (varsayılan) | Eser · sahne · bağlantı · tarih/mekân |
| Bir hikâye fikriyle | Fikri not alın · nottan eser oluşturun · eserin çekirdeği · ilk sahne |
| Bir karakterle | Karakter · isteği · karşıt güç · karakterin bulunduğu ilk sahne |
| Bir dünyayla | Dünyanın kuralı · güç ve bedeli · bir yer · o yerle ilgili bir not ya da sahne |
| Seri planıyla | Seri oluşturun · serinin büyük sorusu · seriye ilk kitap · ilk sahne |

- "Bir hikâye fikriyle" artık `baslangic.1`'e bağlanmaz (Model §1 kural 1). İlk adım bir **not**tur; eser istenmez.
- "Seri planıyla" yolu, `seri` türü kodlanmadan görünmez.
- "Geç" her adımın yanında küçük bir bağlantıdır. Soruya bağlı adımda soruyu `sonra` yapar; değilse cihazda işaretler.

## 2. Rehberden çalışmaya geçiş

### 2.1 Rehber nerede

- Sayfa rehberinin yan panelinde (K25 [main]) "Yazarlık rehberi" bölümü ve sayfaya uygun konulara "Bu işi neden yapıyorum?" bağlantıları [öneri].
- Komut paletinde "Yazarlık rehberi" [öneri].
- Programla gelir, çevrimdışı açılır, evren verisine yazılmaz.
- Yazarken pencere açmaz; yalnız yan panelde açılır.

### 2.2 Her konunun sonunda "Uygulamada deneyin"

Rehberin her konusu dört tür eylemden birini sunar. Türü düğmenin yanında belli olur:

| Eylem türü | Veriyi değiştirir mi | Örnek |
|---|---|---|
| **Açıklama göster** | Hayır | "Örnek: Lale'nin isteği" |
| **İlgili kaydı aç** | Hayır | "Açık sahnenin planına git" |
| **Yeni kayıt oluştur** | Yalnız kullanıcı onaylayınca; içerik üretmez, adı kullanıcı yazar | "Yeni okur sorusu oluştur" |
| **Bir yöntem öner** | Hayır; gerekçesi yazar | "Dönüm noktalarını olay örgüsü masasında deneyin" |

| Rehber konusu | Eylem | Hedef | Seçim yoksa |
|---|---|---|---|
| 2 Hikâye çekirdeği | Etkin eserin çekirdek sorularını aç | Eser | Eser seçtir; eser yoksa "Fikri not alın" |
| 5 Karakterin isteği | Seçili karakterin "En çok ne istiyor?" sorusuna git | Karakter | Karakter listesi |
| 4 Çatışma motoru | İki tarafı ilişkiyle bağla | Karakter, topluluk, evren kuralı | İlişki ekleme penceresi |
| 12 Dönüm noktaları | Olay örgüsü masasını aç | Etkin eser | Eser seçtir |
| 14 Sahnede amaç | Açık sahnenin planına git | Sahne | — |
| 17 Sırlar ve karşılık | Etkin eserin montajını aç; "Yeni okur sorusu" | Okur sorusu, sahne niyeti | — |
| 19 Dünya inşası | Evren kuralları ve Dünya Pusulası | Evren | — |
| 21 Düzeltme | Sürüm al; açık meseleleri aç | Sürüm, mesele | — |
| 22 Devam kitabı | Kitap sonunda açık olanlar | Eser | — |

### 2.3 Soru satırında "Neden?" ve "Örnek"

Programla gelen her soru isteğe bağlı bir rehber konusu ve örnek cevap taşır [öneri]. Örnek cevap alanına **kopyalanmaz**. Kullanıcının kendi yazdığı ya da metnini değiştirdiği sorularda gösterilmez.

## 3. Şimdi kartı

Masa'nın en üstünde [öneri]. Kaynakları, sırası ve yasakları Model §5'tedir.

```text
┌ Şimdi ───────────────────────────── Çalışıyorum: [Unutulanlar ▾] ┐
│ Unutulanlar › 3. bölüm › Arşivde karşılaşma                        │
│ Devam notunuz: "Arşivcinin neden yardım ettiğini netleştir."       │
│ [Sahneye dön]  Notu düzenle                                        │
│ Son oturumda kendinize bu notu bıraktınız.                         │
│ ────────────────────────────────────────────────────────────────── │
│ Ayrıca: "Orhun annesini tanıyor muydu?" · önemli mesele ›          │
│         "Doruk noktası" · sonraya bıraktığınız soru ›              │
└─────────────────────────────────────────────────────────────────────┘
```

- **"Çalışıyorum:"** seçimi etkin çalışmadır (Model §5). Boş bırakılabilir ("Bütün evren").
- Rehber önerileri kapatılmışsa kart yalnız devam notunu ve son düzenleneni gösterir.
- Hiç dayanak yoksa kart görünmez; Masa bugünkü gibidir. "Nereden başlamak istersiniz?" gibi bir yönlendirme **yalnız** İlk adımlar listesi gizlenmemişse görünür.

## 4. Yaz ekranında sahne planı

Bağlam panelinin üstünde katlı "Sahne planı" bölümü: `sahne_plani` soruları ve sahnenin çalışma durumu [öneri].

```text
┌ Bağlam ─────────────────────────────┐
│ ▾ Sahne planı          İlk taslak ▾ │
│   Kim ne istiyor?                   │
│   [Lale dosyayı arıyor          ]   │
│   Ne engel oluyor?                  │
│   [Dosya silinmiş               ]   │
│   Sahne sonunda ne değişiyor?       │
│   [                             ]   │
│                     Geç · Neden?    │
│   Bu sahnenin niyetleri (2) ›       │  ← montajdaki okur soruları
│ Tarih: vergi günü, 412              │
│ …                                   │
└─────────────────────────────────────┘
```

- Tarih, mekân, bakış açısı, katılımcılar **yeniden sorulmaz**; onlar sahne alanlarıdır [main].
- Plan cevapları sahneyi "dolu" saymaz (§5.5 tasarım); panel boş sahnede kapalı başlar [main].
- "Bu sahnenin niyetleri" montajdaki sahne niyetlerine gider [main: `Montaj.tsx`].

## 5. Seri sayfası

Seri bir kayıttır; sayfası kayıt sayfasıdır (K24 menüsü değişmez). Yaz ağacında seri bir klasör gibi görünür [öneri]. Üyelik, sıralar ve silme Model §3'tedir.

```text
┌─ Hatıra İmparatorluğu · Seri ─────────────────────────────── [?] ─┐
│ Büyük soru: Bellek bir kaynağa dönüşünce özgürlük mümkün mü?        │
│ Merkez çatışma: Hafıza Divanı ↔ anılarını geri isteyenler           │
│ Şu an: Unutulanlar (etkin)                                          │
│                                                                     │
│ Kitaplar · önerilen okuma sırası (sürükleyin)              [+ Eser] │
│ ┌ I Unutulanlar ── ilk taslak ┐ ┌ II Hatırlayanlar ── plan ┐ ┌ III … ┐│
│ │ Çekirdek: Deniz'e ne oldu?  │ │ Çekirdek: —              │ │       ││
│ │ Kitap sonunda açık: 2 soru ›│ │                          │ │       ││
│ └─────────────────────────────┘ └──────────────────────────┘ └───────┘│
│                                                                     │
│ ▸ Olası finaller (2 alternatif · seçilmedi)                         │
│ ▸ Karakterlerin yolu (karakter × kitap)                             │
│ ▸ Kitaplar arası okur soruları (açık / açıklandığı kitap)           │
│ ▸ Kurgu hatları (kitaplara göre)                                    │
│ ▸ Açık meseleler ve gerekçeler                                      │
│ ▸ Yayımlanmış kitaplar ve sabit sürümler                            │
└─────────────────────────────────────────────────────────────────────┘
```

| Bölüm | Kaynak | Durum |
|---|---|---|
| Büyük soru, merkez çatışma | `seri` soru seti | [öneri] |
| Kitaplar | Ağaçta seri altındaki eserler; eser çalışma durumu; `cekirdek.1` | [öneri] |
| Kitap sonunda açık | Model §7 hesabı | [öneri] |
| Olası finaller | `alternatif` kümesindeki olaylar, karar rozetleri | [öneri] |
| Karakterlerin yolu | `eser_odagi` ilişkileri ve `karakter_kitapta` cevapları; hücreden sahneye | [öneri] |
| Kitaplar arası okur soruları | Montaj, seri okuma sırasıyla | [main] montaj; seri sırası [öneri] |
| Kurgu hatları | Görünümler › Kurgu hatları, seri eserleriyle süzülmüş | [main] |
| Açık meseleler, gerekçeler | Seriye `mesele_konusu`/`gerekce_konusu` ile bağlı olanlar | [main] |
| Yayımlanmış kitaplar | Sabit başvuru sürümü | [main] |

Karakterlerin yolu matrisi:

```text
               I Unutulanlar          II Hatırlayanlar        III Son Hatıra
Lale     başta: Deniz'i bulmak     başta: isyanı korumak     —
         sonda: suçu üstlenmek     inanç: "halk hazır"
         karar: şişeyi çalmak ›    karar: — 
Deniz    (odak değil)              başta: anıları dağıtmak   …
Orhun    (odak değil)              1 sahnede bakış açısı ›    …
```

Her hücre o kitabın cevabıdır; hücreler birbirini değiştirmez (Model §8).

## 6. Olay örgüsü masası (yeni)

### 6.1 Sorun

40 bölümlük bir kitapta yazar dönüm noktasını 18. bölümden 12. bölüme almak, iki hattın nerede kesiştiğini, bir sırrın hangi sahnede açıldığını aynı anda görmek ister. Bugün bunlar ayrı görünümlerdedir: kurgu hatları, bölüm × kayıt matrisi, montaj, neden–sonuç [main].

### 6.2 Davranış

**Yeni bir veri değil, var olanların tek pencerede birleşimi.** Bir eserin okuma sırası sütunlar; satırlar yazarın seçtiği "izler":

```text
Unutulanlar · olay örgüsü                    [Bölümler ▾] [İz ekle ▾]

            Bl.1        Bl.2        Bl.3 ──────── Bl.4        Bl.5
            S1  S2      S3  S4      S5  S6  S7    S8  S9      S10 S11
Dönüm       ●Tetik.     ●İlk seçim     ●Orta              ●Doruk  ●Son
Deniz'in izi ■   ■       ■           ■               ■       ■   ■
Silinmiş isyan       ·ipucu      ·ipucu   ✕yanıltmaca            ?açık
Lale (bulunuyor) ●  ●   ●   ●       ●   ●   ●     ●   ●       ●   ●
Orhun (bulunuyor)                       ●         ●           ●
Durum      ✎   ✎   ✎   ○       ○   ○   ○     ○   ○       ○   ○
                                           ○ planlandı  ✎ ilk taslak
[seçili: S6 "Annenin şişesi"]  Sahneyi aç · Taşı · Bu sahneyi anlatan olay ›
```

| Satır türü | Kaynak | Durum |
|---|---|---|
| Dönüm noktaları | Esere `anlatir` ile bağlı olaylar (fikir rozetiyle) ya da yazarın "dönüm noktası" etiketi verdiği sahneler | [main] ilişki ve etiket; satır [öneri] |
| Kurgu hattı | `kurgu_hattinda` bağları | [main] |
| Okur sorusu | Montaj sahne niyetleri: ipucu, yanıltmaca, açıklama | [main] |
| Karakter | `sahnede` rolü *bulunuyor* (ya da seçilen rol) | [main] bölüm × kayıt matrisiyle aynı |
| Çalışma durumu | Sahne çalışma durumu | [öneri] |

- **Taşımak:** Bir sahne sütunu sürüklenince bugünkü `yerlestir` çalışır ve **anlatı etki özeti** gösterilir: "Bu taşıma, okurun 'Silinmiş isyan' sorusunu öğrendiği sahneyi S9'dan S5'e alıyor" [main: `yerlestir` → `etki`; montaj].
- **Plan sahnesi:** "Boş sahne ekle" metinsiz bir sahne oluşturur ve sütuna yerleştirir. Metni sonra Yaz ekranında yazılır.
- **Alternatif sıra:** Masada iki sıra denemek için deneme kopyası kullanılır [main: §9.7]; masa yeni bir "alternatif sıra" verisi tutmaz.
- **Seri düzeyi:** Sütunlar kitaplar, satırlar seri izleri olabilir (aynı bileşen, eser yerine seri). İlk sürümde yalnız eser.

### 6.3 Zor sorular ve cevapları

| Soru | Cevap |
|---|---|
| Plan kartı sahneye dönüşünce kart ne olur? | Kart yoktur; plan zaten sahne ya da olaydır (Model §4.4) |
| Sahne bölüm değiştirince olay tarihi neden değişmez? | Okuma sırası ile evren kronolojisi ayrıdır (Model §3.3) |
| Yerleşmemiş taslak sahne nasıl bulunur? | Masada "Yerleşmemiş" sütun grubu (Model §4.4) |
| Seri planı ile kitap planı nasıl ayrılır? | Aynı bileşen, farklı kapsam; seri satırları seri izlerinden gelir |
| Bir karakter birden çok hatta nasıl çizilir? | Karakter satırı ayrıdır; hat satırları ayrıdır. Kesişim aynı sütunda görülür |
| Yayımlanmış metne bağlı unsurlar? | Yayımlanmış eserin sahnesi taşınırken F18 sorusu [main: `yayim.ts`] |

### 6.4 Neden ayrı ekran?

K24 "az kullanılan araçlar katlanır" der. Masa bir **görünüm**dür (Görünümler altında "Olay örgüsü") ve eser sayfasından açılır; menüye eklenmez. Görünüşü değiştiren her iş gibi önce **resimli taslak** gösterilir.

## 7. Paketler

> **Durum (19 Ekim gece):** kullanıcı D1–D13'ü önerildiği gibi onayladı. P1, P2, P3, P4 (ilk kısım), P5, P7, P8, P9, P10 kodlandı ve tasarıma işlendi (K27); birleştirme isteği #6'da ekran görüntüsü onayı bekliyor. P6 için iki resimli taslak hazır. Bu belgedeki "[öneri]" etiketleri yazıldığı anki durumu gösterir; güncel davranış tasarım belgesindedir.

| # | Paket | İçerik | Yeni veri | Bağımlılık | Sınamalar |
|---|---|---|---|---|---|
| P1 | **Rehber** | Rehber metinleri, yan panel, "Neden?/Örnek", "Uygulamada deneyin" (açıklama ve ilgili kaydı aç türleri) | Yok | — | Her konu açılır; programlama terimi yok; Esc/odak (Akış 17) |
| P2 | **Anlatı soruları** | `cekirdek`, `eser`, `sahne_plani`, `hat` setleri; sahne planı paneli | Yalnız soru tanımları | — | Eski evren cevapları kaybolmaz; yeni eserde setler görünür |
| P3 | **İlk adımlar yolları** | Yol seçimi, dört durum, "Geç" | Cihaz ayarı | P2 (çekirdek yolu) | Geçilen adım yapıldı görünmez; yol değişince işlem yazılmaz |
| P4 | **Seri** | `seri` türü, eserin seri altına yerleşmesi, seri sayfası (kitaplar, büyük soru), silme/geri yükleme önizlemesi | Tür, ağaç kuralı | P2 (`seri` seti) | Model §3.4 tablosu; eski sürümle açılış |
| P5 | **Alternatifler** | `alternatif` ilişkisi, kesinleştirme önizlemesi, olası finaller bölümü | İlişki türü | P4 (finaller bölümü) | Kesinleştirme öbürünü kendiliğinden değiştirmez; ipuçları korunur |
| P6 | **Olay örgüsü masası** | Eser kapsamlı masa, taşıma ve etki özeti | Yok (P8 ile durum satırı) | — (P4 ile seri sütunu) | Taşıma geri alınır; 1.500 sahnede açılış süresi |
| P7 | **Karakterin kitaptaki yolu** | `eser_odagi`, ilişkiye soru, matris | İlişki türü, ilişkiye soru | P4 | Çoklu odak; kitap satırları birbirini değiştirmez |
| P8 | **Çalışma durumları** | Eser ve sahne alanları, dağılım | Şablon alanları | — | Karar durumuyla karışmaz |
| P9 | **Kitap sonunda açık olanlar** | Model §7 | Yok | Montaj kullanımı; P4 ile seri sütunu | III. kitap yazılınca I. kitap raporu değişmez |
| P10 | **Şimdi kartı ve etkin çalışma** | Model §5 | Evren ayarı | P2, P3 | Etkin çalışma kendiliğinden değişmez; +50 ms sınırı |
| — | Sonraya | Ek seri üyeliği, okuma yolları, seri düzeyi masa | — | Somut takılma (K11) | — |

**Sıra gerekçesi:** P1–P3 boşluk hissini doğrudan azaltır ve veri riski taşımaz. P4–P5'in veri anlamları P6–P9'un ekranlarını etkilediği için **tasarımları şimdi yapıldı** (Model); **kodlanmaları** onaydan sonradır. P10 en sona kaldı, çünkü anlamlı öneri ancak P2–P5'in verisi oluşunca mümkün. Basit bir sürümü (yalnız devam notu ve etkin çalışma) daha erken gelebilir.

## 8. Kullanıcı kararları

Her biri için önerilen varsayılan ve öbür seçeneğin bedeli. Onaylananlar tasarıma K kararı olarak, öneriler §16'ya F48 ve sonrası olarak girer (K11).

| # | Karar | Önerilen | Öbür seçenek ve bedeli |
|---|---|---|---|
| D1 | Başlangıç ekranı | K26 listesi + yol seçimi | Ayrı karşılama ekranı: K26'yı geri almak, bir tıklama fazla |
| D2 | Yol seçimi nerede | Cihazda | Evrende: iki cihaz aynı yolu gösterir; arayüz tercihi kurgu verisine karışır |
| D3 | Seri modeli | `seri` türü; eser ağaçta seri altında (Model §3) | Yalnız ilişki: ağaçta görünmez, sıralama yeni altyapı ister |
| D4 | Çoklu seri | İlk sürümde yalnız ana seri; ek üyelik sonra ilişkiyle | Baştan çoklu: arayüz karmaşıklaşır, ihtiyaç henüz yok |
| D5 | Plan ve alternatif | Var olan karar durumları + yeni `alternatif` ilişkisi (Model §4) | Ayrı plan katmanı: aynı bilgi iki yerde |
| D6 | Karakterin kitaptaki yolu | Soru taşıyan `eser_odagi` ilişkisi (Model §8) | Yalnız açıklama: karşılaştırılamaz; ayrı tür: kayıt listesi kalabalıklaşır |
| D7 | Çalışma durumu | Eser ve sahne ayrı, isteğe bağlı (Model §9) | Yalnız eser: karışık durumdaki kitabı yanlış gösterir |
| D8 | Rehber programın içinde | Evet, çevrimdışı, yan panelde | Yalnız belge: yazarken erişilemez |
| D9 | Etkin çalışma | Ayrı, eşitlenen, yalnız kullanıcı seçer (Model §5) | Son düzenleneni kullanmak: III. kitaba not eklemek odağı kaydırır |
| D10 | Menü adları | Bu öneriden bağımsız; bekleyen tablo geçerli | — |
| D11 | Paket sırası | §7 | — |
| D12 | Kurgu hattı ipucu rolleri ile montaj ipuçları | İkisi de kalsın; "kitap sonunda açık" yalnız montajı kullansın | Birleştirmek: tek ipucu kavramı ama eski verinin dönüşümü gerekir |
| D13 | Olay örgüsü masası | P6 olarak, önce resimli taslak | Hiç yapmamak: mevcut dört görünüm ayrı kalır |
