# Rehberli yazarlık: ürün tasarımı önerisi

> **Belge türü:** Tasarım önerisi. **Onaylanmış karar değildir; programın davranışını tanımlamaz.** Bağlayıcı belge `tasarim/dunya-atlasi-tasarim.md`'dir. Buradaki öneriler (Ö1–Ö12) kullanıcı onaylarsa §16'ya fikir olarak, kararlaşınca §1.1'e karar olarak ve ilgili bölümlere davranış olarak girer (§0.2).
>
> **Hazırlanış:** 19 Ekim 2026. Girdi: kullanıcının "Roman Serisi Rehber ve Tasarım Brifi" (depoda değil), depodaki tasarım, `DEVIR.md` ve kod (`claude/modest-lovelace-ozltpf` dalı, `fda4e45`).
>
> **Eş belgeler:** [Yazarlık rehberi](yazarlik-ve-roman-serisi-calisma-rehberi.md) (içerik) · [Kullanım akışları](rehberli-yazarlik-kullanim-akislari.md) · [Mevcut sistemle farklar](rehberli-yazarlik-mevcut-sistem-farklari.md)

---

## 0. Öncelikli inceleme özeti

### 0.1 En acil üç sorun

1. **Program "ne"yi kaydedeceğinizi biliyor, "neden"ini söylemiyor.** Soru kütüphanesi zengin (karakter, karşıt karakter, ilişki, büyü, kültür, Dünya Pusulası…). Ama hiçbir soru, cevabın romanda neye yarayacağını ya da cevaplayamazsanız ne yapacağınızı anlatmıyor. Yöntem bilgisi olmayan yazar soruyu görüyor, ama kullanamıyor. *(Brifin "B. Yöntem problemi".)*
2. **Anlatının üst katmanları için hiç soru yok.** Eser, sahne ve kurgu hattı türlerinin varsayılan soru seti boştur (`alan/sablon.ts` `VARSAYILANLAR`). Karakter için altı soru var; "bu kitabın görevi ne?", "bu sahnede ne değişiyor?" sorusu yok. Roman yazmayı zorlaştıran tam da bu katmandır.
3. **Seri kavramı yok.** Evren tek üst birim (K22). Aynı evrende üç kitap yazılabiliyor, ama "bu üç kitap bir seridir, sırası şudur, büyük sorusu şudur" diyebileceğiniz bir yer yok. Seriyi planlamak isteyen yazar bunu Dünya Pusulası'na ya da serbest bir nota yazmak zorunda.

### 0.2 Mevcut sistemden en çok yararlanacak beş iyileştirme

| # | İyileştirme | Neyi yeniden kullanır | Yeni veri |
|---|---|---|---|
| 1 | **Ö4 — Anlatı soru setleri** (hikâye çekirdeği, kitabın görevi, dönüm noktaları, kurgu hattı) | Soru kütüphanesi, "Bu kayda soru seti ekle", soru durumları (cevaplandı / sonra / ilgisiz) | Yalnız yeni soru tanımları; tablo yok |
| 2 | **Ö5 — Sahne planı** (amaç, engel, değişim) | Soru seti + bağlam paneli (§5.5) | Yalnız yeni soru tanımları |
| 3 | **Ö1 + Ö3 — Yazarlık rehberi ve "Neden?" bağlantıları** | Sayfa rehberi yan paneli (K25), `rehber-metinleri.ts` düzeni | Yok (programla gelen metin) |
| 4 | **Ö6 — Masa'da "Şimdi" kartı** | Kaldığınız yer ve devam notu, önemli açık meseleler, son düzenlenenler, İlk adımlar | Yok (var olanı bir araya getirir) |
| 5 | **Ö9 — "Bu kitaptan seriye kalanlar"** | Kurgu hatları, ipucu durumları, eser açık meseleleri | Yok (türetilmiş liste) |

### 0.3 Yeni veri modeli gerektirebilecek üç karar

1. **Seri nasıl tutulacak?** Öneri: yeni kayıt türü `seri`. Eserler anlatı ağacında serinin altına yerleşir (§4, Seçenek A+). Karar D3.
2. **Başlangıç yolu ve "etkin iş" cihazda mı, evrende mi?** Öneri: başlangıç yolu cihazda; etkin iş, var olan "kaldığınız yer" kaydına bir alan olarak evrende. Karar D2, D9.
3. **Karakterin kitaplar boyunca yolu nerede yazılacak?** Öneri: karakter ↔ eser arasında yeni "eserin odak karakteri" ilişkisi; açıklaması plan notunu taşır. Karar D6.

### 0.4 Önerilen ilk kullanım ekranı (metinsel tel kafes)

Kullanıcı 19 Ekim'de başlangıç için **taslak B**'yi seçti: Yaz sayfasının üstünde "İlk adımlar" listesi (K26, kodda). Brifin önerdiği ayrı "Nereden başlamak istersiniz?" ekranı, kullanıcının o gün **seçmediği** taslak A'ya denk düşüyor. Bu yüzden öneri, K26'yı bozmadan genişletmektir. Ayrı ekran yok; liste kendi yolunu değiştirebilir (Ö2):

```text
┌─ Yaz ─────────────────────────────────────────────────────────────┐
│ İlk adımlar                                         [Gizle]       │
│ Nasıl başlamak istersiniz?                                         │
│  (•) Bir sahneyle   ( ) Bir fikirle   ( ) Bir karakterle           │
│  ( ) Bir dünyayla   ( ) Seri planıyla                              │
│                                                                    │
│  1. Bir eser oluşturun                     ✓                        │
│  2. İlk sahneyi ekleyin                    ← sıradaki   [Sahne ekle]│
│  3. Metinde bir kayda bağlanın                                      │
│  4. Sahneye tarih ya da mekân verin                                 │
│                                                                    │
│  Bu adımlar neden?  ›                                               │
└────────────────────────────────────────────────────────────────────┘
```

"Bir fikirle" seçilince adımlar değişir; yapılanlar yine evrenden anlaşılır:

```text
│  1. Fikrinizi tek cümleyle yazın           [Fikri yaz]             │
│     Kimin başına ne gelebilir? Ayrıntı şimdi gerekmiyor.           │
│     Örnek göster ›                                                 │
│  2. Fikirde bir çatışma bulun                                      │
│  3. Ortadaki karakteri oluşturun                                   │
│  4. İlk sahneyi yazın                                              │
```

### 0.5 Seri sayfasının metinsel tel kafesi

```text
┌─ Hatıra İmparatorluğu  · Seri ────────────────────────── [?] ──────┐
│ Serinin büyük sorusu                                                │
│  İnsanların belleği bir kaynağa dönüşünce özgürlük mümkün mü?       │
│                                                                     │
│ Kitaplar  (sürükleyerek sıralayın)                     [+ Eser]     │
│  ┌ I  Unutulanlar ─────────── Taslak ─┐ ┌ II Hatırlayanlar ── Plan ─┐│
│  │ Soru: Deniz'e ne oldu?             │ │ Soru: Geri verilen anılar…││
│  │ Kapanan: Deniz bulunur             │ │ Kapanan: —                ││
│  │ Seriye kalan: 2 hat · 1 ipucu   ›  │ │                            ││
│  └────────────────────────────────────┘ └────────────────────────────┘│
│                                                                     │
│ Büyük plan                         ▸ (katlı: başlangıç dengesi,      │
│                                       ilk kırılma, orta evre, final) │
│ Karakterlerin yolu                 ▸ (katlı: karakter × kitap)       │
│ Kitaplara yayılan kurgu hatları    ▸ (Görünümler › Kurgu hatları'na) │
│ Açık meseleler (bu seri)           ▸                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 0.6 Açık kararlar

Ayrıntı §7'de. Kısa liste:

| # | Karar | Önerilen varsayılan | Alternatifin bedeli |
|---|---|---|---|
| D1 | Başlangıç: İlk adımlar'ı genişlet mi, ayrı ekran mı? | Genişlet (Ö2) | Ayrı ekran: K26 kararını geri almak; bir tıklama daha |
| D2 | Başlangıç yolu nerede saklanır? | Cihazda, evren başına | Evrende: eşitlenir ama bir arayüz tercihini kalıcı veriye çevirir |
| D3 | Seri modeli | Yeni tür `seri`, eserler ağaçta altına | Bkz. §4 tablo |
| D4 | Bir eser birden çok seride olabilir mi? | Ağaçta tek seri; ikinci üyelik ilişkiyle, ihtiyaç doğunca | Baştan çoklu üyelik: ağaç yerine yalnız ilişki, sıralama karmaşıklaşır |
| D5 | Plan kartları (olası olaylar) nerede? | *Fikir* durumunda olay kaydı | Ayrı plan katmanı: aynı bilginin iki kopyası |
| D6 | Karakterin kitaplardaki yolu | "Eserin odak karakteri" ilişkisinin açıklaması | Ayrı kayıt: daha zengin, daha ağır |
| D7 | Eserin çalışma durumu (fikir / plan / taslak / revizyon / bitti) | Eser şablonunda seçim alanı | Karar durumuyla birleştirmek: iki ayrı anlam karışır |
| D8 | Yazarlık rehberi programın içinde mi? | Evet, yan panelde, çevrimdışı | Yalnız ayrı belge: yazarken erişilemez |
| D9 | "Etkin iş" (şu an üzerinde çalıştığım eser/seri) | Kaldığınız yer kaydında, eşitlenir | Hiç tutmamak: Masa önerileri hangi kitaba ait belirsiz kalır |
| D10 | Menü adları (Masa, İnceleme…) | Önceki öneri tablosu (DEVIR §3.3) | — (zaten bekliyor) |
| D11 | Öneriler hangi sırayla? | §8'deki paket sırası | — |

### 0.7 Kod öncesi kabul senaryoları

Ayrıntı: [Kullanım akışları](rehberli-yazarlik-kullanim-akislari.md). Her pakette en az şunlar sınanır:
- Rehberi hiç kullanmayan biri, bugünkü kadar hızlı eser ve sahne açabilir (Akış 10).
- Rehberi gizlemek ya da yolu değiştirmek hiçbir kaydı silmez, değiştirmez (Akış 11).
- İki cihazda aynı anda yazılan soru cevapları ve seri sırası, mevcut çatışma kurallarıyla birleşir (Akış 15).
- 60 bin işlemli bir evrende Masa'nın "Şimdi" kartı ve İlk adımlar, açılışı ölçülebilir biçimde yavaşlatmaz (Akış 18).
- Hiçbir öneri metnin içeriğinden çıkarım yapmaz; her önerinin dayanağı görünür (K1).

### 0.8 Önerilen uygulama sırası

| Sıra | Paket | Neden önce | Veri riski |
|---|---|---|---|
| 1 | **Rehber içeriği** (bu belgelerle bitti) | Kod beklemeden bugün okunabilir | Yok |
| 2 | **Ö4 + Ö5** anlatı ve sahne soru setleri | En büyük boşluk; yalnız soru tanımları | Çok düşük: yeni kodlar, eski cevaplar dokunulmaz |
| 3 | **Ö1 + Ö3** rehber paneli ve "Neden? / Örnek göster" | Ö4'ün soruları açıklamasız kalmasın | Yok |
| 4 | **Ö2** İlk adımlar'da yol seçimi | K26'yı genişletir | Yok (cihaz tercihi) |
| 5 | **Ö6** Masa'da "Şimdi" kartı | Geri dönen yazar | Düşük (D9 seçilirse bir alan) |
| 6 | **Ö7 + Ö9** seri türü, seri sayfası, seriye kalanlar | Çok kitaplı planlamanın temeli | Orta: yeni tür, anlatı ağacında yeni düzey; dönüşüm sınaması gerekir |
| 7 | **Ö11** karakterin kitaplardaki yolu | Seriye bağlı | Düşük |
| 8 | **Ö8, Ö10, Ö12** okuma yolları, revizyon turu, rehber yolları | Somut ihtiyaç doğunca (K11) | — |

---

## 1. Kullanıcılar ve görev haritası

Brif beş kullanıcıyı ayrı ele almayı istiyor. Programın tek kullanıcısı yazarın kendisidir (K18). Bu beş "kullanıcı", aynı yazarın farklı günlerdeki hâlleridir.

| Kullanıcı | Somut sorunu | Bugün ne buluyor | Önerilen çözüm |
|---|---|---|---|
| **Yeni başlayan** | Boş evrende ilk anlamlı hareketi bilmiyor | İlk adımlar (eser → sahne → bağlantı → bağlam); Masa'da "Başlamak için" üç soru | Ö2 yol seçimi; Ö4 çekirdek soruları; Ö1 "neden" metinleri |
| **Ara verip dönen** | Nerede kaldığını, neyi düşündüğünü hatırlamıyor | Masa'da kaldığınız yer ve not, önemli açık meseleler | Ö6 "Şimdi" kartı: tek yerde, tek önerilen adım |
| **Kendi yöntemi olan** | Rehber ayak bağı olmasın | Rehber yok, her şey isteğe bağlı | Her şey atlanabilir; gizlenen rehber geri gelmez; soru setleri yalnız istenince eklenir |
| **Yalnız dünya kuran** | "Henüz romanın yok" uyarısı istemiyor | Dünya Pusulası, tür soru setleri | Ö2'de "Bir dünyayla" yolu; hiçbir yerde "eser yok" uyarısı yok |
| **Çok kitap yazan** | Kitaplar arası planı, kalanları, okuma sırasını göremiyor | Ayrı eserler; kurgu hatları eserler boyunca; okur modeli eser başına | Ö7 seri, Ö9 seriye kalanlar, Ö11 karakter yolları, Ö8 okuma yolları |

## 2. İlkeler (brif §2.1 ile tasarımın eşleşmesi)

Brifin on ilkesinin dokuzu tasarımda zaten karar ya da kural olarak var. Bu öneriler hiçbirini gevşetmez:

| Brif ilkesi | Tasarımdaki karşılığı |
|---|---|
| Yazarın iradesi | K1, §2.1 |
| Yöntem serbestliği | K5, §6 "Yeni evren başlangıcı isteğe bağlıdır" |
| Açık olmayan bilgi eksik sayılmaz | §3.6 bilinmeyenin türleri; §6 doluluk göstergesi yok |
| Evren gerçeği ile eser düzeni ayrı | §3.3 "Sahne başka bölüme taşınınca evren tarihi değişmez" |
| Yazma akışı kesilmez | §6.1 "Yazarken akış kesilmez" |
| Gerçek içerik korunur | §10, işlem günlüğü |
| Çift kayıt önlenir | §3.3 "Evren kayıtları ortaktır" |
| Açıklanabilir öneri | K1; F31 keşif soruları "mümkün der, oldu demez" |
| Geri alınabilir karar | §3.6 karar durumu; §10.8 geri alma |
| Erken yazmaya izin | K26 İlk adımlar sahneyle başlar |

Bu belgenin eklediği tek yeni ilke:

> **Her rehber sorusu üç şeyi söyler:** ne sorduğunu, neden sorduğunu ve cevaplayamazsanız ne yapabileceğinizi. "Neden" ve "takılırsanız" metinleri programla gelir; kullanıcının verisine bakmaz (Ö1, Ö3).

## 3. Öneriler

Her öneri aynı sırayla yazılır: **Sorun → Davranış → Ekranda → Kayıtlarla ilişkisi → Yeniden kullanım → Sınır durumları → Kabul ölçütü.**

### Ö1 — Yazarlık rehberi (programın içinde)

**Sorun:** Sayfa rehberi (K25) düğmelerin ne işe yaradığını anlatır, yazarlığı anlatmaz. Yöntem bilgisi olmayan yazar için "karakterin korkusu ne?" sorusu bir şey ifade etmez.

**Davranış:** Programla birlikte gelen, değiştirilemeyen bir konu kütüphanesi. 24 konu, her biri iki katmanlı: kısa görünüm (ne, neden, küçük adım) ve isteğe bağlı ayrıntı (sorular, örnek, yanıltıcı örnek, takılırsanız, sınır). İçeriğin kaynağı [yazarlık rehberi](yazarlik-ve-roman-serisi-calisma-rehberi.md) §B'dir.

**Ekranda:**
- Sayfa rehberinin yan panelinde, sayfaya uygun konular için "Bu işi neden yapıyorum?" bağlantısı. Örnek: Yaz sayfasının rehberinde "Sahnede amaç, engel, sonuç" ve "İlk taslak"; kurgu hattı kaydında "Kurgu hatları".
- Aynı yan panelde "Yazarlık rehberi" başlığıyla konu listesi. Bir konu açılınca kısa görünüm; "Ayrıntı" ile geri kalanı.
- Komut paletinde "Yazarlık rehberi" komutu.

**Kayıtlarla ilişkisi:** Yok. Rehber metni programın parçasıdır; evren verisine yazılmaz, eşitlenmez.

**Yeniden kullanım:** `SayfaYardimi` yan paneli ve `rehber-metinleri.ts` düzeni (yeni bir dosya, aynı biçim). Çevrimdışı çalışır.

**Sınır durumları:**
- Kullanıcı rehberi hiç açmazsa hiçbir şey değişmez.
- Rehber metni yazarın verisine bakmaz; "sizin karakteriniz için" demez (K1).
- Metindeki örnekler *Hatıra İmparatorluğu*'ndandır; kullanıcının evreninden alıntı yapmaz.

**Kabul ölçütü:** Her konunun kısa görünümü bir ekrana sığar (telefonda en çok iki kaydırma). Her konu "ne zaman gerekmez" satırı içerir. Konular programlama terimi içermez. İngilizce terim (logline, foreshadowing) yalnızca ilk kullanımda, Türkçe karşılığıyla geçer.

---

### Ö2 — İlk adımlar'da başlangıç yolu

**Sorun:** K26'nın dört adımı sahneyle başlayan yazara uygundur. Fikirle, karakterle ya da dünyayla başlamak isteyen için ilk adım "eser oluşturun" anlamsız gelebilir. Brifin "Nereden başlamak istersiniz?" ekranı bunu çözer, ama kullanıcı 19 Ekim'de ayrı ekran yerine listeyi seçti.

**Davranış:** İlk adımlar listesinin başında tek satırlık yol seçimi. Beş yol, her birinin kendi dört adımı var. Adımların yapılıp yapılmadığı, bugünkü gibi yalnız evrenin kayıtlı verisinden anlaşılır.

| Yol | Adımlar | "Yapıldı" sayılması |
|---|---|---|
| **Bir sahneyle** (varsayılan; bugünkü) | Eser · sahne · bağlantı · tarih/mekân | Bugünkü `ilkAdimlar` isteği |
| **Bir fikirle** | Hikâye çekirdeği · çatışma · karakter · sahne | `baslangic.1` cevaplandı · `baslangic.2` cevaplandı · bir karakter kaydı · bir sahne |
| **Bir karakterle** | Karakter · "En çok ne istiyor?" · karşıt güç · karakterin bulunduğu ilk sahne | Karakter kaydı · `karakter.1` cevaplandı · `dusman`/`rakip` ilişkisi ya da `karsit` seti · karakterin "bulunuyor" rolüyle bağlı olduğu sahne |
| **Bir dünyayla** | Dünyanın kuralı (Pusula 4) · güç ve bedeli (Pusula 3) · bir yer · o yerde geçen bir sahne ya da bir not | Soru durumları · mekân kaydı · mekâna bağlı sahne ya da not |
| **Seri planıyla** | Hikâye çekirdeği · serinin büyük sorusu · ilk kitap · ilk sahne | `baslangic.1` · seri kaydında büyük soru (Ö7) · seriye bağlı eser · sahne |

Bir adımın "sonraya bırakıldı" ya da "ilgisiz" işaretlenmesi o adımı geçilmiş sayar (soru durumları, §6).

**Ekranda:** Bkz. §0.4. Seçenekler radyo düğmesi; klavyeyle ok tuşlarıyla gezilir. Her adımın yanında tek eylem düğmesi (örneğin "Fikri yaz" kaydı açmadan Masa'daki soruyu yerinde açar). Altında "Bu adımlar neden?" bağlantısı (Ö1).

**Kayıtlarla ilişkisi:** Yol seçimi evren verisine yazılmaz (D2); cihazda evren başına saklanır, tıpkı bugünkü "Gizle" gibi. Adımların yapılması zaten var olan kayıtlarla, soru cevaplarıyla ve ilişkilerle olur; yeni bir şey yazılmaz.

**Yeniden kullanım:** `IlkAdimlar` bileşeni ve `ilkAdimlar` isteği; soru durumları; Masa'daki `SoruSatir` (yerinde cevaplama).

**Sınır durumları:**
- **Yol değiştirmek** hiçbir şeyi silmez; yeni yolun adımları da evrenden okunur. Zaten yapılmış olanlar işaretli gelir.
- **İçe aktarılmış evren** (yedekten, başka programdan): Adımlar zaten yapılmış görünür ve liste kendiliğinden kaybolur (bugünkü davranış).
- **İkinci cihaz:** Yol seçimi orada sorulmaz; varsayılan "Bir sahneyle" görünür. Adımlar aynı veriden okunduğu için yapılanlar aynıdır. (D2'de "evrende" seçilirse yol da eşitlenir.)
- **Seri yolu, Ö7 yokken:** Bu yol Ö7 kodlanana kadar görünmez.
- **Büyük evren:** Adım denetimleri sayım değil varlık sorgusudur (`LIMIT 1`); evren büyüklüğünden bağımsızdır.

**Kabul ölçütü:**
- Yol seçmeyen kullanıcı bugünkü listeyi görür.
- Beş yolun her birinde dört adım tamamlanınca liste kaybolur.
- Yol değiştirmek veri değiştirmez (işlem günlüğünde yeni işlem yok).
- "Gizle" bütün yolları gizler; geri getirmek için Masa'da "İlk adımları göster" bağlantısı.

---

### Ö3 — Sorularda "Neden?" ve "Örnek göster"

**Sorun:** Soru kütüphanesindeki sorular ipucu satırı taşır ("Kıtlık, inanç, iktidar…"), ama ne işe yaradıklarını söylemez.

**Davranış:** Programla gelen her soru setinin tanımı isteğe bağlı bir **rehber konusu** (Ö1) ve her soru isteğe bağlı bir **örnek cevap** taşır. Soru satırında iki küçük bağlantı: "Neden?" (rehber konusunu yan panelde açar) ve "Örnek" (örnek cevabı satırın altında katlı gösterir).

**Ekranda:**

```text
En çok ne istiyor?                               Neden? · Örnek
  [ cevap alanı                                ]  Sonra · İlgisiz
  ▾ Örnek: "Kayıp kardeşinin dosyasını bulmak." Somut bir hedef;
    "mutlu olmak" gibi bir his değil.
```

**Kayıtlarla ilişkisi:** Yok. Örnekler ve konu bağlantıları programla gelen soru tanımındadır; kullanıcının düzenlediği ya da eklediği sorularda bulunmaz (onlar için bağlantılar görünmez).

**Yeniden kullanım:** `SORU_SETLERI` tanımı (`ipucu` alanının yanına `ornek` ve `konu`); `SoruSatir`.

**Sınır durumları:**
- Kullanıcı soruyu kendi şablonunda yeniden yazdıysa (§3.1 şablon düzenleyici) kodu aynı kaldıkça örnek görünmeye devam eder; metni çok değiştirdiyse örnek yanıltıcı olabilir. Öneri: soru metni programdakinden farklıysa örnek gösterilmez.
- Örnek cevap, cevap alanına **kopyalanmaz**; düğme yoktur. Örnek bir şablon değil, bir açıklamadır.

**Kabul ölçütü:** Programla gelen bütün sorularda "Neden?" bir konu açar. Örnekler *Hatıra İmparatorluğu*'ndandır ve birbiriyle çelişmez.

---

### Ö4 — Anlatı soru setleri

**Sorun:** Eser, sahne ve kurgu hattı türlerinin soru seti yok. Yazar kitap ve hat düzeyinde düşünmek için hiçbir soruyla karşılaşmıyor.

**Davranış:** Yeni soru setleri. Var olan setler gibi isteğe bağlı, cevapsız kalması eksik sayılmaz. Kodlar değişmez; cevaplar bu kodlarla saklanır.

| Set kodu | Ad | Varsayılan türü | Sorular (ipucu) |
|---|---|---|---|
| `cekirdek` | Hikâye çekirdeği | — (evren seti; Masa'da) | Kim, ne istiyor? · Ona ne engel oluyor? · Başaramazsa ne kaybeder? · Okur hangi sorunun cevabını merak edecek? · Bu hikâye hangi soruyu soruyor? (tema, soru biçiminde) |
| `eser` | Bu kitabın görevi | `eser` | Bu kitabın merkez sorusu ne? · Denge hangi olayla bozuluyor? · Doruk noktası ne? · Bu kitapta ne çözülüyor? · Ne açık kalıyor? · Kitabın sonunda ana karakter nerede? |
| `donum` | Dönüm noktaları | — (esere istenince eklenir) | Açılış durumu · Tetikleyici olay · İlk önemli seçim · İlk başarısızlık ya da yanlış başarı · Orta noktada değişim · Krizin derinleşmesi · Doruk noktası · Sonuç |
| `hat` | Kurgu hattı | `kurgu_hatti` | Bu hattın sorusu ne? · Kimleri kapsıyor? · Şu anki durumu ne? · Olası karşılığı ne? · Bilerek açık mı kalacak? |
| `seri` | Serinin büyük planı | `seri` (Ö7) | Serinin büyük sorusu · Başlangıç dengesi · İlk büyük kırılma · Orta evre · Olası final (birden çok olabilir) · Bilerek cevapsız kalacaklar |
| `devam` | Seriye kalanlar | — (esere istenince) | Sonraki kitap için not · Kalıcı olarak değişenler · Yeni kitabın ilk çatışması nereden doğabilir? |

**Ekranda:** Kayıt sayfasının "Sorular" bölümünde, bugünkü karakter soruları gibi. `donum` ve `devam` setleri "Bu kayda soru seti ekle" listesinde görünür.

**Kayıtlarla ilişkisi:** Cevaplar bugünkü soru cevaplarıyla aynı yerde, aynı işlemlerle (`soruCevapla`) tutulur ve eşitlenir. Bir dönüm noktası cevabı bir olaya ya da sahneye dönüştürülmek istenirse bu, bugünkü "Bir soru yeni bir kayıtla da cevaplanabilir" davranışıyla yapılır (§6).

**Yeniden kullanım:** Tamamen: `SORU_SETLERI`, `VARSAYILANLAR`, `SoruBolumu`, `MasaPusulasi`.

**Sınır durumları:**
- **Eski evrenler:** Varsayılan şablonunu değiştirmemiş türler yeni setleri kendiliğinden görür; değiştirmiş türlerde (§3.1 "Yazar değiştirince evrene kaydedilir") görünmez, "Bu kayda soru seti ekle" listesinde durur. Hiçbir cevap kaybolmaz.
- **`cekirdek` ile var olan `baslangic`:** `baslangic` setinin üç sorusu (temel fikir, çatışma, ortadaki karakter) değiştirilmez; `cekirdek` ayrı ve isteğe bağlıdır. Masa'da "Başlamak için" bugünkü gibi kalır, `cekirdek` Dünya Pusulası'nın yanında katlı durur. (Alternatif: `baslangic`'i genişletmek; eski kodlar değişmez ama soru sayısı artar. Önerilmez.)
- **Doluluk göstergesi yoktur;** "8 sorudan 3'ü cevaplandı" yazılmaz.

**Kabul ölçütü:** Yeni bir eser kaydı açıldığında "Bu kitabın görevi" soruları görünür. Var olan bir evrende hiçbir cevap kaybolmaz ya da kodu değişmez (dönüşüm sınaması). Soru setleri §Ek A'ya eklenir.

---

### Ö5 — Sahne planı

**Sorun:** Sahne yazarken "bu sahnede ne olmalı?" sorusu için yer yok. Bağlam paneli (§5.5) evren bilgisini gösterir, yazarın sahne niyetini göstermez.

**Davranış:** `sahne` türüne varsayılan soru seti `sahne_plani`: **Kim ne istiyor? · Ne engel oluyor? · Sahne sonunda ne değişiyor? · Okur ne öğreniyor?** Yaz ekranındaki bağlam panelinin en üstünde katlı "Sahne planı" bölümü bu dört soruyu gösterir ve yerinde cevaplatır.

**Ekranda:**

```text
┌ Bağlam ────────────────────────┐
│ ▸ Sahne planı                   │   ← katlı; cevap varsa ilk satırı görünür
│ ▾ Sahne planı                   │
│   Kim ne istiyor?               │
│   [Lale, Deniz'in dosyasını…]   │
│   Ne engel oluyor?              │
│   [Dosya silinmiş]              │
│   Sahne sonunda ne değişiyor?   │
│   [ ]            Sonra · Neden? │
│ Tarih: 412, vergi günü          │
│ Mekân: Başkent arşivi           │
│ …                               │
└─────────────────────────────────┘
```

**Kayıtlarla ilişkisi:** Cevaplar sahnenin soru cevaplarıdır. Sahnenin tarihi, mekânı, bakış açısı ve katılımcıları **tekrar sorulmaz**; onlar zaten sahne alanlarıdır. "Okur ne öğreniyor?" serbest metindir; okur modelinin (§3.6) yerine geçmez. Yazar isterse okur modeline ayrıca işaretler.

**Yeniden kullanım:** Soru seti (Ö4 ile aynı altyapı); bağlam paneli (`SahneBaglamPaneli`); `SoruSatir`.

**Sınır durumları:**
- **Boş sahne kuralı (§5.5):** Sahne planı cevapları sahneyi "dolu" saymaz; panel boş sahnede kapalı başlar. Sahne planı bölümü yalnız panel açıkken görünür.
- **Yazarken akış:** Plan soruları pencere açmaz, odak almaz; bölüm katlı kalır (§6.1).
- **Atmosfer sahnesi:** "Ne değişiyor?" sorusu "ilgisiz" işaretlenebilir; program uyarı vermez.

**Kabul ölçütü:** Plan cevabı yazılan sahne, başka bir cihazda aynı cevapla açılır. Plan bölümünü hiç açmayan yazar için Yaz ekranı bugünküyle aynıdır.

---

### Ö6 — Masa'da "Şimdi" kartı

**Sorun:** Masa bugün dört ayrı bölüm gösterir: kaldığınız yer, son düzenlenenler, hızlı notlar, bahsedilen ama yazılmamışlar. Ayrıca başlamak için soruları, önemli açık meseleleri ve Dünya Pusulası'nı gösterir. Geri dönen yazar için "şimdi ne yapayım?" sorusunun cevabı bu listelerin arasında dağılmıştır.

**Davranış:** Masa'nın en üstünde tek bir kart. Kart, aşağıdaki öncelikle **ilk bulunan** dayanağı gösterir. Altında en çok iki alternatif listelenir:

| Öncelik | Dayanak (yalnızca kayıtlı veri) | Kartta | Gerekçe satırı |
|---|---|---|---|
| 1 | Kaldığınız yerde bir devam notu var | Not + "Sahneye dön" | "Son oturumda kendinize bu notu bıraktınız." |
| 2 | Önemli işaretli, düşünülecek bir açık mesele var (etkin işe bağlı olan önce) | Mesele + "Aç" | "Bu meseleyi önemli olarak işaretlemiştiniz." |
| 3 | İlk adımlarda sıradaki adım (gizlenmediyse) | Adım + eylem | "Seçtiğiniz başlangıç yolunda sıradaki adım." |
| 4 | Sonraya bırakılmış bir soru (etkin işe bağlı olan önce) | Soru + "Cevapla" | "Bu soruyu sonraya bırakmıştınız." |
| 5 | Son düzenlenen sahne | Sahne + "Devam et" | "En son bu sahne üzerinde çalıştınız." |
| — | Hiçbiri | "Nereden başlamak istersiniz?" + yollar (Ö2) | Gerekçe yok |

**Ekranda:**

```text
┌ Şimdi ────────────────────────────────────────────────────┐
│ Unutulanlar › 3. bölüm › Arşivde karşılaşma                │
│ Devam notunuz: "Arşivcinin neden yardım ettiğini netleştir."│
│ [Sahneye dön]   Notu düzenle                               │
│ Son oturumda kendinize bu notu bıraktınız.                 │
│ ─────────────────────────────────────────────────────────  │
│ Ayrıca: Önemli mesele "Orhun annesini tanıyor muydu?" ›    │
│         Sonraya bıraktığınız soru "Kitabın doruk noktası" ›│
└────────────────────────────────────────────────────────────┘
```

**Kayıtlarla ilişkisi:** Yeni kayıt yoktur. Kart var olan dört kaynağı okur. D9 kabul edilirse kaldığınız yer kaydına bir **etkin iş** alanı eklenir (bir eser ya da seri kodu); öncelik 2 ve 4'te o işe bağlı olanlar öne alınır.

**İşaretleme:** Kart kendi başına durum tutmaz. "Sonra", "İlgisiz", "Yaptım" bugünkü soru ve mesele durumlarıdır (*sonra · ilgisiz · cevaplandı*; mesele: *düşünülecek · şu an gerekmiyor · kararlaştırıldı*). Brifin istediği dört ayrı işaret ("ilgisiz / sonra / yaptım / vazgeçtim") bunlarla karşılanır: "vazgeçtim" bir mesele için *şu an gerekmiyor*, bir fikir için *vazgeçilmiş* karar durumudur.

**Yeniden kullanım:** `kaldigiYer`, `meseleler`, `evrenSorulari`, `ilkAdimlar` istekleri; Masa bölümleri.

**Sınır durumları:**
- **Her öneri bir kez tıklanınca biter değil:** Kart sürekli verinin hâlini yansıtır. Mesele kararlaştırılınca kendiliğinden düşer.
- **Tekrarlayan bildirim yok:** Kart Masa'da durur; başka sayfada görünmez, ses ya da rozet çıkarmaz.
- **İki cihaz:** Devam notu eşitlenir (bugün de öyle); kart iki cihazda aynı dayanağı gösterir.
- **Hiç veri yoksa** kart boş bir uyarı değil, yol seçimini gösterir.

**Kabul ölçütü:** Kart her zaman bir gerekçe satırı taşır. Kartın gösterdiği hiçbir şey metin içeriğinden çıkarılmaz. Kart açılışı, büyük evrende (60 bin işlem) Masa'nın bugünkü açılışından 50 ms'den fazla uzun sürmez.

---

### Ö7 — Seri

**Sorun:** Çok kitaplı planlamanın yeri yok. Kitapların sırası, serinin büyük sorusu, kitaplar arasında kalanlar ayrı ayrı notlarda dağılıyor.

**Davranış:**
- Yeni kayıt türü **Seri** (`seri`, grup "Anlatı ve yazarlık"). Varsayılan soru seti `seri` (Ö4).
- Anlatı ağacında yeni bir üst düzey: **seri › eser › bölüm › sahne**. Bir eser bir serinin altına sürüklenebilir; serisiz eser bugünkü gibi en üstte durur.
- Seri içindeki eser sırası **önerilen okuma sırasıdır**. Evren kronolojisi değildir, yayın sırası değildir.
- Seri sayfası (§0.5): büyük soru, kitap kartları, katlı büyük plan, katlı karakter yolları (Ö11), kurgu hatlarına bağlantı, bu seriye bağlı açık meseleler.

**Ekranda:** Yaz sayfasının eser ağacında seri bir klasör gibi görünür (katlanır). "Yeni eser" düğmesinin yanında "Yeni seri". Seri kaydı açılınca kayıt sayfası, eser kaydındaki "Anlatı sözleşmesi" gibi seriye özel bölümler gösterir.

**Kayıtlarla ilişkisi:**
- Seri bir kayıttır: adı, özeti, karar durumu, soruları, notları, açık meseleleri vardır. Silinmesi ve geri yüklenmesi bugünkü kayıt kurallarıyla olur.
- Eserin seriye yerleşmesi anlatı ağacındaki üst ilişkisidir (bugün bölümün esere, sahnenin bölüme yerleştiği aynı yapı, `anlati` tablosu). İşlem günlüğünden geçer.
- **Seri silinirse** eserler en üst düzeye çıkar; hiçbir eser, sahne ya da metin silinmez (sahne kaldırma §9.6 ile aynı ilke).
- **Eserin seriden çıkması ya da başka seriye taşınması** evren tarihini, okur modelini ya da sahneleri etkilemez. Okur modeli eser başına hesaplandığı için (§3.6) değişmez. Seri düzeyindeki okuma yolları (Ö8) etkilenir.

**Yeniden kullanım:** Kayıt türü, şablon, soru seti, anlatı ağacı ve sürükle-bırak sıralaması, kayıt sayfası. Yeni olan: ağaçta seri düzeyi, seri sayfasının bölümleri.

**Sınır durumları:**
- **Bir eser iki seride (D4):** Ağaçta tek üst vardır. Paylaşılan evrende bir yan roman iki seriye birden aitse ikinci üyelik "seriye de dahil" ilişkisiyle gösterilir. Bu, somut ihtiyaç doğana kadar kodlanmaz.
- **Serisiz eserler** her zaman desteklenir; "seriye bağlayın" uyarısı yoktur.
- **Seride tek eser:** Geçerlidir; seri sonradan büyüyebilir.
- **Eşzamanlı sıralama:** İki cihazda aynı seride farklı sıralama yapılırsa mevcut sıralama çatışma kuralları uygulanır (anlatı ağacı ile aynı).
- **Wiki ve yayın:** Seri bir yayın birimi değildir; yayın kapsamı eser ve baskıya bağlı kalır (§11).

**Kabul ölçütü:**
- Eski evrenler dönüşümsüz açılır (seri yoksa ağaç bugünkü gibi).
- Eseri seriye taşımak ve geri almak, işlem günlüğünde tek işlem grubudur ve geri alınabilir.
- Seriyi silmek hiçbir eseri silmez (sınama).
- Seri sayfası 50 eserli bir seride bir saniyenin altında açılır.

---

### Ö8 — Seri okuma yolları *(sonraya)*

**Sorun:** Öncül roman, yan kitap ve "ikinci kitaptan başlayan okur" için okurun bilgisi farklıdır (§3.6, §3.3).

**Davranış:** Bir seriye birden çok adlı okuma yolu ("Yayın sırası", "Kronolojik"). Okur modeli bir okuma yolu boyunca eserleri art arda okuyan bir okur olarak hesaplanabilir.

**Neden sonraya:** Bugün okur modeli eser başınadır ve tasarım bunu açıkça istiyor ("Birinci kitapta açıklanan sır, aynı evrendeki başka kitabı ilk okuyan için hâlâ sır olabilir"). Okuma yolları bu modeli genişletir, değiştirmez; ama somut bir takılma (K11) olmadan kodlanmamalı.

---

### Ö9 — "Bu kitaptan seriye kalanlar"

**Sorun:** Bir kitap bitince seriye ne kaldığı (açık hatlar, verilmiş ama karşılığı gelmemiş ipuçları) dağınık.

**Davranış:** Eser sayfasında ve seri sayfasındaki kitap kartında türetilmiş bir liste:
1. Bu eserin sahnelerine bağlı ama son durumu "karşılığı verildi" ya da "vazgeçildi" olmayan **ipuçları** (kurgu hattı rolleri).
2. Bu eserde ilerleyen ve bu eserden sonraki bir eserde de sahnesi olan ya da hiç kapanmamış **kurgu hatları**.
3. Bu esere bağlı, durumu *düşünülecek* olan **açık meseleler**.
4. Yazar `devam` setini (Ö4) eklediyse onun cevapları.

**Kayıtlarla ilişkisi:** Yeni veri yok. Yalnız okuma.

**Sınır durumları:** "Kapanmamış hat" bir hata değildir; liste uyarı rengi taşımaz. Program bir hattın kapanıp kapanmadığını metinden çıkarmaz; yalnız ipucu durumlarına ve hattın kendi "şu anki durumu" sorusuna bakar.

**Kabul ölçütü:** Liste yalnız açık işaretlere dayanır; her satır kaynağına (ipucu, hat, mesele) bağlantı verir.

---

### Ö10 — Revizyon turu *(yalnız rehber; kod gerekmez)*

**Sorun:** Revizyon katmanlarını (yapı, karakter, dünya, sahne, cümle) izlemek.

**Öneri:** Yeni bir kavram açmak yerine rehber (Konu 21) şunu önerir: Her revizyon turu için bir **açık mesele** etiketi ("revizyon: yapı"). Turun başında bir **sürüm** kaydı (§9.7). Akıllı listeyle o etiketteki düşünülecek meseleler. Bugün yapılabilir. Somut bir takılma doğarsa ayrı bir "revizyon turu" görünümü düşünülür.

---

### Ö11 — Karakterin kitaplardaki yolu

**Sorun:** Bir karakterin seri boyunca nasıl değişeceği planı, evren gerçeğinden (durum geçmişi) ayrı bir yerde tutulmalı.

**Davranış:** Karakter ile eser arasında yeni ilişki türü **"eserin odak karakteri"** (`eser_odagi`; A karakter, B eser). Bugünkü `odak` ilişkisi (karakter ↔ **sahne**, "Odak karakteri olduğu sahne") ayrıdır ve değişmez. İlişkinin açıklama alanı, karakterin o kitaptaki **planlanan yolu**dur ("Geçmişi arıyor"). Seri sayfasında katlı tablo: satırlar odak karakterler, sütunlar serinin eserleri, hücreler açıklamalar.

**Kayıtlarla ilişkisi:** İlişki tablosunun var olan `aciklama` alanı. İlişki *fikir* ya da *kesinleşmiş* olabilir. Bu bir **plan notudur**, evren gerçeği değildir: karakterin evrendeki durumu (unvan, ölüm, yaralar) durum geçmişinde ve olaylarda kalır (§3.5). İkisi birbirine kendiliğinden yazılmaz.

**Sınır durumları:**
- Bir sahnenin odak karakteri ya da bakış açısı olmak ile eserin odak karakteri olmak ayrıdır; biri öbürünü kendiliğinden doğurmaz.
- Açıklama yetmezse (çok uzun plan) ilişki, tasarımın genel kuralıyla kendi kaydına dönüşür (§3.2 "ayrıntı gerekince ilişki kendi kodu olan bir kayda dönüşür").

**Kabul ölçütü:** Karakterin evren kaydı tek kalır. Tablo yalnız açıkça kurulmuş ilişkilerden oluşur.

---

### Ö12 — Rehberli yollar *(sonraya)*

Brifin Akış 01'i (fikir → çatışma → karakter → seri → kitap → sahne) Ö2'nin "Seri planıyla" yolu ve Ö4 soru setleriyle karşılanır. Bunun ötesinde adım adım bir "yol" kavramı (rehberin sırasını kaydeden, ilerlemeyi tutan) **önerilmez**: K5'e ve "doluluk göstergesi yoktur" ilkesine aykırı bir ilerleme duygusu yaratır.

## 4. Seri veri modeli: seçenek karşılaştırması

| | **A+ (önerilen)** Seri kayıt türü; eserler anlatı ağacında altına | **A** Seri kayıt türü; eserler ilişkiyle bağlanır | **B** Eserde "seri" alanı | **C** Sanal seri (yalnız görünüm) | **D** Ayrı plan katmanı |
|---|---|---|---|---|---|
| Serinin kendi soruları, notları, meseleleri | Var (kayıt) | Var | Yok | Yok | Var |
| Kitap sırası | Ağaçtaki konum (bugünkü sıralama altyapısı) | İlişkide sıra gerekir (bugün yok) | Alan | Yok | Kendi |
| Birden çok seri | İkinci üyelik ilişkiyle (D4) | Doğal | Yok | — | Doğal |
| Yaz ağacında görünür | Doğal | Ek iş | Ek iş | Ek iş | Ayrı ekran |
| Yeni veri | Yeni tür; ağaçta yeni düzey | Yeni tür; yeni ilişki + sıra | Yeni alan | Yok | Yeni kavram, kimlik, eşitleme |
| Aynı bilginin iki kopyası | Yok | Yok | Yok | Yok | **Risk:** plan ile evren ayrışır |
| Tasarımla uyum | §3.3 hiyerarşisinin doğal uzantısı; K22 "tek sabit üst birim evrendir" ile çelişmez (seri evrenin içinde bir kayıttır) | Uyumlu | Çoklu seri ve yan kitapta yetersiz | Seri düzeyinde plan tutamaz | §2.1 tek kaynak ilkesiyle çatışır |

**Öneri gerekçesi:** A+ var olan kayıt, şablon, soru ve sıralama altyapısının hepsini kullanır; seri ile kitaplar arasındaki en sık ilişkiyi (sıralı içerme) en az yeni kavramla verir. Çoklu üyelik, paylaşılan evrenlerde gerçek bir ihtiyaçtır ama nadirdir; ilişkiyle sonradan eklenebilir.

## 5. Plan gerçeği ile evren gerçeği

Brif "Kitap III'te kahraman ölebilir" (olasılık) ile "Kahraman 412'de öldü" (kesin evren bilgisi) ayrımını istiyor. Tasarımda bunun araçları zaten var. Yeni bir "plan katmanı" önerilmez:

| İhtiyaç | Araç (bugün var) | Not |
|---|---|---|
| Olası bir olay | Olay kaydı, karar durumu *fikir* | Denetlenir ama uyarıları sessiz grupta (K13); zaman çizelgesinde karar rozetiyle ayrı görünür |
| Alternatif finaller | İki *fikir* olay; biri *kesinleşmiş*, öbürü *vazgeçilmiş* | Vazgeçilen silinmez, denetlenmez |
| Henüz karar verilmemiş soru | Açık mesele (*düşünülecek*) | "Önemli" işaretlenirse Masa'da öne çıkar |
| Neden bu seçim? | Gerekçe kaydı | Soru, seçenekler, çözüm, gerekçe |
| Bir alternatifi ayrı yazmak | Deneme kopyası (§9.7) | Ana metni bozmaz |
| Karakterin planlanan yolu | Ö11 ilişki açıklaması | Durum geçmişine yazılmaz |
| Sahnenin niyeti | Ö5 soruları | Evren olayı değildir |

**Eksik olan tek ayrım:** Eserin **çalışma durumu** (fikir / plan / taslak / revizyon / bitti). Bu, karar durumuyla (*fikir · kesinleşmiş · vazgeçilmiş*) aynı şey değildir: kesinleşmiş bir eser hâlâ taslak olabilir. Öneri (D7): eser şablonunda bir seçim alanı. Kullanıcı şablonu değiştirebilir.

## 6. Veri katmanları: neyin nerede durduğu

| Bilgi | Katman | Eşitlenir mi | Gerekçe |
|---|---|---|---|
| Rehber metni, örnekler, konu bağlantıları | Program | — | Kullanıcı verisi değil |
| İlk adımlar: "Gizle", seçilen yol | Cihaz (evren başına) | Hayır | Arayüz tercihi (bugünkü "Gizle" ile aynı) |
| Bağlam panelinin açık/kapalı oluşu | Cihaz | Hayır | Bugünkü gibi |
| Soru cevapları ve durumları (Ö4, Ö5) | Evren | Evet | Yazarın kurgu kararları |
| Seri, seriye yerleşme (Ö7) | Evren | Evet | Kayıt ve ağaç |
| Odak karakter planı (Ö11) | Evren | Evet | İlişki |
| Devam notu, etkin iş (Ö6, D9) | Evren (kaldığınız yer) | Evet | §5.9 "cihazlar arasında eşitlenir" |

Hepsi işlem günlüğünden geçer (§10.1). Rehberin kapatılması, gizlenmesi ya da yol değiştirmesi hiçbir evren verisine yazmaz.

## 7. Açık kararlar (ayrıntılı)

**D1 — Başlangıç ekranı.** *Varsayılan:* İlk adımlar'ı genişlet (Ö2). *Alternatif:* evren oluşturulunca ayrı "Nereden başlamak istersiniz?" ekranı (brif §6.2 ve DEVIR'deki taslak A). *Bedel:* 19 Ekim'deki "taslak B" kararını geri almak; her yeni evrende bir ekran daha; ama seçimler daha görünür olur.

**D2 — Yol seçimi nerede?** *Varsayılan:* cihaz. *Alternatif:* evrende, eşitlenen bir tercih. *Bedel:* Eşitlemek, iki cihazda aynı yolu gösterir. Ama bir arayüz tercihini kalıcı veriye çevirir ve işlem günlüğüne bir işlem ekler. Tablet en sona ertelendiği için bugün fark küçüktür.

**D3 — Seri modeli.** *Varsayılan:* A+ (§4). Alternatifler ve bedelleri §4 tablosunda.

**D4 — Çoklu seri üyeliği.** *Varsayılan:* ağaçta tek seri; ikinci üyelik ihtiyaç doğunca ilişkiyle. *Bedel:* Yan roman iki seride birden ağaçta görünmez, yalnız seri sayfasında görünür.

**D5 — Plan kartları.** *Varsayılan:* *fikir* olay kaydı (§5). *Alternatif:* ayrı "plan kartı" türü. *Bedel:* Kart kesinleşince olaya dönüştürmek gerekir; iki kayıt, bir bilgi.

**D6 — Karakter yolu.** *Varsayılan:* "eserin odak karakteri" ilişkisinin açıklaması. *Alternatif:* her karakter × eser için ayrı not kaydı. *Bedel:* Daha zengin, ama tablo için sorgu ve kayıt sayısı artar.

**D7 — Eserin çalışma durumu.** *Varsayılan:* eser şablonunda seçim alanı (fikir / plan / taslak / revizyon / bitti). *Alternatif:* hiç tutmamak. *Bedel:* Seri sayfasındaki kitap kartında durum görünmez.

**D8 — Rehber programın içinde mi?** *Varsayılan:* evet, çevrimdışı, yan panelde. *Alternatif:* yalnız bu belge. *Bedel:* Yazarken rehbere ulaşmak için programdan çıkmak.

**D9 — Etkin iş.** *Varsayılan:* kaldığınız yer kaydına bir alan, Masa'da "Şu an üzerinde çalıştığım: [eser ▾]". *Alternatif:* son düzenlenen eseri etkin saymak (veri yok). *Bedel:* Son düzenlenen her zaman niyeti yansıtmaz (bir yer kaydını düzeltmek etkin işi değiştirir).

**D10 — Menü adları.** DEVIR'de bekliyor; bu belgeden bağımsız.

**D11 — Sıra.** §0.8.

## 8. Mevcut kararlarla çakışmalar ve çözümleri

| Çakışma | Nerede | Çözüm |
|---|---|---|
| **K11 fikir girişi dondurulmuş.** Ö2, Ö4–Ö9, Ö11 yeni fikir. | §1.1 K11 | K11 somut bir takılmayla fikir girişine izin verir. Kullanıcının takılması bu brifte açıkça yazılı: "roman yazmak konusunda gerekli donanıma sahip değilim; boş evrende nereden başlayacağımı bilmiyorum." Öneri: kullanıcı onaylarsa F48 ve sonrası olarak §16'ya *Öneri* durumunda girer. |
| **K26 taslak B.** Brif ayrı başlangıç ekranı öneriyor. | §1.1 K26, §5.10 | D1: K26'yı genişlet, değiştirme. |
| **K24 menü.** Brif seri merkezi için yeni sayfalar öneriyor. | §5.10 | Yeni menü öğesi yok. Seri bir kayıttır; sayfası kayıt sayfasıdır; Yaz ağacında görünür. |
| **K1 yapay zekâ yok.** Brif "öneri kartları" istiyor. | §1.1 K1 | Ö6'nın her satırı kayıtlı bir veriye dayanır ve dayanağını yazar. Metin içeriğine bakan hiçbir kural yok. |
| **K22 tek üst birim evren.** Seri yeni bir üst birim mi? | §1.1 K22 | Hayır. Seri evrenin içinde bir kayıttır; eserler gibi. |
| **§6 "doluluk göstergesi yoktur".** İlk adımlar üstü çizili adımlar gösteriyor. | §6, K26 | İlk adımlar bir yüzde ya da puan göstermez; dört somut adımdır. Ö2 bunu korur. |
| Brifin "DEVIR §3.5 yanlış başvuru" tespiti | DEVIR | Yanlış başvuru yok: "Rehberli arayüz (§3.5)" DEVIR'in kendi §3.5 bölümüdür (tasarım belgesinin değil). Karışıklığı önlemek için DEVIR'de "DEVIR §3.5" yazılabilir. |
| Tasarım belgesinin başlığındaki "Aşama: tasarım. Program kodu yazılmadı." | Tasarım, ilk satır | Gerçekten eski. Kodlama K9 ile başladı. Düzeltme bir tutarlılık düzeltmesidir (K11'e göre yeni fikir değil); kullanıcı onayıyla yapılır. |

## 9. Bilinçli olarak önerilmeyenler

- Tamamlanma yüzdesi, evren sağlığı puanı, "16 kültürünüz yok" gibi hedef dışı uyarılar.
- Yeni evrende zorunlu sihirbaz ya da form.
- Metni okuyup tema, duygu, tempo ya da "ipucu bulundu" yorumu (K1).
- Seriye özel ayrı bir "evren gerçeği" kopyası.
- Menüye yeni ana sayfa.
- Rehberin her sayfada kalıcı bir panel olarak durması.
