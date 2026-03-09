<template>
  <view class="ha-container">
    <view class="ha-hero">
      <view class="ha-hero__title">场景快捷面板</view>
      <view class="ha-hero__desc">跨端一致的场景执行体验，保留最近执行记录。</view>
      <view class="ha-stat-grid">
        <view class="ha-stat">
          <text class="ha-stat__label">场景总数</text>
          <text class="ha-stat__value">{{ sceneTotal }}</text>
        </view>
        <view class="ha-stat">
          <text class="ha-stat__label">筛选结果</text>
          <text class="ha-stat__value">{{ filteredScenes.length }}</text>
        </view>
      </view>
    </view>

    <view class="ha-card">
      <view class="ha-section-head">
        <view class="ha-title">场景列表</view>
        <button class="ha-btn ha-btn--secondary" size="mini" :loading="loading" @click="loadScenes">
          刷新
        </button>
      </view>

      <input
        v-model="searchKeyword"
        class="ha-input"
        placeholder="搜索场景名称 / 实体ID"
        confirm-type="search"
      />

      <view class="ha-action-row">
        <button class="ha-btn ha-btn--ghost" size="mini" @click="searchKeyword = ''">清空搜索</button>
      </view>

      <view v-if="error" class="ha-error">{{ error }}</view>
      <view v-if="loading" class="ha-empty">正在同步场景，请稍候...</view>
      <view v-else-if="filteredScenes.length === 0" class="ha-empty">当前筛选条件下暂无场景</view>

      <view v-for="item in filteredScenes" :key="item.entityId" class="ha-item">
        <view class="ha-item__top">
          <view class="ha-item__name">{{ item.name }}</view>
          <view :class="item.stateClass">{{ item.stateLabel }}</view>
        </view>

        <view class="ha-item__meta">{{ item.entityId }}</view>
        <view class="ha-note">{{ item.lastActivatedText }}</view>

        <view class="ha-item__bottom">
          <text class="ha-subtle">点击按钮立即触发</text>
          <button class="ha-btn ha-btn--primary" size="mini" @click="activate(item.entityId)">
            执行场景
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';

import { activateScene, fetchScenes } from '../../utils/api';
import { decorateScene } from '../../utils/presenters';
import {
  getSceneActivationHistory,
  getSessionToken,
  setSceneActivationHistory
} from '../../utils/storage';

const loading = ref(false);
const error = ref('');
const rawScenes = ref([]);
const searchKeyword = ref('');
const historyMap = ref(getSceneActivationHistory());

const sceneTotal = computed(() => rawScenes.value.length);
const filteredScenes = computed(() => {
  const keyword = String(searchKeyword.value || '').trim().toLowerCase();
  return rawScenes.value.filter((item) => {
    if (!keyword) {
      return true;
    }
    const searchable = `${item.name} ${item.entityId}`.toLowerCase();
    return searchable.includes(keyword);
  });
});

function refreshHistory() {
  historyMap.value = getSceneActivationHistory();
}

async function loadScenes() {
  if (!getSessionToken()) {
    rawScenes.value = [];
    error.value = '请先在“我的”页面完成登录。';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await fetchScenes();
    rawScenes.value = (result.items || []).map((item) => decorateScene(item, historyMap.value));
  } catch (loadError) {
    rawScenes.value = [];
    error.value = loadError.message || '场景列表加载失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

async function activate(entityId) {
  uni.showLoading({
    title: '执行中'
  });

  try {
    await activateScene(entityId);
    historyMap.value = setSceneActivationHistory({
      ...historyMap.value,
      [entityId]: new Date().toISOString()
    });
    rawScenes.value = rawScenes.value.map((item) => decorateScene(item, historyMap.value));

    uni.showToast({
      title: '场景已执行',
      icon: 'success'
    });
  } catch (actionError) {
    error.value = actionError.message || '场景执行失败，请稍后重试。';
    uni.showToast({
      title: '执行失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
}

onShow(() => {
  refreshHistory();
  loadScenes();
});

onPullDownRefresh(async () => {
  await loadScenes();
  uni.stopPullDownRefresh();
});
</script>
