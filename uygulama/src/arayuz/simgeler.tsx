// Gezinti çubuğunun ince çizgili simgeleri (K41). Hepsi bu program için çizildi; ek simge kütüphanesi yoktur.
// Simgeler yalnız süstür (aria-hidden): sayfanın adı her zaman yanında yazılıdır.
const YOLLAR: Record<string, preact.ComponentChildren> = {
  // Yaz: tüy kalem
  yaz: <><path d="M5 19c4-1 8-4 11-8l3-6c-3 1-6 2-8 4-3 3-5 6-6 10z" /><path d="M5 19l6-6" /></>,
  // Genel bakış: dört pano
  masa: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="4" rx="1.5" /><rect x="13" y="10" width="7" height="10" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /></>,
  // Kayıtlar: üst üste fişler
  kayitlar: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M7 4h10" /><path d="M8 12h8M8 16h5" /></>,
  // Sözlük: açık kitap
  terimler: <><path d="M4 6c3-1.3 6-1.3 8 .5 2-1.8 5-1.8 8-.5v13c-3-1.3-6-1.3-8 .5-2-1.8-5-1.8-8-.5z" /><path d="M12 6.5V19.5" /></>,
  // Haritalar: katlanmış harita
  haritalar: <><path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" /><path d="M9 4.5v13M15 6.5v13" /></>,
  // Takvim
  takvim: <><rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
  // Pano: iğneli kâğıtlar
  tuval: <><rect x="4" y="4" width="9" height="9" rx="1.5" /><rect x="11" y="11" width="9" height="9" rx="1.5" /><circle cx="8.5" cy="6.5" r="0.6" /></>,
  // Grafikler ve araçlar: sütunlar
  gorunumler: <><path d="M4 20h16" /><path d="M7.5 16.5v-4M12 16.5V7M16.5 16.5v-6.5" /></>,
  // Uyarılar: üçgen
  inceleme: <><path d="M12 4.5l8.5 15h-17z" /><path d="M12 10.5v4M12 17.2v.1" /></>,
  // Konu dosyaları: klasör
  masalar: <path d="M3.5 7.5a2 2 0 012-2h4l2 2h7a2 2 0 012 2v8.5a2 2 0 01-2 2h-13a2 2 0 01-2-2z" />,
  // Karar bekleyenler: terazi
  meseleler: <><path d="M12 4v16M7.5 20h9M5 7.5h14" /><path d="M5 7.5l-2.5 5.5h5z M19 7.5l-2.5 5.5h5z" /></>,
  // Şablonlar
  sablonlar: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9.5h16M10 9.5V20" /></>,
  // Görünüm: yarım ay
  gorunum: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 010 16z" fill="currentColor" stroke="none" opacity="0.35" /></>,
  // Henüz yazılmayanlar: boş sayfa
  bahsedilen: <><path d="M6.5 3.5h8l3.5 3.5v13.5h-11.5z" /><path d="M14.5 3.5V7H18" /><path d="M9.5 13h5" stroke-dasharray="1.5 2" /></>,
  // Çöp kutusu
  cop: <><path d="M4.5 7h15M9.5 7V4.5h5V7" /><path d="M6.5 7l1 13h9l1-13" /></>,
  // Değişiklik geçmişi: saat
  gecmis: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" /></>,
  // Kayıtlı anlar: yer imi
  surumler: <path d="M7 4h10v16l-5-4-5 4z" />,
  // Yedek: arşiv kutusu
  yedek: <><rect x="3.5" y="4.5" width="17" height="4.5" rx="1" /><path d="M5 9v10.5h14V9M10 13h4" /></>,
  // Diğer
  diger: <><circle cx="6" cy="12" r="0.9" /><circle cx="12" cy="12" r="0.9" /><circle cx="18" cy="12" r="0.9" /></>,
};

export function GezintiSimgesi({ kod }: { kod: string }) {
  const yol = YOLLAR[kod];
  if (!yol) return null;
  return (
    <svg class="gezinti-simge" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{yol}</svg>
  );
}
