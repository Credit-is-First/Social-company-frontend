import { describeReminderRun } from './describeReminderRun';

const run = (overrides = {}) => ({
  markedOverdue: 0,
  dueSoonReminders: 0,
  overdueReminders: 0,
  newlyOverdue: 0,
  ...overrides,
});

describe('describeReminderRun', () => {
  it('says so when there was nothing to do', () => {
    expect(describeReminderRun(run())).toBe('No reminders to send: nothing is due soon or newly overdue.');
  });

  it('reports loans marked overdue and reminders sent', () => {
    expect(describeReminderRun(run({ markedOverdue: 1, dueSoonReminders: 1, overdueReminders: 2 }))).toBe(
      'Marked 1 loan overdue. Sent 1 due-soon and 2 overdue reminders.',
    );
  });

  it('uses the singular for a single reminder', () => {
    expect(describeReminderRun(run({ overdueReminders: 1 }))).toBe('Sent 1 overdue reminder.');
  });

  it('pluralises loans', () => {
    expect(describeReminderRun(run({ markedOverdue: 3 }))).toBe('Marked 3 loans overdue.');
  });
});
