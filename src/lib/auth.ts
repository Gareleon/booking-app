export const SESSION_COOKIE_NAME = "clinic_session";

export function createSessionToken() {
  return `${crypto.randomUUID()}-${Date.now()}`;
}
