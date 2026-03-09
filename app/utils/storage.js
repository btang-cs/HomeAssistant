const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const API_BASE_URL_KEY = 'ha:apiBaseUrl';
const SESSION_TOKEN_KEY = 'ha:sessionToken';
const FAVORITE_DEVICE_IDS_KEY = 'ha:favoriteDeviceIds';
const SCENE_HISTORY_KEY = 'ha:sceneActivationHistory';
const AUTOMATION_HISTORY_KEY = 'ha:automationRunHistory';

export function getApiBaseUrl() {
  return uni.getStorageSync(API_BASE_URL_KEY) || DEFAULT_BASE_URL;
}

export function setApiBaseUrl(url) {
  const value = String(url || '')
    .trim()
    .replace(/\/+$/, '') || DEFAULT_BASE_URL;
  uni.setStorageSync(API_BASE_URL_KEY, value);
  return value;
}

export function getSessionToken() {
  return uni.getStorageSync(SESSION_TOKEN_KEY) || '';
}

export function setSessionToken(token) {
  const value = String(token || '').trim();
  if (value) {
    uni.setStorageSync(SESSION_TOKEN_KEY, value);
  } else {
    uni.removeStorageSync(SESSION_TOKEN_KEY);
  }
  return value;
}

export function getFavoriteDeviceIds() {
  const saved = uni.getStorageSync(FAVORITE_DEVICE_IDS_KEY);
  return Array.isArray(saved) ? saved : [];
}

export function setFavoriteDeviceIds(ids) {
  const value = Array.isArray(ids) ? ids : [];
  uni.setStorageSync(FAVORITE_DEVICE_IDS_KEY, value);
  return value;
}

export function getSceneActivationHistory() {
  const saved = uni.getStorageSync(SCENE_HISTORY_KEY);
  return saved && typeof saved === 'object' ? saved : {};
}

export function setSceneActivationHistory(history) {
  const value = history && typeof history === 'object' ? history : {};
  uni.setStorageSync(SCENE_HISTORY_KEY, value);
  return value;
}

export function getAutomationRunHistory() {
  const saved = uni.getStorageSync(AUTOMATION_HISTORY_KEY);
  return saved && typeof saved === 'object' ? saved : {};
}

export function setAutomationRunHistory(history) {
  const value = history && typeof history === 'object' ? history : {};
  uni.setStorageSync(AUTOMATION_HISTORY_KEY, value);
  return value;
}

export function clearSession() {
  uni.removeStorageSync(SESSION_TOKEN_KEY);
}
