import { useState } from 'react'
import { Container, Stack } from '../../components/layout'
import {
  Button,
  GitHubIcon,
  LinkedInIcon,
  MenuIcon,
  CloseIcon,
} from '../../components/ui'
import { CompanionToggle } from './CompanionToggle'
import styles from './Header.module.css'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '#projects' },
  { label: 'Experience', href: '#timeline' },
  { label: 'Contact', href: '#contact' },
]

const GITHUB_URL = 'https://github.com/Yarish652'
const LINKEDIN_URL = 'https://www.linkedin.com/in/yarish-khan-161340257/'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className={styles.header}>
      <Container>
        <Stack
          direction="row"
          align="center"
          justify="space-between"
          gap={4}
          className={styles.bar}
        >
          <Stack direction="row" align="center" gap={3} className={styles.brand}>
            <a href="#top" className={styles.logo}>
              Atlas
            </a>
            <CompanionToggle />
          </Stack>

          <Stack
            as="ul"
            direction="row"
            align="center"
            gap={6}
            className={styles.navList}
          >
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={`${styles.navLink} u-link`}>
                  {link.label}
                </a>
              </li>
            ))}
          </Stack>

          <Stack direction="row" align="center" gap={4} className={styles.actions}>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className={styles.iconLink}
            >
              <GitHubIcon />
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile"
              className={styles.iconLink}
            >
              <LinkedInIcon />
            </a>
            <Button href="/resume.pdf" variant="secondary">
              Resume
            </Button>
          </Stack>

          <button
            type="button"
            className={styles.menuToggle}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
            {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </Stack>
      </Container>

      {isMenuOpen && (
        <nav id="mobile-nav" className={styles.mobileNav} aria-label="Mobile">
          <Container>
            <Stack as="ul" gap={4} className={styles.mobileNavList}>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} onClick={() => setIsMenuOpen(false)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </Stack>

            <Stack
              direction="row"
              align="center"
              gap={4}
              className={styles.mobileActions}
            >
              <a href="#" aria-label="GitHub profile" className={styles.iconLink}>
                <GitHubIcon />
              </a>
              <a href="#" aria-label="LinkedIn profile" className={styles.iconLink}>
                <LinkedInIcon />
              </a>
              <Button href="/resume.pdf" variant="secondary">
                Resume
              </Button>
            </Stack>
          </Container>
        </nav>
      )}
    </header>
  )
}
