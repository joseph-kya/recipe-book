import { textFor } from './content.js';
import { ui } from './i18n.js';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export function useRecipeText(recipe, lang) {
  const { text, lang: textLang, fallback } = textFor(recipe, lang);
  return { r: text, textLang, fallback, t: ui[lang] };
}

export function ContMark({ t, lang }) {
  return (
    <span className="sr-only" lang={lang}>
      {' '}
      {t.cont}
    </span>
  );
}

export function StepProgress({ className, doneCount, totalSteps }) {
  if (doneCount === 0) return null;
  const allDone = doneCount === totalSteps;
  return (
    <span className={cx(className, allDone && `${className}--done`)} aria-hidden="true">
      {doneCount}/{totalSteps}
    </span>
  );
}
