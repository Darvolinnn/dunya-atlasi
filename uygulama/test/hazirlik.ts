// Sınamalardan önce Automerge WASM'ını dosyadan yükler.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { automergeHazirla } from '../src/alan/automerge';

const require = createRequire(import.meta.url);
await automergeHazirla(readFileSync(require.resolve('@automerge/automerge/automerge.wasm')));
