"use client";

type TelegramNotificationParams = {
  phoneNumber: string;
  message: string;
};

/**
 * Sends a notification message to a Telegram user
 * Uses the Telegram Bot API to send messages
 */
export async function sendTelegramNotification({ phoneNumber, message }: TelegramNotificationParams): Promise<boolean> {
  try {
    // Telegram Bot token from configuration
    const BOT_TOKEN = "7662377324:AAEFhwY-y1q3IrX4OEJAUG8VLa8DqNndH6E"; // AbsensiDigitalBot token
    
    // Validate inputs more strictly before making request
    if (!phoneNumber || phoneNumber === 'undefined' || phoneNumber === 'null' || phoneNumber === '') {
      console.error("Invalid Telegram chat_id:", phoneNumber);
      return false;
    }
    
    if (!message || message.trim() === '') {
      console.error("Empty message cannot be sent to Telegram");
      return false;
    }
    
    console.log(`Sending Telegram message to ${phoneNumber}: ${message}`);
    
    try {
      // Use a try-catch specifically for the fetch operation
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: phoneNumber,
          text: message,
          parse_mode: 'HTML'
        }),
      });
      
      // Check if response is OK before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error("Failed to parse error response as JSON:", errorText);
        }
        
        console.error("Telegram API returned error status:", response.status, errorData);
        return false;
      }
      
      const data = await response.json();
      return data.ok === true;
    } catch (fetchError) {
      console.error("Network error sending Telegram notification:", fetchError);
      return false;
    }
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
    return false;
  }
}

/**
 * Formats an attendance notification message
 */
export function formatAttendanceMessage(student: any, status: string, time: string, date: string): string {
  // Format based on the new requirements
  if (status === 'hadir' || status === 'present') {
    return `Ananda ${student.name} telah hadir di sekolah pada ${date} pukul ${time} WIB.`;
  }
  
  // Keep the old format for non-present statuses
  const statusEmoji = 
    status === 'sakit' || status === 'sick' ? '🤒' :
    status === 'izin' || status === 'permitted' ? '📝' :
    '❌';
  
  const statusText = 
    status === 'sakit' || status === 'sick' ? 'Sakit' :
    status === 'izin' || status === 'permitted' ? 'Izin' :
    'Alpha';
  
  return `
<b>👨‍🎓 INFO KEHADIRAN SISWA</b>
<b>Nama :</b> ${student.name}
<b>NISN :</b> ${student.nisn || '-'}
<b>Kelas :</b> ${student.class || '-'}
<b>Status :</b> ${statusEmoji} <b>${statusText}</b>
<b>Waktu :</b> ${time || '-'}
<b>Tanggal :</b> ${date || '-'}

<i>Pesan ini dikirim otomatis oleh sistem Absensi Digital</i>
  `.trim();
}
