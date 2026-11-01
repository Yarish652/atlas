export type Project = {
  slug: string
  index: string
  title: string
  /** The pinned card's single line. Keep it short — it never wraps. */
  intro: string
  /** The opening line of the unpinned view. */
  blurb: string
  tags: string[]
  /** Cover art. Fixed 16:10 frame. */
  image: string
  imageAlt: string
  /** Source code. */
  repo?: string
  /** Live deployment. */
  demo?: string
  wip?: boolean
  /** The unpinned view: the story behind the card. */
  detail: {
    problem: string
    approach: string
    result: string
    stack: string[]
  }
}

export const projects: Project[] = [
  {
    slug: 'pronunciation',
    index: '01',
    title: 'AI Pronunciation Assessment',
    intro: 'Explainable speech scoring.',
    blurb:
      'Explainable speech scoring — deterministic phoneme analysis before LLM coaching, cutting false positives by ~80%.',
    tags: ['Speech', 'LLM', 'Python'],
    image: '/projects/pronunciation.webp',
    imageAlt: 'AI Pronunciation Assessment — phoneme report scoring a recording 86/100',
    repo: 'https://github.com/Yarish652/SpeechCorrection',
    detail: {
      problem:
        'Pronunciation tools that let an LLM judge speech are confidently wrong: they flag mistakes that never happened and can’t say why a word scored low.',
      approach:
        'Every decision is deterministic. Whisper gives word timestamps, eSpeak gives the expected IPA, Wav2Vec2 hears the actual phonemes, and an edit-distance alignment feeds a rule engine that decides what is a mistake and how severe it is. The LLM runs last, only to turn settled results into coaching — and the report stays valid if it fails.',
      result:
        'Word-by-word issues that link back to the transcript, a pronunciation and fluency score, and ~80% fewer false positives. Audio is deleted the moment a request finishes.',
      stack: ['FastAPI', 'faster-whisper', 'Wav2Vec2', 'phonemizer', 'OpenRouter', 'Next.js'],
    },
  },
  {
    slug: 'timesheet-sloth',
    index: '02',
    title: 'Timesheet Sloth',
    intro: 'Your standup, written locally.',
    blurb:
      'A fully local ActivityWatch agent (formerly Momentum) — TabPFN and Gemma 4 write your standups, label untracked time and suggest what to work on next.',
    tags: ['Local AI', 'Agents', 'Python'],
    image: '/projects/timesheet-sloth.svg',
    imageAlt:
      'Timesheet Sloth — a terminal standup with Done, Focus and Next, a day of focus blocks, and a suggestion reading 7% to 44%',
    repo: 'https://github.com/Yarish652/timesheet-sloth',
    detail: {
      problem:
        'Standups and timesheets get rebuilt from memory, and the tools that could write them want your activity on someone else’s server.',
      approach:
        'It reads ActivityWatch history on the machine. TabPFN labels uncategorised time, forecasts focus, and learns which ways of starting a session end in focus; Gemma 4 via Ollama writes the prose using only numbers the tools hand it. While you’re away it prepares one suggestion for when you sit back down. Network calls are limited to localhost — enforced in code, not just promised.',
      result:
        'On 14 weeks of real data it labels uncategorised time at 0.81 accuracy (an app lookup manages 0.33) and ranks focused session starts at 0.75 ROC-AUC. Where TabPFN loses — forecasting tomorrow’s focus — the published eval says so.',
      stack: ['ActivityWatch', 'TabPFN 3.5', 'Gemma 4', 'Ollama', 'uv'],
    },
  },
  {
    slug: 'speakzy',
    index: '03',
    title: 'Speakzy',
    intro: 'Language exchange with AI.',
    blurb: 'AI-powered language learning companion with speech feedback.',
    tags: ['Full-stack', 'RAG', 'Realtime'],
    image: '/projects/speakzy.webp',
    imageAlt: 'Speakzy — chat bubbles translating “¿Cómo estás?”, learn & revise with AI',
    repo: 'https://github.com/Yarish652/Speakzy',
    demo: 'https://speakzy-9rkd.onrender.com/',
    detail: {
      problem:
        'Language learners need two things apps rarely combine: real people to practise with, and vocabulary that follows what they already know.',
      approach:
        'Learners get matched by language pair, then chat and video-call in real time. A daily AI flashcard set is grounded in each learner’s study history with retrieval — known words are excluded, related ones are woven into examples. A grammar tutor cites real Tatoeba sentences, and a Leitner deck brings words back at growing intervals with zero LLM calls.',
      result:
        'A deployed platform with schema-validated LLM output, a primary/fallback model strategy, per-user quotas, response caching, LLM cost and latency observability, and CI on every push.',
      stack: ['React 19', 'Express', 'MongoDB', 'Stream', 'OpenRouter', 'Gemini embeddings'],
    },
  },
  {
    slug: 'pdf-analyzer',
    index: '04',
    title: 'PDF Analyzer',
    intro: 'Cited answers from any PDF.',
    blurb:
      'Local retrieval-augmented Q&A over your PDFs — hybrid search, local reranking, and answers that cite the page they came from.',
    tags: ['RAG', 'LLM', 'Python'],
    image: '/projects/pdf-analyzer.svg',
    imageAlt:
      'PDF Analyzer — a page with two highlighted passages, and an answer citing them as 1 and 2',
    repo: 'https://github.com/Yarish652/pdfAnalyzer-',
    detail: {
      problem:
        'Plain vector search over a PDF misses exact terms, splits ideas mid-section, and gives answers you can’t check against the page.',
      approach:
        'Chunking adapts to the document — one chunk per résumé entry, one per slide, or sentence-packed within a section for prose — and scanned pages go through OCR. Each question runs MPNet and BM25 search side by side, fuses them with reciprocal rank fusion and reranks locally with a cross-encoder before the model answers with numbered citations.',
      result:
        'Hit@3 of 0.96 on a 49-page book chapter, local retrieval cut from ~990 ms to ~550 ms per question, and answers that stream from the first token with page-and-section sources.',
      stack: ['FastAPI', 'PyMuPDF', 'Chroma', 'MPNet', 'BM25', 'ONNX Runtime', 'RapidOCR', 'OpenRouter'],
    },
  },
]
