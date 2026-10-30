'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { ThemeSelector } from '../theme/ThemeSelector';
import { SIDEBAR_NAV_ITEMS } from './Sidebar';
import styles from './MobileDrawer.module.css';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const DRAWER_NAV_ITEMS = SIDEBAR_NAV_ITEMS;

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close drawer upon route navigation
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      if (!dialog.open) {
        dialog.showModal();
      }
      requestAnimationFrame(() => {
        closeBtnRef.current?.focus();
      });
    } else {
      if (dialog.open) {
        dialog.close();
      }
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isOpen]);

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-label="Navigation menu"
      className={styles.drawerDialog}
    >
      <div className={styles.drawerContent}>
        <div className={styles.drawerHeader}>
          <Logo size={24} showWordmark={true} />
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className={styles.closeButton}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className={styles.drawerNav} aria-label="Secondary Mobile Navigation">
          <ul className={styles.drawerList}>
            {DRAWER_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.href} className={styles.drawerItem}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`${styles.drawerLink} ${isActive ? styles.active : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={18} aria-hidden="true" className={styles.drawerIcon} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.drawerFooter}>
          <div className={styles.themeSection}>
            <span className={styles.themeLabel}>Appearance</span>
            <ThemeSelector />
          </div>
          <div className={styles.learnerTag}>
            <span className={styles.learnerTitle}>JavaVerse Demo Shell</span>
            <span className={styles.learnerSubtitle}>Signed-in preview mode</span>
          </div>
        </div>
      </div>
    </dialog>
  );
}
