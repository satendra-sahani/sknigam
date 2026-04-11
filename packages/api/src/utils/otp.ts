export function generateOTP(): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[MOCK OTP] Generated OTP: ${otp}`);
  return otp;
}

export function getOTPExpiryDate(): Date {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
}
