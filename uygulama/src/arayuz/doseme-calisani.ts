// Döşeme çalışanı (§8.1, K38): büyük görseli bir kez çözer, istenen parçayı küçültüp sıkıştırılmış olarak döndürür.
// Arayüz yalnız ekrandaki parçaları ister; tam görsel ekran kartına hiç gönderilmez.
/// <reference lib="webworker" />
let resim: ImageBitmap | null = null;
let hazir: Promise<void> = Promise.resolve();

type Istek = { tur: 'ac'; veri: Blob } | { tur: 'doseme'; no: number; sx: number; sy: number; sg: number; sy2: number; g: number; y: number };

self.onmessage = (e: MessageEvent<Istek>) => {
  const m = e.data;
  if (m.tur === 'ac') { hazir = createImageBitmap(m.veri).then((r) => { resim?.close(); resim = r; }); hazir.catch(() => {}); return; }
  void hazir.then(async () => {
    if (!resim) throw new Error('Görsel açılamadı.');
    const c = new OffscreenCanvas(m.g, m.y);
    const x = c.getContext('2d')!;
    x.imageSmoothingQuality = 'high';
    x.drawImage(resim, m.sx, m.sy, m.sg, m.sy2, 0, 0, m.g, m.y);
    const blob = await c.convertToBlob({ type: 'image/webp', quality: 0.92 });
    (self as unknown as Worker).postMessage({ no: m.no, blob });
  }).catch((h) => (self as unknown as Worker).postMessage({ no: m.no, hata: String(h?.message ?? h) }));
};
