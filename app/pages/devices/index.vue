<template>
  <view class="ha-container">
    <view class="ha-hero">
      <view class="ha-hero__title">家庭设备面板</view>
      <view class="ha-hero__desc">一套客户端代码，覆盖移动端与小程序入口。</view>
      <view class="ha-stat-grid">
        <view class="ha-stat">
          <text class="ha-stat__label">设备总数</text>
          <text class="ha-stat__value">{{ deviceTotal }}</text>
        </view>
        <view class="ha-stat">
          <text class="ha-stat__label">在线设备</text>
          <text class="ha-stat__value">{{ onlineTotal }}</text>
        </view>
      </view>
      <view class="ha-stat-grid">
        <view class="ha-stat">
          <text class="ha-stat__label">可控设备</text>
          <text class="ha-stat__value">{{ controllableTotal }}</text>
        </view>
        <view class="ha-stat">
          <text class="ha-stat__label">筛选结果</text>
          <text class="ha-stat__value">{{ filteredTotal }}</text>
        </view>
      </view>
    </view>

    <view class="ha-card">
      <view class="ha-section-head">
        <view class="ha-title">设备筛选</view>
        <button class="ha-btn ha-btn--secondary" size="mini" :loading="loading" @click="loadDevices">
          刷新
        </button>
      </view>

      <input
        v-model="searchKeyword"
        class="ha-input"
        placeholder="搜索设备名称 / 实体ID"
        confirm-type="search"
      />

      <scroll-view class="ha-chip-scroll" :scroll-x="true" show-scrollbar="false">
        <view class="ha-chip-row">
          <view
            v-for="tab in domainTabs"
            :key="tab.key"
            :class="['ha-chip', { 'ha-chip--active': selectedDomain === tab.key }]"
            @click="selectedDomain = tab.key"
          >
            {{ tab.label }} ({{ tab.count }})
          </view>
        </view>
      </scroll-view>

      <view class="ha-switch-row">
        <view class="ha-switch-item">
          <text class="ha-subtle">仅看在线</text>
          <switch color="#1459d9" :checked="onlyOnline" @change="onlyOnline = $event.detail.value" />
        </view>
        <view class="ha-switch-item">
          <text class="ha-subtle">仅看收藏</text>
          <switch color="#1459d9" :checked="onlyFavorites" @change="onlyFavorites = $event.detail.value" />
        </view>
      </view>

      <view class="ha-action-row">
        <button class="ha-btn ha-btn--ghost" size="mini" @click="clearFilters">重置筛选</button>
      </view>

      <view v-if="error" class="ha-error">{{ error }}</view>
      <view v-if="loading" class="ha-empty">正在加载设备，请稍候...</view>
      <view v-else-if="filteredDevices.length === 0" class="ha-empty">当前筛选条件下暂无设备</view>

      <view v-for="item in filteredDevices" :key="item.entityId" class="ha-item">
        <view class="ha-item__top">
          <view class="ha-item__name">{{ item.name }}</view>
          <view :class="item.availabilityClass">{{ item.availabilityText }}</view>
        </view>

        <view class="ha-item__meta">{{ item.domainLabel }} · {{ item.entityId }}</view>

        <view class="ha-item__bottom">
          <view>
            <text class="ha-subtle">状态</text>
            <text :class="item.stateClass" style="margin-left: 12rpx;">{{ item.stateLabel }}</text>
          </view>
          <button class="ha-btn ha-btn--ghost" size="mini" @click="toggleFavorite(item.entityId)">
            {{ item.isFavorite ? '已收藏' : '收藏' }}
          </button>
        </view>

        <view v-if="item.controllable" class="ha-item__actions">
          <button class="ha-btn ha-btn--primary" size="mini" @click="handleDeviceAction(item.entityId, 'turn_on')">
            开启
          </button>
          <button class="ha-btn ha-btn--danger" size="mini" @click="handleDeviceAction(item.entityId, 'turn_off')">
            关闭
          </button>
          <button class="ha-btn ha-btn--secondary" size="mini" @click="handleDeviceAction(item.entityId, 'toggle')">
            切换
          </button>
        </view>
        <view v-else class="ha-note">当前设备仅支持查看状态</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';

import { fetchDevices, setDeviceState } from '../../utils/api';
import { buildDomainTabs, decorateDevice } from '../../utils/presenters';
import {
  getFavoriteDeviceIds,
  getSessionToken,
  setFavoriteDeviceIds
} from '../../utils/storage';

const loading = ref(false);
const error = ref('');
const rawDevices = ref([]);
const searchKeyword = ref('');
const selectedDomain = ref('all');
const onlyOnline = ref(false);
const onlyFavorites = ref(false);
const favoriteIds = ref(getFavoriteDeviceIds());

const domainTabs = computed(() => buildDomainTabs(rawDevices.value));
const deviceTotal = computed(() => rawDevices.value.length);
const onlineTotal = computed(() => rawDevices.value.filter((item) => item.available).length);
const controllableTotal = computed(() => rawDevices.value.filter((item) => item.controllable).length);

const filteredDevices = computed(() => {
  const keyword = String(searchKeyword.value || '').trim().toLowerCase();
  const favoriteSet = new Set(favoriteIds.value);

  return rawDevices.value
    .filter((item) => {
      if (selectedDomain.value !== 'all' && item.domain !== selectedDomain.value) {
        return false;
      }
      if (onlyOnline.value && !item.available) {
        return false;
      }
      if (onlyFavorites.value && !favoriteSet.has(item.entityId)) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      const searchable = `${item.name} ${item.entityId} ${item.domainLabel}`.toLowerCase();
      return searchable.includes(keyword);
    })
    .map((item) => ({
      ...item,
      isFavorite: favoriteSet.has(item.entityId)
    }));
});

const filteredTotal = computed(() => filteredDevices.value.length);

function clearFilters() {
  searchKeyword.value = '';
  selectedDomain.value = 'all';
  onlyOnline.value = false;
  onlyFavorites.value = false;
}

function refreshFavorites() {
  favoriteIds.value = getFavoriteDeviceIds();
}

function toggleFavorite(entityId) {
  const set = new Set(favoriteIds.value);
  if (set.has(entityId)) {
    set.delete(entityId);
  } else {
    set.add(entityId);
  }
  favoriteIds.value = setFavoriteDeviceIds(Array.from(set));
}

async function loadDevices() {
  if (!getSessionToken()) {
    rawDevices.value = [];
    error.value = '请先在“我的”页面完成登录。';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await fetchDevices();
    rawDevices.value = (result.items || []).map((item) => decorateDevice(item));
  } catch (loadError) {
    rawDevices.value = [];
    error.value = loadError.message || '设备列表加载失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

async function handleDeviceAction(entityId, action) {
  const actionLabels = {
    turn_on: '开启',
    turn_off: '关闭',
    toggle: '切换'
  };

  uni.showLoading({
    title: `${actionLabels[action] || '操作'}中`
  });

  try {
    const result = await setDeviceState(entityId, action);
    if (result?.device) {
      rawDevices.value = rawDevices.value.map((item) =>
        item.entityId === entityId ? decorateDevice(result.device) : item
      );
    } else {
      await loadDevices();
    }

    uni.showToast({
      title: '操作成功',
      icon: 'success'
    });
  } catch (actionError) {
    error.value = actionError.message || '设备控制失败，请稍后重试。';
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
}

onShow(() => {
  refreshFavorites();
  loadDevices();
});

onPullDownRefresh(async () => {
  await loadDevices();
  uni.stopPullDownRefresh();
});
</script>
