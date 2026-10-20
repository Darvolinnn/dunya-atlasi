// Evrenin "Ne yazıyorsunuz?" seçimi (§4, K28) kabuktan alt ekranlara iletilir; tür seçicisi ve grafik listesi
// kurguya uzak olanları "Diğer" altına katlar.
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export const KurguBaglami = createContext<string | null>(null);
export const useKurgu = () => useContext(KurguBaglami);
