"use client";

import { sendTelegramNotification, formatAttendanceMessage as formatTelegramMessage } from './telegram';
import { sendWhatsAppNotification, formatWhatsAppMessage } from './whatsapp';

export type NotificationChannels = 'telegram' | 'whatsapp' | 'both' | 'none';

export interface NotificationParams {
  student: any;
  status: string;
  time: string;
  date: string;
  channel: NotificationChannels;
  contactInfo: {
    telegramId?: string;
    whatsappNumber?: string;
  };
  message?: string;
}

/**
 * Sends attendance notification through specified channels
 */
export async function sendAttendanceNotification({
  student,
  status,
  time,
  date,
  channel,
  contactInfo,
  message
}: NotificationParams): Promise<{telegram: boolean, whatsapp: boolean}> {
  
  const results = {
    telegram: false,
    whatsapp: false
  };
  
  try {
    // Send via Telegram if requested
    if (channel === 'telegram' || channel === 'both') {
      if (contactInfo.telegramId) {
        const telegramMessage = message || formatTelegramMessage(student, status, time, date);
        results.telegram = await sendTelegramNotification({
          phoneNumber: contactInfo.telegramId,
          message: telegramMessage
        });
      }
    }
    
    // Send via WhatsApp if requested
    if (channel === 'whatsapp' || channel === 'both') {
      if (contactInfo.whatsappNumber) {
        const whatsappMessage = message || formatWhatsAppMessage(student, status, time, date);
        results.whatsapp = await sendWhatsAppNotification({
          phoneNumber: contactInfo.whatsappNumber,
          message: whatsappMessage
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error sending notifications:", error);
    return results;
  }
}

/**
 * Utility function to determine the best notification channel
 * based on available contact information
 */
export function determineBestChannel(contactInfo: { 
  telegramId?: string; 
  whatsappNumber?: string;
  preferredChannel?: NotificationChannels;
}): NotificationChannels {
  const { telegramId, whatsappNumber, preferredChannel } = contactInfo;
  
  // Check if there's a preferred channel set
  if (preferredChannel && preferredChannel !== 'both' && preferredChannel !== 'none') {
    // Make sure the preferred channel has contact info
    if (preferredChannel === 'telegram' && telegramId) {
      return 'telegram';
    }
    if (preferredChannel === 'whatsapp' && whatsappNumber) {
      return 'whatsapp';
    }
  }
  
  // Determine the best channel based on available contact info
  if (telegramId && whatsappNumber) {
    return 'both';
  } else if (telegramId) {
    return 'telegram';
  } else if (whatsappNumber) {
    return 'whatsapp';
  }
  
  // No channels available
  return 'none';
}
