/**
 * FR-5 & FR-9 WhatsApp Message Compiler
 * URL format: https://wa.me/<number>?text=<url-encoded message>
 * Placeholders: {name}, {branch}, {review_link}
 */

export interface MessageParams {
  name: string;
  branch: string;
  review_link: string;
}

export function compileTemplate(templateBody: string, params: MessageParams): string {
  let message = templateBody;
  message = message.replace(/{name}/g, params.name || 'Patient');
  message = message.replace(/{branch}/g, params.branch || 'Medimall');
  message = message.replace(/{review_link}/g, params.review_link || '');
  return message;
}

export function generateWhatsAppUrl(phone: string, text: string): string {
  // wa.me expects numbers without '+' or formatting, exactly as our normalized phone (e.g. 919876543210)
  const cleanNumber = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}
