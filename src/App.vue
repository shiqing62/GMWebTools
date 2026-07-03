<template>
  <div class="app-container">
    <div v-if="!isLoggedIn" class="login-wrapper">
      <el-card class="login-card" shadow="hover">
        <template #header><h2 style="margin:0; text-align:center;">🎮 GM 控制台登录</h2></template>
        <el-form label-position="top">
          <el-form-item label="管理员账号">
            <el-input v-model="loginForm.username" placeholder="请输入账号" :prefix-icon="User"></el-input>
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password @keyup.enter="handleLogin" :prefix-icon="Lock"></el-input>
          </el-form-item>
          <el-button type="primary" style="width:100%; margin-top:10px;" @click="handleLogin" :loading="loading">登 录</el-button>
        </el-form>
      </el-card>
    </div>

    <template v-else>
      <header class="app-header">
        <div class="app-title">🛠️ GM 工具后台 </div>
        <div class="user-info">
          当前用户: <span style="color:#409EFF; margin-right:15px; font-weight:bold;">{{ currentUser }}</span>
          <el-button type="danger" plain size="small" @click="handleLogout">退出登录</el-button>
        </div>
      </header>

      <div class="app-main">
        <aside class="sidebar">


          <el-card shadow="never" style="position: relative; overflow: hidden;">
            <div v-if="!selectedRoom" class="overlay-mask">请先选择在线房间</div>
            <template #header>👹 生成怪物控制</template>
            <el-form :model="form" label-width="60px" label-position="left" size="small">
              <el-form-item label="Boss ID">
                <el-input-number v-model="form.bossId" :min="1" style="width:100%"></el-input-number>
              </el-form-item>
              <el-form-item label="坐标位置">
                <div style="display:flex; gap:10px; width:100%;">
                  <el-input v-model.number="form.x" placeholder="X">
                    <template #prepend>X</template>
                  </el-input>
                  <el-input v-model.number="form.z" placeholder="Z">
                    <template #prepend>Z</template>
                  </el-input>
                </div>
              </el-form-item>
              <el-button type="primary" style="width:100%; margin-top: 10px;" @click="spawnBoss">立即生成 Boss</el-button>
            </el-form>
          </el-card>

          <el-card shadow="never" style="position: relative; overflow: hidden;">
            <div v-if="!selectedRoom" class="overlay-mask">请先选择在线房间</div>
            <template #header>🎁 生成掉落物控制</template>
            <el-form :model="dropForm" label-width="60px" label-position="left" size="small">
              <el-form-item label="掉落技能">
                <el-select v-model="dropForm.itemId" placeholder="请选择要掉落的技能" style="width: 100%;">
                  <el-option v-for="item in dropItemList" :key="item.id" :label="item.name + ' (' + item.id + ')'" :value="item.id"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="坐标位置">
                <div style="display:flex; gap:10px; width:100%;">
                  <el-input v-model.number="dropForm.x" placeholder="X">
                    <template #prepend>X</template>
                  </el-input>
                  <el-input v-model.number="dropForm.z" placeholder="Z">
                    <template #prepend>Z</template>
                  </el-input>
                </div>
              </el-form-item>
              <el-button type="success" style="width:100%; margin-top: 10px;" @click="spawnDrop" :disabled="!dropForm.itemId">生成掉落物</el-button>
            </el-form>
          </el-card>

          <el-card shadow="never" style="position: relative; overflow: hidden;">
            <div v-if="!selectedRoom" class="overlay-mask">请先选择在线房间</div>
            <template #header>⚙️ 场景监控设置</template>

            <div @click="showMap = !showMap" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; cursor: pointer;">
              <span style="font-size: 14px; color: #67C23A; user-select: none;">🗺️ 显示地形障碍</span>
              <el-switch key="showmap-switch" id="sw-showmap" v-model="showMap" inline-prompt active-text="开" inactive-text="关" style="pointer-events: none;"></el-switch>
            </div>
            <div @click="enablePick = !enablePick" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; cursor: pointer;">
              <span style="font-size: 14px; color: #409EFF; user-select: none;">📍 地图坐标拾取</span>
              <el-switch key="enablepick-switch" id="sw-enablepick" v-model="enablePick" inline-prompt active-text="开" inactive-text="关" style="pointer-events: none;"></el-switch>
            </div>
          </el-card>

          <el-card shadow="never">
            <template #header>⏱️ 全局服务器时间流速控制</template>
            <el-form label-width="60px" label-position="left" size="small">
              <el-form-item label="全局倍率">
                <el-slider 
                  v-model="timeScale" 
                  :min="1" 
                  :max="10" 
                  :step="0.1" 
                  show-input>
                </el-slider>
              </el-form-item>
              <el-button type="warning" style="width:100%; margin-top: 10px;" @click="setTimeScale">应用流速设置</el-button>
            </el-form>
          </el-card>
        </aside>

        <main class="center-content">
          <div style="padding: 15px 20px 0 20px; font-weight: bold; color: #409EFF; font-size: 15px; flex-shrink: 0;">
            当前房间: {{ selectedRoom ? selectedRoom.roomId : '未选择' }}
          </div>
          <div class="map-wrapper" ref="mapWrapperRef">
            <div class="map-container"
                 @click="handleMapClick"
                 ref="mapRef"
                 :style="{ 
                   cursor: enablePick ? 'crosshair' : 'default',
                   width: 512 * renderRatio + 'px',
                   height: 512 * renderRatio + 'px',
                   backgroundSize: 16 * renderRatio + 'px ' + 16 * renderRatio + 'px'
                 }">

              <div style="position:absolute; left:50%; top:0; bottom:0; border-left:1px dashed rgba(255,255,255,0.2); z-index: 1;"></div>
              <div style="position:absolute; top:50%; left:0; right:0; border-top:1px dashed rgba(255,255,255,0.2); z-index: 1;"></div>
              <div style="position:absolute; left:50%; top:50%; width:6px; height:6px; background:#f1c40f; transform:translate(-50%, -50%); border-radius:50%; z-index: 1; box-shadow: 0 0 5px #f1c40f;"></div>

              <div class="obstacles-layer" v-show="showMap" style="position: absolute; width: 100%; height: 100%; left: 0; bottom: 0; pointer-events: none;">
                <div v-for="(obs, idx) in obstacles"
                     :key="'obs-'+idx"
                     class="obstacle"
                     :class="{ 'shape-circle': obs.shape === '0' }"
                     :style="getObstacleStyle(obs)"
                     :title="obs.name">
                </div>
              </div>

              <div v-for="entity in entities"
                   :key="entity.type + '-' + entity.id"
                   :class="entity.type === 'player' ? 'player-dot' : (entity.type === 'boss' ? 'boss-dot' : 'drop-dot')"
                   :style="calcPosition(entity.x, entity.z)">
                <div class="entity-info">
                  {{ entity.type === 'player' ? '🧑‍🚀' : (entity.type === 'boss' ? '👹' : '🎁') }} {{ entity.name }}
                  <div class="hp-bar" v-if="entity.type !== 'drop'">
                    <div class="hp-fill" :style="{width: (entity.hp/entity.maxHp*100) + '%'}"></div>
                  </div>
                </div>
              </div>

              <div v-if="clickEffect.show" class="click-ripple" :style="{ left: clickEffect.x + 'px', bottom: clickEffect.z + 'px' }"></div>
            </div>
          </div>
          
          <el-card shadow="never" class="log-card" body-style="padding: 10px; display:flex; flex-direction:column; flex: 1; overflow:hidden;">
            <template #header>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>📜 控制台日志</span>
                <el-button link type="info" size="small" @click="clearHistory">清空</el-button>
              </div>
            </template>
            <div class="history-panel" ref="historyRef">
              <div v-if="history.length === 0" style="color:#606266; text-align:center; margin-top:10px;">暂无操作记录</div>
              <div v-for="(item, index) in history" :key="index" class="log-item">
                <span class="log-time">{{ item.time }}</span>
                <span class="log-content" :class="{'log-error': item.isError}">{{ item.msg }}</span>
              </div>
            </div>
          </el-card>
        </main>

        <aside class="sidebar right-sidebar">
          <el-card shadow="never">
            <template #header>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>🌐 在线房间列表</span>
                <el-button link type="primary" size="small" @click="fetchRoomList">刷新</el-button>
              </div>
            </template>
            <div v-if="roomList.length === 0" style="text-align: center; color: #909399; font-size: 13px;">暂无在线房间</div>
            <div v-else class="room-list">
              <div v-for="r in roomList" :key="r.roomId" 
                   class="room-item" 
                   :class="{'room-selected': selectedRoom && selectedRoom.roomId === r.roomId}"
                   @click="selectRoom(r)">
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-weight: bold;">房间: {{ r.roomId }}</span>
                  <span style="color: #67C23A; font-size: 12px;">{{ r.curPlayerCount }}/{{ r.maxPlayerCount }} 人</span>
                </div>
                <div style="font-size: 12px; color: #a3a6ad; margin-top: 4px;">
                  场景: {{ r.sceneId }} | 剩余时长: {{ Math.floor(r.timeLeft / 60) }}:{{ (r.timeLeft % 60).toString().padStart(2, '0') }}
                </div>
              </div>
            </div>
          </el-card>

          <el-card shadow="never">
            <template #header>🎯 房间任务状态 {{ selectedRoom ? `(房间 ${selectedRoom.roomId})` : '' }}</template>
            <div v-if="!selectedRoom" style="text-align: center; color: #909399; font-size: 13px; padding: 10px 0;">
              当前未选择在线房间或房间已销毁
            </div>
            <div v-else-if="computedTasks.length === 0" style="text-align: center; color: #909399; font-size: 13px; padding: 10px 0;">
              当前房间无任务数据
            </div>
            <div v-else class="task-list">
              <div v-for="t in computedTasks" :key="t._uniqueKey" class="task-item-card" :class="`task-${t.status}`">
                <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                  <span style="font-weight: bold; font-size: 13px;" :style="{ color: t.status === 'running' ? '#409EFF' : '#c0c4cc' }">任务 {{ t.taskId }}</span>
                  <span class="task-status-badge" :class="`badge-${t.status}`">{{ getStatusLabel(t.status) }}</span>
                </div>
                <div v-if="t.status === 'running'" style="margin-top: 8px;">
                  <el-progress 
                    :percentage="t.targetProgress ? Math.min(100, Math.floor((t.progress / t.targetProgress) * 100)) : 0" 
                    :format="p => t.progress + '/' + t.targetProgress"
                    :stroke-width="10">
                  </el-progress>
                  <div v-if="t.endTimeMs > 0" style="font-size: 11px; color: #E6A23C; margin-top: 4px;">
                    结束倒计时: {{ formatTriggerTime(Math.max(0, t.endTimeMs - getRoomElapsedTime())) }}
                  </div>
                </div>
                <div v-if="t.triggerTimeMs !== undefined" style="font-size: 11px; color: #909399; margin-top: 4px;">
                  开启时间: {{ formatTriggerTime(t.triggerTimeMs) }}
                </div>
              </div>
            </div>
          </el-card>

          <el-card shadow="never">
            <template #header>🌍 地图事件监控</template>
            <div v-if="!selectedRoom" style="text-align: center; color: #909399; font-size: 13px; padding: 10px 0;">
              当前未选择在线房间或房间已销毁
            </div>
            <div v-else-if="!isMapEventSupported" style="text-align: center; color: #909399; font-size: 13px;">
              ⚠️ 当前房间模式不支持地图事件
            </div>
            <div v-else-if="mapEvents.length === 0" style="text-align: center; color: #909399; font-size: 13px;">
              暂无地图事件配置
            </div>
            <div v-else class="event-list">
              <div v-for="ev in mapEvents" :key="ev.mapEventId" class="event-item">
                <div style="flex: 1;">
                  <div style="font-size: 13px; font-weight: bold;">
                    事件 ID: {{ ev.mapEventId }} 
                    <span style="font-size: 11px; color: #a3a6ad;">({{ ev.eventType }})</span>
                  </div>
                  <div v-if="ev.remark" style="font-size: 11px; color: #909399; margin-top: 2px;">{{ ev.remark }}</div>
                </div>
                <el-switch 
                  :id="`sw-event-${ev.mapEventId}`"
                  v-model="ev.active" 
                  @change="(val) => toggleMapEvent(ev, val)"
                  inline-prompt 
                  active-text="开" 
                  inactive-text="关">
                </el-switch>
              </div>
            </div>
          </el-card>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import axios from 'axios';
// 引入 Element Plus 的图标组件
import { User, Lock, Location } from '@element-plus/icons-vue';

// 登录状态
const isLoggedIn = ref(false);
const currentUser = ref('');
const loginForm = ref({ username: '', password: '' });
const loading = ref(false);

// GM 状态
const history = ref([]);
const entities = ref([]);
const historyRef = ref(null);
let timer = null;
let roomListTimer = null;
const form = ref({ bossId: 103, x: 0, z: 0 });

// 掉落表单状态
const dropForm = ref({ itemId: null, x: 0, z: 0 });
const dropItemList = ref([]);

// 时间加速状态
const timeScale = ref(1.0);

// 地图与数据状态
const mapRef = ref(null);
const mapWrapperRef = ref(null);
let resizeObserver = null;
const obstacles = ref([]);
const showMap = ref(false);
const enablePick = ref(false);
const renderRatio = ref(1.0); // 将由 ResizeObserver 动态计算

// 点击特效状态
const clickEffect = ref({ show: false, x: 0, z: 0 });

// 房间与任务事件状态
const roomList = ref([]);
const selectedRoom = ref(null);
const taskData = ref({ timeline: [], currentTask: null, taskResults: [] });
const mapEvents = ref([]);
const isMapEventSupported = ref(false);

const getRoomElapsedTime = () => {
  if (!selectedRoom.value) return 0;
  const r = roomList.value.find(room => room.roomId === selectedRoom.value.roomId);
  return r ? r.elapsedTimeMs : 0;
};

const fetchRoomList = async () => {
  if (!isLoggedIn.value) return;
  try {
    const res = await axios.get('http://localhost:3000/api/gm/rooms');
    if (res.data && res.data.data) {
      roomList.value = res.data.data;
    }
  } catch (err) {
    console.error('获取房间列表失败', err);
  }
};

const selectRoom = (room) => {
  if (selectedRoom.value && selectedRoom.value.roomId === room.roomId) return;
  selectedRoom.value = room;
};

const fetchTaskData = async () => {
  if (!selectedRoom.value) return;
  try {
    const res = await axios.get(`http://localhost:3000/api/gm/room_tasks/${selectedRoom.value.roomId}`);
    if (res.data && res.data.data) {
      taskData.value = res.data.data;
    }
  } catch (err) {
    console.error('获取任务数据失败', err);
  }
};

const computedTasks = computed(() => {
  if (!taskData.value) return [];
  const { timeline, currentTask, taskResults } = taskData.value;
  
  // 以 timeline 顺序为基准，克隆一份列表
  const list = (timeline || []).map((t, index) => ({ 
    ...t, 
    status: 'pending',
    _uniqueKey: `${t.taskId}_${index}` // 生成唯一 key 用于 Vue 渲染
  }));
  
  const resultsQueue = [...(taskResults || [])];
  let currentTaskMatched = false;

  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    
    // 如果有已完成的结果，按顺序消耗
    const resultIndex = resultsQueue.findIndex(r => String(r.taskId) === String(t.taskId));
    if (resultIndex !== -1) {
      const r = resultsQueue.splice(resultIndex, 1)[0];
      t.status = (r.state === 2) ? 'success' : 'failed';
      continue;
    }
    
    // 如果还没匹配当前正在执行的任务
    if (currentTask && !currentTaskMatched && String(currentTask.taskId) === String(t.taskId)) {
      t.status = 'running';
      t.progress = currentTask.progress || 0;
      t.targetProgress = currentTask.targetProgress || 1;
      t.endTimeMs = currentTask.endTimeMs || 0;
      currentTaskMatched = true;
      continue;
    }
  }

  return list;
});

const formatTriggerTime = (ms) => {
  if (ms === undefined || ms === null) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getStatusLabel = (status) => {
  const map = { pending: '⏳ 待触发', running: '🔥 进行中', success: '✅ 已完成', failed: '❌ 已失败' };
  return map[status] || '未知';
};

const getTaskResultColor = (taskId) => {
  const result = taskData.value.taskResults.find(r => r.taskId === taskId);
  if (!result) {
    if (taskData.value.currentTask && taskData.value.currentTask.taskId === taskId) return '#409EFF'; 
    return '#909399'; 
  }
  if (result.state === 2) return '#67C23A'; // completed
  if (result.state === 3) return '#F56C6C'; // failed
  return '#909399';
};

const fetchMapEvents = async () => {
  if (!selectedRoom.value) return;
  try {
    const res = await axios.get(`http://localhost:3000/api/gm/room_map_events/${selectedRoom.value.roomId}`);
    if (res.data) {
      isMapEventSupported.value = res.data.support;
      mapEvents.value = res.data.data || [];
    }
  } catch (err) {
    console.error('获取地图事件失败', err);
  }
};

const toggleMapEvent = async (ev, enable) => {
  if (!selectedRoom.value) return;
  try {
    const res = await axios.post('http://localhost:3000/api/gm/room_map_events/toggle', {
      roomId: selectedRoom.value.roomId,
      mapEventId: ev.mapEventId,
      enable: enable
    });
    addLog(`${enable ? '开启' : '关闭'}地图事件 ${ev.mapEventId} 成功`);
  } catch (err) {
    addLog(`${enable ? '开启' : '关闭'}事件失败`, true);
    ev.active = !enable; // revert
  }
};

watch(selectedRoom, (newRoom) => {
  if (timer) { clearInterval(timer); timer = null; }
  if (!newRoom) {
    entities.value.splice(0, entities.value.length);
    taskData.value = { timeline: [], currentTask: null, taskResults: [] };
    mapEvents.value = [];
    if (isLoggedIn.value) addLog(`停止房间监控`);
  } else {
    addLog(`开启监控房间: ${newRoom.roomId}`);
    fetchSceneData();
    fetchTaskData();
    fetchMapEvents();
    
    timer = setInterval(() => {
      fetchSceneData();
      if (selectedRoom.value) {
        fetchTaskData();
        fetchMapEvents();
      }
    }, 1000);
  }
});

// 时间格式化
const getFormattedTime = () => {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const sec = now.getSeconds().toString().padStart(2, '0');
  return `[${h}:${min}:${sec}]`;
};

const addLog = (message, isError = false) => {
  const timeStr = getFormattedTime();
  history.value.unshift({ time: timeStr, msg: message, isError: isError });
  if (currentUser.value) {
    localStorage.setItem(`gm_history_${currentUser.value}`, JSON.stringify(history.value));
  }
};

const loadMapData = async () => {
  try {
    const res = await axios.get('http://localhost:3000/mapdata/MultiPlayerMapData.json');
    let allObstacles = [];
    if (res.data && res.data.chunks) {
      res.data.chunks.forEach(chunk => {
        if (chunk.obstacles) allObstacles.push(...chunk.obstacles);
      });
    }
    obstacles.value = allObstacles;
  } catch (err) {
    console.error("加载地图障碍物数据失败:", err);
  }
};

onMounted(() => {
  loadMapData();
  const token = localStorage.getItem('gm_token');
  const user = localStorage.getItem('gm_user');
  if (token && user) {
    currentUser.value = user;
    isLoggedIn.value = true;
    setAuthHeader(token);
    loadHistory(user);
    fetchDropItems();
    fetchRoomList();
    roomListTimer = setInterval(fetchRoomList, 1000);
  }

  if (mapWrapperRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const minSize = Math.min(width, height);
        // 留出一点安全边距防止浮动误差导致滚动条
        renderRatio.value = Math.max(0.5, (minSize - 4) / 512); 
      }
    });
    resizeObserver.observe(mapWrapperRef.value);
  }
});

const loadHistory = (username) => {
  const saved = localStorage.getItem(`gm_history_${username}`);
  if (saved) {
    try { history.value = JSON.parse(saved); } catch(e) { history.value = []; }
  } else { history.value = []; }
};

const clearHistory = () => {
  history.value = [];
  if (currentUser.value) localStorage.removeItem(`gm_history_${currentUser.value}`);
};

const setAuthHeader = (token) => {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete axios.defaults.headers.common['Authorization'];
};

const fetchDropItems = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/gm/drop_items');
    if (res.data.code === 200) {
      dropItemList.value = res.data.data;
    }
  } catch (err) {
    console.error("加载掉落物配置失败");
  }
};

const handleLogin = async () => {
  if(!loginForm.value.username || !loginForm.value.password) return;
  loading.value = true;
  try {
    const res = await axios.post('http://localhost:3000/api/login', loginForm.value);
    if (res.data.code === 200) {
      const token = res.data.token;
      currentUser.value = loginForm.value.username;
      localStorage.setItem('gm_token', token);
      localStorage.setItem('gm_user', currentUser.value);
      setAuthHeader(token);
      loadHistory(currentUser.value);
      isLoggedIn.value = true;
      addLog(`登录成功，欢迎回来！`);
      fetchDropItems(); // 登录成功后获取掉落物列表
      fetchRoomList();
      if (roomListTimer) clearInterval(roomListTimer);
      roomListTimer = setInterval(fetchRoomList, 1000);
    }
  } catch (err) {
    alert('登录失败: ' + (err.response?.data?.message || err.message));
  } finally {
    loading.value = false;
  }
};

const handleLogout = () => {
  if (timer) { clearInterval(timer); timer = null; }
  if (roomListTimer) { clearInterval(roomListTimer); roomListTimer = null; }
  addLog(`退出登录`);
  setTimeout(() => {
    localStorage.removeItem('gm_token');
    localStorage.removeItem('gm_user');
    setAuthHeader(null);
    isLoggedIn.value = false;
    currentUser.value = '';
    history.value = [];
    selectedRoom.value = null;
  }, 100);
};

const handleMapClick = (event) => {
  if (!enablePick.value || !mapRef.value) return;

  const rect = mapRef.value.getBoundingClientRect();
  const clickPixelX = event.clientX - rect.left;
  const clickPixelY = event.clientY - rect.top;

  const clickPixelZ = rect.height - clickPixelY;

  const gameX = Math.round(clickPixelX / renderRatio.value);
  const gameZ = Math.round(clickPixelZ / renderRatio.value);

  form.value.x = gameX;
  form.value.z = gameZ;
  dropForm.value.x = gameX;
  dropForm.value.z = gameZ;

  clickEffect.value = { show: false, x: clickPixelX, z: clickPixelZ };
  nextTick(() => { clickEffect.value.show = true; });

  addLog(`📍 拾取坐标: X=${gameX}, Z=${gameZ}`);
};

const spawnDrop = async () => {
  if (!selectedRoom.value) return;
  try {
    addLog(`正在生成技能掉落 [ID: ${dropForm.value.itemId}] @ (${dropForm.value.x}, ${dropForm.value.z})...`);
    await axios.post('http://localhost:3000/api/gm/spawn_drop', { ...dropForm.value, roomId: selectedRoom.value.roomId, y: 0 });
    addLog(`✅ 掉落物生成成功！`);
    fetchSceneData();
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    addLog(`❌ 生成失败: ${msg}`, true);
  }
};

const calcPosition = (gameX, gameZ) => {
  return { 
    left: `${gameX * renderRatio.value}px`, 
    bottom: `${gameZ * renderRatio.value}px` 
  };
};

const getObstacleStyle = (obs) => {
  let style = {
    left: `${obs.position.x * renderRatio.value}px`,
    bottom: `${obs.position.z * renderRatio.value}px`,
    transform: `translate(-50%, 50%) rotate(${obs.rotationY || 0}deg)`,
  };

  const MIN_SIZE = 4;

  if (obs.shape === "0") {
    const radius = (obs.radius || 1) * renderRatio.value;
    style.width = `${Math.max(radius * 2, MIN_SIZE)}px`;
    style.height = `${Math.max(radius * 2, MIN_SIZE)}px`;
  } else {
    const w = (obs.size?.x || 2) * renderRatio.value;
    const h = (obs.size?.z || 2) * renderRatio.value;
    style.width = `${Math.max(w, MIN_SIZE)}px`;
    style.height = `${Math.max(h, MIN_SIZE)}px`;
  }
  return style;
};

const spawnBoss = async () => {
  if (!selectedRoom.value) return;
  try {
    addLog(`正在生成 Boss [${form.value.bossId}] @ (${form.value.x}, ${form.value.z})...`);
    await axios.post('http://localhost:3000/api/gm/spawn_boss', { ...form.value, roomId: selectedRoom.value.roomId, y: 0 });
    addLog(`✅ 生成成功！`);
    fetchSceneData();
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    addLog(`❌ 生成失败: ${msg}`, true);
  }
};

const fetchSceneData = async () => {
  if (!selectedRoom.value) return;
  try {
    const res = await axios.get(`http://localhost:3000/api/gm/scene/${selectedRoom.value.roomId}`);
    if (res.data.entities) entities.value = res.data.entities;
  } catch (err) {
    // 忽略轮询网络错误
  }
};

const setTimeScale = async () => {
  try {
    addLog(`正在将全局服务器时间流速设置为: ${timeScale.value}x ...`);
    await axios.post('http://localhost:3000/api/gm/set_time_scale', { 
      scale: timeScale.value 
    });
    addLog(`✅ 全局时间流速 (${timeScale.value}x) 设置成功！`);
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    addLog(`❌ 设置时间流速失败: ${msg}`, true);
  }
};



onUnmounted(() => { 
  if (timer) clearInterval(timer); 
  if (roomListTimer) clearInterval(roomListTimer);
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

<style>
/* 全局样式，原本在 body, html 上的样式 */
body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: #141414;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  overflow: hidden;
}
</style>

<style scoped>
/* 组件私有样式 */
.app-container { height: 100vh; display: flex; flex-direction: column; }

/* 顶部导航 */
.app-header { height: 60px; background-color: #1d1e1f; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; flex-shrink: 0; }
.app-title { font-size: 18px; font-weight: bold; color: #e5eaf3; display: flex; align-items: center; gap: 10px; }
.user-info { font-size: 14px; color: #a3a6ad; }

/* 登录框 */
.login-wrapper { height: 100vh; display: flex; justify-content: center; align-items: center; background: #141414; }
.login-card { width: 380px; }

/* 主体布局 */
.app-main { display: flex; flex: 1; overflow: hidden; }

/* 左侧/右侧 控制面板 */
.sidebar { width: 350px; background-color: #1a1a1a; border-right: 1px solid #333; padding: 10px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; flex-shrink: 0; }
.sidebar > * { flex-shrink: 0; }
.right-sidebar { border-left: 1px solid #333; border-right: none; }
:deep(.sidebar .el-card__header) { padding: 8px 12px; font-weight: bold; font-size: 13px; }
:deep(.sidebar .el-card__body) { padding: 10px; overflow: hidden; }

/* 中间主区域 */
.center-content { flex: 1; background-color: #0d0d0d; display: flex; flex-direction: column; overflow: hidden; }

/* 地图包裹区域 */
.map-wrapper { flex: 1; display: flex; justify-content: center; align-items: center; overflow: hidden; padding: 20px; }

/* 地图样式 */
.map-container {
  position: relative;
  background-color: #2c3e50;
  border: 2px solid #4c4d4f;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.5);
  overflow: hidden;
  background-image: linear-gradient(#34495e 1px, transparent 1px), linear-gradient(90deg, #34495e 1px, transparent 1px);
  flex-shrink: 0;
  transition: cursor 0.2s, width 0.3s, height 0.3s;
}

.log-card {
  width: 100%;
  height: 200px;
  flex-shrink: 0;
  background-color: #1a1a1a;
  border-radius: 0;
  border-top: 1px solid #333;
  border-left: none;
  border-right: none;
  border-bottom: none;
}
:deep(.log-card .el-card__header) { padding: 8px 15px; font-weight: bold; font-size: 13px; }

/* 障碍物及实体样式 */
.obstacle { position: absolute; background-color: rgba(241, 196, 15, 0.3); border: 1px solid rgba(243, 156, 18, 0.6); pointer-events: none; box-sizing: border-box; z-index: 10; transition: opacity 0.3s; }
.shape-circle { border-radius: 50%; background-color: rgba(52, 152, 219, 0.3); border-color: rgba(41, 128, 185, 0.6); }

/* 实体样式 */
.boss-dot { position: absolute; width: 16px; height: 16px; background-color: #e74c3c; border: 2px solid #fff; border-radius: 50%; transform: translate(-50%, 50%); transition: left 0.3s ease, bottom 0.3s ease; box-shadow: 0 0 10px #e74c3c; z-index: 20; }
.player-dot { position: absolute; width: 14px; height: 14px; background-color: #3498db; border: 2px solid #fff; border-radius: 50%; transform: translate(-50%, 50%); transition: left 0.3s ease, bottom 0.3s ease; box-shadow: 0 0 10px #3498db; z-index: 21; }
.drop-dot { position: absolute; width: 12px; height: 12px; background-color: #2ecc71; border: 2px solid #fff; border-radius: 50%; transform: translate(-50%, 50%); transition: left 0.3s ease, bottom 0.3s ease; box-shadow: 0 0 10px #2ecc71; z-index: 15; }

/* 恢复的新模块样式 */
.room-list { display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; }
.room-item { background: #2b2b2b; border: 1px solid #333; padding: 10px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.room-item:hover { border-color: #409EFF; }
.room-selected { border-color: #67C23A; background: rgba(103,194,58,0.1); }

/* 任务列表样式 */
.task-list { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; }
.task-item-card { background: #242424; border: 1px solid #333; padding: 10px; border-radius: 4px; }
.task-running { border-color: #409EFF; background: rgba(64,158,255,0.05); }
.task-success { border-color: #67C23A; }
.task-failed { border-color: #F56C6C; }
.task-status-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; }
.badge-pending { color: #E6A23C; background: rgba(230,162,60,0.1); }
.badge-running { color: #409EFF; background: rgba(64,158,255,0.1); }
.badge-success { color: #67C23A; background: rgba(103,194,58,0.1); }
.badge-failed { color: #F56C6C; background: rgba(245,108,108,0.1); }

/* 事件列表样式 */
.event-list { display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; }
.event-item { background: #2b2b2b; border: 1px solid #333; padding: 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }

/* 实体信息浮窗 */
.entity-info { position: absolute; top: -38px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(0,0,0,0.85); padding: 4px 8px; border-radius: 4px; font-size: 12px; z-index: 30; pointer-events: none; color: #fff; border: 1px solid #555;}
.hp-bar { width: 100%; height: 4px; background: #333; margin-top: 4px; border-radius: 2px; overflow: hidden; }
.hp-fill { height: 100%; background: #2ecc71; transition: width 0.3s ease; }

/* 日志区域 */
.history-panel { background: #141414; border-radius: 4px; padding: 10px; flex: 1; overflow-y: auto; font-family: 'Consolas', monospace; font-size: 12px; border: 1px solid #333; }
.log-item { margin-bottom: 6px; line-height: 1.4; }
.log-time { color: #909399; margin-right: 8px; font-size: 11px; }
.log-content { color: #c0c4cc; }
.log-error { color: #F56C6C; }

.overlay-mask {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(30, 30, 30, 0.7);
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #E6A23C;
  font-size: 14px;
  font-weight: bold;
  backdrop-filter: blur(2px);
}

/* 坐标点击提示效果 */
.click-ripple { position: absolute; width: 20px; height: 20px; border: 2px solid #2ecc71; border-radius: 50%; transform: translate(-50%, 50%); animation: ripple 0.6s linear forwards; pointer-events: none; z-index: 99; }
@keyframes ripple { 0% { width: 0; height: 0; opacity: 1; } 100% { width: 40px; height: 40px; opacity: 0; } }
</style>