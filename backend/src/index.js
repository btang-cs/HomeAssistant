import { randomUUID } from 'crypto';

import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { config } from './lib/config.js';
import { HomeAssistantClient } from './lib/haClient.js';
import {
  activateMockScene,
  getMockDevice,
  listMockAutomations,
  listMockDevices,
  listMockScenes,
  setMockDeviceState,
  triggerMockAutomation
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

const ACTIONABLE_DOMAINS = new Set(['light', 'switch', 'fan', 'input_boolean']);
const DEVICE_ACTIONS = new Set(['turn_on', 'turn_off', 'toggle']);

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

app.post('/auth/device-login', (req, res) => {
  const provider = String(req.body?.provider || 'device').trim() || 'device';
  const platform = String(req.body?.platform || 'unknown').trim() || 'unknown';
  const deviceName = String(req.body?.deviceName || '').trim();
  const token = randomUUID();

  sessions.create(token, { provider, platform, deviceName });

  res.json({
    sessionToken: token,
    expiresIn: config.sessionTtlSeconds,
    mode: config.mockMode ? 'mock' : 'proxy',
    authType: 'device'
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

app.get('/api/devices', async (req, res) => {
  try {
    if (config.mockMode) {
      const items = applyDeviceFilters(listMockDevices().map(withDeviceMetadata), req.query);
      res.json({
        items,
        total: items.length,
        source: 'mock',
        summary: summarizeDevices(items)
      });
      return;
    }

    const states = await haClient.getStates();
    const items = applyDeviceFilters(
      states
        .map((state) => toDeviceDTO(state))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name)),
      req.query
    );

    res.json({
      items,
      total: items.length,
      source: 'home_assistant',
      summary: summarizeDevices(items)
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/devices/:entityId', async (req, res) => {
  const entityId = decodeEntityId(req.params.entityId);
  if (!entityId) {
    res.status(400).json({ message: 'Invalid entityId format.' });
    return;
  }

  try {
    if (config.mockMode) {
      const item = withDeviceMetadata(getMockDevice(entityId));
      if (!item) {
        res.status(404).json({ message: 'Device not found in mock data.' });
        return;
      }

      res.json({ item, source: 'mock' });
      return;
    }

    const state = await haClient.getState(entityId);
    const item = toDeviceDTO(state, { allowUnsupported: true });

    res.json({ item, source: 'home_assistant' });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/devices/:entityId/toggle', async (req, res) => {
  await handleDeviceAction(req, res, 'toggle');
});

app.post('/api/devices/:entityId/state', async (req, res) => {
  const action = String(req.body?.action || '').trim().toLowerCase();
  if (!DEVICE_ACTIONS.has(action)) {
    res.status(400).json({ message: 'Invalid action. Use turn_on, turn_off, or toggle.' });
    return;
  }

  await handleDeviceAction(req, res, action);
});

app.get('/api/scenes', async (req, res) => {
  const keyword = normalizeKeyword(req.query?.q);

  try {
    if (config.mockMode) {
      const items = applySceneKeywordFilter(listMockScenes(), keyword);
      res.json({ items, total: items.length, source: 'mock' });
      return;
    }

    const states = await haClient.getStates();
    const items = applySceneKeywordFilter(
      states
        .filter((state) => String(state.entity_id || '').startsWith('scene.'))
        .map((state) => ({
          entityId: state.entity_id,
          name: state.attributes?.friendly_name || state.entity_id,
          state: state.state
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      keyword
    );

    res.json({ items, total: items.length, source: 'home_assistant' });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/scenes/:entityId/activate', async (req, res) => {
  const entityId = decodeEntityId(req.params.entityId);

  if (!entityId?.startsWith('scene.')) {
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

app.get('/api/automations', async (req, res) => {
  const keyword = normalizeKeyword(req.query?.q);
  const kind = String(req.query?.kind || '').trim().toLowerCase();

  try {
    if (config.mockMode) {
      const items = applyAutomationFilters(listMockAutomations(), keyword, kind);
      res.json({ items, total: items.length, source: 'mock' });
      return;
    }

    const states = await haClient.getStates();
    const items = applyAutomationFilters(
      states
        .filter((state) => {
          const entityId = String(state.entity_id || '');
          return entityId.startsWith('automation.') || entityId.startsWith('script.');
        })
        .map((state) => toAutomationDTO(state))
        .sort((a, b) => a.name.localeCompare(b.name)),
      keyword,
      kind
    );

    res.json({ items, total: items.length, source: 'home_assistant' });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/automations/:entityId/run', async (req, res) => {
  const entityId = decodeEntityId(req.params.entityId);
  const kind = entityId.split('.')[0];

  if (!entityId || !['automation', 'script'].includes(kind)) {
    res.status(400).json({ message: 'Only automation.* or script.* entityId can be run.' });
    return;
  }

  try {
    if (config.mockMode) {
      const item = triggerMockAutomation(entityId);
      if (!item) {
        res.status(404).json({ message: 'Automation not found in mock data.' });
        return;
      }

      res.json({ ok: true, entityId, item, source: 'mock' });
      return;
    }

    if (kind === 'automation') {
      await haClient.callService('automation', 'trigger', { entity_id: entityId });
    } else {
      await haClient.callService('script', 'turn_on', { entity_id: entityId });
    }

    let item = null;
    try {
      const state = await haClient.getState(entityId);
      item = toAutomationDTO(state);
    } catch {
      // Service call succeeded but latest state pull failed.
    }

    res.json({ ok: true, entityId, item, source: 'home_assistant' });
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

async function handleDeviceAction(req, res, action) {
  const entityId = decodeEntityId(req.params.entityId);
  if (!entityId) {
    res.status(400).json({ message: 'Invalid entityId format.' });
    return;
  }

  const domain = entityId.split('.')[0];
  if (!ACTIONABLE_DOMAINS.has(domain)) {
    res
      .status(400)
      .json({ message: `Domain ${domain} does not support ${action} in current version.` });
    return;
  }

  try {
    if (config.mockMode) {
      const device = withDeviceMetadata(setMockDeviceState(entityId, action));
      if (!device) {
        res.status(404).json({ message: 'Device not found in mock data.' });
        return;
      }
      res.json({ ok: true, entityId, action, device, source: 'mock' });
      return;
    }

    await callDeviceActionOnHomeAssistant(entityId, action);

    let device = null;
    try {
      const state = await haClient.getState(entityId);
      device = toDeviceDTO(state, { allowUnsupported: true });
    } catch {
      // Service call succeeded but latest state pull failed.
    }

    res.json({ ok: true, entityId, action, device, source: 'home_assistant' });
  } catch (error) {
    sendError(res, error);
  }
}

function decodeEntityId(rawValue) {
  const entityId = decodeURIComponent(rawValue || '');
  return entityId.includes('.') ? entityId : '';
}

function callDeviceActionOnHomeAssistant(entityId, action) {
  if (action === 'toggle') {
    return haClient.callService('homeassistant', 'toggle', { entity_id: entityId });
  }

  if (action === 'turn_on' || action === 'turn_off') {
    return haClient.callService('homeassistant', action, { entity_id: entityId });
  }

  const error = new Error('Unsupported action.');
  error.code = 'INVALID_DEVICE_ACTION';
  throw error;
}

function normalizeKeyword(value) {
  return String(value || '').trim().toLowerCase();
}

function applyDeviceFilters(items, query = {}) {
  const keyword = normalizeKeyword(query.q);
  const domainRaw = String(query.domain || '').trim();
  const domainSet = new Set(
    domainRaw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
  const availableFilter = parseBooleanFilter(query.available);
  const controllableFilter = parseBooleanFilter(query.controllable);

  return items.filter((item) => {
    if (keyword) {
      const searchable = `${item.name} ${item.entityId}`.toLowerCase();
      if (!searchable.includes(keyword)) {
        return false;
      }
    }

    if (domainSet.size > 0 && !domainSet.has(item.domain)) {
      return false;
    }

    if (availableFilter !== null && Boolean(item.available) !== availableFilter) {
      return false;
    }

    if (controllableFilter !== null && Boolean(item.controllable) !== controllableFilter) {
      return false;
    }

    return true;
  });
}

function parseBooleanFilter(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const text = String(value).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(text)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(text)) {
    return false;
  }

  return null;
}

function applySceneKeywordFilter(items, keyword) {
  if (!keyword) {
    return items;
  }

  return items.filter((item) => {
    const searchable = `${item.name} ${item.entityId}`.toLowerCase();
    return searchable.includes(keyword);
  });
}

function applyAutomationFilters(items, keyword, kind) {
  return items.filter((item) => {
    if (kind && item.kind !== kind) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const searchable = `${item.name} ${item.entityId}`.toLowerCase();
    return searchable.includes(keyword);
  });
}

function summarizeDevices(items) {
  const summary = {
    total: items.length,
    online: 0,
    offline: 0,
    controllable: 0,
    byDomain: {}
  };

  for (const item of items) {
    const domain = item.domain || 'unknown';
    summary.byDomain[domain] = (summary.byDomain[domain] || 0) + 1;

    if (item.available) {
      summary.online += 1;
    } else {
      summary.offline += 1;
    }

    if (item.controllable) {
      summary.controllable += 1;
    }
  }

  return summary;
}

function withDeviceMetadata(device) {
  if (!device) {
    return null;
  }

  return {
    ...device,
    controllable:
      typeof device.controllable === 'boolean'
        ? device.controllable
        : ACTIONABLE_DOMAINS.has(device.domain)
  };
}

function toDeviceDTO(state, options = {}) {
  const entityId = String(state.entity_id || '');
  const domain = entityId.split('.')[0];
  const allowUnsupported = Boolean(options.allowUnsupported);

  if (!allowUnsupported && !SUPPORTED_DOMAINS.has(domain)) {
    return null;
  }

  return {
    entityId,
    name: state.attributes?.friendly_name || entityId,
    domain,
    state: String(state.state ?? 'unknown'),
    available: state.state !== 'unavailable',
    controllable: ACTIONABLE_DOMAINS.has(domain),
    unit: state.attributes?.unit_of_measurement || '',
    deviceClass: state.attributes?.device_class || '',
    lastChanged: state.last_changed || '',
    lastUpdated: state.last_updated || ''
  };
}

function toAutomationDTO(state) {
  const entityId = String(state.entity_id || '');
  const kind = entityId.split('.')[0];

  return {
    entityId,
    name: state.attributes?.friendly_name || entityId,
    kind,
    state: String(state.state ?? 'unknown'),
    lastTriggeredAt: ''
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
