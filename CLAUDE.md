# Dünya Atlası: ajan talimatları

Bu depo, bir yazarın kurgu evrenlerini kurmasına yardım eden kişisel bir web uygulamasıdır (PWA). Kullanıcı Türkçe yazar; arayüz ve kayıt mesajları Türkçedir.

## Bağlayıcı kaynaklar
- Tasarımın tek kaynağı `tasarim/dunya-atlasi-tasarim.md`. Bağlayıcı bölümler **§0** (okuma ve güncelleme kuralları, terimler) ve **§18** (veri sözleşmeleri, arama, özellik kullanım sözleşmesi).
- Teknik kararlar §1.3'tedir (TK1 SQLite WASM + OPFS SAH havuzu, TK2 Automerge, TK3–TK5 Google/Drive/medya).
- **Öneri** durumundaki fikirler kodlanmaz. Yeni fikir eklenmez (K11).
- Geliştirme sırası §14'tedir; bir aşamanın kapsamı dışına çıkılmaz.

## Kurallar
- Depoya sır (anahtar, jeton, parola) ve **gerçek evren verisi** girmez; örnekler uydurmadır (§0.3, §17.3).
- Depoya lisans dosyası eklenmez (K19).
- Her değişiklik işlem günlüğünden geçer: veritabanına yalnızca `EvrenVt.islemYap()` yazar; görünen tablolar işlemlerden türetilir (§10.1).
- Programda yapay zekâ yoktur; serbest metinden anlam çıkarılmaz (K1).
- Kullanıcıya gösterilen metinde programlama terimi kullanılmaz.

## Yapı
- `uygulama/`: Vite + TypeScript + Preact. `npm run dev` (port 5180), `npm test`, `npm run denetle`.
  - `src/alan/`: tarayıcıdan bağımsız alan kuralları (kod, işlem, Türkçe).
  - `src/calisan/`: veritabanı çalışanı (Web Worker) ve işlemlerin tablolara uygulanması.
  - `src/veri/`: arayüz ile çalışan arasındaki istekler.
  - `src/arayuz/`: ekranlar.
- `deneyler/`: depoya girmez (§14.3).
