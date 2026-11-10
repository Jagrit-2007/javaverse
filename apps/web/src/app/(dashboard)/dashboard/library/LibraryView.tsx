'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { LibraryItem } from '@javaverse/schemas';

interface LibraryViewProps {
  initialItems: LibraryItem[];
  csrfToken?: string;
}

export function LibraryView({ initialItems, csrfToken = '' }: LibraryViewProps) {
  const [items, setItems] = useState<LibraryItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  const allTags = Array.from(new Set(items.flatMap((item) => item.tags)));

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchQuery.trim().length === 0 ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = selectedTag === 'ALL' || item.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/v1/library/${id}`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      // Ignore network errors in optimistic UI
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        maxWidth: '1200px',
        width: '100%',
      }}
    >
      <header>
        <h1
          style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}
        >
          Your Library & Bookmarks
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Quickly access saved analyses, lessons, and practice problems with private notes.
        </p>
      </header>

      <section
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface)',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-subtle)',
        }}
        aria-label="Library search and filters"
      >
        <input
          type="search"
          placeholder="Search library..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '0.375rem 0.75rem',
            fontSize: '0.875rem',
            border: '1px solid var(--border-strong)',
            borderRadius: '0.375rem',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            minWidth: '240px',
          }}
          aria-label="Search library by title or notes"
        />

        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Tag:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag('ALL')}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                borderRadius: '0.25rem',
                border: '1px solid var(--border-subtle)',
                backgroundColor:
                  selectedTag === 'ALL' ? 'var(--action-primary-bg)' : 'var(--bg-surface)',
                color:
                  selectedTag === 'ALL' ? 'var(--action-primary-text)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  borderRadius: '0.25rem',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor:
                    selectedTag === tag ? 'var(--action-primary-bg)' : 'var(--bg-surface)',
                  color:
                    selectedTag === tag ? 'var(--action-primary-text)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem',
        }}
        aria-label="Bookmarked items list"
      >
        {filteredItems.length === 0 ? (
          <div
            style={{
              padding: '2rem',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
              color: 'var(--text-muted)',
              gridColumn: '1 / -1',
            }}
          >
            No bookmarked items found. Bookmark questions, lessons, or problems to revisit them
            here!
          </div>
        ) : (
          filteredItems.map((item) => {
            const targetLink =
              item.itemType === 'lesson'
                ? `/dashboard/learn/${item.itemId}`
                : item.itemType === 'problem'
                  ? `/dashboard/practice/${item.itemId}`
                  : `/dashboard/ask?analysis=${item.itemId}`;

            return (
              <article
                key={item.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '0.5rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: 'var(--elevation-low)',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--status-info-bg)',
                      color: 'var(--status-info-text)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.itemType}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.75rem',
                      color: 'var(--status-danger-text)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    aria-label={`Remove ${item.title} from library`}
                  >
                    Remove Bookmark
                  </button>
                </div>

                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  <Link
                    href={targetLink}
                    style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                  >
                    {item.title}
                  </Link>
                </h2>

                {item.notes && (
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      fontStyle: 'italic',
                    }}
                  >
                    &ldquo;{item.notes}&rdquo;
                  </p>
                )}

                {item.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {item.tags.map((t: string) => (
                      <span
                        key={t}
                        style={{
                          fontSize: '0.6875rem',
                          backgroundColor: 'var(--bg-surface-subtle)',
                          color: 'var(--text-secondary)',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
