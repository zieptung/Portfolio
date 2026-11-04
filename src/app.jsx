import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence, MotionConfig, useScroll, useTransform, useSpring, useReducedMotion, useMotionValueEvent, useAnimationFrame, useInView } from 'framer-motion';
import { ArrowUpRight, ArrowDown, ArrowRight, Play, X, Menu, Mail, Phone, MapPin, Github, Linkedin, Facebook, Download, Pause, Search, Plus, Minus, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import archive from './data/projects.json';
import brands from './data/brands.json';
import { copy } from './i18n';
import CursorCrew from './cursor-crew';
import './styles.css';

const MotionContext = createContext(true);
const LangContext = createContext({ lang: 'vi', t: copy.vi, setLang: () => {} });
const useLang = () => useContext(LangContext);
const localize = (project, lang) => (lang === 'en' && project?.en ? { ...project, ...project.en } : project);
const EASE = [0.22, 1, 0.36, 1];
const categories = ['all', 'AI & Automation', 'Backend', 'Desktop', 'Web'];
const featured = ['AI Agent tại Novamed', 'Student Management API', 'Student Course Registration System'].map(key => archive.find(p => p.title === key)).filter(Boolean);
function Reveal({ children, className = '', delay = 0, as = 'div' }) {
  const enabled = useContext(MotionContext);
  const Component = motion[as];
  return <Component className={className} initial={enabled ? { opacity: 0, y: 32 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.12 }} transition={{ duration: enabled ? 0.75 : 0, delay, ease: EASE }}>{children}</Component>;
}

function MediaImage({ src, alt, className = '', priority = false, ...props }) {
  const { t } = useLang();
  const [state, setState] = useState('loading');
  const imgRef = useRef(null);
  useEffect(() => {
    const img = imgRef.current;
    // Cached images can finish before React attaches onLoad.
    setState(img?.complete ? (img.naturalWidth ? 'loaded' : 'error') : 'loading');
  }, [src]);
  return <span className={`media-image ${state} ${className}`}>
    {state === 'error' && <span className="image-fallback"><span className="display">DT.</span><span>{t.noPreview}</span></span>}
    <img ref={imgRef} src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} width="960" height="600" onLoad={() => setState('loaded')} onError={e => {
      if (e.currentTarget.src.includes('maxresdefault.jpg')) e.currentTarget.src = e.currentTarget.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
      else setState('error');
    }} {...props} />
  </span>;
}

function Magnetic({ children, className = '', ...props }) {
  const enabled = useContext(MotionContext);
  const x = useSpring(0, { stiffness: 220, damping: 20 });
  const y = useSpring(0, { stiffness: 220, damping: 20 });
  return <motion.a className={className} style={{ x, y }} onPointerMove={e => {
    if (!enabled || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.12); y.set((e.clientY - r.top - r.height / 2) * 0.2);
  }} onPointerLeave={() => { x.set(0); y.set(0); }} {...props}>{children}</motion.a>;
}

function LangSwitch() {
  const { lang, t, setLang } = useLang();
  return <div className="lang-switch" role="group" aria-label={t.langLabel}>{[['vi', 'VI', 'Tiếng Việt'], ['en', 'EN', 'English']].map(([code, label, name]) => <button key={code} lang={code} className={lang === code ? 'selected' : ''} aria-pressed={lang === code} aria-label={name} onClick={() => setLang(code)}>{label}</button>)}</div>;
}

function Header({ enabled, onToggle }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('home');
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: '-15% 0px -65% 0px' });
    document.querySelectorAll('main > section[id]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  return <header className="site-header">
    <a className="wordmark" href="#home" aria-label={t.homeLabel}>DT<span>✳</span></a>
    <nav className="desktop-nav" aria-label={t.navLabel}>{t.nav.map(([id, label]) => <a key={id} href={`#${id}`} className={active === id ? 'active' : ''}>{label}</a>)}</nav>
    <div className="header-actions"><LangSwitch/><button className="motion-toggle" onClick={onToggle} aria-label={enabled ? t.motionPause : t.motionPlay} aria-pressed={!enabled}>{enabled ? <Pause size={13} /> : <Play size={13} />}<span>{enabled ? t.motionOn : t.motionOff}</span></button><a className="header-contact" href="#contact">{t.talk} <ArrowUpRight size={16} /></a><button className="menu-toggle icon-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? t.menuClose : t.menuOpen}>{open ? <X /> : <Menu />}</button></div>
    <AnimatePresence>{open && <motion.nav id="mobile-menu" className="mobile-menu" aria-label={t.navMobileLabel} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>{[['home', t.navHome], ...t.nav].map(([id, label], i) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}><span>0{i + 1}</span>{label}<ArrowUpRight size={18} /></a>)}</motion.nav>}</AnimatePresence>
  </header>;
}

function Hero() {
  const { t } = useLang();
  const ref = useRef(null);
  const enabled = useContext(MotionContext);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const portraitY = useTransform(scrollYProgress, [0, 1], [0, 85]);
  const portraitScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -55]);
  return <section id="home" className="hero" ref={ref}>
    <div className="hero-top"><span>{t.heroTop[0]}<br/><span className="muted">{t.heroTop[1]}</span></span><span className="availability"><i />{t.available}</span></div>
    <motion.div className="hero-title display" aria-hidden="true" style={enabled ? { y: titleY } : {}} initial={enabled ? { clipPath: 'inset(0 0 100% 0)' } : false} animate={{ clipPath: 'inset(0 0 0% 0)' }} transition={{ duration: 1.4, ease: EASE }}>{t.heroTitle}</motion.div>
    <motion.div className="hero-portrait" style={enabled ? { y: portraitY, scale: portraitScale } : {}} initial={enabled ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.2 }}><img src="./Asset/img/diep-tung-silhouette.png" alt={t.portraitAlt} width="1024" height="1536" fetchPriority="high" /></motion.div>
    <motion.div className="hero-intro" style={enabled ? { y: copyY } : {}} initial={enabled ? { opacity: 0, x: -35 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.35, ease: EASE }}>
      <p className="handwriting">{t.hello}</p><h1 className="display">DIEP TUNG<span>.</span></h1><p className="hero-role">{t.role[0]}<br />{' '}{t.role[1]}</p><p className="hero-description">{t.heroText[0]}<br />{t.heroText[1]}</p>
      <Magnetic href="#portfolio" className="primary-link">{t.heroCta} <ArrowDown size={17}/></Magnetic>
      <span className="hero-location"><MapPin size={12} /> {t.location}</span>
    </motion.div>
    <motion.div className="hero-side" initial={enabled ? { opacity: 0, x: 30 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.55, ease: EASE }}>
      <div className="hero-manifesto"><span className="crosshair" aria-hidden="true">✳</span><p>{t.manifesto[0]}<br />{t.manifesto[1]}</p></div>
      <div className="hero-stats"><div><span className="display">3</span><p>{t.statYear[0]}<br/>{t.statYear[1]}</p></div><div><span className="display">3.49</span><p>{t.statGpa[0]}<br/>{t.statGpa[1]}</p></div><div className="hero-award-stat"><span className="display">4<span>+</span></span><a href="#experience" aria-label={t.statAgentLabel}>AI AGENT / BOT<ArrowUpRight size={12}/></a></div><a href={t.cv} download><Download size={16}/><span>{t.downloadCv}</span></a></div>
    </motion.div>
    <div className="hero-bottom"><a className="reel-button" href="https://github.com/zieptung" target="_blank" rel="noopener noreferrer"><span className="play-circle"><Github size={12} /></span>{t.github}<span className="muted">@ZIEPTUNG</span></a><span className="hero-scroll">{t.scroll} <ArrowDown size={13}/></span><span className="edition">{t.edition}</span></div>
  </section>;
}

function ProjectCard({ project, index, onOpen }) {
  const { t } = useLang();
  const enabled = useContext(MotionContext);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [-12, 12]);
  const video = ['youtube', 'drive'].includes(project.type);
  return <motion.article ref={ref} className="project-card" layout initial={enabled ? { opacity: 0, y: 32 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.08 }} transition={{ duration: enabled ? 0.6 : 0, delay: (index % 3) * 0.06, ease: EASE }} exit={{ opacity: 0, scale: 0.96 }}>
    <button className="project-open" onClick={() => onOpen(project)} aria-label={`${t.view} ${project.title}`}><motion.div className="project-picture" style={enabled ? { y } : {}}><MediaImage src={project.image} alt={project.title}/></motion.div><span className="project-type">{project.type === 'repo' ? t.typeRepo : project.type === 'case' ? t.typeCase : t.typeImage}</span><span className="project-hover">{video ? <Play fill="currentColor" size={18}/> : <ArrowUpRight size={22}/>}</span><span className="project-frame" aria-hidden="true" /></button>
    <button className="project-caption" onClick={() => onOpen(project)}><span className="project-number display">{String(index + 1).padStart(2, '0')}</span><span><h3>{project.title}</h3><span className="project-category">{t.categories[project.category] || project.category}{project.year ? ` / ${project.year}` : ''}</span></span><ArrowUpRight size={20}/></button>
  </motion.article>;
}

function BrandStrip() {
  const { t } = useLang();
  const enabled = useContext(MotionContext);
  const ref = useRef(null);
  const loopWidth = useRef(0);
  const inView = useInView(ref);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (!ref.current || showAll) return;
    const update = () => { loopWidth.current = ref.current?.querySelector('.brand-set')?.getBoundingClientRect().width || 0; };
    const observer = new ResizeObserver(update);
    observer.observe(ref.current); update();
    return () => observer.disconnect();
  }, [showAll]);
  useAnimationFrame((time, delta) => {
    if (!enabled || paused || interacting || !inView || showAll || !ref.current || !loopWidth.current) return;
    const el = ref.current;
    el.scrollLeft += Math.min(delta, 40) * 0.038;
    if (el.scrollLeft >= loopWidth.current) el.scrollLeft -= loopWidth.current;
  });
  const move = direction => { setPaused(true); ref.current?.scrollBy({ left: direction * ref.current.clientWidth * .7, behavior: enabled ? 'smooth' : 'instant' }); };
  return <Reveal className="brand-section"><div className="brand-heading"><p>{t.techHeading[0]}<br/><strong>{t.techHeading[1]}</strong></p><div><button className="brand-all" onClick={() => setShowAll(v => !v)} aria-expanded={showAll} aria-controls="brand-collection">{showAll ? t.showLess : t.showAll(brands.length)}{showAll ? <Minus size={14}/> : <Plus size={14}/>}</button>{!showAll && <><button className="icon-button brand-pause" aria-label={paused ? t.stripPlay : t.stripPause} aria-pressed={paused} onClick={() => setPaused(v => !v)}>{paused ? <Play size={13}/> : <Pause size={13}/>}</button><button className="icon-button" onClick={() => move(-1)} aria-label={t.stripPrev}><ChevronLeft size={17}/></button><button className="icon-button" onClick={() => move(1)} aria-label={t.stripNext}><ChevronRight size={17}/></button></>}</div></div><div id="brand-collection" className={showAll ? 'brand-full-grid' : 'brand-viewport'} ref={ref} onPointerEnter={e => { if(e.pointerType==='mouse') setInteracting(true); }} onPointerLeave={() => setInteracting(false)} onPointerDown={() => setPaused(true)} onFocusCapture={() => setInteracting(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false); }} tabIndex={showAll ? undefined : 0} role={showAll ? 'list' : 'region'} aria-label={t.stripLabel}>
      {showAll ? brands.map(b => <div className="brand-logo tech-logo" key={b.name} role="listitem"><span className="tech-name display">{b.name}</span></div>) : <div className="brand-rail">{[0,1].map(copy => <div className="brand-set" key={copy} aria-hidden={copy === 1 ? true : undefined}>{brands.map(b => <div className="brand-logo tech-logo" key={b.name}><span className="tech-name display">{b.name}</span></div>)}</div>)}</div>}
    </div></Reveal>;
}

function Portfolio({ onProject }) {
  const { t, lang } = useLang();
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [limit, setLimit] = useState(9);
  const results = archive.map(p => localize(p, lang)).filter(p => (category === 'all' || p.category === category) && `${p.title} ${t.categories[p.category]} ${p.role}`.toLowerCase().includes(query.toLowerCase()));
  const projects = expanded || category !== 'all' || query ? results.slice(0, limit) : featured.map(p => localize(p, lang));
  return <section id="portfolio" className="portfolio section-wrap">
    <Reveal className="section-heading"><div><span className="eyebrow">{t.workEyebrow}</span><h2>{t.workTitle}<span className="accent">.</span></h2></div><button className="text-link" onClick={() => { if (expanded) { setExpanded(false); setCategory('all'); setQuery(''); } else { setExpanded(true); setLimit(9); } }}>{expanded ? t.workFeatured : t.workAll}<ArrowRight size={21}/></button></Reveal>
    <Reveal className="portfolio-toolbar">
      <div className="filters" role="group" aria-label={t.filterLabel}>
        {categories.map(c => <button key={c} className={category === c ? 'selected' : ''} aria-pressed={category === c} onClick={() => { setCategory(c); setExpanded(true); setLimit(9); }}>{t.categories[c]}{c === category && <motion.span className="filter-line" layoutId="filter-line"/>}</button>)}
      </div>
      <label className="search-box"><Search size={15}/><span>{t.searchWord}</span><input aria-label={t.searchLabel} type="search" placeholder={t.searchPlaceholder} value={query} onChange={e => { setQuery(e.target.value); setExpanded(true); setLimit(9); }}/></label>
    </Reveal>
    <motion.div className="project-grid" layout><AnimatePresence mode="popLayout">{projects.map((p, i) => <ProjectCard key={p.id} project={p} index={i} onOpen={onProject}/>)}</AnimatePresence></motion.div>
    {projects.length === 0 && <div className="empty-state"><p>{t.empty(query)}</p><button className="text-link" onClick={() => { setQuery(''); setCategory('all'); }}>{t.clearSearch} <X size={15}/></button></div>}
    {expanded && results.length > limit && <div className="load-more"><button className="outline-button" onClick={() => setLimit(v => v + 9)}>{t.loadMore} <Plus size={16}/></button><span>{projects.length} / {results.length} {t.projectsWord}</span></div>}
    <BrandStrip/>
  </section>;
}

function Awards({onProject}) {
  const { t } = useLang();
  const [expanded,setExpanded] = useState(false);
  const laurelPath = 'M48 94C8 68 9 30 35 5M22 61C8 60 3 49 3 44c12 0 19 6 19 17zm-5-19C5 35 6 23 8 19c11 5 13 14 9 23zm7-20C15 12 20 3 24 0c7 8 6 16 0 22zM31 79C17 79 8 70 7 64c13-2 22 4 24 15zm-3-18c-5-10-2-19 7-25 5 11 1 20-7 25zm10 24c-6-11-4-20 5-27 6 9 5 20-5 27z';
  return <section id="awards" className={`recognition section-wrap ${expanded ? 'awards-expanded' : ''}`}>
    <Reveal className="recognition-intro">
      <span className="eyebrow">{t.awardsEyebrow}</span>
      <h2 className="display">{t.awardsTitle[0]}<br/><span className="accent">{t.awardsTitle[1]}</span></h2>
      <div className="award-total">
        <svg viewBox="0 0 60 100" aria-hidden="true"><path d={laurelPath} fill="currentColor"/></svg>
        <span className="display">2</span>
        <svg viewBox="0 0 60 100" aria-hidden="true"><g transform="translate(60 0) scale(-1 1)"><path d={laurelPath} fill="currentColor"/></g></svg>
        <span className="award-total-label">{t.scholarships}</span>
      </div>
      <p>{t.awardsText[0]}<br/>{t.awardsText[1]}</p>
      <button className="text-link award-proof" onClick={()=>onProject({...t.certificates[0],type:'image',media:t.certificates[0].image,category:t.awardCategory,description:t.awardDescription})}>{t.viewCertificate}<ArrowUpRight size={18}/></button>
    </Reveal>
    <div className="recognition-list">
      <div className="recognition-list-head"><span>{t.awardsHead}</span><span>2024 – 2026</span></div>
      <ol id="recognition-list">{t.awards.map((award,i)=><Reveal as="li" className={`recognition-row ${i>2?'additional-award':''}`} key={award.year} delay={i*.045}>
        <span className="award-index">0{i+1}</span>
        <div><h3>{award.title}</h3><p>{award.event}</p></div>
        <span className="award-year display">{award.year}</span>
      </Reveal>)}</ol>
      <button className="award-expand" aria-expanded={expanded} aria-controls="recognition-list" onClick={()=>setExpanded(v=>!v)}>{expanded?t.awardsLess:t.awardsMore}{expanded?<Minus size={16}/>:<Plus size={16}/>}</button>
    </div>
  </section>;
}
function Breakdown() {
  const { t } = useLang();
  const ref = useRef(null);
  const enabled = useContext(MotionContext);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  useMotionValueEvent(scrollYProgress, 'change', v => { if (enabled) setStep(Math.min(t.flow.length - 1, Math.max(0, Math.floor((v - 0.2) / 0.5 * t.flow.length)))); });
  const titleX = useTransform(scrollYProgress, [0, 1], [30, -30]);
  return <section className="breakdown section-wrap" ref={ref} aria-labelledby="breakdown-title"><Reveal className="breakdown-copy"><span className="eyebrow">{t.flowEyebrow}</span><motion.h2 id="breakdown-title" className="display" style={enabled ? { x: titleX } : {}}>{t.flowTitle[0]}<br/><span className="accent">{t.flowTitle[1]}</span></motion.h2><p>{t.flowText[0]}<br/>{t.flowText[1]}</p><span className="breakdown-credit">{t.flowCredit}<br/>NODE.JS · EXPRESS · MYSQL</span></Reveal><Reveal className="flow-panel"><div className="flow-bar"><i/><i/><i/><span>{t.flowBar}</span></div><ol className="flow-list">{t.flow.map(([name, text], i) => <li key={name} className={!enabled || i <= step ? 'is-on' : ''}><span className="flow-index">{String(i + 1).padStart(2, '0')}</span><strong>{name}</strong><span className="flow-text">{text}</span></li>)}</ol></Reveal></section>;
}
function About() {
  const { t } = useLang();
  const enabled = useContext(MotionContext);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 75%'] });
  return <section id="about" className="about section-wrap" ref={ref}>
    <Reveal className="about-lead"><div><span className="eyebrow">{t.aboutEyebrow}</span><h2 className="display">{t.aboutTitle[0]}<br/>{t.aboutTitle[1]}<span className="accent">{t.aboutTitle[2]}</span></h2></div><p>{t.aboutText}</p></Reveal>
    <div className="studio-grid">
      <Reveal className="education-panel"><h3 className="panel-heading">{t.eduHeading}</h3><p className="eyebrow accent">{t.eduEyebrow}</p><div className="education-row"><strong>{t.school}</strong><span>{t.major}</span><p>{t.schoolText}</p></div><div className="education-row"><strong>{t.scholarship}</strong><span>2024 · 2026</span><p>{t.scholarshipText}</p></div><p className="eyebrow accent skills-heading">{t.skillsHeading}</p><div className="skill-tags">{t.skills.map(s => <span key={s}>{s}</span>)}</div><div className="software-row">{[].map(([file, name]) => <img key={file} src={`./Asset/svg/${file}.svg`} alt={name} title={name} loading="lazy" width="28" height="28"/>)}</div></Reveal>
      <div className="process-panel"><Reveal><h3 className="panel-heading">{t.processHeading}</h3></Reveal><div className="process-list"><div className="process-track"><motion.div style={{ scaleY: enabled ? scrollYProgress : 1 }}/></div>{t.process.map(([num, title, text], i) => <Reveal key={num} className="process-row" delay={i * 0.035}><span className="process-num display">{num}</span><span className="process-node"/><div><h4>{title}</h4><p>{text}</p></div></Reveal>)}</div></div>
      <Reveal className="quote-panel"><span className="quote-mark display">“</span><blockquote>{t.quote[0]}<br/>{t.quote[1]}<br/><em>{t.quote[2]}<br/>{t.quote[3]}</em></blockquote><span className="handwriting">Diep Tung</span><div className="quote-bottom">{t.quoteBottom[0]}<br/>{t.quoteBottom[1]}<span className="quote-symbol" aria-hidden="true">✳</span></div></Reveal>
    </div>
  </section>;
}

function Journey({ onProject }) {
  const { t } = useLang();
  const [open, setOpen] = useState(0);
  return <section id="experience" className="journey section-wrap">
    <Reveal className="section-heading"><div><span className="eyebrow">{t.journeyEyebrow}</span><h2>{t.journeyTitle}<span className="accent">.</span></h2></div><a className="text-link" href={t.cv} download>{t.resume}<Download size={16}/></a></Reveal>
    <div className="journey-grid"><div className="experience-list">{t.experiences.map((job, i) => <Reveal className={`experience-row ${open === i ? 'is-open' : ''}`} key={job.title}><button aria-expanded={open === i} aria-controls={`job-${i}`} onClick={() => setOpen(open === i ? null : i)}><span className="experience-date">{job.date}</span><span><h3>{job.title}</h3><span className="experience-place">{job.place}</span></span>{open === i ? <Minus size={18}/> : <Plus size={18}/>}</button><AnimatePresence initial={false}>{open === i && <motion.div id={`job-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}><p>{job.text}</p></motion.div>}</AnimatePresence></Reveal>)}</div>
    <Reveal className="awards-panel"><p className="eyebrow">{t.milestonesEyebrow}</p><h3 className="display">{t.milestonesTitle[0]}<br/><span className="accent">{t.milestonesTitle[1]}</span></h3><div className="award-list">{t.certificates.map((cert, i) => <button key={cert.title + cert.year} onClick={() => onProject({ ...cert, type: 'image', media: cert.image, category: t.certCategory, description: t.certDescription })}><span>{String(i + 1).padStart(2, '0')}</span><span>{cert.title}<small>{cert.year}</small></span><ArrowUpRight size={19}/></button>)}</div></Reveal></div>
  </section>;
}

function Contact({ onProject }) {
  const { t, lang } = useLang();
  const [sent, setSent] = useState(false);
  const send = e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = t.briefText(data.get('name'), data.get('type'), data.get('message'));
    navigator.clipboard?.writeText(text).catch(() => {});
    window.open('https://zalo.me/0388674005', '_blank', 'noopener,noreferrer');
    setSent(true);
  };
  return <section id="contact" className="contact section-wrap">
    <div className="contact-grid"><Reveal className="contact-intro"><span className="eyebrow">{t.contactEyebrow}</span><h2 className="display">{t.contactTitle[0]}<br/>{t.contactTitle[1]}<span className="accent">.</span></h2><p>{t.contactText[0]}<br/>{t.contactText[1]}</p><Magnetic href="https://zalo.me/0388674005" target="_blank" rel="noopener noreferrer" className="contact-cta"><span className="round-arrow"><ArrowUpRight size={21}/></span>{t.contactCta}</Magnetic></Reveal>
    <Reveal className="contact-links" delay={0.1}><a href="mailto:dieptung20102005@gmail.com"><Mail/><span><small>EMAIL</small>dieptung20102005@gmail.com</span><ArrowUpRight size={16}/></a><a href="https://github.com/zieptung" target="_blank" rel="noopener noreferrer"><Github/><span><small>GITHUB</small>@zieptung</span><ArrowUpRight size={16}/></a><a href="https://zalo.me/0388674005" target="_blank" rel="noopener noreferrer"><Phone/><span><small>{t.phoneLabel}</small>0388 674 005</span><ArrowUpRight size={16}/></a><div><MapPin/><span><small>{t.basedLabel}</small>{t.basedIn}</span></div></Reveal>
    <Reveal className="contact-reel" delay={0.2}><button onClick={() => onProject(localize(featured[0], lang))} aria-label={t.reelLabel}><div className="reel-screen"><span className="reel-screen-top">DIEP TUNG<span>{t.reelTag}</span></span><MediaImage src={localize(featured[0], lang)?.image} alt={t.reelAlt}/><span className="reel-screen-title display">{t.reelTitle[0]}<br/><span>{t.reelTitle[1]}</span></span><span className="play-circle"><ArrowUpRight size={18}/></span></div><span className="reel-caption">{t.reelCaption}</span></button></Reveal></div>
    <Reveal><details className="project-brief"><summary>{t.briefSummary} <Plus size={19}/></summary><form onSubmit={send}><label>{t.formName}<input name="name" required placeholder={t.formNamePlaceholder} autoComplete="name" maxLength="100"/></label><label>{t.formType}<select name="type">{t.formTypes.map(o => <option key={o}>{o}</option>)}</select></label><label className="brief-message">{t.formMessage}<textarea name="message" required rows="3" placeholder={t.formMessagePlaceholder} maxLength="3000"/></label><button className="solid-button" type="submit">{t.formSubmit} <ArrowUpRight size={18}/></button><p className="form-note" role="status">{sent ? t.formSent : t.formNote}</p></form></details></Reveal>
  </section>;
}

function ProjectDialog({ project, onClose }) {
  const { t } = useLang();
  const ref = useRef(null);
  const [renderMode, setRenderMode] = useState('final');
  const [shot, setShot] = useState(0);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [retried, setRetried] = useState(0);
  const enabled = useContext(MotionContext);
  const activeShot = project.type === 'render' ? project.renders[shot] : null;
  const embedType = activeShot?.video ? 'youtube' : activeShot?.drive ? 'drive' : project.type;
  const embedMedia = activeShot?.video || activeShot?.drive?.match(/\/d\/([^/]+)/)?.[1] || project.media;
  const isVideo = ['youtube', 'drive'].includes(embedType);
  const availableModes = [['layout', 'Layout'], ['solid', 'Solid'], ['material', 'Material'], ['lighting', 'Lighting'], ['final', 'Final render']].filter(([mode]) => activeShot?.[mode] && !(mode === 'solid' && activeShot.hideSolidMode));
  const effectiveMode = activeShot?.[renderMode] ? renderMode : availableModes[0]?.[0];
  const rendered = activeShot?.[effectiveMode] || activeShot?.image || project.image;
  const sourceUrl = project.type === 'case' ? null : embedType === 'youtube' ? `https://www.youtube.com/watch?v=${embedMedia}` : embedType === 'drive' ? `https://drive.google.com/file/d/${embedMedia}/view` : project.type === 'render' ? rendered : project.media || project.image;
  const changeShot = next => { setMediaLoaded(false); setMediaFailed(false); setShot(next); };
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const listener = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const nodes = [...ref.current.querySelectorAll('button, a[href], input, select, textarea, iframe')].filter(n => !n.disabled && n.getClientRects().length);
        const first = nodes[0]; const last = nodes.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', listener);
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', listener); previous?.focus(); };
  }, [onClose]);
  useEffect(() => {
    if (!isVideo) return;
    const timer = setTimeout(() => { if (!mediaLoaded) setMediaFailed(true); }, 14000);
    return () => clearTimeout(timer);
  }, [mediaLoaded, retried, isVideo, embedMedia]);
  return <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.div ref={ref} className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex="-1" initial={enabled ? { y: 45, scale: 0.97 } : false} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
      <div className="dialog-heading"><span className="eyebrow">{t.categories[project.category] || project.category} {project.year && ` / ${project.year}`}</span><button onClick={onClose} className="icon-button" aria-label={t.close}><X/></button></div>
      <div className={`dialog-media ${!isVideo ? 'still' : ''}`}>
        {isVideo ? <>{!mediaLoaded && <div className="media-loading" role="status">{mediaFailed ? <><p>Chưa tải được bản xem trước. Mở nguồn gốc để xem.</p><button className="outline-button" onClick={() => { setMediaFailed(false); setMediaLoaded(false); setRetried(v => v + 1); }}>Thử lại</button></> : <><span className={enabled ? 'loading-ring' : 'loading-ring paused'}/><p>Đang tải video…</p></>}</div>}<iframe key={`${embedMedia}-${retried}`} src={embedType === 'youtube' ? `https://www.youtube-nocookie.com/embed/${embedMedia}?autoplay=1&rel=0` : `https://drive.google.com/file/d/${embedMedia}/preview`} title={project.title} width="1280" height="720" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onLoad={() => { setMediaLoaded(true); setMediaFailed(false); }} onError={() => setMediaFailed(true)}/></> : <MediaImage src={rendered} alt={project.title} priority/>}
      </div>
      {project.type === 'render' && (availableModes.length > 0 || project.renders.length > 1) && <div className="render-controls"><div role="group" aria-label="Giai đoạn render">{availableModes.map(([mode, label]) => <button key={mode} className={effectiveMode === mode ? 'selected' : ''} onClick={() => setRenderMode(mode)} aria-pressed={effectiveMode === mode}>{label}</button>)}</div>{project.renders.length > 1 && <div className="shot-controls"><button className="icon-button" aria-label="Shot trước" onClick={() => changeShot((shot - 1 + project.renders.length) % project.renders.length)}><ChevronLeft/></button><span>SHOT {shot + 1} / {project.renders.length}</span><button className="icon-button" aria-label="Shot tiếp theo" onClick={() => changeShot((shot + 1) % project.renders.length)}><ChevronRight/></button></div>}</div>}
      <div className="dialog-description"><div><h2 id="dialog-title">{project.title}</h2>{project.role && <span className="accent">{project.role}</span>}<p>{project.description}</p></div>{sourceUrl && <a className="outline-button" href={sourceUrl} target="_blank" rel="noopener noreferrer">{project.type === 'repo' ? t.openGithub : project.type === 'website' ? t.openWebsite : t.openSource}<ExternalLink size={15}/></a>}</div>
      {isVideo && <p className="embed-note">Nếu video bị chủ sở hữu giới hạn, hãy dùng “Mở nguồn gốc”.</p>}
    </motion.div>
  </motion.div>;
}

function App() {
  const reduced = useReducedMotion();
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem('diep-tung-lang') === 'en' ? 'en' : 'vi'; } catch { return 'vi'; } });
  const t = copy[lang];
  const setLang = next => { setLangState(next); try { localStorage.setItem('diep-tung-lang', next); } catch {} };
  useEffect(() => { document.documentElement.lang = lang; document.title = t.meta.title; document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description); }, [lang, t]);
  const [motionOn, setMotionOn] = useState(() => { try { return localStorage.getItem('diep-tung-motion') !== 'off'; } catch { return true; } });
  const enabled = motionOn && !reduced;
  const [project, setProject] = useState(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 28, restDelta: 0.001 });
  useEffect(() => { document.documentElement.dataset.motion = enabled ? 'on' : 'off'; }, [enabled]);
  const toggle = () => { setMotionOn(!motionOn); try { localStorage.setItem('diep-tung-motion', motionOn ? 'off' : 'on'); } catch {} };
  const close = React.useCallback(() => setProject(null), []);
  return <LangContext.Provider value={{ lang, t, setLang }}><MotionContext.Provider value={enabled}>
    <MotionConfig reducedMotion={enabled ? 'user' : 'always'} transition={{ ease: EASE }}>
      <a className="skip-link" href="#portfolio">{t.skip}</a>
      <motion.div className="reading-progress" style={{ scaleX: enabled ? progress : scrollYProgress }}/>
      <CursorCrew enabled={enabled && !project} lang={lang}/>
      <Header enabled={enabled} onToggle={toggle}/>
      <main>
        <Hero/>
        <Portfolio onProject={setProject}/>
        <Awards onProject={setProject}/>
        <Breakdown/>
        <About/>
        <Journey onProject={setProject}/>
        <Contact onProject={setProject}/>
      </main>
      <footer className="footer">
        <a className="wordmark" href="#home">DT<span>✳</span></a>
        <span>© {new Date().getFullYear()} DIEP TUNG. {t.footer}</span>
        <div>
          <a href="https://github.com/zieptung" target="_blank" rel="noopener noreferrer" aria-label="GitHub zieptung"><Github size={17}/></a>
          <a href="https://www.linkedin.com/in/di%E1%BB%87p-t%C3%B9ng-803266297/" target="_blank" rel="noopener noreferrer" aria-label={t.footerLinkedin}><Linkedin size={17}/></a>
          <a href="https://www.facebook.com/Tungduhoc05/" target="_blank" rel="noopener noreferrer" aria-label={t.footerFacebook}><Facebook size={17}/></a>
          <a href="#home" aria-label={t.footerTop}><ArrowUpRight size={18}/></a>
        </div>
      </footer>
      <AnimatePresence>{project && <ProjectDialog key={project.title} project={project} onClose={close}/>}</AnimatePresence>
    </MotionConfig>
  </MotionContext.Provider></LangContext.Provider>;
}

createRoot(document.getElementById('root')).render(<App/>);
