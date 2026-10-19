// §15-13 sonuçtan koşullara masası (F03). Kullanım sözleşmesi (§18.2):
// Soru: "Üçüncü akşam kaleye ulaşmalı, tüneli kullanamaz" hedefine kayıtlı seçeneklerle hangi planlar uyar?
// En az veri: iki yer, süre sınırı ve süresi girilmiş rotalar. Eksik veri: süresi girilmemiş rota hesaba girmez,
// adıyla bildirilir. Okunanlar: rotalar, süreleri ve koşulları, kişinin bildiği yollar, varsayım paketi. Hiçbir şey
// yazılmaz. Yeni olanak uydurulmaz; bulunamaması evrende imkânsızlık değildir (§2.2 kural 13). Her plan neyi
// gerektirdiğini söyler (kişinin bilmesi gereken yol, kullanılan koşul, kalan pay).
import { kodGecerliMi } from '../alan/kod';
import { anaTakvim, eksenAraligi, GUN_PARCA, tarihCoz } from '../alan/tarih';
import type { KisaKayit, KosulMasasi, KosulPlani, RotaAdimi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { rotaKenarlari, type Kenar } from './haber';
import { yonlendir, zamanSetiOku } from './izdusum';
import type { PaketEtkisi } from './masa';

const EN_COK_PLAN = 10;
const ARAMA_SINIRI = 50000;
const gunYaz = (n: number) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün`;

function kisa(e: EvrenVt, kod: string): KisaKayit {
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [kod]);
  return r ? { kod, ad: r.ad as string, tur: r.tur as string } : { kod, ad: 'Silinmiş kayıt', tur: 'diger' };
}
function kayitKodu(e: EvrenVt, kod: unknown, hata: string): string {
  const k = typeof kod === 'string' && kodGecerliMi(kod) ? yonlendir(e.db, kod) : '';
  if (!k || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]) === undefined) throw new Error(hata);
  return k;
}

export interface KosulGirdisi {
  nereden: string; nereye: string; enCokGun: number; cikis?: string | null; kosul?: string | null; kisi?: string | null;
  yasakRotalar?: string[]; yasakYerler?: string[];
}

/** Süre sınırına uyan basit yollar (aynı yerden iki kez geçmeyen), kısa olan önce. */
export function planlariAra(kenarlar: Kenar[], nereden: string, nereye: string, sinir: number) {
  const komsu = new Map<string, { k: Kenar; diger: string }[]>();
  for (const k of kenarlar) {
    if (k.gun === null) continue;
    komsu.set(k.a, [...(komsu.get(k.a) ?? []), { k, diger: k.b }]);
    komsu.set(k.b, [...(komsu.get(k.b) ?? []), { k, diger: k.a }]);
  }
  const bulunan: { yol: { k: Kenar; nereden: string; nereye: string }[]; toplam: number }[] = [];
  let adim = 0, kesildi = false;
  const gezilen = new Set([nereden]);
  const yol: { k: Kenar; nereden: string; nereye: string }[] = [];
  const gez = (x: string, toplam: number) => {
    if (++adim > ARAMA_SINIRI) { kesildi = true; return; }
    if (x === nereye) { bulunan.push({ yol: [...yol], toplam }); return; }
    for (const { k, diger } of komsu.get(x) ?? []) {
      if (kesildi) return;
      const t = toplam + k.gun!;
      if (gezilen.has(diger) || t > sinir + 1e-9) continue;
      gezilen.add(diger); yol.push({ k, nereden: x, nereye: diger });
      gez(diger, t);
      yol.pop(); gezilen.delete(diger);
    }
  };
  gez(nereden, 0);
  bulunan.sort((a, b) => a.toplam - b.toplam || a.yol.length - b.yol.length);
  return { bulunan, kesildi };
}

function enKisa(kenarlar: Kenar[], nereden: string, nereye: string): number | null {
  const uzak = new Map<string, number>([[nereden, 0]]);
  const bitti = new Set<string>();
  for (;;) {
    let en: string | null = null;
    for (const [d, u] of uzak) if (!bitti.has(d) && (en === null || u < uzak.get(en)!)) en = d;
    if (en === null) break;
    bitti.add(en);
    for (const k of kenarlar) {
      if (k.gun === null || (k.a !== en && k.b !== en)) continue;
      const d = k.a === en ? k.b : k.a;
      const y = uzak.get(en)! + k.gun;
      if (!uzak.has(d) || y < uzak.get(d)!) uzak.set(d, y);
    }
  }
  return uzak.get(nereye) ?? null;
}

export function kosulMasasi(e: EvrenVt, g: KosulGirdisi, p: PaketEtkisi | null): KosulMasasi {
  const nereden = kayitKodu(e, g.nereden, 'Başlangıç yerini seçin.');
  const nereye = kayitKodu(e, g.nereye, 'Varılacak yeri seçin.');
  if (nereden === nereye) throw new Error('Başlangıç ile varış aynı.');
  const sinir = Number(g.enCokGun);
  if (!Number.isFinite(sinir) || sinir <= 0 || sinir > 100000) throw new Error('Süre sınırını sıfırdan büyük bir gün sayısı olarak yazın.');
  const yasakRota = new Set((g.yasakRotalar ?? []).map((k) => kayitKodu(e, k, 'Yasaklanan rota bulunamadı.')));
  const yasakYer = new Set((g.yasakYerler ?? []).map((k) => kayitKodu(e, k, 'Uğranmayacak yer bulunamadı.')));
  if (yasakYer.has(nereden) || yasakYer.has(nereye)) throw new Error('Başlangıç ya da varış yeri uğranmayacak yerlerde olamaz.');
  const kisi = g.kisi ? kayitKodu(e, g.kisi, 'Kişi bulunamadı.') : null;
  const kosul = String(g.kosul ?? '').trim() || null;
  const z = zamanSetiOku(e.db);
  const cikis = g.cikis && String(g.cikis).trim() ? tarihCoz(String(g.cikis), z) : null;
  if (g.cikis && String(g.cikis).trim() && !cikis?.eksen) throw new Error('Çıkış tarihi zaman sırasına yerleşmiyor; takvimden bir tarih yazın.');

  const tum = rotaKenarlari(e, kosul, p);
  const izinli = tum.filter((k) => !yasakRota.has(k.kod) && !yasakYer.has(k.a) && !yasakYer.has(k.b));
  const { bulunan, kesildi } = planlariAra(izinli, nereden, nereye, sinir);
  const bilinen = kisi ? new Set(e.db.selectObjects(`SELECT b FROM iliskiler WHERE a=? AND tur='yolu_bilir' AND silindi IS NULL AND karar<>'vazgecildi'`, [kisi]).map((r) => yonlendir(e.db, r.b as string))) : null;
  const ana = anaTakvim(z);
  const planlar: KosulPlani[] = bulunan.slice(0, EN_COK_PLAN).map((b) => {
    const adimlar: RotaAdimi[] = b.yol.map((x) => ({ rota: { kod: x.k.kod, ad: x.k.ad, tur: 'rota' }, nereden: kisa(e, x.nereden), nereye: kisa(e, x.nereye), gun: x.k.gun, kosul: x.k.kosul }));
    const bilinmeyen = bilinen ? adimlar.filter((a) => !bilinen.has(a.rota.kod)).map((a) => a.rota) : [];
    const pay = sinir - b.toplam;
    const gerekenler: string[] = [];
    if (kisi && bilinmeyen.length) gerekenler.push(`${kisa(e, kisi).ad} bu yollardan ${bilinmeyen.length} tanesini bilmiyor olarak kayıtlı: ${bilinmeyen.map((r) => r.ad).join(', ')}. Bu plan için bilmesi gerekir.`);
    const kosullar = [...new Set(adimlar.map((a) => a.kosul).filter(Boolean))];
    if (kosullar.length) gerekenler.push(`Kullanılan süre koşulları: ${kosullar.join(', ')}.`);
    gerekenler.push(pay < 1e-9 ? 'Tam sınırda varır; hiç pay kalmaz.' : `Sınırdan ${gunYaz(pay)} önce varır.`);
    const varis = cikis?.eksen ? eksenAraligi({ enErken: cikis.eksen.enErken === null ? null : cikis.eksen.enErken + Math.round(b.toplam * GUN_PARCA), enGec: cikis.eksen.enGec === null ? null : cikis.eksen.enGec + Math.round(b.toplam * GUN_PARCA) }, ana) : null;
    return { adimlar, toplam: b.toplam, pay, varis, bilinmeyen, gerekenler };
  });

  const nedenler: string[] = [];
  if (!planlar.length) {
    const yasakla = enKisa(izinli, nereden, nereye);
    const yasaksiz = enKisa(tum, nereden, nereye);
    if (yasakla !== null) nedenler.push(`Bu koşullarla en kısa kayıtlı yol ${gunYaz(yasakla)}; sınır ${gunYaz(sinir)}.`);
    if (yasaksiz !== null && (yasakla === null || yasaksiz < yasakla) && yasaksiz <= sinir) nedenler.push(`Yasaklanan rota ya da yerler kullanılabilseydi ${gunYaz(yasaksiz)} süren bir yol vardı.`);
    if (yasakla === null && yasaksiz === null) nedenler.push('İki yer arasında süresi girilmiş rotalarla kayıtlı bir bağlantı yok.');
  }
  const suresizler = izinli.filter((k) => k.gun === null).map((k) => ({ kod: k.kod, ad: k.ad, tur: 'rota' }));
  const kapali = p ? [...p.rota.values()].filter((v) => v === false).length : 0;
  return {
    tur: 'kayıtlı ağa göre zorunlu sonuç',
    hukum: planlar.length ? 'çözüm bulundu' : 'kayıtlı seçeneklerde bulunamadı',
    guncellik: 'güncel',
    planlar, dahaFazla: bulunan.length > EN_COK_PLAN || kesildi, nedenler, suresizler,
    kapsam: `Kayıtlı rotalar ve elle girilmiş süreler${kosul ? ` (“${kosul}” koşulunda)` : ' (her rotanın en kısa tanımlı süresi)'}; aynı yerden iki kez geçmeyen yollar. Molalar sürelerin içinde sayılır.${kapali ? ` Pakete göre ${kapali} rota kapalı.` : ''}`,
    varsayimlar: [
      ...(suresizler.length ? [`Süresi girilmemiş ${suresizler.length} rota hesaba girmedi.`] : []),
      ...(kesildi ? ['Olası yol sayısı çok fazla; liste eksik olabilir.'] : []),
      ...(planlar.length ? [] : ['Bu sonuca ulaşmak için henüz kaydedilmemiş bir imkân ya da koşul değişikliği gerekiyor. Bu, evrende imkânsız olduğu demek değil.']),
    ],
  };
}
