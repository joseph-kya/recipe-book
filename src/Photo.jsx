import { useLayoutEffect, useRef, useState } from 'react';
import { textFor } from './content.js';
import { ui } from './i18n.js';
import './photo.css';

// "How it'll look": the finished bake from the recipe's source page, in a
// small framed diner print. `height` caps the picture (desktop pages size it
// to the room left on the page); without it the picture fills the column up to
// the 270px × 4/3 = 360px cap.
export default function Photo({ recipe, lang, height }) {
  const photo = recipe.photo;
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
    else setLoaded(false);
  }, [photo?.small, photo?.large]);

  if (!photo) return null;
  const t = ui[lang];
  const { text } = textFor(recipe, lang);
  const site = photo.credit?.site;
  // Match the exact CSS width cap so portrait tablets and compact desktop slots
  // pick the 400w variant whenever it already covers their physical pixels.
  const sizes = height
    ? `${Math.round((height * 4) / 3)}px`
    : '(min-width: 424px) 360px, calc(100vw - 4rem)';
  return (
    <figure className="photo" data-unit="photo" style={height ? { '--photo-h': `${height}px` } : undefined}>
      {t.photoLabel && <p className="photo-label">{t.photoLabel}</p>}
      <div className="photo-mat">
        <div className="photo-frame">
          <img
            ref={imgRef}
            className={loaded ? 'is-loaded' : undefined}
            src={photo.small}
            srcSet={`${photo.small} 400w, ${photo.large} 800w`}
            sizes={sizes}
            width="400"
            height="300"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            alt={site ? t.photoAlt(text.title, site) : text.title}
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
      {site && (
        <figcaption className="photo-credit">
          {t.photoCredit}:{' '}
          <a href={photo.credit.url} target="_blank" rel="noopener noreferrer">
            {site}
          </a>
        </figcaption>
      )}
    </figure>
  );
}
