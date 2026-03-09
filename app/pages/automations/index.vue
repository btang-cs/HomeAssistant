<template>
  <view class="ha-container">
    <view class="ha-hero">
      <view class="ha-hero__title">自动化与脚本</view>
      <view class="ha-hero__desc">集中管理家庭自动化与快捷脚本，支持搜索、分类和执行记录。</view>
      <view class="ha-stat-grid">
        <view class="ha-stat">
          <text class="ha-stat__label">项目总数</text>
          <text class="ha-stat__value">{{ automationTotal }}</text>
        </view>
        <view class="ha-stat">
          <text class="ha-stat__label">筛选结果</text>
          <text class="ha-stat__value">{{ filteredAutomations.length }}</text>
        </view>
      </view>
    </view>

    <view class="ha-card">
      <view class="ha-section-head">
        <view class="ha-title">自动化中心</view>
        <button class="ha-btn ha-btn--secondary" size="mini" :loading="loading" @click="loadAutomations">
          刷新
        </button>
      </view>

      <input
        v-model="searchKeyword"
        class="ha-input"
        placeholder="搜索自动化名称 / 实体ID"
        confirm-type="search"
      />

      <scroll-view class="ha-chip-scroll" :scroll-x="true" show-scrollbar="false">
        <view class="ha-chip-row">
          <view
            v-for="tab in kindTabs"
            :key="tab.key"
            :class="['ha-chip', { 'ha-chip--active': selectedKind === tab.key }]"
            @click="selectedKind = tab.key"
          >
            {{ tab.label }} ({{ tab.count }})
          </view>
        </view>
      </scroll-view>

      <view class="ha-action-row">
        <button class="ha-btn ha-btn--ghost" size="mini" @click="clearFilters">重置筛选</button>
      </view>

      <view v-if="error" class="ha-error">{{ error }}</view>
      <view v-if="loading" class="ha-empty">正在同步自动化，请稍候...</view>
      <view v-else-if="filteredAutomations.length === 0" class="ha-empty">当前筛选条件下暂无自动化</view>

      <view v-for="item in filteredAutomations" :key="item.entityId" class="ha-item">
        <view class="ha-item__top">
          <view class="ha-item__name">{{ item.name }}</view>
          <view :class="item.stateClass">{{ item.stateLabel }}</view>
        </view>

        <view class="ha-item__meta">{{ item.kindLabel }} · {{ item.entityId }}</view>
        <view class="ha-note">{{ item.lastTriggeredText }}</view>

        <view class="ha-item__bottom">
          <text class="ha-subtle">直接触发一次执行</text>
          <button class="ha-btn ha-btn--primary" size="mini" @click="run(item.entityId)">
            立即执行
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';

import { fetchAutomations, runAutomation } from '../../utils/api';
import { decorateAutomation } from '../../utils/presenters';
import {
  getAutomationRunHistory,
  getSessionToken,
  setAutomationRunHistory
} from '../../utils/storage';

const loading = ref(false);
const error = ref('');
const rawAutomations = ref([]);
const searchKeyword = ref('');
const selectedKind = ref('all');
const historyMap = ref(getAutomationRunHistory());

const kindTabs = computed(() => {
  const counts = rawAutomations.value.reduce(
    (acc, item) => {
      acc[item.kind] = (acc[item.kind] || 0) + 1;
      return acc;
    },
    {}
  );

  return [
    { key: 'all', label: '全部', count: rawAutomations.value.length },
    { key: 'automation', label: '自动化', count: counts.automation || 0 },
    { key: 'script', label: '脚本', count: counts.script || 0 }
  ];
});

const automationTotal = computed(() => rawAutomations.value.length);
const filteredAutomations = computed(() => {
  const keyword = String(searchKeyword.value || '').trim().toLowerCase();

  return rawAutomations.value.filter((item) => {
    if (selectedKind.value !== 'all' && item.kind !== selectedKind.value) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const searchable = `${item.name} ${item.entityId}`.toLowerCase();
    return searchable.includes(keyword);
  });
});

function refreshHistory() {
  historyMap.value = getAutomationRunHistory();
}

function clearFilters() {
  searchKeyword.value = '';
  selectedKind.value = 'all';
}

async function loadAutomations() {
  if (!getSessionToken()) {
    rawAutomations.value = [];
    error.value = '请先在“我的”页面完成登录。';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await fetchAutomations();
    rawAutomations.value = (result.items || []).map((item) => decorateAutomation(item, historyMap.value));
  } catch (loadError) {
    rawAutomations.value = [];
    error.value = loadError.message || '自动化列表加载失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

async function run(entityId) {
  uni.showLoading({
    title: '执行中'
  });

  try {
    const result = await runAutomation(entityId);
    historyMap.value = setAutomationRunHistory({
      ...historyMap.value,
      [entityId]: new Date().toISOString()
    });

    if (result?.item) {
      rawAutomations.value = rawAutomations.value.map((item) =>
        item.entityId === entityId
          ? decorateAutomation(result.item, historyMap.value)
          : decorateAutomation(item, historyMap.value)
      );
    } else {
      rawAutomations.value = rawAutomations.value.map((item) =>
        decorateAutomation(item, historyMap.value)
      );
    }

    uni.showToast({
      title: '执行成功',
      icon: 'success'
    });
  } catch (runError) {
    error.value = runError.message || '自动化执行失败，请稍后重试。';
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
  loadAutomations();
});

onPullDownRefresh(async () => {
  await loadAutomations();
  uni.stopPullDownRefresh();
});
</script>
