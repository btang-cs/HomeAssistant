const api = require('../../utils/api');

const SCENE_HISTORY_STORAGE_KEY = 'sceneActivationHistory';

Page({
  data: {
    loading: false,
    error: '',
    scenes: [],
    sceneTotal: 0,
    filteredTotal: 0,
    searchKeyword: '',
    isEmpty: false,
    historyMap: {}
  },

  onShow() {
    this.loadHistory();
    this.loadScenes();
  },

  loadHistory() {
    const historyMap = wx.getStorageSync(SCENE_HISTORY_STORAGE_KEY) || {};
    this.setData({ historyMap: typeof historyMap === 'object' ? historyMap : {} });
  },

  saveHistory(historyMap) {
    wx.setStorageSync(SCENE_HISTORY_STORAGE_KEY, historyMap);
    this.setData({ historyMap });
  },

  async loadScenes() {
    const app = getApp();
    if (!app.globalData.sessionToken) {
      this.rawScenes = [];
      this.setData({
        scenes: [],
        sceneTotal: 0,
        filteredTotal: 0,
        isEmpty: true,
        error: '请先在“我的”页面完成登录。',
        loading: false
      });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      const result = await api.fetchScenes();
      this.rawScenes = (result.items || []).map((item) => this.decorateScene(item, this.data.historyMap));

      this.applySearchFilter();

      this.setData({
        loading: false,
        sceneTotal: this.rawScenes.length
      });
    } catch (error) {
      this.rawScenes = [];
      this.setData({
        scenes: [],
        sceneTotal: 0,
        filteredTotal: 0,
        isEmpty: true,
        loading: false,
        error: error.message || '场景列表加载失败，请稍后重试。'
      });
    }
  },

  decorateScene(item, historyMap = this.data.historyMap) {
    const state = String(item.state || 'unknown').toLowerCase();

    let stateLabel = '可执行';
    let stateClass = 'tag-on';

    if (state === 'unavailable') {
      stateLabel = '不可用';
      stateClass = 'tag-muted';
    } else if (state === 'unknown') {
      stateLabel = '未知';
      stateClass = 'tag-muted';
    } else if (state === 'scening') {
      stateLabel = '就绪';
      stateClass = 'tag-on';
    }

    const lastActivatedAt = historyMap[item.entityId] || '';

    return {
      ...item,
      stateLabel,
      stateClass,
      lastActivatedAt,
      lastActivatedText: lastActivatedAt
        ? `最近执行：${this.formatTime(lastActivatedAt)}`
        : '尚未执行'
    };
  },

  applySearchFilter() {
    const keyword = String(this.data.searchKeyword || '').trim().toLowerCase();

    const scenes = (this.rawScenes || []).filter((item) => {
      if (!keyword) {
        return true;
      }

      const searchable = `${item.name} ${item.entityId}`.toLowerCase();
      return searchable.includes(keyword);
    });

    this.setData({
      scenes,
      filteredTotal: scenes.length,
      isEmpty: scenes.length === 0
    });
  },

  onSearchInput(event) {
    this.setData({ searchKeyword: event.detail.value || '' });
    this.applySearchFilter();
  },

  onClearSearch() {
    this.setData({ searchKeyword: '' });
    this.applySearchFilter();
  },

  async onActivateTap(event) {
    const entityId = event.currentTarget.dataset.entityId;
    if (!entityId) {
      return;
    }

    wx.showLoading({ title: '执行中' });

    try {
      await api.activateScene(entityId);

      const historyMap = {
        ...this.data.historyMap,
        [entityId]: new Date().toISOString()
      };

      this.saveHistory(historyMap);
      this.rawScenes = (this.rawScenes || []).map((item) => this.decorateScene(item, historyMap));

      this.applySearchFilter();

      wx.showToast({ title: '场景已执行', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '执行失败', icon: 'none' });
      this.setData({ error: error.message || '场景执行失败，请稍后重试。' });
    } finally {
      wx.hideLoading();
    }
  },

  formatTime(isoTime) {
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
  },

  onPullDownRefresh() {
    this.loadScenes().finally(() => wx.stopPullDownRefresh());
  }
});
