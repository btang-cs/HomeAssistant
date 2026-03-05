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

export function toggleMockDevice(entityId) {
  const device = mockDevices.get(entityId);
  if (!device) {
    return null;
  }

  const isOn = device.state === 'on';
  device.state = isOn ? 'off' : 'on';
  device.lastChanged = new Date().toISOString();
  device.lastUpdated = device.lastChanged;
  return clone(device);
}

export function listMockScenes() {
  return clone(mockScenes);
}

export function activateMockScene(entityId) {
  return Boolean(mockScenes.find((scene) => scene.entityId === entityId));
}
