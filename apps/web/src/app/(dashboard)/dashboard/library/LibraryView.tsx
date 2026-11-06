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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  // Extract all unique tags
  const allTags = Array.from(new Set(items.flatMap((i) => i.tags)));

  const filteredItems = items.filter((i) => {
    if (selectedTag !== 'ALL' && !i.tags.includes(selectedTag)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = i.title.toLowerCase().includes(q);
      const matchNotes = i.notes?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchNotes) return false;
    }
    return true;
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
        setItems(items.filter((i) => i.id !== id));
      }
    } catch {
      // Failed to delete
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <header>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Your Library & Bookmarks
        </h1>
        <p style={{ fontSize: '1rem', color: '#475569', margin: '0.25rem 0 0 0' }}>
          Quickly access saved analyses, lessons, and practice problems with private notes.
        </p>
      </header>

      <section
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
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
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            minWidth: '240px',
          }}
          aria-label="Search library by title or notes"
        />

        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Tag:</span>
            <button
              type="button"
              onClick={() => setSelectedTag('ALL')}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                borderRadius: '0.25rem',
                border: '1px solid #cbd5e1',
                backgroundColor: selectedTag === 'ALL' ? '#2563eb' : '#ffffff',
                color: selectedTag === 'ALL' ? '#ffffff' : '#334155',
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
                  border: '1px solid #cbd5e1',
                  backgroundColor: selectedTag === tag ? '#2563eb' : '#ffffff',
                  color: selectedTag === tag ? '#ffffff' : '#334155',
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
              backgroundColor: '#ffffff',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              color: '#64748b',
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
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
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
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
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
                      color: '#b91c1c',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    aria-label={`Remove ${item.title} from library`}
                  >
                    Remove Bookmark
                  </button>
                </div>

                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                  <Link href={targetLink} style={{ color: '#0f172a', textDecoration: 'none' }}>
                    {item.title}
                  </Link>
                </h2>

                {item.notes && (
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: '#475569',
                      margin: 0,
                      fontStyle: 'italic',
                    }}
                  >
                    &ldquo;{item.notes}&rdquo;
                  </p>
                )}

                {item.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: '0.6875rem',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
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
