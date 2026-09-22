// Operational alerts (ADR 006: Workers Logs + alerts instead of Sentry). Every alert is logged; #59 adds
// email and Telegram transports. Alerts never contain lead PII: IDs and step names only.
export type Alert = { subject: string; lines: string[] };

export type AlertTransport = (alert: Alert) => Promise<void>;

export async function sendAlert(alert: Alert, transports: AlertTransport[] = []) {
  console.error(`[alert] ${alert.subject}`, alert.lines);
  // One transport failing (e.g. email down) must not stop the others.
  await Promise.allSettled(transports.map((send) => send(alert)));
}
