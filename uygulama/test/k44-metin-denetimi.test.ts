// K44: metin denetimi ve ad benzerliği. Örnek adlar ve metinler uydurmadır.
import { describe, expect, it } from 'vitest';
import { dizgiDenetimi, ekDenetimi, metniDenetle, tekrarDenetimi, type DenetimSahnesi } from '../src/alan/metin-denetimi';
import { benzerAdlar, harfFarki } from '../src/alan/ad-benzerligi';

const sahne = (...paragraflar: string[]): DenetimSahnesi => ({ kod: 's1', ad: 'Liman', paragraflar });

describe('özel adların ekleri', () => {
  it('okunuşa göre yanlış eki gösterir, doğruları göstermez', () => {
    const r = ekDenetimi([sahne("Kael'a baktı. Kael'e döndü. Velkar'te kaldı, Velkar'da uyudu. Ela'nin eli.")],
      [{ kod: 'k', ad: 'Kael', okunus: '' }, { kod: 'v', ad: 'Velkar', okunus: '' }, { kod: 'e', ad: 'Ela', okunus: '' }]);
    expect(r.map((b) => [b.isaretli, b.mesaj.split(' ')[0]])).toEqual([["Velkar'te", '“Velkar\'da”'], ["Kael'a", '“Kael\'e”'], ["Ela'nin", '“Ela\'nın”']]);
  });
  it('okunuş girilmişse ona göre denetler', () => {
    const r = ekDenetimi([sahne("Saoirse'ye baktı. Saoirse'ya döndü.")], [{ kod: 's', ad: 'Saoirse', okunus: 'Sörşa' }]);
    expect(r.map((b) => b.isaretli)).toEqual(["Saoirse'ye"]);
  });
  it('okunuş belli değilse yalnız aynı ekin farklı yazılışlarını gösterir', () => {
    const r = ekDenetimi([sahne("Xhaq'a gitti. Xhaq'a döndü. Xhaq'e baktı. Xhaq'ın evi.")], [{ kod: 'x', ad: 'Xhaq', okunus: '' }]);
    expect(r.map((b) => b.isaretli)).toEqual(["Xhaq'e"]);
    expect(r[0].mesaj).toContain("Xhaq'a 2 kez");
  });
  it('uzun ad bulunduysa içindeki kısa ad ayrıca sayılmaz', () => {
    const r = ekDenetimi([sahne("Kara Kael'a baktı.")], [{ kod: 'k', ad: 'Kael', okunus: '' }, { kod: 'kk', ad: 'Kara Kael', okunus: '' }]);
    expect(r.map((b) => b.kayit)).toEqual(['kk']);
  });
});

describe('dizgi', () => {
  it('çift boşluk, noktalamadan önce boşluk, kapanmamış tırnak ve ara sözde kısa çizgi', () => {
    const r = dizgiDenetimi([sahne('Kapı  açıldı .', '“Gel, dedi.', 'Yol - uzun yol - bitti.', 'Bekle... Sonra…')]);
    expect(r.map((b) => b.mesaj)).toEqual([
      'Çift boşluk.', 'Noktalama işaretinden önce boşluk.', 'Tırnak açılmış ama kapanmamış (ya da kapanmış ama açılmamış).',
      'Ara sözde kısa çizgi; uzun çizgi (—) mi olmalı?', 'Ara sözde kısa çizgi; uzun çizgi (—) mi olmalı?',
      'Üç nokta çoğunlukla üç ayrı nokta (...) ile; burada tek işaretli üç nokta (…).',
    ]);
  });
  it('konuşma çizgisi karışıklığında az kullanılanı gösterir', () => {
    const r = dizgiDenetimi([sahne('— Gel.', '— Gelmem.', '- Neden?', 'Sustu.')]);
    expect(r.map((b) => [b.paragraf, b.mesaj])).toEqual([[2, 'Konuşmalar çoğunlukla uzun çizgi (—) ile; burada kısa çizgi (-).']]);
  });
});

describe('yakın tekrar', () => {
  it('aynı başlangıçlı sözcükler pencerede üç kez geçerse bulgudur; sık sözcükler ve kayıt adları sayılmaz', () => {
    const m = 'Ansızın kapı açıldı. Ansızın rüzgâr girdi ve ansızın sustu. Kael Kael Kael dedi dedi dedi.';
    const r = tekrarDenetimi([sahne(m)], [{ kod: 'k', ad: 'Kael', okunus: '' }]);
    expect(r.map((b) => b.mesaj)).toEqual(['3 kez, 8 kelime içinde: ansızın.']);
    expect(tekrarDenetimi([sahne(m)], [], 5)).toHaveLength(1); // Kael adı kayıtlı değilse sayılır (4 harf)
    expect(tekrarDenetimi([sahne(m)], [{ kod: 'k', ad: 'Kael', okunus: '' }], 5)).toEqual([]);
  });
  it('bakış, bakışları, bakışını aynı başlangıçla sayılır', () => {
    const r = tekrarDenetimi([sahne('Bakışı sertti.', 'Bakışları kaçtı. Onun bakışını sevmedi.')], []);
    expect(r[0].mesaj).toBe('3 kez, 6 kelime içinde: bakışı, bakışları, bakışını.');
  });
});

describe('toplu denetim', () => {
  it('bulgular okuma sırasıyla, kelime sayısıyla döner', () => {
    const s2 = { kod: 's2', ad: 'Kule', paragraflar: ['Kapı  kapandı.'] };
    const r = metniDenetle([sahne("Kael'a baktı."), s2], [{ kod: 'k', ad: 'Kael', okunus: '' }]);
    expect(r.bulgular.map((b) => [b.sahne.kod, b.tur])).toEqual([['s1', 'ek'], ['s2', 'dizgi']]);
    expect(r.kelime).toBe(4);
  });
});

describe('ad benzerliği', () => {
  const K = [{ kod: 'a', ad: 'Alder', tur: 'karakter' }, { kod: 'b', ad: 'Arden', tur: 'mekan' }, { kod: 'c', ad: 'Ela', tur: 'karakter' },
    { kod: 'd', ad: 'Alden Taşçı', tur: 'karakter' }, { kod: 'e', ad: 'ALDEN', tur: 'esya' }];
  it('harf farkı', () => {
    expect(harfFarki('alder', 'alden')).toBe(1);
    expect(harfFarki('alder', 'adler')).toBe(1);
    expect(harfFarki('alder', 'arden')).toBe(2);
  });
  it('aynı ad önce, sonra yakın adlar; kısa adlarda yalnız aynısı', () => {
    expect(benzerAdlar('Alden', K).map((x) => [x.kod, x.neden])).toEqual([['e', 'ayni'], ['d', 'yakin'], ['a', 'yakin']]);
    expect(benzerAdlar('Ala', K)).toEqual([]);
    expect(benzerAdlar('ela', K).map((x) => x.kod)).toEqual(['c']);
  });
});
