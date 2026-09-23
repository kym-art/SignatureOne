// Formattage des numéros de téléphone (utilisé par AuthService).
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('00')) return `+${cleaned.substring(2)}`;
  if (!cleaned.startsWith('+') && cleaned.length >= 8) {
    return cleaned.startsWith('228') ? `+${cleaned}` : `+228${cleaned}`;
  }
  return cleaned;
}
