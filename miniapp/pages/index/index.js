const api = require('../../utils/api');

const TOGGLEABLE_DOMAINS = new Set(['light', 'switch', 'fan', 'input_boolean']);

const DOMAIN_LABELS = {
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

Page({
  data: {
    loading: false,
    error: '',
    devices: [],
    deviceTotal: 0,
    onlineTotal: 0,
    isEmpty: false
  },

  onShow() {
    this.loadDevices();
  },

  async loadDevices() {
    const app = getApp();
    if (!app.globalData.sessionToken) {
      this.setData({
        devices: [],
        deviceTotal: 0,
        onlineTotal: 0,
        isEmpty: true,
        error: '请先在“我的”页面完成登录。',
        loading: false
      });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      const result = await api.get('/api/devices');
      const sourceDevices = result.items || [];
      const devices = sourceDevices.map((item) => ({
        ...item,
        toggleable: TOGGLEABLE_DOMAINS.has(item.domain),
        domainLabel: DOMAIN_LABELS[item.domain] || item.domain,
        availabilityText: item.available ? '在线' : '离线',
        availabilityClass: item.available ? 'tag-on' : 'tag-muted',
        stateLabel: this.formatState(item.state, item.domain),
        stateClass: this.formatStateClass(item.state, item.domain)
      }));

      const onlineTotal = devices.filter((item) => item.available).length;

      this.setData({
        devices,
        deviceTotal: devices.length,
        onlineTotal,
        isEmpty: devices.length === 0,
        loading: false
      });
    } catch (error) {
      this.setData({
        devices: [],
        deviceTotal: 0,
        onlineTotal: 0,
        isEmpty: true,
        loading: false,
        error: error.message || '设备列表加载失败，请稍后重试。'
      });
    }
  },

  formatState(state, domain) {
    const value = String(state || 'unknown').toLowerCase();

    if (domain === 'sensor') {
      return String(state || '--');
    }

    if (value === 'on') {
      return '开启';
    }
    if (value === 'off') {
      return '关闭';
    }
    if (value === 'unavailable') {
      return '离线';
    }
    if (value === 'unknown') {
      return '未知';
    }

    return String(state || '--');
  },

  formatStateClass(state, domain) {
    const value = String(state || 'unknown').toLowerCase();

    if (domain === 'sensor') {
      return 'tag-muted';
    }

    if (value === 'on') {
      return 'tag-on';
    }
    if (value === 'off') {
      return 'tag-off';
    }

    return 'tag-muted';
  },

  async onToggleTap(event) {
    const entityId = event.currentTarget.dataset.entityId;
    if (!entityId) {
      return;
    }

    wx.showLoading({ title: '切换中' });

    try {
      await api.post(`/api/devices/${encodeURIComponent(entityId)}/toggle`, {});
      wx.showToast({ title: '操作成功', icon: 'success' });
      await this.loadDevices();
    } catch (error) {
      wx.showToast({ title: '操作失败', icon: 'none' });
      this.setData({ error: error.message || '设备切换失败，请稍后重试。' });
    } finally {
      wx.hideLoading();
    }
  },

  onPullDownRefresh() {
    this.loadDevices().finally(() => wx.stopPullDownRefresh());
  }
});
