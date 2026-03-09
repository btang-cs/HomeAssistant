import {
  getApiBaseUrl,
  getSessionToken,
  setSessionToken
} from './storage';

function buildQuery(params = {}) {
  const pairs = [];

  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') {
      return;
    }
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  });

  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}

function request(path, method = 'GET', data) {
  const token = getSessionToken();
  const header = {
    'Content-Type': 'application/json'
  };

  if (token) {
    header.Authorization = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${getApiBaseUrl()}${path}`,
      method,
      data,
      timeout: 10000,
      header,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }

        reject(new Error(response.data?.message || `请求失败（状态码 ${response.statusCode}）`));
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络连接失败，请检查地址或网络状态。'));
      }
    });
  });
}

function loginWithWechatMiniProgram() {
  return new Promise((resolve, reject) => {
    uni.login({
      success(loginResult) {
        request('/auth/wx-login', 'POST', { code: loginResult.code || '' })
          .then((data) => {
            setSessionToken(data.sessionToken || '');
            resolve(data);
          })
          .catch(reject);
      },
      fail(error) {
        reject(new Error(error.errMsg || '微信登录失败，请稍后重试。'));
      }
    });
  });
}

function loginWithDevice() {
  const info = uni.getSystemInfoSync();
  const payload = {
    provider: 'device',
    platform: info.uniPlatform || info.platform || 'unknown',
    deviceName: [info.brand, info.model].filter(Boolean).join(' ').trim()
  };

  return request('/auth/device-login', 'POST', payload).then((data) => {
    setSessionToken(data.sessionToken || '');
    return data;
  });
}

export async function loginSession() {
  // #ifdef MP-WEIXIN
  return loginWithWechatMiniProgram();
  // #endif

  // #ifndef MP-WEIXIN
  return loginWithDevice();
  // #endif
}

export function get(path, params) {
  return request(`${path}${buildQuery(params)}`, 'GET');
}

export function post(path, data) {
  return request(path, 'POST', data);
}

export function fetchDevices(params) {
  return get('/api/devices', params);
}

export function getDevice(entityId) {
  return get(`/api/devices/${encodeURIComponent(entityId)}`);
}

export function setDeviceState(entityId, action) {
  return post(`/api/devices/${encodeURIComponent(entityId)}/state`, { action });
}

export function fetchScenes(params) {
  return get('/api/scenes', params);
}

export function activateScene(entityId) {
  return post(`/api/scenes/${encodeURIComponent(entityId)}/activate`, {});
}

export function fetchAutomations(params) {
  return get('/api/automations', params);
}

export function runAutomation(entityId) {
  return post(`/api/automations/${encodeURIComponent(entityId)}/run`, {});
}
