import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { cityDate, clock, dateKey } from './model';
import { formatStars, periodConfig, periodStars, TRENDING_STALE_MS } from './trendingData';
import useTrending from './useTrending';
import { CAROUSEL_SLIDES, goToSlide, initialCarousel, swipeDirection, tickCarousel } from './carousel';
import { CAROUSEL_TEXT, TRENDING_TEXT, pick } from './i18n';

// One Top 5 list. In the carousel the footer is shared below the dots (TrendingFooter), so
// each slide renders without it.
export function TrendingContent({ data, status, language, city, now, period = 'weekly', footer = true }) {
  const t = pick(TRENDING_TEXT, language);
  const fetched = data ? cityDate(city, new Date(data.generatedAt)) : null;
  const stale = data && now.getTime() - Date.parse(data.generatedAt) > TRENDING_STALE_MS;
  const titleId = `trending-${period}-title`;
  return <section className="trending-feed" aria-labelledby={titleId}>
    <header className="trending-header">
      <h2 id={titleId}>{t[`title_${period}`]}</h2>
      <div className="trending-status" aria-live="polite">
        {fetched ? <span>{t.updated} {dateKey(fetched)} {clock(fetched, '24').digits}</span> : <span>{status === 'error' ? t.failed : t.loading}</span>}
        {data && (status === 'error' || stale) && <strong>{status === 'error' ? t.cached : t.stale}</strong>}
      </div>
    </header>
    {data && <ol className="trending-list" role="list">{data.repositories.map((repo) =>
      <li className="trending-item" key={repo.url}>
        <h3 className="repo-heading"><span className="repo-rank" aria-hidden="true">{String(repo.rank).padStart(2, '0')}</span><a className="repo-link" href={repo.url} target="_blank" rel="noopener noreferrer" title={`${repo.owner} / ${repo.name}`}>{repo.owner} / {repo.name}</a></h3>
        <p className="repo-description" title={repo.description || t.description}>{repo.description || t.description}</p>
        <div className="repo-meta"><span className="repo-language">{repo.language || t.language}</span><span className="repo-stars"><Star aria-hidden="true" strokeWidth={1.8} /><span>+{formatStars(periodStars(repo, period))}</span><small>{t[`stars_${period}`]}</small></span></div>
      </li>
    )}</ol>}
    {footer && <TrendingFooter period={period} language={language} />}
  </section>;
}

export function TrendingFooter({ period = 'weekly', language }) {
  const t = pick(TRENDING_TEXT, language);
  return <footer className="trending-footer"><span>{t.note}</span><a href={periodConfig(period).source} target="_blank" rel="noopener noreferrer">{t[`source_${period}`]}</a></footer>;
}

// Each slide polls its own list from mount, so switching never shows a loading state.
export function TrendingSlide({ period, ...props }) {
  const { data, status } = useTrending(period);
  return <TrendingContent {...props} period={period} data={data} status={status} footer={false} />;
}

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key]);

// Right column (issue #23): weekly and daily Trending side by side in one track, so the panel
// takes the taller slide's height. Auto-advances on the app's minute tick (`now`) every
// `interval` minutes, paused while `paused` (Settings / break dialog) or the mouse is over it.
export function TrendingCarousel({ language, city, now, interval, paused = false, slides = CAROUSEL_SLIDES, renderSlide }) {
  const c = pick(CAROUSEL_TEXT, language);
  const count = slides.length;
  const [state, setState] = useState(() => initialCarousel(Date.now(), interval));
  const [hovered, setHovered] = useState(false);
  // Keyboard focus inside the panel also pauses rotation, so a switch never makes the focused
  // link inert under a keyboard user.
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const touch = useRef(null);
  const swiped = useRef(false);
  const dots = useRef([]);
  const focusDot = useRef(false);
  const index = Math.min(state.index, count - 1);
  useEffect(() => {
    setState((old) => tickCarousel(old, { count, nowMs: now.getTime(), interval, paused: paused || hovered || keyboardFocus }));
  }, [now]);
  // A key pressed on a link in the outgoing slide: that slide turns inert and would drop focus to
  // the page, so move it to the new slide's dot.
  useEffect(() => {
    if (!focusDot.current) return;
    focusDot.current = false;
    if (dots.current[index]) dots.current[index].focus();
  }, [index]);
  const go = (target) => setState((old) => goToSlide(old, target, { count, nowMs: Date.now(), interval }));
  const step = (direction) => go(index + direction);
  const name = (slide) => c[`name_${slide.id}`] || slide.id;
  const draw = renderSlide || ((slide) => <TrendingSlide period={slide.period} language={language} city={city} now={now} />);
  return <section className="trending-carousel" aria-roledescription="carousel" aria-label={c.label}
    onKeyDown={(event) => {
      if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      if (event.target.closest && event.target.closest('.carousel-slide')) focusDot.current = true;
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }}
    onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
    onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovered(false); }}
    onFocus={(event) => { let visible = false; try { visible = event.target.matches(':focus-visible'); } catch { /* old engines */ } setKeyboardFocus(visible); }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false); }}>
    <div className="carousel-stage">
      <div className="carousel-viewport"
        onPointerDown={(event) => { swiped.current = false; touch.current = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY }; }}
        onPointerCancel={() => { touch.current = null; }}
        onPointerUp={(event) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y);
          if (!direction) return;
          // A swipe that ends on a repository link must not also open it.
          // Cleared by the next pointerdown, so a later real tap still opens its link.
          swiped.current = true;
          step(direction);
        }}
        onClickCapture={(event) => { if (swiped.current) { swiped.current = false; event.preventDefault(); event.stopPropagation(); } }}>
        <div className="carousel-track" style={{ transform: `translateX(${-100 * index}%)` }}>
          {slides.map((slide, i) => <div key={slide.id} className={i === index ? 'carousel-slide carousel-slide--current' : 'carousel-slide'}
            role="group" aria-roledescription="slide" aria-label={fill(c.slideGroup, { n: i + 1, total: count })}
            aria-hidden={i === index ? undefined : 'true'} inert={i === index ? undefined : ''}>
            {draw(slide, i)}
          </div>)}
        </div>
      </div>
      {count > 1 && <>
        {/* Issue #25: a transparent 44px hit box around a small disc, so the arrows cover less of the list. */}
        <button type="button" className="carousel-arrow carousel-arrow--previous" title={c.previous} aria-label={c.previous} onClick={() => step(-1)}><span className="carousel-arrow-disc" aria-hidden="true"><ChevronLeft aria-hidden="true" /></span></button>
        <button type="button" className="carousel-arrow carousel-arrow--next" title={c.next} aria-label={c.next} onClick={() => step(1)}><span className="carousel-arrow-disc" aria-hidden="true"><ChevronRight aria-hidden="true" /></span></button>
      </>}
    </div>
    {count > 1 && <div className="carousel-dots">
      {slides.map((slide, i) => <button key={slide.id} ref={(node) => { dots.current[i] = node; }} type="button" className="carousel-dot"
        aria-label={fill(c.slide, { n: i + 1, total: count, name: name(slide) })} title={name(slide)}
        aria-current={i === index ? 'true' : undefined} onClick={() => go(i)}><span className="carousel-dot-mark" aria-hidden="true" /></button>)}
    </div>}
    <TrendingFooter period={slides[index].period} language={language} />
  </section>;
}

export default TrendingCarousel;
