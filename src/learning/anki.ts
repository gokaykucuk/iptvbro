import type { LearnCard } from './types';

/** Sanitize a value into a single tab-separated field with HTML line breaks. */
function field(s: string): string {
  return s.replace(/\t/g, '    ').replace(/\r?\n/g, '<br>');
}

/**
 * Build an Anki-importable tab-separated deck.
 * Front = the word; Back = the subtitle line + the explanation.
 * Import in Anki with: Fields separated by Tab, "Allow HTML in fields" on.
 */
export function cardsToAnki(cards: LearnCard[]): string {
  const header = ['#separator:tab', '#html:true', '#columns:Front\tBack'].join('\n');
  const rows = cards.map((c) => `${field(c.word)}\t${field(`<i>${c.sentence}</i><br><br>${c.explanation}`)}`);
  return `${header}\n${rows.join('\n')}\n`;
}

/** Trigger a download of the Anki deck file. */
export function downloadAnki(cards: LearnCard[]): void {
  const blob = new Blob([cardsToAnki(cards)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'iptvbro-anki.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
