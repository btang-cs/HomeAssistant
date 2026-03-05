const mockDevices = new Map([
  [
    'light.living_room_main',
    {
      entityId: 'light.living_room_main',
      name: 'Living Room Main Light',
      domain: 'light',
      state: 'off',
      available: true,
      lastChanged: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  ],
  [
    'switch.coffee_machine',
    {
      entityId: 'switch.coffee_machine',
      name: 'Coffee Machine',
      domain: 'switch',
      state: 'on',
      available: true,
      lastChanged: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  ],
  [
    'fan.bedroom_fan',
    {
      entityId: 'fan.bedroom_fan',
      name: 'Bedroom Fan',
      domain: 'fan',
      state: 'off',
      available: true,
      lastChanged: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  ],
  [
    'sensor.living_room_temperature',
    {
      entityId: 'sensor.living_room_temperature',
      name: 'Living Room Temperature',
      domain: 'sensor',
      state: '24.1',
      available: true,
      lastChanged: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  ]
]);

const mockScenes = [
  {
    entityId: 'scene.good_morning',
    name: 'Good Morning',
    state: 'scening'
  },
  {
    entityId: 'scene.movie_time',
    name: 'Movie Time',
    state: 'scening'
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function listMockDevices() {
  return Array.from(mockDevices.values()).map((item) => clone(item));
}

export function getMockDevice(entityId) {
  const device = mockDevices.get(entityId);
  return device ? clone(device) : null;
}

export function setMockDeviceState(entityId, action) {
  const device = mockDevices.get(entityId);
  if (!device) {
    return null;
  }

  const current = String(device.state || '').toLowerCase();
  let nextState = current;

  if (action === 'turn_on') {
    nextState = 'on';
  } else if (action === 'turn_off') {
    nextState = 'off';
  } else if (action === 'toggle') {
    nextState = current === 'on' ? 'off' : 'on';
  } else {
    return clone(device);
  }

  const now = new Date().toISOString();
  if (nextState !== current) {
    device.state = nextState;
    device.lastChanged = now;
  }
  device.lastUpdated = now;

  return clone(device);
}

export function toggleMockDevice(entityId) {
  return setMockDeviceState(entityId, 'toggle');
}

export function listMockScenes() {
  return clone(mockScenes);
}

export function activateMockScene(entityId) {
  return Boolean(mockScenes.find((scene) => scene.entityId === entityId));
}
