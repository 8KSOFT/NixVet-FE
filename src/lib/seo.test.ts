import { describe, expect, it } from 'vitest';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, OG_BASE, SITE_URL, TWITTER_BASE } from './seo';

describe('seo', () => {
  it('a imagem de compartilhamento é 1200x630 em PNG (WebP é irregular nos rastreadores)', () => {
    const [img] = OG_BASE.images;
    expect(img).toMatchObject({ width: 1200, height: 630 });
    expect(img.url).toMatch(/\.png$/);
    expect(TWITTER_BASE.images).toEqual([img.url]);
  });
  it('a marca é NixVet e o site é o domínio de produção', () => {
    expect(OG_BASE.siteName).toBe('NixVet');
    expect(SITE_URL).toBe('https://nixvetapp.com.br');
    expect(`${DEFAULT_TITLE} ${DEFAULT_DESCRIPTION}`).toMatch(/veterin/i);
  });
  it('título e descrição não ficam vazios nem passam do que o buscador mostra', () => {
    expect(DEFAULT_TITLE.length).toBeGreaterThan(10);
    expect(DEFAULT_TITLE.length).toBeLessThanOrEqual(70);
    expect(DEFAULT_DESCRIPTION.length).toBeLessThanOrEqual(200);
  });
});
