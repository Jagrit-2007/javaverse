import { prisma } from '@javaverse/db';
import type { LibraryItem, SaveLibraryItemRequest } from '@javaverse/schemas';

/**
 * Fetch user library items with optional search and tag filters
 */
export async function getLibraryItems(
  userId: string,
  query?: string,
  tag?: string,
): Promise<LibraryItem[]> {
  const items = await prisma.libraryItem.findMany({
    where: {
      userId,
      bookmarked: true,
      ...(tag ? { tags: { has: tag } } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });

  return items.map((item) => ({
    id: item.id,
    itemType: item.itemType as 'analysis' | 'lesson' | 'problem',
    itemId: item.itemId,
    title: item.title,
    notes: item.notes,
    tags: item.tags,
    bookmarked: item.bookmarked,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
}

/**
 * Save or update a library bookmark with private notes and tags
 */
export async function saveLibraryItem(
  userId: string,
  data: SaveLibraryItemRequest,
): Promise<LibraryItem> {
  const item = await prisma.libraryItem.upsert({
    where: {
      userId_itemType_itemId: {
        userId,
        itemType: data.itemType,
        itemId: data.itemId,
      },
    },
    update: {
      title: data.title,
      notes: data.notes ?? null,
      tags: data.tags ?? [],
      bookmarked: data.bookmarked ?? true,
    },
    create: {
      userId,
      itemType: data.itemType,
      itemId: data.itemId,
      title: data.title,
      notes: data.notes ?? null,
      tags: data.tags ?? [],
      bookmarked: data.bookmarked ?? true,
    },
  });

  return {
    id: item.id,
    itemType: item.itemType as 'analysis' | 'lesson' | 'problem',
    itemId: item.itemId,
    title: item.title,
    notes: item.notes,
    tags: item.tags,
    bookmarked: item.bookmarked,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

/**
 * Remove an item from the user library
 */
export async function deleteLibraryItem(userId: string, id: string): Promise<boolean> {
  const deleted = await prisma.libraryItem.deleteMany({
    where: { id, userId },
  });

  return deleted.count > 0;
}
