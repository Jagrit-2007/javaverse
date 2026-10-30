import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import styles from './PublicLayout.module.css';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.publicWrapper}>
      {/* Public Header */}
      <header className={styles.header} aria-label="Public Site Header">
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logoLink}>
            <Logo size={32} showWordmark={true} />
          </Link>

          <nav className={styles.nav} aria-label="Public Site Navigation">
            <ul className={styles.navList}>
              <li>
                <Link href="/learn" className={styles.navLink}>
                  Curriculum
                </Link>
              </li>
              <li>
                <Link href="/about" className={styles.navLink}>
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className={styles.navLink}>
                  Contact
                </Link>
              </li>
            </ul>
          </nav>

          <div className={styles.headerActions}>
            <ThemeSelector />
            <Link href="/dashboard" className={styles.dashboardBtn}>
              <span>View Demo Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Public Content */}
      <main id="main-content" tabIndex={-1} className={styles.mainContent}>
        {children}
      </main>

      {/* Public Footer */}
      <footer className={styles.footer} aria-label="Public Site Footer">
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Logo size={24} showWordmark={true} />
            <p className={styles.footerTagline}>
              Open-source, self-hosted Java learning platform. Built for conceptual clarity and
              developer intuition.
            </p>
          </div>

          <nav className={styles.footerNav} aria-label="Footer Navigation">
            <div className={styles.footerNavCol}>
              <span className={styles.footerColTitle}>Platform</span>
              <ul className={styles.footerList}>
                <li>
                  <Link href="/learn">Curriculum Preview</Link>
                </li>
                <li>
                  <Link href="/dashboard">Demo Dashboard</Link>
                </li>
                <li>
                  <Link href="/about">About JavaVerse</Link>
                </li>
              </ul>
            </div>
            <div className={styles.footerNavCol}>
              <span className={styles.footerColTitle}>Legal &amp; Support</span>
              <ul className={styles.footerList}>
                <li>
                  <Link href="/privacy">Privacy Policy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms of Service</Link>
                </li>
                <li>
                  <Link href="/contact">Contact &amp; Issues</Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} JavaVerse contributors. Released under open-source
            software license.
          </p>
        </div>
      </footer>
    </div>
  );
}
