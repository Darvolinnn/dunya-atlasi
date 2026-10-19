// F28 iddia dosyası (§3.9): anlatım türleri ve dayanak türleri. Yazar seçer; metinden çıkarılmaz.
import type { AnlatimTanimi } from '../veri/api';

export const ANLATIM_TURLERI: { kod: AnlatimTanimi['tur']; ad: string }[] = [
  { kod: 'resmi', ad: 'Resmî kayıt' }, { kod: 'tanik', ad: 'Tanık anlatımı' }, { kod: 'belge', ad: 'Mektup ya da belge' },
  { kod: 'aile', ad: 'Aile anlatısı' }, { kod: 'soylenti', ad: 'Söylenti' }, { kod: 'diger', ad: 'Diğer' },
];
export const DAYANAK_TURLERI: { kod: NonNullable<AnlatimTanimi['dayanakTuru']>; ad: string }[] = [
  { kod: 'kopya', ad: 'Kopyası' }, { kod: 'tercume', ad: 'Tercümesi' }, { kod: 'aktarma', ad: 'Ondan aktarıyor' },
];
