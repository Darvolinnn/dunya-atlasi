import { render } from 'preact';
import '@fontsource-variable/literata';
import '@fontsource-variable/literata/wght-italic.css';
import '@fontsource-variable/source-sans-3';
import './arayuz/stil.css';
import { Istemci, tekSekmeKilidi } from './veri/istemci';
import { Uygulama, BaskaSekme } from './arayuz/Uygulama';

const kok = document.getElementById('uygulama')!;

(async () => {
  if (!(await tekSekmeKilidi())) {
    render(<BaskaSekme />, kok);
    return;
  }
  render(<Uygulama istemci={new Istemci()} />, kok);
})();
