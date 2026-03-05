const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';

function getBaseUrl() {
  const app = getApp();
  return app?.globalData?.apiBaseUrl || DEFAULT_BASE_URL;
}

function getToken() {
  const app = getApp();
  return app?.globalData?.sessionToken || '';
}

function request(path, method = 'GET', data) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}${path}`,
      method,
      data,
      timeout: 10000,
      header: headers,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }

        const message = response.data?.message || `请求失败（状态码 ${response.statusCode}）`;
        reject(new Error(message));
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络连接失败，请检查地址或网络状态。'));
      }
    });
  });
}

function get(path) {
  return request(path, 'GET');
}

function post(path, data) {
  return request(path, 'POST', data);
}

function loginWithWechat() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginResult) {
        post('/auth/wx-login', { code: loginResult.code || '' })
          .then((data) => {
            const app = getApp();
            if (app?.setSessionToken) {
              app.setSessionToken(data.sessionToken || '');
            }
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

module.exports = {
  get,
  post,
  loginWithWechat
};
