import { RemindersService } from '../reminders.service';
import { PrismaService } from '../../../shared/prisma.service';

const BASE_REMINDER = {
  id: 'r1',
  chatId: BigInt(456),
  userId: BigInt(100),
  text: 'meeting',
  fireAt: new Date(),
  fired: false,
  createdAt: new Date(),
};

describe('RemindersService', () => {
  let service: RemindersService;
  let mockCreate: jest.Mock;
  let mockFindMany: jest.Mock;
  let mockUpdate: jest.Mock;

  beforeEach(() => {
    mockCreate = jest.fn();
    mockFindMany = jest.fn();
    mockUpdate = jest.fn();
    const prisma = {
      reminder: { create: mockCreate, findMany: mockFindMany, update: mockUpdate },
    } as unknown as PrismaService;
    service = new RemindersService(prisma);
  });

  describe('create', () => {
    it('creates a reminder with the given fields', async () => {
      const fireAt = new Date(Date.now() + 60_000);
      mockCreate.mockResolvedValue({ ...BASE_REMINDER, fireAt });

      await service.create(BigInt(456), BigInt(100), 'meeting', fireAt);

      expect(mockCreate).toHaveBeenCalledWith({
        data: { chatId: BigInt(456), userId: BigInt(100), text: 'meeting', fireAt },
      });
    });
  });

  describe('fireReminders', () => {
    it('does nothing when botApi is not set', async () => {
      await service.fireReminders();
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('sends each pending reminder and marks it fired', async () => {
      mockFindMany.mockResolvedValue([BASE_REMINDER]);
      mockUpdate.mockResolvedValue({ ...BASE_REMINDER, fired: true });

      const mockApi = { sendMessage: jest.fn().mockResolvedValue(undefined) };
      service.setBotApi(mockApi);

      await service.fireReminders();

      expect(mockApi.sendMessage).toHaveBeenCalledWith('456', 'Reminder: meeting');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { fired: true },
      });
    });

    it('continues to the next reminder when one fails to send', async () => {
      const second = { ...BASE_REMINDER, id: 'r2', chatId: BigInt(789), text: 'second' };
      mockFindMany.mockResolvedValue([BASE_REMINDER, second]);
      mockUpdate.mockResolvedValue({ ...second, fired: true });

      const mockApi = {
        sendMessage: jest.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce(undefined),
      };
      service.setBotApi(mockApi);

      await expect(service.fireReminders()).resolves.not.toThrow();
      expect(mockApi.sendMessage).toHaveBeenCalledTimes(2);
      // only the successful second reminder gets marked fired
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'r2' },
        data: { fired: true },
      });
    });
  });
});
