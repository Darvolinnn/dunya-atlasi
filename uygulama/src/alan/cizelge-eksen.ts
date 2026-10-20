// Zaman çizelgesinin ekseni ve yerleşimi (§7, taslak 3A). Tarayıcıdan bağımsız, saf hesaplar.
//
// Kırık eksen: kayıtların bulunduğu kümeler doğrusal ölçekle çizilir; aralarındaki uzun boş süreler sabit dar bir
// "≈" kırığına iner. Böylece bin yıllık bir evrende aynı yıla düşen olaylar üst üste binmez. Kırık yalnızca hiçbir
// kaydın (bant ya da nokta) bulunmadığı boşlukta olur; hiçbir kaydın süresi kısaltılmaz.

export interface EksenParcasi { bas: number; son: number; x0: number; x1: number }
export interface EksenKirigi { bas: number; son: number; x0: number; x1: number }
export interface KirikEksen {
  parcalar: EksenParcasi[];
  kiriklar: EksenKirigi[];
  genislik: number;
  /** Eksendeki an → piksel. Kırık içindeki anlar kırığın içinde doğrusal ilerler. */
  konum(t: number): number;
  /** Piksel → eksendeki an (kırıkta yaklaşık). */
  an(x: number): number;
}

export interface KirikSecenekleri {
  /** Bir boşluğun kırılması için toplam sürenin en az bu oranı kadar olması gerekir. */
  esik?: number;
  /** Kırığın piksel genişliği. */
  kirikGen?: number;
}

/** Kayıtların [en erken, en geç] aralıklarından kırık eksen kurar. */
export function kirikEksen(araliklar: [number, number][], genislik: number, s: KirikSecenekleri = {}): KirikEksen {
  const esik = s.esik ?? 0.12, kirikGen = s.kirikGen ?? 28;
  const l = araliklar.map(([a, b]) => (a <= b ? [a, b] : [b, a]) as [number, number]).sort((x, y) => x[0] - y[0]);
  if (!l.length) l.push([0, 1]);
  const alt = l[0][0], ust = Math.max(...l.map((x) => x[1]));
  const toplam = Math.max(1, ust - alt);
  // Örtüşen ya da bitişik aralıklar tek kümeye birleşir.
  const kumeler: [number, number][] = [];
  for (const [a, b] of l) {
    const son = kumeler[kumeler.length - 1];
    if (son && a <= son[1]) son[1] = Math.max(son[1], b);
    else kumeler.push([a, b]);
  }
  // Her kümenin iki yanına küçük bir pay: tek noktalık küme de görünür bir genişlik alır.
  const pay = toplam * 0.02 || 1;
  const parcaUclari: [number, number][] = [];
  const kirikUclari: [number, number][] = [];
  let bas = kumeler[0][0] - pay;
  for (let i = 0; i < kumeler.length; i++) {
    const k = kumeler[i], sonraki = kumeler[i + 1];
    if (!sonraki) { parcaUclari.push([bas, k[1] + pay]); break; }
    const bosluk = sonraki[0] - k[1];
    if (bosluk > toplam * esik && bosluk > 4 * pay) {
      parcaUclari.push([bas, k[1] + pay]);
      kirikUclari.push([k[1] + pay, sonraki[0] - pay]);
      bas = sonraki[0] - pay;
    }
  }
  const dolu = parcaUclari.reduce((n, [a, b]) => n + (b - a), 0) || 1;
  const kullanilir = Math.max(40, genislik - kirikUclari.length * kirikGen);
  const olcek = kullanilir / dolu;
  const parcalar: EksenParcasi[] = [];
  const kiriklar: EksenKirigi[] = [];
  let x = 0;
  parcaUclari.forEach(([a, b], i) => {
    parcalar.push({ bas: a, son: b, x0: x, x1: x + (b - a) * olcek });
    x += (b - a) * olcek;
    const kr = kirikUclari[i];
    if (kr) { kiriklar.push({ bas: kr[0], son: kr[1], x0: x, x1: x + kirikGen }); x += kirikGen; }
  });
  const hepsi = [...parcalar, ...kiriklar].sort((p, r) => p.bas - r.bas);
  const konum = (t: number) => {
    if (t <= hepsi[0].bas) return hepsi[0].x0 - (hepsi[0].bas - t) * olcek;
    for (const p of hepsi) if (t <= p.son) return p.x0 + ((t - p.bas) / Math.max(1e-9, p.son - p.bas)) * (p.x1 - p.x0);
    const son = hepsi[hepsi.length - 1];
    return son.x1 + (t - son.son) * olcek;
  };
  const an = (px: number) => {
    for (const p of hepsi) if (px <= p.x1) return p.bas + ((px - p.x0) / Math.max(1e-9, p.x1 - p.x0)) * (p.son - p.bas);
    const son = hepsi[hepsi.length - 1];
    return son.son + (px - son.x1) / olcek;
  };
  return { parcalar, kiriklar, genislik: x, konum, an };
}

/** Aynı şeritteki öğeleri satırlara dağıtır: piksel aralıkları ([x0, x1], yazı dahil) çakışan öğe alt satıra iner.
 *  Girdinin sırası korunur; dönen dizi her öğenin satır numarasıdır. */
export function satirlaraDagit(araliklar: [number, number][], bosluk = 8): number[] {
  const satirSonu: number[] = [];
  return araliklar.map(([a, b]) => {
    let i = satirSonu.findIndex((s) => a >= s + bosluk);
    if (i < 0) { i = satirSonu.length; satirSonu.push(b); } else satirSonu[i] = b;
    return i;
  });
}

/** Bir parçadaki yıl çizgileri için adım: çizgiler arası en az `enAz` piksel kalır. */
export function yilAdimi(yilSayisi: number, piksel: number, enAz = 72): number {
  const adimlar = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
  for (const a of adimlar) if ((piksel / Math.max(1, yilSayisi)) * a >= enAz) return a;
  return adimlar[adimlar.length - 1];
}
