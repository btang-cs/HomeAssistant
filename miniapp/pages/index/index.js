const api = require('../../utils/api');

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

const FAVORITE_STORAGE_KEY = 'favoriteDeviceIds';

Page({
  data: {
    loading: false,
    error: '',
    devices: [],
    domainTabs: [{ key: 'all', label: '全部', count: 0 }],
    selectedDomain: 'all',
    searchKeyword: '',
    onlyOnline: false,
    onlyFavorites: false,
    favoriteIds: [],
    deviceTotal: 0,
    onlineTotal: 0,
    controllableTotal: 0,
    filteredTotal: 0,
    isEmpty: false
  },

  onShow() {
    this.loadFavorites();
    this.loadDevices();
  },

  loadFavorites() {
    const saved = wx.getStorageSync(FAVORITE_STORAGE_KEY);
    const favoriteIds = Array.isArray(saved) ? saved : [];
    this.setData({ favoriteIds });
  },

  saveFavorites(favoriteIds) {
    wx.setStorageSync(FAVORITE_STORAGE_KEY, favoriteIds);
    this.setData({ favoriteIds });
  },

  async loadDevices() {
    const app = getApp();
    if (!app.globalData.sessionToken) {
      this.rawDevices = [];
      this.setData({
        devices: [],
        domainTabs: [{ key: 'all', label: '全部', count: 0 }],
        deviceTotal: 0,
        onlineTotal: 0,
        controllableTotal: 0,
        filteredTotal: 0,
        isEmpty: true,
        error: '请先在“我的”页面完成登录。',
        loading: false
      });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      const result = await api.fetchDevices();
      const sourceDevices = result.items || [];

      this.rawDevices = sourceDevices.map((item) => this.decorateDevice(item));
      this.buildDomainTabs(this.rawDevices);
      this.applyLocalFilters();

      this.setData({
        loading: false,
        deviceTotal: this.rawDevices.length,
        onlineTotal: this.rawDevices.filter((item) => item.available).length,
        controllableTotal: this.rawDevices.filter((item) => item.controllable).length
      });
    } catch (error) {
      this.rawDevices = [];
      this.setData({
        devices: [],
        domainTabs: [{ key: 'all', label: '全部', count: 0 }],
        deviceTotal: 0,
        onlineTotal: 0,
        controllableTotal: 0,
        filteredTotal: 0,
        isEmpty: true,
        loading: false,
        error: error.message || '设备列表加载失败，请稍后重试。'
      });
    }
  },

  decorateDevice(item) {
    const domain = item.domain || 'unknown';
    const state = this.formatState(item.state, domain, item.unit);
    const available = Boolean(item.available);

    return {
      ...item,
      domainLabel: DOMAIN_LABELS[domain] || domain,
      availabilityText: available ? '在线' : '离线',
      availabilityClass: available ? 'tag-on' : 'tag-muted',
      stateLabel: state.label,
      stateClass: state.className,
      controllable: Boolean(item.controllable)
    };
  },

  formatState(rawState, domain, unit) {
    const value = String(rawState || 'unknown').toLowerCase();

    if (domain === 'sensor') {
      const display = unit ? `${rawState}${unit}` : String(rawState || '--');
      return {
        label: display,
        className: 'tag-muted'
      };
    }

    if (value === 'on') {
      return { label: '开启', className: 'tag-on' };
    }

    if (value === 'off') {
      return { label: '关闭', className: 'tag-off' };
    }

    if (value === 'unavailable') {
      return { label: '离线', className: 'tag-muted' };
    }

    if (value === 'unknown') {
      return { label: '未知', className: 'tag-muted' };
    }

    return {
      label: String(rawState || '--'),
      className: 'tag-muted'
    };
  },

  buildDomainTabs(devices) {
    const counter = {};

    devices.forEach((item) => {
      const domain = item.domain || 'unknown';
      counter[domain] = (counter[domain] || 0) + 1;
    });

    const tabs = [{ key: 'all', label: '全部', count: devices.length }];
    Object.keys(counter)
      .sort((a, b) => {
        const aLabel = DOMAIN_LABELS[a] || a;
        const bLabel = DOMAIN_LABELS[b] || b;
        return aLabel.localeCompare(bLabel);
      })
      .forEach((domain) => {
        tabs.push({
          key: domain,
          label: DOMAIN_LABELS[domain] || domain,
          count: counter[domain]
        });
      });

    this.setData({ domainTabs: tabs });
  },

  applyLocalFilters() {
    const {
      searchKeyword,
      selectedDomain,
      onlyOnline,
      onlyFavorites,
      favoriteIds
    } = this.data;
    const keyword = String(searchKeyword || '').trim().toLowerCase();
    const favoriteSet = new Set(favoriteIds || []);

    const devices = (this.rawDevices || []).filter((item) => {
      if (selectedDomain !== 'all' && item.domain !== selectedDomain) {
        return false;
      }

      if (onlyOnline && !item.available) {
        return false;
      }

      if (onlyFavorites && !favoriteSet.has(item.entityId)) {
        return false;
      }

      if (keyword) {
        const searchable = `${item.name} ${item.entityId} ${item.domainLabel}`.toLowerCase();
        if (!searchable.includes(keyword)) {
          return false;
        }
      }

      return true;
    });

    const enriched = devices.map((item) => ({
      ...item,
      isFavorite: favoriteSet.has(item.entityId)
    }));

    this.setData({
      devices: enriched,
      filteredTotal: enriched.length,
      isEmpty: enriched.length === 0
    });
  },

  onSearchInput(event) {
    this.setData({ searchKeyword: event.detail.value || '' });
    this.applyLocalFilters();
  },

  onDomainTabTap(event) {
    const domain = event.currentTarget.dataset.domain;
    if (!domain) {
      return;
    }

    this.setData({ selectedDomain: domain });
    this.applyLocalFilters();
  },

  onOnlyOnlineChange(event) {
    this.setData({ onlyOnline: Boolean(event.detail.value) });
    this.applyLocalFilters();
  },

  onOnlyFavoritesChange(event) {
    this.setData({ onlyFavorites: Boolean(event.detail.value) });
    this.applyLocalFilters();
  },

  onClearFilters() {
    this.setData({
      searchKeyword: '',
      selectedDomain: 'all',
      onlyOnline: false,
      onlyFavorites: false
    });
    this.applyLocalFilters();
  },

  onToggleFavorite(event) {
    const entityId = event.currentTarget.dataset.entityId;
    if (!entityId) {
      return;
    }

    const favoriteSet = new Set(this.data.favoriteIds || []);
    if (favoriteSet.has(entityId)) {
      favoriteSet.delete(entityId);
    } else {
      favoriteSet.add(entityId);
    }

    const favoriteIds = Array.from(favoriteSet);
    this.saveFavorites(favoriteIds);
    this.applyLocalFilters();
  },

  async onActionTap(event) {
    const entityId = event.currentTarget.dataset.entityId;
    const action = event.currentTarget.dataset.action;

    if (!entityId || !action) {
      return;
    }

    const actionNameMap = {
      turn_on: '开启',
      turn_off: '关闭',
      toggle: '切换'
    };

    wx.showLoading({ title: `${actionNameMap[action] || '操作'}中` });

    try {
      const result = await api.setDeviceState(entityId, action);

      if (result?.device) {
        this.rawDevices = (this.rawDevices || []).map((item) =>
          item.entityId === entityId ? this.decorateDevice(result.device) : item
        );
        this.applyLocalFilters();
      } else {
        await this.loadDevices();
      }

      wx.showToast({ title: '操作成功', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '操作失败', icon: 'none' });
      this.setData({ error: error.message || '设备控制失败，请稍后重试。' });
    } finally {
      wx.hideLoading();
    }
  },

  onPullDownRefresh() {
    this.loadDevices().finally(() => wx.stopPullDownRefresh());
  }
});
