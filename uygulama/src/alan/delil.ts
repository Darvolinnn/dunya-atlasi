// F08 belge ailesi türleri (§3.9): kopya, tercüme ve sansürlü sürüm aynı ailededir.
import type { DelilTanimi } from '../veri/api';

export const DELIL_AILE_TURLERI: { kod: NonNullable<DelilTanimi['aile']>['tur']; ad: string }[] = [
  { kod: 'kopya', ad: 'Kopyası' }, { kod: 'tercume', ad: 'Tercümesi' }, { kod: 'sansurlu', ad: 'Sansürlü sürümü' },
];
