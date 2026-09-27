import { ReminderRunResult } from '../../../services/api';

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** "Marked 1 loan overdue. Sent 1 due-soon and 2 overdue reminders." */
export const describeReminderRun = (result: ReminderRunResult): string => {
  const parts: string[] = [];
  if (result.markedOverdue > 0) {
    parts.push(`Marked ${plural(result.markedOverdue, 'loan', 'loans')} overdue.`);
  }
  const sent: string[] = [];
  if (result.dueSoonReminders > 0) sent.push(`${result.dueSoonReminders} due-soon`);
  if (result.overdueReminders > 0) sent.push(`${result.overdueReminders} overdue`);
  if (sent.length > 0) {
    const total = result.dueSoonReminders + result.overdueReminders;
    parts.push(`Sent ${sent.join(' and ')} ${total === 1 ? 'reminder' : 'reminders'}.`);
  }
  return parts.length > 0 ? parts.join(' ') : 'No reminders to send: nothing is due soon or newly overdue.';
};
