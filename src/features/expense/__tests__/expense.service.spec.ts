import { ExpenseService } from '../expense.service';
import { PrismaService } from '../../../shared/prisma.service';

describe('ExpenseService', () => {
  let service: ExpenseService;
  let mockCreate: jest.Mock;
  let mockFindMany: jest.Mock;
  let mockAggregate: jest.Mock;

  beforeEach(() => {
    mockCreate = jest.fn();
    mockFindMany = jest.fn();
    mockAggregate = jest.fn();
    const prisma = {
      expense: { create: mockCreate, findMany: mockFindMany, aggregate: mockAggregate },
    } as unknown as PrismaService;
    service = new ExpenseService(prisma);
  });

  describe('add', () => {
    it('creates an expense with the given fields', async () => {
      const row = { id: 'e1', userId: BigInt(1), chatId: BigInt(2), amount: 500, description: 'coffee', createdAt: new Date() };
      mockCreate.mockResolvedValue(row);

      const result = await service.add(BigInt(1), BigInt(2), 500, 'coffee');

      expect(mockCreate).toHaveBeenCalledWith({
        data: { userId: BigInt(1), chatId: BigInt(2), amount: 500, description: 'coffee' },
      });
      expect(result).toBe(row);
    });
  });

  describe('getMonthlyExpenses', () => {
    it('queries expenses within the current calendar month, ordered by date desc', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.getMonthlyExpenses(BigInt(1));

      const { where, orderBy } = mockFindMany.mock.calls[0][0];
      const now = new Date();
      expect(where.userId).toEqual(BigInt(1));
      expect(where.createdAt.gte).toEqual(new Date(now.getFullYear(), now.getMonth(), 1));
      expect(where.createdAt.lt).toEqual(new Date(now.getFullYear(), now.getMonth() + 1, 1));
      expect(orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  describe('getMonthlyTotal', () => {
    it('aggregates amount and count for the current month', async () => {
      mockAggregate.mockResolvedValue({ _sum: { amount: 1500 }, _count: 3 });

      const result = await service.getMonthlyTotal(BigInt(1));

      const { where, _sum, _count } = mockAggregate.mock.calls[0][0];
      expect(where.userId).toEqual(BigInt(1));
      expect(_sum).toEqual({ amount: true });
      expect(_count).toBe(true);
      expect(result._sum.amount).toBe(1500);
      expect(result._count).toBe(3);
    });
  });
});
