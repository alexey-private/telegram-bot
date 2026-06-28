import { createRemindersComposer } from '../reminders.composer';
import { RemindersService } from '../reminders.service';
import { createTestBot, makeCommandUpdate } from '../../../test/bot-test-utils';

const BASE_REMINDER = {
  id: 'r1',
  chatId: BigInt(200),
  userId: BigInt(100),
  text: 'ping',
  fireAt: new Date(),
  fired: false,
  createdAt: new Date(),
};

function setup() {
  const service = {
    create: jest.fn(),
    setBotApi: jest.fn(),
    fireReminders: jest.fn(),
  } as unknown as jest.Mocked<RemindersService>;

  const { bot, replies } = createTestBot();
  bot.use(createRemindersComposer(service));
  return { service, bot, replies };
}

describe('RemindersComposer — /remind', () => {
  it('replies usage when no arguments given', async () => {
    const { bot, replies } = setup();
    await bot.handleUpdate(makeCommandUpdate('/remind'));
    expect(replies[0]).toContain('Usage');
  });

  it('replies prompt when only duration given without text', async () => {
    const { bot, replies } = setup();
    await bot.handleUpdate(makeCommandUpdate('/remind 5m'));
    expect(replies[0]).toContain('text');
  });

  it('replies invalid-duration message for unknown unit', async () => {
    const { bot, replies, service } = setup();
    await bot.handleUpdate(makeCommandUpdate('/remind 2x meeting'));
    expect(replies[0]).toContain('Invalid duration');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('replies invalid-duration message for non-numeric value', async () => {
    const { bot, replies } = setup();
    await bot.handleUpdate(makeCommandUpdate('/remind abc meeting'));
    expect(replies[0]).toContain('Invalid duration');
  });

  it('creates reminder for minutes and replies confirmation', async () => {
    const { bot, replies, service } = setup();
    service.create.mockResolvedValue(BASE_REMINDER as any);

    const before = Date.now();
    await bot.handleUpdate(makeCommandUpdate('/remind 30m ping'));
    const after = Date.now();

    expect(service.create).toHaveBeenCalledWith(
      BigInt(200),
      BigInt(100),
      'ping',
      expect.any(Date),
    );

    const fireAt = (service.create.mock.calls[0][3] as Date).getTime();
    expect(fireAt).toBeGreaterThanOrEqual(before + 30 * 60 * 1000);
    expect(fireAt).toBeLessThanOrEqual(after + 30 * 60 * 1000);

    expect(replies[0]).toContain('30m');
    expect(replies[0]).toContain('ping');
  });

  it('creates reminder for hours', async () => {
    const { bot, service } = setup();
    service.create.mockResolvedValue(BASE_REMINDER as any);

    const before = Date.now();
    await bot.handleUpdate(makeCommandUpdate('/remind 2h standup'));
    const after = Date.now();

    const fireAt = (service.create.mock.calls[0][3] as Date).getTime();
    expect(fireAt).toBeGreaterThanOrEqual(before + 2 * 60 * 60 * 1000);
    expect(fireAt).toBeLessThanOrEqual(after + 2 * 60 * 60 * 1000);
  });

  it('creates reminder for days', async () => {
    const { bot, service } = setup();
    service.create.mockResolvedValue(BASE_REMINDER as any);

    const before = Date.now();
    await bot.handleUpdate(makeCommandUpdate('/remind 1d review'));
    const after = Date.now();

    const fireAt = (service.create.mock.calls[0][3] as Date).getTime();
    expect(fireAt).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
    expect(fireAt).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
  });

  it('supports multi-word reminder text', async () => {
    const { bot, service } = setup();
    service.create.mockResolvedValue(BASE_REMINDER as any);

    await bot.handleUpdate(makeCommandUpdate('/remind 1h call the doctor'));

    expect(service.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'call the doctor',
      expect.any(Date),
    );
  });
});
