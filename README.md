# Dünya Atlası

Kurgu evrenleri için bir dünya kurma programı: kayıtlar, ilişkiler, zaman çizelgesi, harita, bilgi katmanları ve tutarlılık denetimleri. Yapay zekâ içermez; yalnızca yazarın girdiği veri ve tanımladığı kurallarla çalışır. Windows 11, Android tablet ve iPhone'da aynı evrenle çalışan bir web uygulaması (PWA) olarak tasarlanıyor; eşitleme ve yedek Google Drive üzerinden.

**Durum:** Geliştirme sırasının bütün aşamaları (0–5) kodlandı; kalan tasarım maddeleri üzerinde çalışılıyor. Ayrıntı ve kalan işler: [DEVIR.md](DEVIR.md). Program `uygulama/` klasöründe.

| Belge | İçerik |
|---|---|
| [tasarim/dunya-atlasi-tasarim.md](tasarim/dunya-atlasi-tasarim.md) | Tasarım. Programın güncel davranışının tek kaynağı. |
| [tasarim/tasarim-gecmisi.md](tasarim/tasarim-gecmisi.md) | Kararların gerekçesi, değişiklik kaydı, kaynaklar arasındaki çelişkiler |
| [tasarim/tasarim.md](tasarim/tasarim.md) | yazar.io görsel ve video incelemesi (ilk araştırma) |
| [DEVIR.md](DEVIR.md) | Güncel durum, kalan işler ve devralan ajan için çalışma yöntemi |
| [uygulama/](uygulama/) | Program kodu (Vite + TypeScript + Preact, SQLite WASM, Automerge) |

Evren verisi bu depoya girmez; kullanıcının cihazlarında ve Google Drive'ında durur. Belgelerdeki adlar ve olaylar uydurma örneklerdir.
