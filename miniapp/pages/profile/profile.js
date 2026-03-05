const api = require('../../utils/api');

Page({
  data: {
    apiBaseUrl: 'http://127.0.0.1:3000',
    sessionToken: '',
    maskedToken: '',
    mode: '',
    modeLabel: '--',
    health: null,
    error: ''
  },

  onShow() {
    const app = getApp();
    const sessionToken = app.globalData.sessionToken;

    this.setData({
      apiBaseUrl: app.globalData.apiBaseUrl,
      sessionToken,
      maskedToken: this.maskToken(sessionToken),
      modeLabel: this.formatModeLabel(this.data.mode)
    });
  },

  onBaseUrlInput(event) {
    this.setData({ apiBaseUrl: event.detail.value });
  },

  onSaveBaseUrl() {
    const app = getApp();
    app.setApiBaseUrl(this.data.apiBaseUrl);
    this.setData({ apiBaseUrl: app.globalData.apiBaseUrl });
    wx.showToast({ title: '地址已保存', icon: 'success' });
  },

  async onWechatLogin() {
    this.setData({ error: '' });
    wx.showLoading({ title: '登录中' });

    try {
      const result = await api.loginWithWechat();
      const app = getApp();
      const sessionToken = app.globalData.sessionToken;
      const mode = result.mode || '';

      this.setData({
        sessionToken,
        maskedToken: this.maskToken(sessionToken),
        mode,
        modeLabel: this.formatModeLabel(mode)
      });

      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch (error) {
      this.setData({ error: error.message || '登录失败，请稍后重试。' });
      wx.showToast({ title: '登录失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onLogout() {
    const app = getApp();
    app.setSessionToken('');
    this.setData({
      sessionToken: '',
      maskedToken: '',
      health: null,
      error: ''
    });
    wx.showToast({ title: '已退出登录', icon: 'success' });
  },

  async onCheckHealth() {
    if (!this.data.sessionToken) {
      this.setData({ error: '请先登录后再检测连接状态。' });
      return;
    }

    this.setData({ error: '' });
    wx.showLoading({ title: '检测中' });

    try {
      const result = await api.get('/api/health');
      const mode = result.mode || this.data.mode;
      const health = {
        okText: result.ok ? '正常' : '异常',
        modeLabel: this.formatModeLabel(mode),
        haConfiguredText: result.haConfigured ? '已配置' : '未配置',
        timestamp: result.timestamp || '--'
      };

      this.setData({
        mode,
        modeLabel: this.formatModeLabel(mode),
        health
      });
    } catch (error) {
      this.setData({ error: error.message || '连接检测失败，请稍后重试。' });
    } finally {
      wx.hideLoading();
    }
  },

  formatModeLabel(mode) {
    if (mode === 'mock') {
      return '模拟模式';
    }
    if (mode === 'proxy') {
      return 'Home Assistant 代理模式';
    }
    return '--';
  },

  maskToken(token) {
    if (!token) {
      return '';
    }

    if (token.length <= 12) {
      return token;
    }

    return `${token.slice(0, 8)}...${token.slice(-4)}`;
  }
});
