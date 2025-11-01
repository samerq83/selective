import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPhone(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  return cleaned;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    calendar: 'gregory'
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    calendar: 'gregory'
  });
}

export function getEditDeadline(editTimeLimit: number = 2): Date {
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + editTimeLimit);
  return deadline;
}

export function canEditOrder(editDeadline?: Date): boolean {
  if (!editDeadline) return false;
  return new Date() < new Date(editDeadline);
}

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `ST${year}${month}${day}-${random}`;
}

export function playNotificationSound() {
  if (typeof window !== 'undefined') {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {
      // Ignore errors if sound can't play
    });
  }
}