import { Container, Stack } from '../../components/layout'
import styles from './Footer.module.css'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '#projects' },
  { label: 'Experience', href: '#timeline' },
  { label: 'Contact', href: '#contact' },
]

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container>
        <Stack direction="row" align="center" justify="space-between" wrap gap={5}>
          <span className={styles.logo}>Atlas</span>

          <Stack as="ul" direction="row" gap={5} className={styles.navList}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="u-link">
                  {link.label}
                </a>
              </li>
            ))}
          </Stack>

          <p className={styles.copyright}>
            © {new Date().getFullYear()} Yarish Khan. All rights reserved.
          </p>
        </Stack>

      </Container>
    </footer>
  )
}
