export interface SmsPayload {
  to: string;
  trackingId?: string;
  status: string;
  portalUrl?: string;
  message?: string;
}

export interface SmsResult {
  providerMessageId: string;
  responseCode: string;
}

/**
 * Pluggable SMS provider abstraction. Select via env SMS_PROVIDER
 * ("stub" default). Real gateways (CDAC/MahaOnline/MSG91/...) implement
 * SmsProvider and register below — no caller changes needed.
 */
export interface SmsProvider {
  name: string;
  send(to: string, message: string): Promise<SmsResult>;
}

class StubSmsProvider implements SmsProvider {
  name = "stub";

  async send(to: string, message: string): Promise<SmsResult> {
    console.info(`[SMS Dispatch] (stub) Sending to ${to}: "${message}"`);
    const mockMessageId = `SMS-MOCK-${Math.floor(100000 + Math.random() * 900000)}`;
    return { providerMessageId: mockMessageId, responseCode: "200_SUCCESS" };
  }
}

const providers: Record<string, SmsProvider> = {
  stub: new StubSmsProvider()
  // Future: cdac: new CdacSmsProvider(), msg91: new Msg91SmsProvider(), ...
};

function getProvider(): SmsProvider {
  const key = (process.env.SMS_PROVIDER || "stub").toLowerCase();
  return providers[key] || providers.stub;
}

export async function sendSMS(payload: SmsPayload): Promise<SmsResult> {
  const portalUrl = payload.portalUrl || "https://mahacsr.maharashtra.gov.in";

  // Format standard SMS template (Feature 4)
  const defaultMessage = payload.trackingId
    ? `MahaCSR Update: Your request ${payload.trackingId} status has changed to: ${payload.status}. Track progress on ${portalUrl}`
    : `MahaCSR Notification: Status update - ${payload.status}. Portal URL: ${portalUrl}`;

  const messageText = payload.message || defaultMessage;

  return getProvider().send(payload.to, messageText);
}
