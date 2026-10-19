# Rehberli yazarlık: revizyon analizi

> **Belge türü:** İnceleme. Davranış tanımlamaz.
>
> **Girdi:** Kullanıcının 19 Ekim 2026 tarihli "Rehberli Yazarlık Tasarımı: Eleştirel İnceleme ve Revizyon Talimatları" belgesi (depoda değil). Bu belge, öneri setinin ilk sürümündeki dört dosyayı eleştiriyordu: yazarlık rehberi, ürün tasarımı, kullanım akışları, mevcut sistemle farklar (`6fa89ac`).
>
> **Çıktı:** Bu revizyonda ilk sürümün tasarım, akış ve farklar belgeleri kaldırıldı; yerlerine şunlar geldi:
> - [Veri ve kavram modeli](roman-serisi-veri-ve-kavram-modeli.md): her kavramın tek tanımı.
> - [Ürün tasarımı v2](rehberli-yazarlik-urun-tasarimi-v2.md): ekranlar, paketler, kararlar.
> - [Yaratıcı çalışma akışları v2](yaratici-calisma-akislari-v2.md): senaryolar.
>
> [Yazarlık rehberi](yazarlik-ve-roman-serisi-calisma-rehberi.md) aynı dosyada düzeltildi. Eski sürümler git geçmişindedir.
>
> **Doğrulama kaynağı:** `main` = `2a223a9`; açık birleştirme isteği #5 = `claude/modest-lovelace-ozltpf`, `bf5ca22`.

---

## 1. İncelemenin değerlendirmesi

| İnceleme bulgusu | Doğrulama | Sonuç | Yeni yeri |
|---|---|---|---|
| Akış 02: "Adsız eser" kabul ediliyor dendi; ad boşken düğme pasif | **Doğru.** `YazEkrani.tsx:187` `disabled={!ad.trim()}` | Düzeltildi | Akışlar v2 A1 |
| "[var]" etiketi dal ayırmıyor | **Doğru.** İlk adımlar `main`'de yok (`git show origin/main:…/YazEkrani.tsx` içinde `IlkAdimlar` yok), yalnız #5'te | Etiketler [main] / [#5] / [tasarım] / [öneri] oldu | Model, giriş |
| "Bir fikirle" yolu `baslangic.1`'e bağlanmış; o soru evrenin kuralını soruyor | **Doğru.** İlk sürümde tasarım böyle bağlıyordu, farklar belgesi ise sorunun dar olduğunu yazıyordu; kendi içinde çelişkiydi | Üç düzey ayrıldı; `baslangic.1` değişmez | Model §1 |
| "Sonra" yapılmış adım "yapıldı" sayılıyor | **Doğru.** İlk sürüm Ö2: "sonraya bırakıldı ya da ilgisiz işaretlenmesi o adımı geçilmiş sayar" ve liste kapanıyordu | Dört durum; geçilen ✓ değil | Model §2 |
| Toplu "Atla" ile tek "Sonra" ayrılmamış | **Doğru.** İkisi de `soru_cevaplari.durum='sonra'` yazar (`Sablon.tsx` `MasaPusulasi`) | Yeni veri yerine kural: başlangıç soruları Şimdi kartında önerilmez | Model §2 kural 3 |
| Mekân adımı yalnız `mekan` saymamalı | **Doğru.** Ayrıca "Yerler" grubu rota, yolculuk, eşyayı da içeriyor (`alan/turler.ts:15-19`) | Açık tür listesi | Model §2.1 |
| Boş karşıt seti adımı tamamlamamalı | **Doğru.** | Dayanak: ilişki ya da `karsit.1` cevabı | Model §2.1 |
| Alternatif final tek soruya iki cevap olamaz | **Doğru.** `soru_cevaplari` birincil anahtarı `(kayit, soru)` | Her final ayrı olay + `alternatif` ilişkisi | Model §4.2, §6 |
| "Seriye kalanlar" yalnız güncel duruma bakarsa tarih bozulur | **Doğru, ve daha derin:** kurgu hattı ipucu rolleri yalnız **sayılıyor** (`calisan/gorunum.ts:360`); tek ipucunun kimliği yok. İlk sürümün Ö9'u bu yüzden hiç çalışamazdı | Montaj (okur soruları, sahne niyetleri, okuma sırası) temel alındı | Model §7 |
| Seri silme/geri getirme arada taşınan eseri ezebilir | **Doğru,** ilk sürüm tanımlamamıştı | Silme alt satırlara dokunmaz; geri yükleme konum yazmaz | Model §3.4 |
| Ağaç konumu ile üyelik ayrılmalı | **Doğru** | Ana seri (ağaç) + ek üyelik (ilişki, sonra) | Model §3.2 |
| Karakter gelişimi tek açıklamaya sığmaz | **Doğru** | Soru taşıyan `eser_odagi` ilişkisi | Model §8 |
| Sahne ve eser çalışma durumu ayrı | **Doğru** | İki ölçek | Model §9 |
| Etkin çalışma ≠ son düzenlenen | **Doğru;** ilk sürüm D9'da ayrı alan öneriyordu ama "son düzenlenen eseri etkin saymak"ı da seçenek sayıyordu | Etkin çalışma yalnız kullanıcı seçince değişir | Model §5 |
| Olay örgüsü planlama masası eksik | **Doğru bir eksik.** Ama yeni veri gerekmiyor: kurgu hatları, bölüm × kayıt matrisi, montaj ve `yerlestir` etki özeti [main] tek pencerede birleşebiliyor | P6, önce resimli taslak | Tasarım v2 §6 |
| Dünya kurma rehberi romandan ayrı olmalı | **Doğru** | Rehber A.6: dünya kurmak romanın ön hazırlığı değil | Rehber A.6 |
| Yöntemler evrensel görünmemeli; biçimlere göre harita | **Doğru** | Yöntem haritası | Rehber A.6 |
| Her konunun sonunda "uygulamada dene" | **Doğru** | Başlık "Uygulamada deneyin"; dört eylem türü | Rehber, Tasarım v2 §2.2 |
| Örnekteki "anı yalnız sahibine geri verilir" kuralı ile "halka geri vermek" | **Çelişki değil, açıklama eksikti.** Ama incelemenin bakmadığı **gerçek bir çelişki** vardı: C.2 tablosu Lale'nin sınırını "II. kitapta çiğner" diyordu, oysa Konu 5 ve dönüm noktaları I. kitabın ortasında çiğnetiyor | İkisi de düzeltildi | Rehber Konu 9, 12, C.2 |

**İncelemenin abarttığı yerler:**

| Bulgu | Neden kısmen | Karar |
|---|---|---|
| "Fikir olay planı temsil etmeye yetmez" | Kayıt düzeyi ve **alan düzeyi** karar durumu ayrı tutuluyor (`kayit_alan_karar` işlemi, `alan_kararlari` sütunu). "Olay kesin, tarihi taslak" bugün ifade edilebiliyor. Eksik olan yalnız alternatiflik bağı | Ayrı plan katmanı yok; `alternatif` ilişkisi var (Model §4) |
| Karakter gelişimi için on boyut | Çoğu serbest metin sorusu olarak karşılanabilir; yapılandırılması gereken yalnız "hangi karakter, hangi kitap" ve kararların sahne bağlantısı | Soru taşıyan ilişki; ayrı tür yok (Model §8.3) |
| Planlama masasının yeni yetenek listesi (karakter gelişim görünümü, neden–sonuç ağı vb.) | Bunlar zaten ayrı görünümler olarak var | Masa yeni veri tutmaz; var olanları birleştirir |

## 2. İlk sürümdeki belgeler arası çelişkiler

| Konu | Rehber | Tasarım (v1) | Akışlar (v1) | Farklar (v1) | Çözüm |
|---|---|---|---|---|---|
| Fikir yolunun ilk adımı | "Temel fikir" Konu 2'de | `baslangic.1` | `baslangic.1` | "dar" diyordu | Not → eser → `cekirdek` (Model §1) |
| Ertelenen adım | — | Geçilmiş sayılır | Liste kapanır | — | Geçildi ≠ yapıldı (Model §2) |
| Olası final | İki fikir olay | Soru seti `seri` içinde "Olası final" | "Olası final iki kez" | — | Ayrı olaylar + `alternatif` |
| Dönüm noktaları | 8 durak (araç) | `donum` soru seti | Soru → sahne | — | Olay ya da plan sahnesi; masa (P6). `donum` seti kaldırıldı |
| İlk adımlar durumu | — | "[var]" | "[var]" | "Bugün çalışanlar" | [#5] |
| Seriye kalanlar | Ö9 | İpucu durumu | — | — | Montaj (Model §7) |
| Revizyon turu | Etiket + sürüm | Ö10 kod gerekmez | — | — | Aynı (rehber) |

## 3. Mevcut kararlarla uyum

| Karar | Uyum | Not |
|---|---|---|
| K1 yapay zekâ yok | Uyumlu | Her dayanak yapılandırılmış veri; Model §2.1, §5.3 yasaklar |
| K5 yöntem dayatılmaz | Uyumlu | Rehber A.6; hiçbir adım zorunlu değil |
| K11 fikir girişi | **Onay gerekir** | Öneriler kullanıcı onaylarsa §16'ya F48 ve sonrası olarak girer; somut takılma kullanıcının brifinde yazılı |
| K13 düz değer kesin, `[[` fikir | Uyumlu | Plan sahnesi ve olaylar bu kuralla doğar |
| K22 tek üst birim evren | Uyumlu | Seri evrenin içinde bir kayıt |
| K24 menü | Uyumlu | Yeni menü öğesi yok; olay örgüsü masası Görünümler altında |
| K25 sayfa rehberi | Uyumlu | Yazarlık rehberi aynı yan panelde |
| K26 İlk adımlar | Uyumlu, genişletiliyor | Yol seçimi D1 |
| Arayüz önce taslak | Uyumlu | P3, P4, P6 için resimli taslak şart |
| PR'ı ajan birleştirir, görünüş değişirse önce onay | — | Bu set kod içermiyor |

## 4. Mevcut sistem: kodla doğrulananlar

| Özellik | Nerede | Dal |
|---|---|---|
| Soru kütüphanesi: 16 set; "Bu kayda soru seti ekle"; durumlar `cevaplandi · sonra · ilgisiz`; "Yeni kayıtla cevapla"; soru başına tek cevap | `alan/sablon.ts`, `arayuz/Sablon.tsx`, `soru_cevaplari` | main |
| Masa: kaldığınız yer ve devam notu; başlamak için (kayıt < 5); önemli açık meseleler; Dünya Pusulası | `Masa.tsx`, `Sablon.tsx` `MasaPusulasi` | main |
| İlk adımlar (dört adım, Gizle) | `YazEkrani.tsx` `IlkAdimlar`, istek `ilkAdimlar` | **#5** |
| Kayıt ve alan düzeyinde karar durumu | `kayit_alan_karar`, `alan_kararlari` | main |
| Zaman çizelgesinde karar rozeti | `Takvim.tsx` `karar-${o.karar}` | main |
| Kurgu hattı ve rolleri (ipucu rolleri yalnız sayılır) | `alan/iliski-turleri.ts` `HAT_ROLLERI`, `calisan/gorunum.ts:360` | main |
| Kurgu montajı: okur soruları, sahne niyetleri, ipucu/yanıltmaca, okuma sırasından öğrenme | `calisan/montaj.ts`, `sahne_niyetleri` | main |
| Anlatı ağacı (`anlati`: ust, konum); yalnız sahne ve bölüm yerleşir; taşımada etki özeti | `calisan/anlati.ts:93-131` | main |
| Neden–sonuç ilişkileri (`neden`, `kolaylastirdi`, `engelledi`, `tepki`) | `alan/iliski-turleri.ts:116-119` | main |
| Sahne `odak` ilişkisi (sahne için) | `alan/iliski-turleri.ts:115` | main |
| Nottan kayıt (`nottan`), açık mesele ve gerekçe bağları | `alan/iliski-turleri.ts:121-123` | main |
| Sabit başvuru sürümü, yayımlanmış eserle çelişki | `calisan/yayim.ts` | main |
| Evren kuralı ve büyü sistemi türleri | `alan/turler.ts` | main |
| Eser listesi oluşturma sırasıyla | `calisan/hizmet.ts:1854` | main |

**Var olup keşfedilmesi zor olanlar** (rehberin "Uygulamada deneyin" satırları bunlara götürür): "Bu kayda soru seti ekle"; "Yeni kayıtla cevapla"; kurgu montajı ve okur soruları; gerekçe kaydı; deneme kopyası; keşif soruları.

## 5. Eski ve sapmış ifadeler (değiştirilmedi, onay bekliyor)

| İfade | Yer | Öneri |
|---|---|---|
| "Aşama: tasarım. Program kodu yazılmadı." | `tasarim/dunya-atlasi-tasarim.md`, 3. satır | Tutarlılık düzeltmesi: kodlama K9 ile başladı, §14.1 aşamalarının hepsi kodlandı (DEVIR §3.1) |
| "Rehberli arayüz (§3.5)" | `DEVIR.md` §3.3 | DEVIR'in kendi §3.5'i; "DEVIR §3.5" yazılmalı |

## 6. Hâlâ açık

1. **D1–D13 kullanıcı kararları** (Tasarım v2 §8).
2. **İlişkiye soru bağlamak** (Model §8): `soru_cevaplari.kayit` bugün kayıt kodu bekliyor; ilişki kodunu kabul etmesi için izdüşüm ve arayüz işi gerekir. Daha basit seçenek: `eser_odagi` ilişkisi bir "karakter yolu" kaydına dönüşür (§3.2 kuralı). P7'den önce seçilmeli.
3. **Eski sürümle açılış** (Model §10): seri altındaki eserin eski program sürümünde görünürlüğü sınanmalı.
4. **Kurgu hattı ipucu rolleri ile montaj ipuçlarının ilişkisi** (D12).
5. **İki alternatif birden kesinleşirse** inceleme kuyruğu satırı (Akışlar v2 B3) yeni bir denetim kuralıdır; §9.1 tasarımına eklenmeli.

## 7. İncelemenin 20 sorusu: nerede cevaplandı

| # | Soru | Cevap |
|---|---|---|
| 1 | Evren fikri, hikâye çekirdeği, kitap çekirdeği, seri sorusu hangi düzeyde? | Model §1 |
| 2 | Kaynak, kullanım yeri, kopya ayrımı | Model §1 kural 2–3 |
| 3 | Adımın yapıldığı hangi veriyle doğrulanır? | Model §2.1 |
| 4 | Sonra / İlgisiz / Gizle / Yapıldı | Model §2 |
| 5 | Alternatif final ve planlanan olay gerçek olaydan nasıl ayrılır? | Model §4.1–4.2 |
| 6 | Plan sahneye ya da kesin olaya dönüşünce kimlik | Model §4.4 |
| 7 | Plan değişince ne doğrudan, ne incelemeye düşer? | Model §4.5 |
| 8 | I. kitabın sonundaki açıklar III yazıldıktan sonra | Model §7 |
| 9 | Okuma / yayın / evren sıraları | Model §3.3 |
| 10 | Seri ağacı üyelikten ayrı mı? | Model §3.2 |
| 11 | Bir eser birden çok seride | Model §3.2 (ek üyelik) |
| 12 | Seri silinip geri gelince arada değişen üyelik | Model §3.4, Akışlar C2 |
| 13 | Karakter gelişimi sahne ve olaya nasıl bağlanır? | Model §8.2 (5. ve 6. sorular) |
| 14 | Çok bakış açısında tek ana karakter varsayımı | Model §8.2 |
| 15 | Olay örgüsü masası mevcut görünümlerden nasıl yararlanır? | Tasarım v2 §6.2 |
| 16 | Rehber ilgili ekrana nasıl götürür? | Tasarım v2 §2.2 |
| 17 | Etkin iş ile son açılan kayıt | Model §5 |
| 18 | Keşfederek yazanda plan sonradan | Akışlar B2 |
| 19 | Eski evrenler ve iki cihaz | Model §10, Akışlar C3, D2 |
| 20 | Hangi özellik gerçekten çalışıyor (dal, commit, sınama)? | §4 bu belge; etiketler Model girişinde |
