import React, { useRef, useState } from 'react';
import { SHOTS } from './model';

export default function ReviewGallery({ photos = {}, onInspect }) {
  const slides = SHOTS.filter(shot => photos[shot.id]?.url);
  const track = useRef(null);
  const [active, setActive] = useState(0);
  const [showSample, setShowSample] = useState(false);
  const index = Math.min(active, Math.max(0, slides.length - 1));
  function go(next) {
    const target = Math.max(0, Math.min(slides.length - 1, next));
    track.current?.children[target]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setActive(target);
  }
  if (!slides.length) return <p>No new photographs yet.</p>;
  return <section className="cs-gallery" aria-label="Review uploaded photographs">
    <div className="cs-gallery-track" ref={track} onScroll={event => {
      const element = event.currentTarget;
      if (element.clientWidth) setActive(Math.round(element.scrollLeft / element.clientWidth));
    }}>
      {slides.map(shot => <button type="button" className="cs-gallery-slide" key={shot.id}
        aria-label={`Inspect ${shot.name}`} onClick={() => onInspect(showSample && photos[shot.id].cleanedPreview ? photos[shot.id].cleanedPreview : photos[shot.id])}>
        <img src={showSample && photos[shot.id].cleanedPreview ? photos[shot.id].cleanedPreview.url : photos[shot.id].url} alt={shot.name} loading={shot.id === 'hero' ? 'eager' : 'lazy'} draggable="false"/>
      </button>)}
    </div>
    <div className="cs-gallery-nav">
      <button type="button" disabled={index === 0} onClick={() => go(index - 1)} aria-label="Previous photo">← Previous</button>
      <span aria-live="polite">{index + 1} / {slides.length}</span>
      <button type="button" disabled={index === slides.length - 1} onClick={() => go(index + 1)} aria-label="Next photo">Next →</button>
    </div>
    <p className="cs-gallery-caption">{slides[index].name} · Swipe or tap a photo to inspect</p>
    {photos[slides[index].id].cleanedPreview && <div className="cs-gallery-comparison"><button type="button" aria-pressed={showSample} onClick={()=>setShowSample(!showSample)}>{showSample ? 'Show original photo' : 'Show cleaned sample'}</button><p>{showSample ? 'Cleaned sample — for approval, not selected for publishing.' : 'Original photo — current website selection.'}</p></div>}
    <div className="cs-gallery-thumbs" aria-label="Choose photograph">
      {slides.map((shot, i) => <button type="button" key={shot.id} aria-label={`Show ${shot.name}`}
        aria-pressed={index === i} onClick={() => go(i)}>
        <img src={photos[shot.id].url} alt="" loading="lazy"/><span>{shot.name}</span>
      </button>)}
    </div>
  </section>;
}
