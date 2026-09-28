// BirthdayField の入力から星座を決める（ブラウザ側）。境目の日は、選択肢を表示してユーザーに選んでもらう。

import { getSign } from './signs';
import { zodiacFromDate } from './zodiac';

export type SignResolution =
  | { status: 'ok'; signId: string }
  | { status: 'error'; message: string }
  // 境目の日の選択肢を表示した。ユーザーが選んだら、もう一度送信してもらう。
  | { status: 'needs-choice' };

function signName(id: string): string {
  return getSign(id)?.name ?? id;
}

function cuspElement(form: HTMLFormElement): HTMLElement {
  return form.querySelector<HTMLElement>('[data-cusp]')!;
}

/** 生年月日が変わったら、境目の日の選択をやり直す。 */
export function watchBirthday(form: HTMLFormElement): void {
  form.addEventListener('change', (e) => {
    const name = (e.target as HTMLInputElement).name;
    if (name === 'year' || name === 'month' || name === 'day') {
      const cusp = cuspElement(form);
      cusp.hidden = true;
      cusp.innerHTML = '';
    }
  });
}

export function resolveSign(form: HTMLFormElement): SignResolution {
  const data = new FormData(form);
  const zodiac = zodiacFromDate(Number(data.get('year')), Number(data.get('month')), Number(data.get('day')));
  if (zodiac === null) return { status: 'error', message: '生年月日を正しく選んでください。' };
  if (zodiac.kind === 'fixed') return { status: 'ok', signId: zodiac.sign };

  const chosen = data.get('cusp-sign');
  if (chosen !== null) return { status: 'ok', signId: String(chosen) };

  const cusp = cuspElement(form);
  cusp.innerHTML = `
    <p>この日は<strong>${signName(zodiac.before)}</strong>と<strong>${signName(zodiac.after)}</strong>の境目です（${zodiac.changesAt}ごろに切り替わり）。しっくりくるほうを選んでください。</p>
    ${[zodiac.before, zodiac.after]
      .map((s) => `<label><input type="radio" name="cusp-sign" value="${s}" ${s === zodiac.suggested ? 'checked' : ''} /> ${signName(s)}</label>`)
      .join('')}
  `;
  cusp.hidden = false;
  cusp.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return { status: 'needs-choice' };
}
