import { useEffect, useState } from 'react'
import { Section, Stack } from '../../components/layout'
import { ArrowRightIcon, GitHubIcon } from '../../components/ui'
import styles from './OpenSource.module.css'

const MERGED_PRS_URL = 'https://github.com/pulls?q=is%3Apr+author%3AYarish652+is%3Amerged'

type Contribution = {
  type: 'fix' | 'feat'
  repo: string
  number: number
  summary: string
  /** ISO date the PR was merged. */
  merged: string
  additions: number
  deletions: number
  files: number
}

/** Merged upstream, newest first. Diff stats are GitHub's, at merge. */
const contributions: Contribution[] = [
  {
    type: 'fix',
    repo: 'aw-watcher-window',
    number: 167,
    summary: 'Settings, Calculator & co. were logged as ApplicationFrameHost. Now each app is named.',
    merged: '2026-11-01',
    additions: 158,
    deletions: 0,
    files: 3,
  },
  {
    type: 'feat',
    repo: 'aw-watcher-input',
    number: 45,
    summary: 'A bar chart of key presses and clicks, hourly or daily.',
    merged: '2026-11-01',
    additions: 141,
    deletions: 5,
    files: 6,
  },
  {
    type: 'fix',
    repo: 'aw-client',
    number: 136,
    summary: 'wait_for_start() overslept its timeout, crashing watchers at login. Fixed.',
    merged: '2026-10-16',
    additions: 62,
    deletions: 7,
    files: 2,
  },
]

const ORG = 'ActivityWatch'
/** The project's main repo — the star count the receipt quotes. */
const STAR_REPO = 'ActivityWatch/activitywatch'
/** Shown until (or instead of) the live count. Taken 2026-11-02. */
const STARS_SNAPSHOT = 19_464

/**
 * The repo's star count, fresh from GitHub's public API once per visit; the
 * snapshot covers a slow network, a rate limit, or no network at all.
 */
function useStars(repo: string, snapshot: number) {
  const [stars, setStars] = useState(snapshot)
  useEffect(() => {
    const key = `stars:${repo}`
    try {
      const cached = sessionStorage.getItem(key)
      if (cached) {
        setStars(Number(cached))
        return
      }
    } catch {
      // Storage blocked: fetch every time instead.
    }
    let alive = true
    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stargazers_count?: unknown } | null) => {
        const count = data?.stargazers_count
        if (!alive || typeof count !== 'number') return
        setStars(count)
        try {
          sessionStorage.setItem(key, String(count))
        } catch {
          // Not cached; harmless.
        }
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [repo])
  return stars
}

/** 19464 → "19.5k". */
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-11-01" → "01 Nov". Fixed format, so it never varies by locale. */
function shortDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d} ${MONTHS[Number(m) - 1]}`
}

const totals = contributions.reduce(
  (t, c) => ({
    additions: t.additions + c.additions,
    deletions: t.deletions + c.deletions,
    files: t.files + c.files,
  }),
  { additions: 0, deletions: 0, files: 0 },
)

export function OpenSource() {
  const stars = useStars(STAR_REPO, STARS_SNAPSHOT)

  return (
    <Section id="opensource" bordered aria-labelledby="opensource-heading">
      <div className={styles.grid}>
        <Stack gap={5} className={styles.copy}>
          <h2 id="opensource-heading" className={styles.heading}>
            Open source
          </h2>
          <p className={styles.lead}>I fix the tools I use.</p>
          <p className={styles.body}>
            ActivityWatch is the data under Timesheet Sloth, so I read its code closely. When its
            watchers misreported Windows apps, gave up on a slow server, or were missing a chart,
            I traced the cause and sent the change upstream.
          </p>
          <a
            href={MERGED_PRS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.more}
          >
            <GitHubIcon width={16} height={16} />
            All merged PRs
            <ArrowRightIcon width={14} height={14} />
          </a>
        </Stack>

        {/* The receipt: printed slip, torn at the foot. The shadow lives on
            the wrapper because the slip's mask (the tear) would cut it off. */}
        <div className={styles.receiptShadow}>
          <figure className={styles.receipt} aria-label={`Pull requests merged into ${ORG}`}>
            <header className={styles.receiptHead}>
              <p className={styles.org}>{ORG}</p>
              <p className={styles.shop}>Merged upstream</p>
              <p className={styles.meta}>
                <span aria-label={`${stars.toLocaleString('en')} GitHub stars`}>
                  ★ {compact.format(stars).toLowerCase()} stars
                </span>{' '}
                · {contributions.length} merges
              </p>
            </header>

            <ol className={styles.items}>
              {contributions.map((c) => (
                <li key={`${c.repo}#${c.number}`}>
                  <a
                    href={`https://github.com/${ORG}/${c.repo}/pull/${c.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.item}
                  >
                    <span className={styles.itemTop}>
                      <span className={styles.type} data-type={c.type}>
                        {c.type}
                      </span>
                      <span className={styles.repo}>
                        {c.repo} #{c.number}
                      </span>
                      <span className={styles.diff} aria-label={`${c.additions} additions, ${c.deletions} deletions`}>
                        +{c.additions} −{c.deletions}
                      </span>
                    </span>
                    <span className={styles.summary}>{c.summary}</span>
                    <span className={styles.merged}>
                      ✓ merged <time dateTime={c.merged}>{shortDate(c.merged)}</time>
                    </span>
                  </a>
                </li>
              ))}
            </ol>

            <div className={styles.total}>
              <span>Total</span>
              <span>{contributions.length} PRs</span>
            </div>
            <p className={styles.totalMeta}>
              +{totals.additions} −{totals.deletions} · {totals.files} files · reviewed &amp; merged
            </p>

            <div className={styles.barcode} aria-hidden="true" />
            <p className={styles.signoff}>github.com/Yarish652</p>
          </figure>
        </div>
      </div>
    </Section>
  )
}
