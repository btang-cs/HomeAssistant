import { randomUUID } from 'crypto';

import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { config } from './lib/config.js';
import { HomeAssistantClient } from './lib/haClient.js';
import {
  activateMockScene,
  listMockDevices,
  listMockScenes,
  toggleMockDevice
} from './lib/mockData.js';
import SessionStore from './lib/sessionStore.js';

const app = express();
const sessions = new SessionStore(config.sessionTtlSeconds);
const haClient = new HomeAssistantClient({
  baseUrl: config.haBaseUrl,
  token: config.haToken,
  verifySSL: config.verifySSL
});

const SUPPORTED_DOMAINS = new Set([
  'light',
  'switch',
  'fan',
  'climate',
  'cover',
  'lock',
  'sensor',
  'binary_sensor',
  'input_boolean'
]);

const TOGGLEABLE_DOMAINS = new Set(['light', 'switch', 'fan', 'input_boolean']);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({
    name: 'Home Assistant WeChat MVP Gateway',
    mode: config.mockMode ? 'mock' : 'proxy',
    timestamp: new Date().toISOString()
  });
});

app.post('/auth/wx-login', (req, res) => {
  const code = req.body?.code || '';
  const token = randomUUID();
  sessions.create(token, { code });

  res.json({
    sessionToken: token,
    expiresIn: config.sessionTtlSeconds,
    mode: config.mockMode ? 'mock' : 'proxy'
  });
});

app.use('/api', (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!token) {
    res.status(401).json({ message: 'Missing bearer token. Please login first.' });
    return;
  }

  if (!sessions.has(token)) {
    res.status(401).json({ message: 'Session expired or invalid token.' });
    return;
  }

  req.sessionToken = token;
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: config.mockMode ? 'mock' : 'proxy',
    haConfigured: haClient.isConfigured(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/devices', async (_req, res) => {
  try {
    if (config.mockMode) {
      const items = listMockDevices();
      res.json({ items, total: items.length, source: 'mock' });
      return;
    }

    const states = await haClient.getStates();
    const items = states
      .map(toDeviceDTO)
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ items, total: items.length, source: 'home_assistant' });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/devices/:entityId/toggle', async (req, res) => {
  const entityId = decodeURIComponent(req.params.entityId || '');
  const domain = entityId.split('.')[0];

  if (!entityId.includes('.')) {
    res.status(400).json({ message: 'Invalid entityId format.' });
    return;
  }

  if (!TOGGLEABLE_DOMAINS.has(domain)) {
    res.status(400).json({ message: `Domain ${domain} does not support toggle in MVP.` });
    return;
  }

  try {
    if (config.mockMode) {
      const device = toggleMockDevice(entityId);
      if (!device) {
        res.status(404).json({ message: 'Device not found in mock data.' });
        return;
      }
      res.json({ ok: true, entityId, device, source: 'mock' });
      return;
    }

    await haClient.callService('homeassistant', 'toggle', { entity_id: entityId });

    let device = null;
    try {
      const state = await haClient.getState(entityId);
      device = toDeviceDTO(state);
    } catch {
      // Service call succeeded but latest state pull failed.
    }

    res.json({ ok: true, entityId, device, source: 'home_assistant' });
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/scenes', async (_req, res) => {
  try {
    if (config.mockMode) {
      const items = listMockScenes();
      res.json({ items, total: items.length, source: 'mock' });
      return;
    }

    const states = await haClient.getStates();
    const items = states
      .filter((state) => String(state.entity_id || '').startsWith('scene.'))
      .map((state) => ({
        entityId: state.entity_id,
        name: state.attributes?.friendly_name || state.entity_id,
        state: state.state
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ items, total: items.length, source: 'home_assistant' });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/scenes/:entityId/activate', async (req, res) => {
  const entityId = decodeURIComponent(req.params.entityId || '');

  if (!entityId.startsWith('scene.')) {
    res.status(400).json({ message: 'Only scene.* entityId can be activated.' });
    return;
  }

  try {
    if (config.mockMode) {
      const ok = activateMockScene(entityId);
      if (!ok) {
        res.status(404).json({ message: 'Scene not found in mock data.' });
        return;
      }
      res.json({ ok: true, entityId, source: 'mock' });
      return;
    }

    await haClient.callService('scene', 'turn_on', { entity_id: entityId });
    res.json({ ok: true, entityId, source: 'home_assistant' });
  } catch (error) {
    sendError(res, error);
  }
});

app.use((error, _req, res, _next) => {
  sendError(res, error);
});

app.listen(config.port, config.host, () => {
  const mode = config.mockMode ? 'mock' : 'proxy';
  console.log(`[backend] listening on http://${config.host}:${config.port} (mode=${mode})`);
});

function toDeviceDTO(state) {
  const entityId = String(state.entity_id || '');
  const domain = entityId.split('.')[0];

  if (!SUPPORTED_DOMAINS.has(domain)) {
    return null;
  }

  return {
    entityId,
    name: state.attributes?.friendly_name || entityId,
    domain,
    state: String(state.state ?? 'unknown'),
    available: state.state !== 'unavailable',
    lastChanged: state.last_changed || '',
    lastUpdated: state.last_updated || ''
  };
}

function sendError(res, error) {
  if (error?.code === 'HA_NOT_CONFIGURED') {
    res.status(500).json({
      message:
        'Home Assistant is not configured. Set HA_BASE_URL and HA_LONG_LIVED_TOKEN, or enable HA_MOCK_MODE=true.'
    });
    return;
  }

  if (error?.response?.status) {
    const payload = error.response.data;
    res.status(error.response.status).json({
      message: payload?.message || 'Home Assistant request failed.',
      detail: payload || null
    });
    return;
  }

  res.status(500).json({
    message: error?.message || 'Unexpected server error.'
  });
}
