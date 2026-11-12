import { ui } from './i18n.js';
import './macros.css';

export default function Macros({ recipe, lang }) {
  const nutrition = recipe.nutrition;
  if (!nutrition) return null;
  const t = ui[lang];
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 1, useGrouping: false });
  const noun = nutrition.serving_basis.match(/^\d+\s+(squares|rolls|slices)\b/)?.[1];
  const basis = t.macroBasis[noun] || t.macroPerServing;
  const cells = [
    ['kcal', 'kcal'],
    ['protein', t.macroProtein],
    ['carbs', t.macroCarbs],
    ['fat', t.macroFat],
  ];
  return (
    <section className="macros" data-unit="macros" aria-label={t.macros} lang={lang}>
      <div className="macros-head">
        <h2 className="macros-title">{t.macros}</h2>
        <p className="macros-basis">
          {basis}
          {nutrition.servings > 1 && nutrition.total?.kcal != null && <> · {t.macroTotal} {number.format(nutrition.total.kcal)} kcal</>}
          {' · '}<span className="macros-note">{t.macroNote}</span>
        </p>
      </div>
      <dl className="macros-strip">
        {cells.map(([key, label]) => (
          <div className="macros-cell" key={key}>
            <dt>{label}</dt>
            <dd>{number.format(nutrition.per_serving[key])}{key !== 'kcal' && <small> g</small>}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
