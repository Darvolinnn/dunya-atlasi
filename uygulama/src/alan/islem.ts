// İşlem günlüğü (§10.1, §18.1 "Eşitleme işlemi", "İşlem grubu"). Tek cihazda bile ilk günden tutulur:
// her değişiklik bir işlemdir; ekrandaki durum işlemlerin uygulanmasıyla oluşur.

/** Veri biçimi sürümü (§10.7). Eski uygulama yeni biçimi açmaz, üzerine yazmaz. */
export const VERI_BICIMI = 1;

export interface IslemGirdisi {
  tur: string;
  veri: Record<string, unknown>;
  /** Uzun metin değişiklikleri (Automerge) gibi ikili yük. */
  ikili?: Uint8Array | null;
}

export interface Islem extends IslemGirdisi {
  /** İşlemin benzersiz kodu. */
  kod: string;
  /** Yazan kurulumun kodu (§10.5). */
  kurulum: string;
  /** O kurulumun bu evrendeki sıra numarası; kurulum içinde tek yerden verilir. */
  sira: number;
  /** Duvar saati (yalnızca bilgi; sıralama ve çatışma buna dayanmaz). */
  zaman: number;
  /** İşlem grubu kodu (§10.4); tek işlemse null. */
  grup: string | null;
  /** İşlemin yapıldığı anda gördüğü değişiklikler: kurulum → son sıra (§10.1). */
  gordu: Record<string, number>;
}
