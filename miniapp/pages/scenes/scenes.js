const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    error: '',
    scenes: [],
    sceneTotal: 0,
    isEmpty: false
  },

  onShow() {
    this.loadScenes();
  },

  async loadScenes() {
    const app = getApp();
    if (!app.globalData.sessionToken) {
      this.setData({
        scenes: [],
        sceneTotal: 0,
        isEmpty: true,
        error: '请先在“我的”页面完成登录。',
        loading: false
      });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      const result = await api.get('/api/scenes');
      const scenes = (result.items || []).map((item) => ({
        ...item,
        stateLabel: this.formatSceneState(item.state),
        stateClass: this.formatSceneStateClass(item.state)
      }));

      this.setData({
        scenes,
        sceneTotal: scenes.length,
        isEmpty: scenes.length === 0,
        loading: false
      });
    } catch (error) {
      this.setData({
        scenes: [],
        sceneTotal: 0,
        isEmpty: true,
        loading: false,
        error: error.message || '场景列表加载失败，请稍后重试。'
      });
    }
  },

  formatSceneState(state) {
    const value = String(state || 'unknown').toLowerCase();

    if (value === 'unavailable') {
      return '不可用';
    }
    if (value === 'unknown') {
      return '未知';
    }
    if (value === 'scening') {
      return '就绪';
    }

    return '可执行';
  },

  formatSceneStateClass(state) {
    const value = String(state || 'unknown').toLowerCase();

    if (value === 'unavailable') {
      return 'tag-muted';
    }

    return 'tag-on';
  },

  async onActivateTap(event) {
    const entityId = event.currentTarget.dataset.entityId;
    if (!entityId) {
      return;
    }

    wx.showLoading({ title: '执行中' });

    try {
      await api.post(`/api/scenes/${encodeURIComponent(entityId)}/activate`, {});
      wx.showToast({ title: '场景已执行', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '执行失败', icon: 'none' });
      this.setData({ error: error.message || '场景执行失败，请稍后重试。' });
    } finally {
      wx.hideLoading();
    }
  },

  onPullDownRefresh() {
    this.loadScenes().finally(() => wx.stopPullDownRefresh());
  }
});
