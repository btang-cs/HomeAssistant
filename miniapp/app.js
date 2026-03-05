App({
  globalData: {
    apiBaseUrl: 'http://127.0.0.1:3000',
    sessionToken: ''
  },

  onLaunch() {
    const savedBaseUrl = wx.getStorageSync('apiBaseUrl');
    const savedSessionToken = wx.getStorageSync('sessionToken');

    if (savedBaseUrl) {
      this.globalData.apiBaseUrl = savedBaseUrl;
    }
    if (savedSessionToken) {
      this.globalData.sessionToken = savedSessionToken;
    }
  },

  setApiBaseUrl(url) {
    const clean = String(url || '').trim().replace(/\/+$/, '');
    const finalUrl = clean || 'http://127.0.0.1:3000';
    this.globalData.apiBaseUrl = finalUrl;
    wx.setStorageSync('apiBaseUrl', finalUrl);
  },

  setSessionToken(token) {
    const value = String(token || '').trim();
    this.globalData.sessionToken = value;
    if (value) {
      wx.setStorageSync('sessionToken', value);
    } else {
      wx.removeStorageSync('sessionToken');
    }
  }
});
