import { useEffect, useState } from 'react'
import SplitText from '@/components/SplitText'
import LivingFace from '@/components/face/LivingFace'
import DitherTrail from '@/components/dither/DitherTrail'
import DitherScene from '@/components/dither/DitherScene'
import avatar from '@/assets/avatar.png'
import { credentials, experience, filters, process, profile, projects, skills, socials, ticker } from '@/data'
import './portfolio.css'

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
      <DitherTrail />
      <nav className="nav" aria-label="Primary">
        <div className="wrap">
          <a
            href="#top"
            className="disp"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, paddingInline: 24, fontWeight: 'var(--hw)', fontSize: 21, letterSpacing: 'var(--ls)' }}
          >
            Eshwar
            <span style={{ width: 9, height: 9, background: 'var(--accent)' }} />
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
                  {ticker.map((t) => (
                    <span key={t} style={{ display: 'contents' }}>
                      <span className="mono">{t}</span>
                      <i />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <div className="night">
        <DitherScene />
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

          <footer className="in" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px 24px', minHeight: 72 }}>
            <p className="mono m">© 2026 Vemula Eshwar</p>
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
