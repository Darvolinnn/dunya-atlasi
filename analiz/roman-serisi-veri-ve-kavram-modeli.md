# Roman serisi: veri ve kavram modeli

> **Belge türü:** Tasarım önerisi; bağlayıcı değil. Bağlayıcı belge `tasarim/dunya-atlasi-tasarim.md`'dir.
>
> **Bu belgenin yeri:** Rehberli yazarlık öneri setinde her **kavramın ve veri davranışının tek tanımı** buradadır. [Ürün tasarımı v2](rehberli-yazarlik-urun-tasarimi-v2.md) ekranları, [yaratıcı çalışma akışları v2](yaratici-calisma-akislari-v2.md) senaryoları anlatır ve buraya bağlanır. Değişikliklerin gerekçesi: [revizyon analizi](rehberli-yazarlik-revizyon-analizi.md).
>
> **Kaynak etiketleri.** Her davranışın yanında nereden bilindiği yazar:
> - **[main]** `main` dalında var (`2a223a9`).
> - **[#5]** yalnız açık birleştirme isteği #5'te var (`claude/modest-lovelace-ozltpf`, `bf5ca22`); henüz `main`'de değil.
> - **[tasarım]** bağlayıcı tasarımda tanımlı, kodu yok ya da doğrulanmadı.
> - **[öneri]** bu öneri setinin önerisi; kullanıcı onaylamadı.
>
> Kod satırları `uygulama/src/` altındadır.

---

## 1. Düzeyler: neyin nerede durduğu

Programın tek sabit üst birimi evrendir (K22). Bu öneri evrenin içine bir düzey ekler (seri) ve her düzeyin "büyük fikrini" ayrı tutar.

| Düzey | Kayıt | Büyük fikri | Sorusu | Örnek (*Hatıra İmparatorluğu*) | Durum |
|---|---|---|---|---|---|
| **Evren** | — (evrenin kendisi) | Ayırt edici kural | Bu dünya nasıl işliyor? | İnsanların anıları vergi olarak alınıyor. | [main] `baslangic.1` "Temel fikir", Dünya Pusulası |
| **Seri** | `seri` | Büyük soru | Birden çok kitap boyunca hangi çatışma araştırılıyor? | Bellek bir kaynağa dönüşünce özgürlük mümkün mü? | [öneri] |
| **Eser** | `eser` [main] | Hikâye çekirdeği | Kim ne istiyor, ne engel oluyor, ne tehlikede? | Kardeşini arayan arşiv memuru silinmiş bir isyanı keşfeder. | [öneri] eser soru seti |
| **Bölüm** | `bolum` [main] | — | — | — | [main] |
| **Sahne** | `sahne` [main] | Sahne planı | Kim ne istiyor, ne engel oluyor, ne değişiyor? | Lale dosyayı arıyor; dosya silinmiş; kendi anısının da eksik olduğunu fark ediyor. | [öneri] sahne soru seti |

**Kurallar:**

1. **`baslangic.1`'in anlamı değişmez.** Bugünkü metni "Temel fikir — Evreni farklı kılan tek kural"dır (`alan/sablon.ts`). Hikâye çekirdeğine ya da seri sorusuna **bağlanmaz, taşınmaz, yeniden adlandırılmaz.** Kayıtlı cevaplar bu kodla durur.
2. **Hikâye fikri eser açmadan yazılabilir.** Fikir önce bir **not** olur [main: Not türü]. Sonra "Bu nottan eser oluştur" denir [main: nottan kayıt doğurma, `nottan` ilişkisi]. Not silinmez; eserle "Doğduğu not" bağıyla kalır. Notun metni eserin çekirdek sorusuna **kendiliğinden kopyalanmaz.** Kullanıcı isterse çekirdek sorusunu nottan **alıntılayarak** doldurur; bu tek seferlik bir kopyadır ve kaynağı (not) cevabın yanında gösterilir.
3. **Aynı fikir birden çok düzeyde kullanılabilir.** Bağ ilişkiyle kurulur, kopyayla değil. Örnek: Seri sorusunun cevabı bir kayda (bir inanç, bir kurum) "Yeni kayıtla cevapla" ile bağlanabilir [main]. İki düzeyin cevabı aynı metin olacaksa kullanıcı iki kez yazar ya da alıntılar. Program iki cevabı birbirine **eşitlemez.**

## 2. Rehber adımlarının durumu

Rehberin her adımı (İlk adımlar, Şimdi kartı) dört durumdan birindedir. Bu tablo bu öneri setindeki **tek tanımdır.**

| Durum | Anlamı | Nereden anlaşılır | Ekranda |
|---|---|---|---|
| **Yapıldı** | Adımın istediği iş kayıtlı veride gözlenebiliyor | Adımın **dayanak sorgusu** (§2.1) doğru dönüyor | Üstü çizili, onay işareti |
| **Şimdilik geçildi** | Kullanıcı şimdi yapmak istemiyor | Adıma bağlı soru `sonra` [main] **ya da** adım cihazda "geç" işaretli [öneri] | Soluk, "Geçildi" yazısı; **onay işareti yok** |
| **İlgisiz** | Kullanıcı bu adımı kendisi için gerekli görmüyor | Adıma bağlı soru `ilgisiz` [main] **ya da** adım cihazda "ilgisiz" işaretli [öneri] | Listede görünmez |
| **Başlanmadı** | Ne dayanak var ne bilinçli erteleme | Yukarıdakilerin hiçbiri | Normal; sıradaki ise vurgulu |

**Kurallar:**

1. **"Geçildi" hiçbir zaman "yapıldı" gösterilmez.** Dört başlangıç sorusu topluca ertelenirse liste "4 adım yapıldı" demez. Geçilen adımlar listede kalır; liste ancak her adım *yapıldı* ya da *ilgisiz* ise kendiliğinden kapanır.
2. **Liste ile gizleme farklı şeylerdir:**

   | Komut | Etkisi | Saklandığı yer |
   |---|---|---|
   | Adımı geç | O adım "geçildi" | Soru varsa soru durumu (evren, eşitlenir); yoksa cihaz |
   | Adım ilgisiz | O adım listeden çıkar | Aynı |
   | İlk adımları gizle | Bütün liste kapanır, adımlar değişmez | Cihaz [#5: `dunya-atlasi:ilk-adimlar-gizli:<evren>`] |
   | Rehber önerilerini kapat | Şimdi kartı yalnız devam notu ve son düzenleneni gösterir (§5.3) | Cihaz [öneri] |

3. **Toplu "Atla" ile tek tek "Sonra" verideki aynı durumu yazar** (`soru_cevaplari.durum='sonra'`) [main: `MasaPusulasi`]. Bunları ayırmak için yeni veri **önerilmez.** Bunun yerine Şimdi kartı (§5.3) *sonraya bırakılmış başlangıç sorularını* hiç önermez; yalnız eser, sahne, seri ve kurgu hattı sorularındaki `sonra` cevaplarını önerir. Gerekçe: başlangıç soruları yalnız yeni evrenin ilk saatlerinde anlamlıdır.
4. **Geri dönülen adım önceki veriyi yeniden istemez.** Dayanak sorgusu zaten var olan veriyi görür.
5. **Yol değiştirmek veri yazmaz** (§2.2). Başka yoldaki kayıtlar silinmez, taşınmaz, yeniden düzenlenmez.

### 2.1 Dayanak sorguları

Bir adımın *yapıldı* sayılması için gereken gözlenebilir veri. Hepsi `LIMIT 1` varlık sorgusudur; evren büyüklüğünden bağımsızdır.

| Adım | Dayanak | Yeterli **değil** |
|---|---|---|
| Bir eser oluşturun | Silinmemiş bir `eser` kaydı [#5] | — |
| İlk sahneyi ekleyin | Silinmemiş bir `sahne` kaydı [#5] | — |
| Metinde bir kayda bağlanın | Bir sahne metninde bağlantı [#5] | — |
| Sahneye tarih ya da mekân verin | Sahne tarihi, sahne olayı tarihi ya da `sahne_yeri` ilişkisi [#5] | — |
| Dünyanızın kuralını yazın | `pusula.4` **cevaplandı** ya da silinmemiş bir `evren_kurali` / `buyu_sistemi` kaydı [main: türler] | `sonra`, `ilgisiz` |
| Hikâyenizin çekirdeği | Bir eserin `cekirdek.1` sorusu cevaplandı **ya da** türü "sahne fikri"/serbest bir **not** var | Boş not |
| Bir yer oluşturun | `mekan`, `sehir` ya da `siyasi` türünde bir kayıt [main] | Yalnız `mekan` saymak; "Yerler" grubunu bütün olarak saymak (rota, yolculuk ve eşya da o gruptadır, `alan/turler.ts`) |
| Karşıt gücü belirleyin | Karakterin bir kayıtla `dusman`, `rakip` ya da `nefret` ilişkisi **ya da** `karsit.1` ("Ne istiyor?") cevaplandı | Boş `karsit` setinin eklenmiş olması |
| Karakterin isteği | `karakter.1` cevaplandı | — |
| Serinin büyük sorusu | Bir seri kaydında `seri.1` cevaplandı | — |
| Seriye bağlı ilk kitap | Anlatı ağacında üstü bir seri olan eser (§3) | Serisiz eser |

### 2.2 Başlangıç yolu

- Yol seçimi bir **arayüz tercihidir**, kurgu verisi değildir. Cihazda evren başına tutulur [öneri].
- **Sonucu:** İki cihazda farklı yol görünebilir. Bu kabul edilir, çünkü adımların *yapıldı* durumu aynı veriden okunduğu için iki cihazda aynıdır. Yalnız *hangi adımların listelendiği* farklıdır.
- Eşitlenen çalışma bilgisi (etkin çalışma, devam notu) ile arayüz tercihi (yol, gizle, bağlam paneli) **karışmaz** (§5).

## 3. Seri, üyelik ve sıralar

### 3.1 Seri kaydı

Yeni tür `seri` (grup "Anlatı ve yazarlık") [öneri]. Bir kayıttır: adı, özeti, karar durumu, etiketleri, soruları (`seri` seti, §6), notları, açık meseleleri olur. Silme ve geri yükleme bugünkü kayıt kurallarıyla olur [main].

**Seri ne değildir:** ikinci bir evren veritabanı; eserlerin zorunlu kategorisi; yayımlanmış metni değiştiren bir plan motoru; ilerleme yüzdesi.

### 3.2 Üyelik ile görünen konum

İki kavram ayrıdır:

| Kavram | Anlamı | Veri | Çokluk |
|---|---|---|---|
| **Ana seri** (görünen konum) | Eser, Yaz sayfasının ağacında bu serinin altında görünür | Anlatı ağacı: `anlati(kod=eser, ust=seri, konum)` [main: tablo var; eser için kullanım öneri] | Eser başına en çok bir |
| **Ek üyelik** | Eser ayrıca başka bir serinin de parçasıdır (yan seri, antoloji) | İlişki `seri_eseri` (A seri, B eser), rol isteğe bağlı [öneri, **ilk sürümde yok**] | Sınırsız |

- Seri sayfasında bir serinin kitapları = ana serisi o olan eserler + ek üyelikle bağlı eserler. Ek üyeler kartta "Ana serisi: …" satırıyla görünür.
- İlk sürüm yalnız **ana seri**yi kodlar. Ek üyelik, ağaç yapısını değiştirmeden ilişkiyle sonradan eklenebilir; ana seri bu yüzden ilişki değil ağaç konumu olarak seçildi (D4).

**Anlatı ağacına etkisi.** Bugün `yerlestir` yalnız sahne ve bölüm kabul eder (`calisan/anlati.ts:96`). Öneri: `eser`, `ust` türü `seri` iken yerleştirilebilir; `seri` hiçbir yere yerleştirilmez (seri içinde seri yok). Yerleştirme bugünkü `anlati_yerlestir` işlemiyle olur ve işlem günlüğünden geçer. Eser başka bir eserin ya da bölümün içine **yerleştirilemez.**

### 3.3 Dört sıra

| Sıra | Ne gösterir | Nerede tutulur | Durum |
|---|---|---|---|
| **Önerilen okuma sırası** | Seriyi baştan okuyacak okura önerilen sıra | Ağaçtaki `konum` (seri altında) | [öneri] |
| **Yayın sırası** | Kitapların çıkış sırası | Eser şablonunda isteğe bağlı "Yayın yılı / sırası" alanı | [öneri] |
| **Evren kronolojisi** | Olayların dünyadaki sırası | Sahne ve olay tarihleri | [main] |
| **Okurun okuma yolu** | Bir okurun gerçekten izlediği sıra (II. kitaptan başlayan okur) | Okur modeli eser başına [main]; seri boyunca yollar | [öneri, Ö8, sonraya] |

Bunlar birbirinden türetilmez. Eseri seri içinde başka konuma taşımak tarihleri, sahneleri, okur modelini değiştirmez.

### 3.4 Yaşam döngüsü

| İşlem | Davranış | Geri alma |
|---|---|---|
| Eseri seriye koymak / seriden çıkarmak / başka seriye taşımak | Tek `anlati_yerlestir` işlemi; eserin içindekiler değişmez | Bugünkü geri alma [main] |
| **Seriyi silmek** | Seri kaydı silindi işaretlenir [main: yumuşak silme]. Eserlerin `anlati` satırlarına **dokunulmaz.** Görünüm kuralı: üstü silinmiş eser en üst düzeyde görünür | Seriyi geri yüklemek |
| **Seriyi geri yüklemek** | Seri silinmeden kaldırılır. Eserlerin `anlati` satırları hiç değişmediği için hâlâ bu seriyi gösteren eserler kendiliğinden altına döner. **Arada başka seriye ya da en üste taşınmış eser** yeni konumunda kalır: taşıma sonradan yazıldığı için eski konumu geri gelmez | Gerek yok |
| Önizleme (silme) | "3 eser en üst düzeye çıkacak; hiçbir eser, sahne ya da metin silinmeyecek." | — |
| Önizleme (geri yükleme) | "2 eser yeniden bu serinin altına girecek. *Hatırlayanlar* arada başka seriye taşındığı için orada kalacak." | — |
| İki cihaz | Biri seriyi silerken öbürü bir eseri seriye koyarsa iki işlem de uygulanır. Eser silinmiş bir serinin altındadır; en üstte görünür; seri geri yüklenince altına girer | Silme–düzenleme çatışması bugünkü kuralla gösterilir (§10.6) [tasarım] |

Bu davranış "silme altındakileri yeniden yazmaz" ilkesinden doğar; bölümler için bugün de böyledir (bölüm silinince sahnelerin `anlati` satırı yerinde kalır).

## 4. Plan, alternatif ve evrenin gerçeği

### 4.1 Üç ayrı anlam

| Anlam | Örnek | Model |
|---|---|---|
| **Olasılık** (yazar henüz seçmedi) | "III. kitapta imparatorluk yıkılabilir." | Olay kaydı, kayıt düzeyinde karar **fikir** [main] |
| **Kesin olay, ayrıntısı taslak** | "İmparatorluk yıkıldı; tarihi henüz 412 mi 413 mü belli değil." | Olay kaydı, kayıt düzeyinde **kesinleşmiş**; tarih alanı **alan düzeyinde fikir** [main: `alan_kararlari`] |
| **Kesin evren olayı** | "İmparatorluk 412 sonbaharında yıkıldı." | Olay kaydı, kesinleşmiş; alanlar kesinleşmiş [main] |

Bugünkü model bu üç anlamı ayırabiliyor: kayıt düzeyi ve alan düzeyi karar durumu ayrıdır (§3.6 tasarım, `kayit_alan_karar` işlemi). **Ayrı bir plan veritabanı önerilmez.**

**Eksik olan tek şey alternatiflik bağıdır.**

### 4.2 Alternatif kümesi

Yeni ilişki türü **`alternatif`** [öneri]: karşılıklı, grup "Yazarlık". "A ile B birbirinin alternatifidir" demek. Üç ya da daha çok alternatif, ikişer ikişer bağlanır. Seri ya da eser sayfası bunları bir küme olarak gösterir.

| Kural | Davranış |
|---|---|
| Alternatifin üyeleri | Aynı türde kayıtlar: olay–olay, sahne–sahne, kurgu hattı–kurgu hattı |
| Bir üye **kesinleşince** | Program öbürlerini **kendiliğinden vazgeçilmiş yapmaz.** Önizleme sorar: "Diğer 1 alternatif de vazgeçilsin mi? (Önerilir)" Kullanıcı seçer |
| Vazgeçilen alternatif | Silinmez [main]; denetlenmez [main]; zaman çizelgesinde yalnız "vazgeçilenleri göster" ile görünür [main: `karar-vazgecildi` sınıfı] |
| Alternatife bağlı ipuçları ve sahne niyetleri | Silinmez, değişmez. Montajda (§7) uyarı satırı: "Bu ipucu vazgeçilen bir alternatife bağlı." |
| Gerekçe | Seçim anında isteğe bağlı bir gerekçe kaydı açılır; alternatiflerin hepsi "Etkilediği kayıt" olarak bağlanır [main: gerekçe kaydı] |
| Yayımlanmış esere bağlı alternatif | Sabit başvuru sürümü değişmez [main]; yayımlanmış eserle çelişen değişiklik F18'e göre sorulur [main: `calisan/yayim.ts`] |

### 4.3 Hangi hesaplara girer?

| Hesap | Fikir olay | Vazgeçilmiş olay |
|---|---|---|
| Zaman çizelgesi | Görünür, karar rozetiyle [main] | Yalnız istenince [main] |
| Neden–sonuç ağı | Görünür, karar rozetiyle | Gizli |
| Tutarlılık denetimleri | Denetlenir; uyarılar **ayrı ve sessiz grupta** (K13) [main] | Denetlenmez [main] |
| Karakterin durum geçmişi | Olay etkileri "fikir" etiketiyle görünür | Uygulanmaz |
| Hesaplar (yaş, rota…) | Yalnız "varsayımla" etiketli sonuçlarda [tasarım §3.6] | Hayır |

### 4.4 Planı olaya, sahneye dönüştürmek

- **Plan kartı ayrı bir nesne değildir.** Plandaki bir "dönüm noktası" ya bir **olay** kaydıdır (evrende olacak şey) ya da metni olmayan bir **sahne** kaydıdır (anlatıda yer alacak an). İkisi de bugün var [main].
- "Bu planı kesinleştir" = olayın kayıt düzeyi kararını *kesinleşmiş* yapmak. Kimlik (kod), ilişkiler ve geçmiş aynı kalır. **Başka hiçbir kayıt kendiliğinden değişmez.**
- "Bu olayı anlatan sahne oluştur" = yeni sahne + `anlatir` ilişkisi [main: sahne olayı ve `anlatir`]. Olay kesinleşmez; sahnenin varlığı onu kesin yapmaz.
- Metni olmayan plan sahnesi eser ağacına yerleştirilmeden de durabilir. Bugün böyle sahneler kayıt listesinde ve kurgu hatları görünümünün "yerleşmemiş" satırlarında görünür [main: `calisan/gorunum.ts` `yerlesmemis`]. Öneri: Yaz ağacının altında katlı "Yerleşmemiş sahneler".

### 4.5 Plan değişince ne olur?

| Değişiklik | Doğrudan değişen | Yalnız incelemeye düşen |
|---|---|---|
| Fikir olay vazgeçilir | Olayın kararı | Ona `neden` ile bağlı olaylar; onu anlatan sahneler; ona bağlı ipuçları (inceleme kuyruğunda bir satır) [tasarım §9.2 etki analizi] |
| Olayın tarihi değişir | Olay tarihi; olayı anlatan sahnelerin **varsayılan** tarihi (sahne kendi tarihini yazmadıysa) [main] | Yaş, rota, süreklilik uyarıları [main] |
| Sahne başka bölüme taşınır | Okuma sırası | Okurun öğrenme sırası; anlatı etki özeti [main: `yerlestir` → `etki`] |

Program serbest metni yeniden yazmaz; metne bağlı işaretler yalnız incelemeye düşer [main §5.7].

## 5. Çalışma bilgisi: dört ayrı kavram

| Kavram | Anlamı | Veri | Eşitlenir | Durum |
|---|---|---|---|---|
| **Kaldığım yer** | Son açık sahne/kayıt, imleç, yan paneldekiler | `kaldigiYer` | Evet | [main] |
| **Devam notu** | Kendime bıraktığım hatırlatma | `kaldigiYer.not` | Evet | [main] |
| **Etkin çalışma** | Şu sıralar üzerinde çalışmayı **seçtiğim** eser ya da seri | Evren ayarı `etkin_calisma` (kod ya da boş) | Evet | [öneri] |
| **Önerilen adım** | Kayıtlı veriye dayalı, isteğe bağlı iş | Saklanmaz; her açılışta hesaplanır | — | [öneri] |

**Kurallar:**

1. **Etkin çalışma yalnız kullanıcı seçince değişir.** Son düzenlenen kayıt hiçbir zaman etkin çalışma ilan edilmez. III. kitaba not eklemek etkin çalışmayı I. kitaptan III. kitaba çevirmez.
2. Etkin çalışma boşsa öneriler kapsamsızdır (bütün evren).
3. Etkin çalışma bir eser ise, o eserin serisi de kapsamdadır; bir seri ise, serideki bütün eserler.

### 5.3 Önerilen adımın sırası

Şimdi kartı ilk bulunan dayanağı gösterir, en çok iki alternatifi altında listeler. Her satır gerekçesini yazar.

| # | Dayanak | Gerekçe satırı |
|---|---|---|
| 1 | Devam notu var | "Son oturumda kendinize bu notu bıraktınız." |
| 2 | Etkin çalışmaya bağlı, önemli işaretli, *düşünülecek* açık mesele | "Bu meseleyi önemli olarak işaretlemiştiniz." |
| 3 | Rehber açıksa ve İlk adımlar gizlenmediyse: sıradaki *başlanmadı* adım | "Seçtiğiniz başlangıç yolunda sıradaki adım." |
| 4 | Etkin çalışmanın eser/seri/sahne/kurgu hattı sorularından `sonra` olan (başlangıç soruları hariç, §2 kural 3) | "Bu soruyu sonraya bırakmıştınız." |
| 5 | Hiçbiri yoksa son düzenlenenler | Gerekçe yok; sıralama düzenleme zamanı |

**Yasak:** serbest metinden çıkarım; "eserde sahne yok" gibi yokluktan iş üretmek; dünya kurana roman önermek; ertelenenleri hata rengiyle göstermek; kullanıcı istemeden kayıt yaratmak, bağlamak ya da kesinleştirmek.

## 6. Soru setleri

Bugünkü soru altyapısı [main]: her soru (kayıt, soru kodu) başına **tek** cevap, durum `cevaplandi | sonra | ilgisiz`, ya da "Yeni kayıtla cevapla". Cevap yokluğu = *başlanmadı*.

Önerilen yeni setler [öneri]. Kodlar kalıcıdır; programdaki metin sonradan düzeltilse de cevaplar kodla kalır.

| Set | Türü | Sorular |
|---|---|---|
| `cekirdek` | `eser` (varsayılan) | 1 Kim, ne istiyor? · 2 Ona ne engel oluyor? · 3 Başaramazsa ne kaybeder? · 4 Okur hangi sorunun cevabını merak edecek? · 5 Bu hikâye hangi soruyu soruyor? |
| `eser` | `eser` (varsayılan) | 1 Bu kitabın merkez sorusu · 2 Dengeyi bozan olay · 3 Doruk noktası · 4 Bu kitapta ne çözülüyor · 5 Ne açık kalıyor |
| `seri` | `seri` (varsayılan) | 1 Serinin büyük sorusu · 2 Merkez çatışma · 3 Başlangıç dengesi · 4 İlk büyük kırılma · 5 Orta evre · 6 Bilerek cevapsız kalacaklar |
| `sahne_plani` | `sahne` (varsayılan) | 1 Kim ne istiyor? · 2 Ne engel oluyor? · 3 Sahne sonunda ne değişiyor? · 4 Okur ne öğreniyor? |
| `hat` | `kurgu_hatti` (varsayılan) | 1 Hattın sorusu · 2 Şu anki durumu · 3 Olası karşılığı · 4 Bilerek açık mı kalacak? |
| `karakter_kitapta` | §8'e bakın | — |

**Olası final bir soru değildir.** "Olası final" tek cevaplı bir soruya iki seçenek olarak yazılmaz; her olası final ayrı bir olay kaydıdır ve alternatif bağıyla bağlanır (§4.2). Seri sayfası "Olası finaller" bölümünde bu olayları listeler.

**Dönüm noktaları bir soru seti değildir.** Önceki taslaktaki `donum` seti kaldırıldı: dönüm noktası bir olay ya da plan sahnesidir (§4.4) ve olay örgüsü masasında (ürün tasarımı v2 §6) düzenlenir. Rehber (Konu 12) sekiz durağı bir **düşünme aracı** olarak anlatır.

**Eski evrenler:** Varsayılan şablonunu değiştirmemiş türler yeni setleri görür; değiştirmiş türlerde setler "Bu kayda soru seti ekle" listesindedir [main: şablon düzenleyici]. Hiçbir cevap taşınmaz.

## 7. Kitap sonunda açık olanlar (tarihsel doğruluk)

### 7.1 Sorun

Bugün kurgu hattına bağlı sahne rollerinin (`ipucu_planlandi`, `ipucu_yerlesti`, `ipucu_karsilik`) yalnız **sayısı** tutulur (`calisan/gorunum.ts:360`). Tek bir ipucunun kimliği yoktur. Bu yüzden "I. kitabın sonunda **hangi** ipucu açıktı?" sorusu bu veriden cevaplanamaz. Önceki taslağın Ö9'u buna dayanıyordu; **geri çekildi.**

### 7.2 Dayanak: kurgu montajı

Programda okurun neyi hangi sahnede öğrendiğini okuma sırasına göre hesaplayan bir model zaten var [main: `calisan/montaj.ts`]:

- **Okur sorusu** (`iddialar`): "Deniz'e ne oldu?" Seçenekleri ve isteğe bağlı gerçek cevap.
- **Sahne niyetleri** (`sahne_niyetleri`): her sahne bir soruya karşı *destekler · zayıflatır · açıklar* işareti taşır. Gerçeği destekleyen işaret *ipucu*, başkasını destekleyen *yanıltmaca*dır.
- Okurun öğrendiği sahne okuma sırasından hesaplanır; sahne taşınınca kendiliğinden değişir.

Bu model **konuma dayalıdır, son duruma değil.** Bir ipucunun açılıp açılmadığı, "açıklar" niyeti taşıyan bir sahnenin okuma sırasında nerede durduğuna bakılarak bulunur. Sonraki kitaplar yazıldıkça I. kitabın içindeki sıra değişmez.

### 7.3 Öneri

**"Kitap sonunda açık olanlar"** [öneri] = seçilen eserin son sahnesine kadar (o eserin okuma sırasıyla):
1. En az bir sahne niyeti olan ama *açıklar* niyeti taşıyan sahnesi bu eserde bulunmayan **okur soruları**. Her biri için: hangi sahnelerde ipucu ya da yanıltmaca var.
2. Bu eserde sahnesi olan ve `hat.4` ("Bilerek açık mı kalacak?") cevabı olmayan **kurgu hatları**; yalnız bilgi olarak, uyarı rengi olmadan.
3. Bu esere `mesele_konusu` ile bağlı *düşünülecek* **açık meseleler**.

**"Bugün bildiğimize göre"** sütunu: Her açık okur sorusu için, seri sırasındaki **sonraki eserlerde** *açıklar* niyetli bir sahne var mı? Varsa hangisi.

| Soru | I. kitabın sonunda | Bugün bildiğimize göre |
|---|---|---|
| Deniz'e ne oldu? | Açıklandı (I, 11. sahne) | — |
| Silinmiş isyanın nedeni ne? | Açık · 2 ipucu, 1 yanıltmaca | II, 7. sahnede açıklanıyor |
| Orhun annesini tanıyor muydu? | Açık · 1 ipucu | Hâlâ açık |

**Sınırlar:**

- Seriler arası hesap için eserlerin seri içindeki **önerilen okuma sırası** (§3.3) kullanılır. Ana serisi olmayan eser için yalnız kendi içi hesaplanır.
- Program serbest metinden "bu sır çözüldü" çıkarmaz; yalnız sahne niyetlerine bakar.
- Bir sahnenin evren tarihi, eser içindeki sırası ve serinin okuma sırası ayrı kalır.
- Kurgu hattı ipucu rolleri (`HAT_ROLLERI`) değişmeden kalır; bu hesapta kullanılmaz. İkisinin ileride birleşip birleşmeyeceği ayrı bir karardır (D12).

## 8. Karakterin kitaplar boyunca yolu

### 8.1 İlke

**Karakterin evren kaydı tektir.** Kitaba göre değişen şey yazarın o kitap için karakter **planıdır** ve evrenin gerçeği (durum geçmişi, olaylar) değildir.

### 8.2 Model

Yeni ilişki türü **`eser_odagi`** [öneri]: A karakter, B eser. Bugünkü `odak` ilişkisinden ayrıdır (o sahne için, `alan/iliski-turleri.ts:115`).

Bu ilişki **kendi kodu olan bir kayda** dönüşebilir [tasarım §3.2: "Miktar, vade… gerekince ilişki kendi kodu olan bir kayda dönüşür"]. Öneri: `eser_odagi` baştan kayıt gibi soru taşıyabilen bir ilişki olsun. Soru seti **`karakter_kitapta`**:

| Kod | Soru | Tür |
|---|---|---|
| 1 | Kitabın başında ne istiyor? | serbest |
| 2 | Kitabın sonunda ne istiyor? | serbest |
| 3 | Başlangıçtaki inancı ya da yanlış varsayımı | serbest |
| 4 | Bu kitapta inancı nasıl sınanıyor? | serbest |
| 5 | Aldığı en zor karar ve vazgeçtiği seçenek | serbest + **sahne/olay bağlantısı** ("Yeni kayıtla cevapla" ile ya da var olan sahneyi seçerek) |
| 6 | Aştığı sınır, ödediği bedel | serbest + sahne/olay bağlantısı |
| 7 | İlişkilerinde ne değişti? | serbest |
| 8 | Sonraki kitaba taşıdığı iç çatışma | serbest |

- **Yapılandırılmış olan:** ilişkinin kendisi (hangi karakter, hangi eser), sorular ve cevapların sahne/olay bağlantıları.
- **Serbest olan:** cevap metinleri. Program bunları karşılaştırmaz, yorumlamaz.
- **Çoklu bakış açısı:** Bir eserde birden çok `eser_odagi` olabilir; "ana karakter" diye tek bir alan yoktur. Seri sayfasındaki matris satır olarak bütün odak karakterleri gösterir.
- **Tarihsel doğruluk:** Her cevap kendi eserine aittir. III. kitabın cevabı I. kitabın satırını değiştirmez; satırlar yan yana durur.

### 8.3 Neden yalnız açıklama değil, neden ayrı tür değil

| Seçenek | Artı | Eksi |
|---|---|---|
| İlişki açıklaması (önceki Ö11) | En hafif | Tek metin; karşılaştırılamaz; sahneye bağlanamaz |
| **Soru taşıyan ilişki (öneri)** | Soru altyapısı, durumları ve "Yeni kayıtla cevapla" aynen kullanılır; kitap başına ayrı | İlişkiye soru bağlamak bugün yok; `soru_cevaplari.kayit` sütunu ilişki kodu da kabul etmeli |
| Ayrı kayıt türü ("karakter yolu") | Tam esneklik | Her karakter × kitap için bir kayıt; kayıt listesini kalabalıklaştırır |

## 9. Çalışma durumları

İki ölçek, ikisi de isteğe bağlı ve **karar durumundan ayrı** [öneri]:

| Ölçek | Değerler | Nerede |
|---|---|---|
| **Eser** | fikir · plan · ilk taslak · düzeltme · bitti · yayımlandı | Eser şablonunda seçim alanı |
| **Sahne** | planlandı · ilk taslak · düzenleniyor · gözden geçirildi | Sahne şablonunda seçim alanı |

- Bölüm için ayrı alan yoktur; bölüm görünümü sahnelerinin dağılımını gösterir ("3 ilk taslak, 5 düzenleniyor").
- Eserin durumu sahnelerden **hesaplanmaz**; yazar seçer. Aynı eserde farklı sahne durumları normaldir.
- Çalışma durumu evren kronolojisini, okur modelini ya da denetimleri etkilemez.
- Yüzde ya da "tamamlanma" gösterilmez. Yalnız dağılım (sayı) gösterilir ve bu da yalnız kullanıcı çalışma durumlarını kullanmaya başladıysa.

## 10. Eşitleme, geri alma ve eski evrenler

| Yeni şey | İşlem | İki cihazda çakışma | Geri alma |
|---|---|---|---|
| Seri kaydı | Bugünkü kayıt işlemleri | Alan çatışması [main §10.3] | [main] |
| Eserin seri konumu | `anlati_yerlestir` | Son yazan kazanır, öbürü çatışma listesinde [main: `anlati` alanı] | [main] |
| `alternatif`, `eser_odagi` ilişkileri | `iliski_ekle` / `iliski_sil` | İlişki çatışması [main] | [main] |
| Soru cevapları (yeni setler, `eser_odagi` dahil) | `soru_cevapla` | Alan çatışması [main] | [main] |
| Etkin çalışma | Evren ayarı yazma | Son yazan kazanır | — |
| Yol, gizle, rehber önerilerini kapat | Cihaz ayarı | Eşitlenmez | — |

**Eski evrenler:** Dönüşüm gerekmez. Seri yoksa ağaç bugünkü gibidir. Yeni ilişki türleri ve soru setleri eski evrende boştur. Eser türünün `yerlestir`'de kabul edilmesi eski işlemleri etkilemez. **Eski program sürümüyle açılan evren:** Eski sürüm `ust` türü seri olan `anlati` satırını görür ama seriyi tanımaz; eser listesi `ORDER BY olusturma` ile geldiği için eser kaybolmaz [main: `hizmet.ts:1854`]. Bu, yeni sürüm kodlanırken sınanmalı (sınama: eski sürümün izdüşüm koduyla yeni günlüğü kurmak).

**Büyük evren:** Dayanak sorguları `LIMIT 1`; Şimdi kartı en çok 5 sorgu; kitap sonu hesabı yalnız seçilen eserin sahneleri ve niyetleri üzerinden. Ölçüm ölçütü: 60 bin işlemli evrende Masa açılışı bugünküne göre +50 ms'den az.
