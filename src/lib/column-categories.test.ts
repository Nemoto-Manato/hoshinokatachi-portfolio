import { describe, expect, it } from 'vitest';
import { COLUMN_CATEGORIES, columnCategoryId, groupColumns } from './column-categories';

describe('読みもののカテゴリ', () => {
  it('対応表の slug はそのカテゴリ', () => {
    expect(columnCategoryId('about-16types')).toBe('start');
    expect(columnCategoryId('zodiac-cusp')).toBe('zodiac');
    expect(columnCategoryId('overlap-star')).toBe('ikimono');
  });

  it('対応表に無い slug は語から推測し、分からなければ「その他」', () => {
    expect(columnCategoryId('four-elements')).toBe('zodiac');
    expect(columnCategoryId('axis-energy')).toBe('axes');
    expect(columnCategoryId('something-new')).toBe('other');
  });

  it('カテゴリの順に分け、記事の無いカテゴリは出さない', () => {
    const groups = groupColumns([{ slug: 'something-new' }, { slug: 'zodiac-cusp' }, { slug: 'about-16types' }]);
    expect(groups.map((g) => g.category.id)).toEqual(['start', 'zodiac', 'other']);
    expect(COLUMN_CATEGORIES.at(-1)?.name).toBe('その他');
  });
});

describe('文章データ（sample-data/）の読みもの', () => {
  it('いまある記事はすべて「その他」以外のカテゴリに入る', async () => {
    const { getColumns } = await import('./articles');
    for (const c of getColumns()) expect(columnCategoryId(c.slug), c.slug).not.toBe('other');
  });
});
