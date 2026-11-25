// Küçük açılır menü (§5.11): düğmeye basınca altında seçenekler açılır; dışarı basınca, Esc'ye ya da bir seçeneğe
// basınca kapanır. Yazma ekranının "Görünüm ▾", "Sahne ⋯" menüleri ve kayıt sayfasının "+ başka ayrıntı" menüsü bunu kullanır.
import { useLayoutEffect, useRef } from 'preact/hooks';

export function AcilirMenu({ dugme, etiket, sinif = 'dugme sade kucuk', sola = false, children }: {
  dugme: preact.ComponentChildren; etiket?: string; sinif?: string; sola?: boolean; children: preact.ComponentChildren;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useLayoutEffect(() => {
    const kapat = (e: Event) => { const d = ref.current; if (d?.open && !d.contains(e.target as Node)) d.open = false; };
    const tus = (e: KeyboardEvent) => { const d = ref.current; if (e.key === 'Escape' && d?.open) { d.open = false; d.querySelector('summary')?.focus(); } };
    addEventListener('pointerdown', kapat); addEventListener('keydown', tus);
    return () => { removeEventListener('pointerdown', kapat); removeEventListener('keydown', tus); };
  }, []);
  return (
    <details class={sola ? 'islem-menusu sola' : 'islem-menusu'} ref={ref}>
      <summary class={sinif} aria-label={etiket}>{dugme}</summary>
      <div class="menu-icerik" onClick={(e) => { if ((e.target as HTMLElement).closest('.menu-ogesi') && ref.current) ref.current.open = false; }}>{children}</div>
    </details>
  );
}
