import { describe, expect, it } from 'vitest';
import en from '@/locales/en/common.json';
import es from '@/locales/es/common.json';
import pt from '@/locales/pt/common.json';
import { FAQ_ITEMS } from './faq-items';

type Faq = Record<string, { q: string; a: string }>;
const faqDe = (locale: unknown) => (locale as { landing: { faq: { items: Faq } } }).landing.faq.items;
const semMarcas = (texto: string) => texto.replace(/<\/?[a-z]+>/g, '');

describe('FAQ da landing nos três idiomas', () => {
  it.each([
    ['pt', pt],
    ['en', en],
    ['es', es],
  ] as const)('%s tem pergunta e resposta para cada item do catálogo', (_lng, locale) => {
    const itens = faqDe(locale);
    expect(Object.keys(itens)).toHaveLength(FAQ_ITEMS.length);
    FAQ_ITEMS.forEach((_, i) => {
      expect(itens[String(i)]?.q?.trim(), `pergunta ${i}`).toBeTruthy();
      expect(itens[String(i)]?.a?.trim(), `resposta ${i}`).toBeTruthy();
    });
  });

  it('a resposta com link usa a marca <gp> nos três idiomas (o link do Google Play)', () => {
    FAQ_ITEMS.forEach((item, i) => {
      if (!item.answerNode) return;
      for (const locale of [pt, en, es]) expect(faqDe(locale)[String(i)].a).toContain('<gp>');
    });
  });

  it('em português, o texto é idêntico ao do catálogo que alimenta o dado estruturado', () => {
    const itens = faqDe(pt);
    FAQ_ITEMS.forEach((item, i) => {
      expect(itens[String(i)].q).toBe(item.question);
      expect(semMarcas(itens[String(i)].a)).toBe(item.answer);
    });
  });
});
