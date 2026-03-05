import dotenv from 'dotenv';

dotenv.config();

function toBool(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  haBaseUrl: (process.env.HA_BASE_URL || '').replace(/\/+$/, ''),
  haToken: process.env.HA_LONG_LIVED_TOKEN || '',
  mockMode: toBool(process.env.HA_MOCK_MODE, true),
  verifySSL: toBool(process.env.HA_VERIFY_SSL, true),
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 86400)
};
