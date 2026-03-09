export const DOMAIN_LABELS = {
  light: '灯光',
  switch: '开关',
  fan: '风扇',
  climate: '空调',
  cover: '窗帘',
  lock: '门锁',
  sensor: '传感器',
  binary_sensor: '二值传感器',
  input_boolean: '布尔开关'
};

export function buildDomainTabs(devices) {
  const counter = {};

  devices.forEach((item) => {
    const domain = item.domain || 'unknown';
    counter[domain] = (counter[domain] || 0) + 1;
  });

  const tabs = [{ key: 'all', label: '全部', count: devices.length }];
  Object.keys(counter)
    .sort((a, b) => (DOMAIN_LABELS[a] || a).localeCompare(DOMAIN_LABELS[b] || b))
    .forEach((domain) => {
      tabs.push({
        key: domain,
        label: DOMAIN_LABELS[domain] || domain,
        count: counter[domain]
      });
    });

  return tabs;
}

export function decorateDevice(item) {
  const domain = item.domain || 'unknown';
  const state = formatDeviceState(item.state, domain, item.unit);
  const available = Boolean(item.available);

  return {
    ...item,
    domainLabel: DOMAIN_LABELS[domain] || domain,
    availabilityText: available ? '在线' : '离线',
    availabilityClass: available ? 'ha-tag ha-tag--on' : 'ha-tag ha-tag--muted',
    stateLabel: state.label,
    stateClass: state.className,
    controllable: Boolean(item.controllable)
  };
}

export function decorateScene(item, historyMap = {}) {
  const state = String(item.state || 'unknown').toLowerCase();
  let stateLabel = '可执行';
  let stateClass = 'ha-tag ha-tag--on';

  if (state === 'unavailable') {
    stateLabel = '不可用';
    stateClass = 'ha-tag ha-tag--muted';
  } else if (state === 'unknown') {
    stateLabel = '未知';
    stateClass = 'ha-tag ha-tag--muted';
  } else if (state === 'scening') {
    stateLabel = '就绪';
  }

  const lastActivatedAt = historyMap[item.entityId] || '';

  return {
    ...item,
    stateLabel,
    stateClass,
    lastActivatedAt,
    lastActivatedText: lastActivatedAt ? `最近执行：${formatTime(lastActivatedAt)}` : '尚未执行'
  };
}

export function decorateAutomation(item, historyMap = {}) {
  const kind = item.kind || 'automation';
  const rawState = String(item.state || 'unknown').toLowerCase();
  const lastTriggeredAt = item.lastTriggeredAt || historyMap[item.entityId] || '';

  return {
    ...item,
    kindLabel: kind === 'script' ? '脚本' : '自动化',
    stateLabel: rawState === 'on' ? '已启用' : rawState === 'off' ? '已停用' : '未知',
    stateClass:
      rawState === 'on' ? 'ha-tag ha-tag--on' : rawState === 'off' ? 'ha-tag ha-tag--off' : 'ha-tag ha-tag--muted',
    lastTriggeredAt,
    lastTriggeredText: lastTriggeredAt ? `最近执行：${formatTime(lastTriggeredAt)}` : '尚未执行'
  };
}

export function formatModeLabel(mode) {
  if (mode === 'mock') {
    return '模拟模式';
  }
  if (mode === 'proxy') {
    return 'Home Assistant 代理模式';
  }
  return '--';
}

export function maskToken(token) {
  if (!token) {
    return '';
  }
  if (token.length <= 12) {
    return token;
  }
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

export function getRuntimeLabel() {
  const info = uni.getSystemInfoSync();
  return `${info.uniPlatform || info.platform || 'unknown'} / ${info.system || 'unknown'}`;
}

function formatDeviceState(rawState, domain, unit) {
  const value = String(rawState || 'unknown').toLowerCase();

  if (domain === 'sensor') {
    return {
      label: unit ? `${rawState}${unit}` : String(rawState || '--'),
      className: 'ha-tag ha-tag--muted'
    };
  }

  if (value === 'on') {
    return { label: '开启', className: 'ha-tag ha-tag--on' };
  }
  if (value === 'off') {
    return { label: '关闭', className: 'ha-tag ha-tag--off' };
  }
  if (value === 'unavailable') {
    return { label: '离线', className: 'ha-tag ha-tag--muted' };
  }
  if (value === 'unknown') {
    return { label: '未知', className: 'ha-tag ha-tag--muted' };
  }

  return {
    label: String(rawState || '--'),
    className: 'ha-tag ha-tag--muted'
  };
}

function formatTime(isoTime) {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${d} ${hh}:${mm}`;
}
