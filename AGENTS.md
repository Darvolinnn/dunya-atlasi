# Bu depoda çalışan yazılım ajanları için

Bu depo, bir yazarın kurgu evrenlerini kurmasına yardım eden kişisel bir web uygulamasıdır (PWA). Kullanıcı Türkçe yazar; arayüz ve kayıt mesajları Türkçedir.

## Bağlayıcı kaynaklar
- **İşi devralıyorsan önce `DEVIR.md`'yi oku:** güncel durum, kalan işler, paralel dallar ve çalışma yöntemi oradadır. Her işin sonunda `DEVIR.md`'yi güncelle.
- Programın davranışının tek kaynağı `tasarim/dunya-atlasi-tasarim.md` belgesidir. Okuma ve güncelleme kuralları o belgenin §0 bölümündedir; bir değişiklik yapmadan önce §0'ı okuyun. Kod için ayrıca bağlayıcı olan bölüm **§18**'dir (veri sözleşmeleri, arama, özellik kullanım sözleşmesi).
- Bir bölümü tek başına uygulamayın; bölümdeki bağlantıları izleyin ve konu dizinindeki (§0.4) tanım yerini esas alın.
- `tasarim/tasarim-gecmisi.md` davranış tanımlamaz; yalnızca gerekçe ve geçmiştir. `tasarim/tasarim.md` ilk araştırmanın kaydıdır.
- Teknik kararlar §1.3'tedir (TK1 SQLite WASM + OPFS SAH havuzu, TK2 Automerge, TK3–TK5 Google, Drive ve medya).
- **Öneri** durumundaki fikirler kodlanmaz. Yeni fikir eklenmez (K11).
- Kodlama kullanıcının onayıyla başladı (K9). Geliştirme sırası §14'tedir; bir aşamanın kapsamı dışına çıkılmaz.

## Kurallar
- Depo herkese açıktır. Depoya sır (anahtar, jeton, parola), **gerçek evren içeriği**, dışa aktarılmış veri ya da ekran görüntüsü konmaz; örnekler uydurmadır (§0.3, §17.3).
- Depoya lisans dosyası eklenmez (K19).
- Her değişiklik işlem günlüğünden geçer: veritabanına yalnızca `EvrenVt.islemYap()` (başka cihazdan gelenler için `disaridanAl()`) yazar; görünen tablolar işlemlerden türetilir (§10.1).
- Programda yapay zekâ yoktur; serbest metinden anlam çıkarılmaz (K1).
- Kullanıcıya gösterilen metinde programlama terimi kullanılmaz.

## Yapı
- `uygulama/`: Vite + TypeScript + Preact. `npm run dev` (port 5173; Google girişine izin verilen adres), `npm test`, `npm run denetle`.
  - `src/alan/`: tarayıcıdan bağımsız alan kuralları (kod, işlem, Türkçe, türler, metin şeması).
  - `src/calisan/`: veritabanı çalışanı (Web Worker), işlemlerin tablolara uygulanması (`izdusum.ts`), istekler (`hizmet.ts`).
  - `src/veri/`: arayüz ile çalışan arasındaki istekler (`api.ts`).
  - `src/arayuz/`: ekranlar.
- `deneyler/`: teknik deneyler; depoya girmez (§14.3).
