import { describe, it, expect, beforeEach } from 'vitest';
import { prisma, assertSafeTestDatabase } from '@javaverse/db';
import {
  createChatInFirstFreeSlot,
  listUserChats,
  getChatById,
  updateChat,
  deleteChatAndFreeSlot,
  postUserMessage,
  saveChatState,
  ChatLimitReachedError,
  ChatNotFoundError,
} from '@/lib/chats';

describe('Phase 4: Chat Slots & Concurrency Invariants', () => {
  let user1Id: string;
  let user2Id: string;

  beforeEach(async () => {
    assertSafeTestDatabase(process.env.DATABASE_URL);
    // Clean test state
    await prisma.userStreamEvent.deleteMany();
    await prisma.durableJob.deleteMany();
    await prisma.analysis.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chatState.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    const u1 = await prisma.user.create({
      data: {
        email: 'learner1@example.com',
        status: 'ACTIVE',
      },
    });
    user1Id = u1.id;

    const u2 = await prisma.user.create({
      data: {
        email: 'learner2@example.com',
        status: 'ACTIVE',
      },
    });
    user2Id = u2.id;
  });

  describe('3-Slot Capacity & Parallel Race Condition', () => {
    it('allows exactly 3 slots to be created when 20 parallel allocation requests fire', async () => {
      // 20 parallel callers trying to allocate chat slots for user1
      const promises = Array.from({ length: 20 }).map((_, idx) =>
        createChatInFirstFreeSlot(user1Id, `Question ${idx + 1}`),
      );

      const results = await Promise.allSettled(promises);

      const successful = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly 3 succeeded, 17 failed
      expect(successful.length).toBe(3);
      expect(rejected.length).toBe(17);

      // Verify rejected errors are ChatLimitReachedError
      for (const rej of rejected) {
        if (rej.status === 'rejected') {
          expect(rej.reason).toBeInstanceOf(ChatLimitReachedError);
          expect((rej.reason as ChatLimitReachedError).code).toBe('CHAT_LIMIT_REACHED');
        }
      }

      // Verify database state: exactly 3 rows in slots 1, 2, 3
      const userChats = await listUserChats(user1Id);
      expect(userChats.length).toBe(3);
      const slots = userChats.map((c) => c.slot).sort();
      expect(slots).toEqual([1, 2, 3]);
    });

    it('enforces delete-and-replace: deleting one slot frees it for exactly one new creation', async () => {
      // Fill all 3 slots
      const c1 = await createChatInFirstFreeSlot(user1Id, 'Chat 1');
      const c2 = await createChatInFirstFreeSlot(user1Id, 'Chat 2');
      const c3 = await createChatInFirstFreeSlot(user1Id, 'Chat 3');

      expect(c1.slot).toBe(1);
      expect(c2.slot).toBe(2);
      expect(c3.slot).toBe(3);

      // Attempting 4th chat fails
      await expect(createChatInFirstFreeSlot(user1Id, 'Chat 4')).rejects.toThrow(
        ChatLimitReachedError,
      );

      // Delete Slot 2
      await deleteChatAndFreeSlot(c2.id, user1Id);

      // Slot 2 is now free: new chat must successfully take slot 2
      const c4 = await createChatInFirstFreeSlot(user1Id, 'Chat 4 Replacement');
      expect(c4.slot).toBe(2);

      // 3 slots full again: next creation must fail
      await expect(createChatInFirstFreeSlot(user1Id, 'Chat 5')).rejects.toThrow(
        ChatLimitReachedError,
      );
    });
  });

  describe('Cross-User Ownership Isolation (Anti-IDOR)', () => {
    it('prevents User 2 from accessing or modifying User 1 chat', async () => {
      const u1Chat = await createChatInFirstFreeSlot(user1Id, 'Private Question');

      // User 2 cannot read User 1 chat
      await expect(getChatById(u1Chat.id, user2Id)).rejects.toThrow(ChatNotFoundError);

      // User 2 cannot update User 1 chat title
      await expect(updateChat(u1Chat.id, user2Id, { title: 'Hacked' })).rejects.toThrow(
        ChatNotFoundError,
      );

      // User 2 cannot save UI state to User 1 chat
      await expect(
        saveChatState(u1Chat.id, user2Id, { activeTab: 'notes', draftMessage: 'exploit' }),
      ).rejects.toThrow(ChatNotFoundError);

      // User 2 cannot delete User 1 chat
      await expect(deleteChatAndFreeSlot(u1Chat.id, user2Id)).rejects.toThrow(ChatNotFoundError);

      // User 2 cannot post message into User 1 chat
      await expect(
        postUserMessage({
          chatId: u1Chat.id,
          userId: user2Id,
          content: 'Sneaky message',
          correlationId: 'test-corr',
        }),
      ).rejects.toThrow(ChatNotFoundError);
    });
  });
});
