<template>
  <view class="ha-container">
    <view class="ha-hero">
      <view class="ha-hero__title">连接与账户</view>
      <view class="ha-hero__desc">统一管理跨端客户端的连接地址、登录状态与服务检测。</view>
      <view class="ha-stat-grid">
        <view class="ha-stat">
          <text class="ha-stat__label">登录状态</text>
          <text class="ha-stat__value">{{ sessionToken ? '已登录' : '未登录' }}</text>
        </view>
        <view class="ha-stat">
          <text class="ha-stat__label">运行平台</text>
          <text class="ha-stat__value" style="font-size: 24rpx;">{{ runtimeLabel }}</text>
        </view>
      </view>
    </view>

    <view class="ha-card">
      <view class="ha-title">后端地址</view>
      <view class="ha-subtle">真机调试时请改为局域网 IP 或 HTTPS 域名，不能使用 `127.0.0.1`。</view>
      <input
        v-model="apiBaseUrl"
        class="ha-input"
        placeholder="请输入后端地址"
      />
      <view class="ha-action-row">
        <button class="ha-btn ha-btn--secondary" size="mini" @click="saveApiBaseUrl">保存地址</button>
        <button class="ha-btn ha-btn--ghost" size="mini" @click="checkHealth">检测连接</button>
      </view>
    </view>

    <view class="ha-card">
      <view class="ha-title">账户登录</view>
      <view class="ha-note">认证方式：{{ authTypeLabel }}</view>
      <view v-if="sessionToken" class="ha-note">会话令牌：{{ maskedToken }}</view>
      <view v-else class="ha-note">当前未登录</view>
      <view class="ha-note">服务模式：{{ modeLabel }}</view>
      <view class="ha-action-row">
        <button class="ha-btn ha-btn--primary" size="mini" @click="login">登录</button>
        <button class="ha-btn ha-btn--danger" size="mini" @click="logout">退出登录</button>
      </view>
      <view v-if="error" class="ha-error">{{ error }}</view>
    </view>

    <view v-if="health" class="ha-card">
      <view class="ha-title">服务状态</view>
      <view class="ha-kv">
        <text class="ha-subtle">服务健康</text>
        <text class="ha-kv__value">{{ health.okText }}</text>
      </view>
      <view class="ha-kv">
        <text class="ha-subtle">运行模式</text>
        <text class="ha-kv__value">{{ health.modeLabel }}</text>
      </view>
      <view class="ha-kv">
        <text class="ha-subtle">HA 配置</text>
        <text class="ha-kv__value">{{ health.haConfiguredText }}</text>
      </view>
      <view class="ha-kv">
        <text class="ha-subtle">检测时间</text>
        <text class="ha-kv__value">{{ health.timestamp }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

import { get, loginSession } from '../../utils/api';
import { formatModeLabel, getRuntimeLabel, maskToken } from '../../utils/presenters';
import { clearSession, getApiBaseUrl, getSessionToken, setApiBaseUrl } from '../../utils/storage';

const apiBaseUrl = ref(getApiBaseUrl());
const sessionToken = ref(getSessionToken());
const mode = ref('');
const health = ref(null);
const error = ref('');
const authType = ref('');

const runtimeLabel = computed(() => getRuntimeLabel());
const maskedToken = computed(() => maskToken(sessionToken.value));
const modeLabel = computed(() => formatModeLabel(mode.value));
const authTypeLabel = computed(() => {
  // #ifdef MP-WEIXIN
  return '微信小程序登录';
  // #endif

  // #ifndef MP-WEIXIN
  return authType.value === 'device' ? '设备登录' : '设备登录';
  // #endif
});

function refreshSession() {
  apiBaseUrl.value = getApiBaseUrl();
  sessionToken.value = getSessionToken();
}

function saveApiBaseUrl() {
  apiBaseUrl.value = setApiBaseUrl(apiBaseUrl.value);
  uni.showToast({
    title: '地址已保存',
    icon: 'success'
  });
}

async function login() {
  error.value = '';
  uni.showLoading({
    title: '登录中'
  });

  try {
    const result = await loginSession();
    sessionToken.value = getSessionToken();
    mode.value = result.mode || '';
    authType.value = result.authType || 'device';

    uni.showToast({
      title: '登录成功',
      icon: 'success'
    });
  } catch (loginError) {
    error.value = loginError.message || '登录失败，请稍后重试。';
    uni.showToast({
      title: '登录失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
}

function logout() {
  clearSession();
  sessionToken.value = '';
  health.value = null;
  error.value = '';

  uni.showToast({
    title: '已退出登录',
    icon: 'success'
  });
}

async function checkHealth() {
  if (!sessionToken.value) {
    error.value = '请先登录后再检测连接状态。';
    return;
  }

  error.value = '';
  uni.showLoading({
    title: '检测中'
  });

  try {
    const result = await get('/api/health');
    mode.value = result.mode || mode.value;
    health.value = {
      okText: result.ok ? '正常' : '异常',
      modeLabel: formatModeLabel(result.mode || mode.value),
      haConfiguredText: result.haConfigured ? '已配置' : '未配置',
      timestamp: result.timestamp || '--'
    };
  } catch (healthError) {
    error.value = healthError.message || '连接检测失败，请稍后重试。';
  } finally {
    uni.hideLoading();
  }
}

onShow(() => {
  refreshSession();
});
</script>
