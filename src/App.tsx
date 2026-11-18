import { useEffect, useState } from 'react'
import {
  Atom, Bot, Braces, Brain, ChartColumn, Cloud, CodeXml, Container, Cylinder, Database, DatabaseZap, FileCode,
  Link, Mail, MessageSquareCode, Route, Server, Sparkles, Triangle, Workflow, Zap, type LucideIcon,
} from 'lucide-react'
import ShapeWaves from '@/components/ShapeWaves'
import SplitText from '@/components/SplitText'
import LivingFace from '@/components/face/LivingFace'
import avatar from '@/assets/avatar.png'
import { credentials, experience, filters, footerLinks, process, profile, projects, skills, socials, ticker } from '@/data'
import './portfolio.css'

// Small icon shown before each word in the big scrolling bar. A word without an entry gets the Sparkles icon.
const TICKER_ICONS: Record<string, LucideIcon> = {
  RAG: DatabaseZap, LangChain: Link, Claude: Sparkles, OpenAI: Brain, 'AI agents': Bot,
  'Prompt engineering': MessageSquareCode, Python: CodeXml, TypeScript: Braces, React: Atom, 'Node.js': Server,
  FastAPI: Zap, Supabase: Database, PostgreSQL: Cylinder, Docker: Container, 'GitHub Actions': Workflow,
  Vercel: Triangle, Cloudflare: Cloud, 'Email Studio': Mail, 'Journey Builder': Route, AMPscript: FileCode,
  'Power BI': ChartColumn,
}

const PIXEL_VARIANTS = ['Square', 'Grid', 'Circle', 'Line', 'Triangle'] as const
type Family = 'Pixel' | 'Sans' | 'Serif' | 'Mono'

const HW: Record<Family, number> = { Pixel: 400, Sans: 500, Serif: 400, Mono: 500 }
const LS: Record<Family, string> = { Pixel: '0', Sans: '-.03em', Serif: '-.015em', Mono: '-.04em' }

const clock = () => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date())
  } catch {
    return ''
  }
}

function ArrowOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 17L17 7M8 7h9v9" />
    </svg>
  )
}

const BRAND: Record<string, string> = {
  LinkedIn:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  X: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  Discord:
    'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
  Mail: 'M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v.4l-10 6.2L2 6.4V6Zm0 2.75V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.75l-9.47 5.87a1 1 0 0 1-1.06 0L2 8.75Z',
  GitHub:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="ext lk" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowOut />
    </a>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="lab">
      <p className="mono">{children}</p>
    </div>
  )
}

export default function App() {
  const [filter, setFilter] = useState('All')
  // The animated logo needs WebGPU. Where the browser lacks it, a plain "</>" is shown instead.
  const [logoFailed, setLogoFailed] = useState(false)
  const [open, setOpen] = useState<string | null>('aiformeru')
  const [time, setTime] = useState(clock)
  const [family, setFamily] = useState<Family>('Pixel')
  const [variant, setVariant] = useState<(typeof PIXEL_VARIANTS)[number]>('Square')

  useEffect(() => {
    const id = setInterval(() => setTime(clock()), 15000)
    return () => clearInterval(id)
  }, [])

  const stacks: Record<Family, string> = {
    Pixel: `'GP ${variant}',ui-monospace,monospace`,
    Sans: "'GF Sans',system-ui,sans-serif",
    Serif: "'GF Serif',Georgia,serif",
    Mono: "'GF Mono',ui-monospace,monospace",
  }

  const pickPixel = () => {
    if (family === 'Pixel') setVariant(PIXEL_VARIANTS[(PIXEL_VARIANTS.indexOf(variant) + 1) % PIXEL_VARIANTS.length])
    else setFamily('Pixel')
  }
  const fb = (k: Family) => (k === family ? 'fb on' : 'fb')

  const visible = projects.filter((p) => filter === 'All' || p.kind === filter)

  return (
    <div
      id="top"
      className="pf"
      style={
        {
          '--ground': '#DADADA',
          '--accent': '#111111',
          '--font': stacks[family],
          '--hw': HW[family],
          '--ls': LS[family],
        } as React.CSSProperties
      }
    >
      <nav className="nav" aria-label="Primary">
        <div className="wrap">
          <a
            href="#top"
            className="disp"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 44, paddingInline: 24, fontWeight: 'var(--hw)', fontSize: 21, letterSpacing: 'var(--ls)' }}
          >
            <span className="logo" aria-hidden="true">
              {logoFailed ? (
                '</>'
              ) : (
                <ShapeWaves
                  text="</>"
                  fontFamily="'GF Mono', ui-monospace, monospace"
                  fontWeight={700}
                  textSize={0.62}
                  cellSize={2}
                  dotSize={0.8}
                  color="#929292"
                  hoverColor="#ffffff"
                  backgroundColor="#111111"
                  brightness={0.5}
                  scale={0.6}
                  fade={0}
                  glow={0}
                  splashRadius={14}
                  onError={() => setLogoFailed(true)}
                />
              )}
            </span>
            Eshwar
          </a>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {['Work', 'Process', 'Experience', 'Skills', 'Contact'].map((n) => (
              <a key={n} className="nl lk" href={`#${n.toLowerCase()}`}>
                {n}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main className="wrap">
        <section id="hero" style={{ paddingTop: 72 }}>
          <div className="in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <p className="mono m fu">Portfolio 2026</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
              <h1 className="big" aria-label="Vemula Eshwar">
                <SplitText text="Vemula" tag="span" textAlign="left" delay={60} trigger="load" />
                <SplitText text="Eshwar" tag="span" textAlign="left" delay={60} trigger="load" />
              </h1>
              <LivingFace avatar={avatar} alt="3D illustrated portrait of Vemula Eshwar, smiling" hoverSelector='a[href^="mailto:"]' />
            </div>
          </div>

          <div className="sec" style={{ marginTop: 56 }}>
            <div className="in" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p className="mono m">Local time</p>
              <p className="disp" style={{ fontSize: 28, fontWeight: 'var(--hw)', letterSpacing: 'var(--ls)' }}>
                {time} <span className="mono m">IST</span>
              </p>
            </div>
            <div className="in" style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 64 }}>
              <SplitText
                tag="p"
                splitType="words"
                textAlign="left"
                delay={45}
                trigger="load"
                className="disp max-w-[26em] text-[clamp(20px,2.1vw,30px)] leading-[1.22] tracking-[var(--ls)]"
                text={profile.tagline}
              />
              <pre className="code fu" aria-label="About me, as code">
                <span className="m">{'const '}</span>eshwar<span className="m">{' = {'}</span>
                {'\n'}
                {profile.code.map(([k, v]) => (
                  <span key={k}>
                    {'  '}
                    {k}
                    <span className="m">{': '}</span>
                    {v}
                    <span className="m">{','}</span>
                    {'\n'}
                  </span>
                ))}
                <span className="m">{'}'}</span>
              </pre>
              <div className="fu fu2" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <a className="btn p" href="#work">View work</a>
                <a className="btn s" href={`mailto:${profile.email}`}>Email me</a>
                <a className="btn s" href="/Vemula_Eshwar_Resume.pdf" target="_blank" rel="noopener noreferrer">Resume</a>
              </div>
            </div>
          </div>

          <div className="cells">
            {[
              ['Role', profile.role],
              ['Company', profile.company],
              ['Based in', profile.location],
              ['Building now', profile.building],
            ].map(([k, v]) => (
              <div key={k}>
                <span className="mono m">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>

          <div className="tick" aria-hidden="true">
            <div className="trk">
              {[0, 1].map((n) => (
                <div key={n}>
                  {ticker.map((t) => {
                    const Icon = TICKER_ICONS[t] ?? Sparkles
                    return (
                      <span key={t} className="tki">
                        <Icon strokeWidth={1.8} />
                        <span>{t}</span>
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <div className="night">
        <main className="wrap">
          <section id="work">
            <div className="sec">
              <SectionLabel>01 / Selected work</SectionLabel>
              <div className="cont">
                <div className="chips" role="group" aria-label="Filter projects">
                  {filters.map((c) => (
                    <button key={c} className={c === filter ? 'chip on' : 'chip'} aria-pressed={c === filter} onClick={() => setFilter(c)}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="list">
                  {visible.map((p, i) => {
                    const isOpen = p.id === open
                    return (
                      <div key={p.id} className="item rv">
                        <button className="pr" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.id)}>
                          <span className="mono m">{String(i + 1).padStart(2, '0')}</span>
                          <span className="ttl">{p.title}</span>
                          <span className="mono kd">{p.metric}</span>
                          <span
                            style={{ display: 'flex', justifyContent: 'flex-end', transform: `rotate(${isOpen ? 45 : 0}deg)`, transition: 'transform .25s cubic-bezier(.2,.7,.1,1)' }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true">
                              <path d="M12 4v16M4 12h16" />
                            </svg>
                          </span>
                        </button>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateRows: isOpen ? '1fr' : '0fr',
                            visibility: isOpen ? 'visible' : 'hidden',
                            transition: isOpen
                              ? 'grid-template-rows .4s cubic-bezier(.2,.7,.1,1), visibility 0s'
                              : 'grid-template-rows .4s cubic-bezier(.2,.7,.1,1), visibility 0s linear .4s',
                          }}
                        >
                          <div style={{ overflow: 'hidden', minHeight: 0 }}>
                            <div className="det">
                              <ul className="pts">
                                {p.points.map((t) => (
                                  <li key={t}>{t}</li>
                                ))}
                              </ul>
                              <div>
                                <div className="tags">
                                  {p.stack.map((t) => (
                                    <span key={t} className="tag">{t}</span>
                                  ))}
                                </div>
                                {p.url && <ExternalLink href={p.url}>{p.urlLabel}</ExternalLink>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

                    <section id="process">
            <div className="sec">
              <SectionLabel>02 / How I work</SectionLabel>
              <div className="cont">
                <p className="mono m path">{process.map((x) => x.name.toLowerCase()).join(' → ')}</p>
                <ol className="flow" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {process.map((x, i) => (
                    <li key={x.name} className={i === process.length - 1 ? 'st last rv' : 'st rv'}>
                      <span className="mono m">{String(i + 1).padStart(2, '0')}</span>
                      <h3 className="ttl">{x.name}</h3>
                      <p>{x.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section id="experience">
            <div className="sec">
              <SectionLabel>03 / Experience</SectionLabel>
              <div className="cont">
                <div className="list">
                  {experience.map((x) => (
                    <div key={x.role} className="xr rv">
                      <p className="mono m">{x.when}</p>
                      <div>
                        <h3 className="h3">{x.role}</h3>
                        <p className="m">{x.org}</p>
                      </div>
                      <ul className="pts">
                        {x.points.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="skills">
            <div className="sec">
              <SectionLabel>04 / Skills</SectionLabel>
              <div className="cont">
                <div className="skg">
                  {skills.map((s) => (
                    <div key={s.title} className="sk rv">
                      <h3 className="mono m" style={{ marginBottom: 12 }}>{s.title}</h3>
                      <ul>
                        {s.items.map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="credentials">
            <div className="sec">
              <SectionLabel>05 / Credentials</SectionLabel>
              <div className="cont">
                <div className="list">
                  {credentials.map(([name, by]) => (
                    <div key={name} className="cr rv">
                      <span>{name}</span>
                      <span className="mono m">{by}</span>
                    </div>
                  ))}
                </div>
                <div className="rv" style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p className="mono m">Education</p>
                  <h3 className="h3">B.Tech, Computer Science &amp; Engineering (Data Science)</h3>
                  <p className="m">Hyderabad Institute of Technology and Management · 2021 – 2025 · CGPA 7.69</p>
                  <p className="m">Coursework: Data Structures, Algorithms, OOP</p>
                </div>
              </div>
            </div>
          </section>

          <section id="contact">
            <div className="sec">
              <SectionLabel>06 / Contact</SectionLabel>
              <div className="cont" style={{ paddingBottom: 96, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 48 }}>
                <div style={{ flex: '1 1 360px', minWidth: 0 }}>
                  <SplitText
                    tag="p"
                    splitType="words"
                    textAlign="left"
                    delay={60}
                    className="disp"
                    text="Have something to build? Write to me."
                  />
                  <div style={{ height: 20 }} />
                  <a className="mail rv" href={`mailto:${profile.email}`}>{profile.email}</a>
                  <div className="soc rv">
                    {socials.map(([label, href]) => (
                      <ExternalLink key={label} href={href}>{label}</ExternalLink>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Full-width strip of social icons. The second row is the same strip in inverted colours,
              clipped to a window in the middle, so icons appear to pass behind a lens. */}
          <div className="soc">
            {[false, true].map((lens) => (
              <div key={String(lens)} className={lens ? 'soc-lens' : undefined} aria-hidden={lens || undefined}>
                <div className="soc-trk">
                  {[0, 1].map((half) => (
                    <div key={half} aria-hidden={half === 1 || undefined}>
                      {[0, 1, 2, 3].flatMap((rep) =>
                        footerLinks.map((l) => {
                          const inner = (
                            <>
                              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d={BRAND[l.name]} />
                              </svg>
                              <span>{l.name}</span>
                            </>
                          )
                          const first = !lens && half === 0 && rep === 0
                          return l.href && !lens ? (
                            <a
                              key={`${rep}${l.name}`}
                              className="soc-it"
                              href={l.href}
                              target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                              rel="noopener noreferrer"
                              tabIndex={first ? undefined : -1}
                            >
                              {inner}
                            </a>
                          ) : (
                            <span key={`${rep}${l.name}`} className="soc-it">
                              {inner}
                            </span>
                          )
                        }),
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <footer className="in" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px 24px', minHeight: 72 }}>
            <p className="mono m" style={{ display: 'inline-flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span>© 2026 Vemula Eshwar</span>
              <span style={{ display: 'inline-flex', gap: 12 }}>
                <a className="lk" href="/Vemula_Eshwar_Resume.pdf" target="_blank" rel="noopener noreferrer" aria-label="View resume (PDF, opens in a new tab)" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Resume ↗</a>
                <a className="lk" href="/Vemula_Eshwar_Resume.pdf" download="Vemula_Eshwar_Resume.pdf" aria-label="Download resume (PDF)" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Download ↓</a>
              </span>
            </p>
            <div className="fs" role="group" aria-label="Typeface">
              <button className={fb('Pixel')} onClick={pickPixel} aria-pressed={family === 'Pixel'} aria-label={`Geist Pixel, ${variant}. Click again to change pixel style`} title={`Geist Pixel: ${variant}`}>
                <svg viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
                  {[1, 8.5, 16].flatMap((y, r) =>
                    [1, 8.5, 16].map((x, c) => (
                      <rect key={`${r}${c}`} className="px" x={x} y={y} width="5" height="5" style={{ animationDelay: `${(r + c) * 0.15}s` }} />
                    )),
                  )}
                </svg>
              </button>
              <button className={fb('Sans')} onClick={() => setFamily('Sans')} aria-pressed={family === 'Sans'} aria-label="Geist Sans" title="Geist Sans">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path className="d" pathLength={1} d="M3 19 L11 3 L19 19 M6.5 13 H15.5" />
                </svg>
              </button>
              <button className={fb('Serif')} onClick={() => setFamily('Serif')} aria-pressed={family === 'Serif'} aria-label="Geist Serif" title="Geist Serif">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path className="d" pathLength={1} d="M2 19 H7 M15 19 H20 M4.5 19 L11 3 L17.5 19 M7.5 13.5 H14.5" />
                </svg>
              </button>
              <button className={fb('Mono')} onClick={() => setFamily('Mono')} aria-pressed={family === 'Mono'} aria-label="Geist Mono" title="Geist Mono">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path className="d" pathLength={1} d="M7 3 H3 V19 H7 M15 3 H19 V19 H15" />
                  <rect className="cur" x="9.5" y="8" width="3" height="6" fill="currentColor" stroke="none" />
                </svg>
              </button>
            </div>
            <a className="mono lk" href="#top" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Back to top</a>
          </footer>
        </main>
      </div>
    </div>
  )
}
