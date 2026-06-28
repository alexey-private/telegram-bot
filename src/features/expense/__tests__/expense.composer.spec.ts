import { createExpenseComposer } from '../expense.composer';
import { ExpenseService } from '../expense.service';
import { createTestBot, makeCommandUpdate } from '../../../test/bot-test-utils';

const BASE_EXPENSE = {
  id: 'e1',
  userId: BigInt(100),
  chatId: BigInt(200),
  amount: 500,
  description: 'coffee',
  createdAt: new Date(),
};

function setup() {
  const service = {
    add: jest.fn(),
    getMonthlyExpenses: jest.fn(),
    getMonthlyTotal: jest.fn(),
  } as unknown as jest.Mocked<ExpenseService>;

  const { bot, replies } = createTestBot();
  bot.use(createExpenseComposer(service));
  return { service, bot, replies };
}

describe('ExpenseComposer — /expense', () => {
  it('replies usage when no arguments given', async () => {
    const { bot, replies } = setup();
    await bot.handleUpdate(makeCommandUpdate('/expense'));
    expect(replies[0]).toContain('/expense');
  });

  it('replies usage when amount is not a number', async () => {
    const { bot, replies, service } = setup();
    await bot.handleUpdate(makeCommandUpdate('/expense badAmount кофе'));
    expect(replies[0]).toContain('/expense');
    expect(service.add).not.toHaveBeenCalled();
  });

  it('replies usage when amount is zero or negative', async () => {
    const { bot, replies, service } = setup();
    await bot.handleUpdate(makeCommandUpdate('/expense 0 кофе'));
    expect(replies[0]).toContain('/expense');
    expect(service.add).not.toHaveBeenCalled();
  });

  it('replies prompt when description is missing', async () => {
    const { bot, replies } = setup();
    await bot.handleUpdate(makeCommandUpdate('/expense 500'));
    expect(replies[0]).toContain('описание');
  });

  it('adds expense and replies confirmation', async () => {
    const { bot, replies, service } = setup();
    service.add.mockResolvedValue(BASE_EXPENSE as any);

    await bot.handleUpdate(makeCommandUpdate('/expense 500 кофе'));

    expect(service.add).toHaveBeenCalledWith(BigInt(100), BigInt(200), 500, 'кофе');
    expect(replies[0]).toContain('500');
    expect(replies[0]).toContain('кофе');
  });

  it('adds expense with multi-word description', async () => {
    const { bot, service } = setup();
    service.add.mockResolvedValue({ ...BASE_EXPENSE, description: 'обед в кафе' } as any);

    await bot.handleUpdate(makeCommandUpdate('/expense 1200 обед в кафе'));

    expect(service.add).toHaveBeenCalledWith(BigInt(100), BigInt(200), 1200, 'обед в кафе');
  });

  describe('/expense report', () => {
    it('replies with no-expenses message when list is empty', async () => {
      const { bot, replies, service } = setup();
      service.getMonthlyExpenses.mockResolvedValue([]);
      service.getMonthlyTotal.mockResolvedValue({ _sum: { amount: null }, _count: 0 } as any);

      await bot.handleUpdate(makeCommandUpdate('/expense report'));
      expect(replies[0]).toMatch(/нет/i);
    });

    it('replies with formatted report including total', async () => {
      const { bot, replies, service } = setup();
      service.getMonthlyExpenses.mockResolvedValue([
        { ...BASE_EXPENSE, amount: 300, description: 'tea' },
        { ...BASE_EXPENSE, id: 'e2', amount: 200, description: 'coffee' },
      ] as any);
      service.getMonthlyTotal.mockResolvedValue({ _sum: { amount: 500 }, _count: 2 } as any);

      await bot.handleUpdate(makeCommandUpdate('/expense report'));

      expect(replies[0]).toContain('300');
      expect(replies[0]).toContain('tea');
      expect(replies[0]).toContain('coffee');
      expect(replies[0]).toContain('500.00');
      expect(replies[0]).toContain('2');
    });
  });
});
