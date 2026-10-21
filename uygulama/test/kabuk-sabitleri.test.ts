// Windows programının verileri iki sabite bağlıdır: program kimliği (verilerin durduğu klasörün adı) ve yerel adresin
// kapısı (tarayıcı motoru verileri adrese göre ayırır). Biri değişirse program açılır ama bütün evrenler görünmez olur
// (veriler diskte durur, program onları bulamaz). Bu sınama, ikisinin yanlışlıkla değiştirilmesini engeller.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const oku = (yol: string) => readFileSync(fileURLToPath(new URL(yol, import.meta.url)), 'utf8');

describe('Windows programının veri yeri değişmez', () => {
  it('program kimliği ve yerel adresin kapısı sabittir', () => {
    const ayar = JSON.parse(oku('../src-tauri/tauri.conf.json'));
    expect(ayar.identifier).toBe('io.github.darvolinnn.dunyaatlasi');
    expect(oku('../src-tauri/src/main.rs')).toMatch(/const KAPI: u16 = 41730;/);
  });
  it('kaldırırken "verileri sil" seçilirse bir kez daha sorulur; varsayılan cevap "Hayır"', () => {
    const ayar = JSON.parse(oku('../src-tauri/tauri.conf.json'));
    expect(ayar.bundle.windows.nsis.installerHooks).toBe('./windows/kaldirma.nsh');
    const kanca = oku('../src-tauri/windows/kaldirma.nsh');
    expect(kanca.charCodeAt(0)).toBe(0xfeff); // Türkçe harfler için UTF-8 imi
    expect(kanca).toMatch(/!macro NSIS_HOOK_PREUNINSTALL/);
    expect(kanca).toMatch(/MB_DEFBUTTON2/);
    expect(kanca).toMatch(/\/SD IDNO/);
    expect(kanca).toMatch(/StrCpy \$DeleteAppDataCheckboxState 0/);
  });
});
