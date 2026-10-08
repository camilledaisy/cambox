import { h } from '../lib/dom.js?v=20261008165204';
import { store } from '../lib/store.js?v=20261008165204';
import { sfx } from '../lib/sfx.js?v=20261008165204';
import { openModal, toast } from '../lib/ui.js?v=20261008165204';

/** First-visit prompt: who's opening packs? Saved on this device. */
export function askForName() {
  const input = h('input.namebox__input', {
    id: 'player-name',
    type: 'text',
    maxlength: '24',
    autocomplete: 'nickname',
    placeholder: 'your name',
    'aria-label': 'Your name',
  });
  const error = h('p.namebox__error', { role: 'alert' });
  let modal;
  const form = h(
    'form.namebox',
    {
      onSubmit: (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (!name) {
          error.textContent = 'Type your name so Camille knows who pulled what!';
          input.focus();
          return;
        }
        store.setCollector(name);
        sfx.play('sparkle');
        modal.close();
        toast(`Welcome, ${name}! Go open a pack ✦`, { icon: '🎁' });
      },
    },
    h('img.namebox__icon', { src: 'images/cake.jpg', alt: '', 'aria-hidden': 'true', draggable: 'false' }),
    h('h2.namebox__title', {}, 'Who’s pulling?'),
    h('p.namebox__text', {}, 'Enter your name to start collecting Camille Cards.'),
    input,
    error,
    h('button.btn.btn--go', { type: 'submit' }, 'LET’S GO ✦'),
    h('p.namebox__fine', {}, 'Your name and the cards you pull are shared with Camille for her birthday.'),
  );
  modal = openModal(form, { className: 'modal--name', label: 'Enter your name', dismissible: false });
  setTimeout(() => input.focus(), 250);
}
