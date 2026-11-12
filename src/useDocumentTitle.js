import { useEffect } from 'react';
import { recipes, textFor } from './content.js';
import { ui } from './i18n.js';
import { routeOfHash } from './layout.js';

export function useDocumentTitle(lang) {
  useEffect(() => {
    const update = () => {
      const route = routeOfHash(location.hash);
      const recipe = recipes.find((item) => item.route === route);
      const t = ui[lang];
      const page = recipe ? textFor(recipe, lang).text.title : route === 'contents' ? t.contents : '';
      document.title = page ? `${page} · ${t.bookTitleFlat}` : t.bookTitleFlat;
    };

    // Book navigation uses pushState, which emits neither hashchange nor popstate.
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    history.pushState = function (...args) {
      const result = pushState.apply(this, args);
      update();
      return result;
    };
    history.replaceState = function (...args) {
      const result = replaceState.apply(this, args);
      update();
      return result;
    };
    addEventListener('hashchange', update);
    addEventListener('popstate', update);
    update();
    return () => {
      history.pushState = pushState;
      history.replaceState = replaceState;
      removeEventListener('hashchange', update);
      removeEventListener('popstate', update);
    };
  }, [lang]);
}
