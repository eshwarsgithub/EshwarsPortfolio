export type Project = {
  id: string
  title: string
  kind: string
  metric: string
  url: string
  urlLabel: string
  points: string[]
  stack: string[]
}

export const profile = {
  name: 'Vemula Eshwar',
  role: 'Vibe Engineer & SFMC Developer',
  company: 'Brazeforce Pvt. Ltd.',
  location: 'Hyderabad, India',
  building: 'Hyderabad Healthcare',
  email: 'eshwarvemula009@gmail.com',
  tagline: 'I don’t demo AI. I build AI that has to survive contact with real people. Models, agents, and the full-stack around them.',
  code: [
    ['role', '"Vibe Engineer"'],
    ['ships', '["RAG platforms", "AI agents", "SFMC automation"]'],
    ['stack', '["Python", "TypeScript", "React", "Supabase"]'],
    ['reviews', '"every line the AI writes"'],
    ['status', '"building Hyderabad Healthcare"'],
  ],
}

export const projects: Project[] = [
  {
    id: 'aiformeru',
    title: 'AIforMeru',
    kind: 'AI',
    metric: '500+ users',
    url: 'https://aiformeru.com',
    urlLabel: 'aiformeru.com',
    points: [
      'RAG-based AI education platform, piloted with Meru International School, with a ₹5 Cr (~$525K) revenue opportunity.',
      'Designed the architecture and RAG pipeline: vector retrieval over curriculum content, OpenRouter multi-LLM routing, MathPix OCR for handwritten input, and a Supabase (PostgreSQL) data layer on Vercel.',
      'Built role-based portals for students, teachers and admins, with an AI lesson engine personalised to each student, automated assessments, and an AI grader for handwritten papers.',
      'Added Three.js and OpenAI 3D visualisations and NCERT-aligned content, and pitched the platform to school principals.',
    ],
    stack: ['RAG', 'OpenRouter', 'MathPix', 'Supabase', 'Three.js', 'Vercel'],
  },
  {
    id: 'coral',
    title: 'Coral Academy',
    kind: 'Platform',
    metric: '+30% revenue in 6 months',
    url: 'https://coralacademy.com',
    urlLabel: 'coralacademy.com',
    points: [
      'US after-school platform for ages 7 to 15. I own engineering, operations and automation, working directly with the client’s ops team.',
      'Migrated core infrastructure off legacy, higher-cost vendors onto BunnyCDN, SendGrid, Intercom and Mailchimp, and manage GitHub, Vercel and Cloudflare.',
      'Built a Claude-powered email agent (LangChain) across three inboxes that triages and auto-responds to routine queries.',
      'Designed a self-service analytics dashboard (Node.js, React, Supabase, Stripe data) so non-technical staff can pull their own reports.',
    ],
    stack: ['Claude', 'LangChain', 'React', 'Node.js', 'Supabase', 'Stripe'],
  },
  {
    id: 'hyd',
    title: 'Hyderabad Healthcare',
    kind: 'Data',
    metric: '23 constituencies mapped',
    url: 'https://hydshealthcare.auka.ai',
    urlLabel: 'hydshealthcare.auka.ai',
    points: [
      'In progress. An interactive map of the 23 Greater Hyderabad assembly constituencies and the hospitals each one serves, with type filters and Telangana government clinic data.',
      'Researching and analysing healthcare supply in order to set up a new health ecosystem.',
    ],
    stack: ['Data analysis', 'Maps', 'Research'],
  },
  {
    id: 'sites',
    title: 'Company & Nonprofit Sites',
    kind: 'Web',
    metric: '4 live sites',
    url: 'https://waheguru.org',
    urlLabel: 'waheguru.org',
    points: [
      'Build and maintain full-stack websites for RedhibbertGroup, Brazeforce, Auka AI and the Waheguru Sangath Foundation.',
    ],
    stack: ['React', 'Node.js', 'Vercel'],
  },
  {
    id: 'sfmc',
    title: 'SFMC Automation',
    kind: 'Marketing Cloud',
    metric: 'Enterprise clients',
    url: '',
    urlLabel: '',
    points: [
      'Salesforce Marketing Cloud automation for enterprise clients at Brazeforce: Email Studio, Journey Builder and Automation Studio.',
    ],
    stack: ['Email Studio', 'Journey Builder', 'Automation Studio', 'AMPscript'],
  },
  {
    id: 'surveillance',
    title: 'Surveillance AI System',
    kind: 'AI',
    metric: 'B.Tech final-year project',
    url: '',
    urlLabel: '',
    points: [
      'Trained a deep learning object detection model for a computer vision surveillance system.',
    ],
    stack: ['YOLOv5', 'OpenCV', 'TensorFlow'],
  },
]

export const filters = ['All', 'AI', 'Platform', 'Data', 'Web', 'Marketing Cloud']

export const ticker = [
  'RAG', 'LangChain', 'Claude', 'OpenAI', 'AI agents', 'Prompt engineering', 'Python', 'TypeScript',
  'React', 'Node.js', 'FastAPI', 'Supabase', 'PostgreSQL', 'Docker', 'GitHub Actions', 'Vercel',
  'Cloudflare', 'Email Studio', 'Journey Builder', 'AMPscript', 'Power BI',
]

export const experience = [
  {
    when: 'Aug 2025 — Present',
    role: 'Vibe Engineer & SFMC Developer',
    org: 'Brazeforce Pvt. Ltd. · IT arm of RedhibbertGroup LLC',
    points: [
      'Design, develop, test, deploy and maintain production applications (React, Node.js, Python, Supabase/PostgreSQL) in a lean 3-engineer Agile/Scrum team.',
      'Use Claude Code and Cursor AI for code generation and refactoring, validating every output through code review and testing and keeping secrets and client data out of prompts.',
      'Review code, mentor teammates and troubleshoot to keep live production systems stable.',
      'Integrate upstream and downstream systems through REST APIs (Stripe, SendGrid, Intercom, Mailchimp).',
      'Build Salesforce Marketing Cloud automation for enterprise clients.',
    ],
  },
  {
    when: 'Aug 2024 — Jul 2025',
    role: 'AI Agentic Intern',
    org: 'RedhibbertGroup LLC',
    points: ['Worked on agentic AI applications and LLM-based workflows before moving into the full-time role.'],
  },
  {
    when: 'Dec 2024 — Feb 2025',
    role: 'Data Analyst Intern',
    org: 'Brain Wave Matrix Solutions',
    points: [
      'Analysed large Twitter data sets with NLP sentiment classification and visualisation.',
      'Built Power BI dashboards and analysis to support decisions.',
    ],
  },
]

export const skills = [
  {
    title: 'GenAI & agents',
    items: ['RAG & vector search', 'LangChain & AI agents', 'LLM integration (Claude, OpenAI, OpenRouter)', 'Prompt engineering & output validation', 'Azure AI Foundry'],
  },
  {
    title: 'Full stack',
    items: ['Python, FastAPI', 'JavaScript, TypeScript', 'React, Node.js', 'REST APIs', 'PostgreSQL (Supabase)'],
  },
  {
    title: 'Data & ML',
    items: ['Data cleaning & quality checks', 'ETL & ingestion pipelines', 'NLP sentiment classification', 'YOLOv5, OpenCV, TensorFlow', 'Power BI'],
  },
  {
    title: 'Delivery & security',
    items: ['Docker, GitHub Actions CI/CD', 'Vercel, Cloudflare', 'pytest, Jest, OWASP Top 10', 'Secrets management', 'Agile/Scrum, code review'],
  },
]

export const credentials = [
  ['Agentic AI Builder', 'Nebius · 2026'],
  ['AI CloudOps Engineer', 'Nebius · 2026'],
  ['Redis Associate Developer', 'Redis · 2026'],
  ['Claude Essentials: LLMs & AI', 'Anthropic · Feb 2026'],
  ['Agentforce', 'Salesforce · 2025'],
  ['Generative AI', 'Deloitte · Oct 2025'],
  ['Data Analytics & Power BI', 'Microsoft · Feb 2025'],
  ['AI & Python Essentials', 'Google · Dec 2024'],
]

export const socials = [
  ['LinkedIn', 'https://linkedin.com/in/vemula-eshwar'],
  ['GitHub', 'https://github.com/eshwarsgithub'],
]

export const process = [
  { name: 'Idea', text: 'Start from a real problem: a school that needs an AI tutor, a team drowning in support email.' },
  { name: 'Plan', text: 'Scope it small, split it into sprints, agree what “done” means with the client.' },
  { name: 'Architect', text: 'Design the system first: data layer, RAG pipeline, APIs and what happens when a data source is down.' },
  { name: 'Build', text: 'React, Node.js, Python and Supabase, with Claude Code and Cursor to move faster.' },
  { name: 'Test', text: 'Review every line the AI writes. pytest, Jest, OWASP checks, secrets kept out of prompts.' },
  { name: 'Deploy', text: 'GitHub Actions CI/CD to Vercel, with Docker and Cloudflare where needed.' },
  { name: 'Prod', text: 'Troubleshoot live systems and keep them stable, with fallbacks instead of outages.' },
  { name: 'Ship', text: 'Real users on real platforms: 500+ on AIforMeru, +30% revenue at Coral Academy.' },
]
