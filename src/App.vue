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
        <div class="app-title">🛠️ MMORPG Server 控制中心</div>
        <div class="user-info">
          当前用户: <span style="color:#409EFF; margin-right:15px; font-weight:bold;">{{ currentUser }}</span>
          <el-button type="danger" plain size="small" @click="handleLogout">退出登录</el-button>
        </div>
      </header>

      <div class="app-main">
        <aside class="sidebar">
          <el-card shadow="never">
            <template #header>👹 生成怪物控制</template>
            <el-form :model="form" label-width="70px" label-position="left" size="default">
              <el-form-item label="场景 ID">
                <el-input v-model="form.sceneId"></el-input>
              </el-form-item>
              <el-form-item label="Boss ID">
                <el-input-number v-model="form.bossId" :min="1" style="width:100%"></el-input-number>
              </el-form-item>
              <el-form-item label="坐标位置">
                <div style="display:flex; gap:10px; width:100%;">
                  <el-input v-model.number="form.x" placeholder="X" :prefix-icon="Location">
                    <template #prepend>X</template>
                  </el-input>
                  <el-input v-model.number="form.z" placeholder="Z">
                    <template #prepend>Z</template>
                  </el-input>
                </div>
                <div v-if="enablePick" style="font-size: 12px; color: #67C23A; margin-top: 5px;">✅ 坐标拾取已开启，可在地图点击获取</div>
                <div v-else style="font-size: 12px; color: #909399; margin-top: 5px;">❌ 坐标拾取已关闭</div>
              </el-form-item>
              <el-button type="primary" style="width:100%; margin-top: 10px;" @click="spawnBoss">立即生成 Boss</el-button>
            </el-form>
          </el-card>

          <el-card shadow="never">
            <template #header>🎁 生成掉落物控制</template>
            <el-form :model="dropForm" label-width="70px" label-position="left" size="default">
              <el-form-item label="掉落技能">
                <el-select v-model="dropForm.itemId" placeholder="请选择要掉落的技能" style="width: 100%;">
                  <el-option v-for="item in dropItemList" :key="item.id" :label="item.name + ' (' + item.id + ')'" :value="item.id"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="坐标位置">
                <div style="display:flex; gap:10px; width:100%;">
                  <el-input v-model.number="dropForm.x" placeholder="X" :prefix-icon="Location">
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

          <el-card shadow="never">
            <template #header>⏱️ 服务器时间流速控制</template>
            <el-form label-width="70px" label-position="left" size="default">
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

          <el-card shadow="never">
            <template #header>⚙️ 场景监控设置</template>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
              <span style="font-size: 14px; color: #E6A23C;">📡 实时数据同步</span>
              <el-switch v-model="polling" inline-prompt active-text="开" inactive-text="关"></el-switch>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
              <span style="font-size: 14px; color: #67C23A;">🗺️ 显示地形障碍</span>
              <el-switch v-model="showMap" inline-prompt active-text="开" inactive-text="关"></el-switch>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size: 14px; color: #409EFF;">📍 地图坐标拾取</span>
              <el-switch v-model="enablePick" inline-prompt active-text="开" inactive-text="关"></el-switch>
            </div>
          </el-card>

          <el-card shadow="never" style="flex: 1; display: flex; flex-direction: column;" body-style="flex:1; padding: 10px; display:flex; flex-direction:column; overflow:hidden;">
            <template #header>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>📜 控制台日志</span>
                <el-button link type="info" size="small" @click="clearHistory">清空</el-button>
              </div>
            </template>
            <div class="history-panel" ref="historyRef">
              <div v-if="history.length === 0" style="color:#606266; text-align:center; margin-top:20px;">暂无操作记录</div>
              <div v-for="(item, index) in history" :key="index" class="log-item">
                <span class="log-time">{{ item.time }}</span>
                <span class="log-content" :class="{'log-error': item.isError}">{{ item.msg }}</span>
              </div>
            </div>
          </el-card>
        </aside>

        <main class="map-viewport">
          <div class="map-container"
               @click="handleMapClick"
               ref="mapRef"
               :style="{ cursor: enablePick ? 'crosshair' : 'default' }">

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
        </main>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
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
const polling = ref(false);
const historyRef = ref(null);
let timer = null;
const form = ref({ sceneId: '101', bossId: 103, x: 0, z: 0 });

// 掉落表单状态
const dropForm = ref({ itemId: null, x: 0, z: 0 });
const dropItemList = ref([]);

// 时间加速状态
const timeScale = ref(1.0);

// 地图与数据状态
const mapRef = ref(null);
const obstacles = ref([]);
const showMap = ref(true);
const enablePick = ref(true);
const renderRatio = 2;

// 点击特效状态
const clickEffect = ref({ show: false, x: 0, z: 0 });

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
    }
  } catch (err) {
    alert('登录失败: ' + (err.response?.data?.message || err.message));
  } finally {
    loading.value = false;
  }
};

const handleLogout = () => {
  polling.value = false;
  addLog(`退出登录`);
  setTimeout(() => {
    localStorage.removeItem('gm_token');
    localStorage.removeItem('gm_user');
    setAuthHeader(null);
    isLoggedIn.value = false;
    currentUser.value = '';
    history.value = [];
  }, 100);
};

const handleMapClick = (event) => {
  if (!enablePick.value || !mapRef.value) return;

  const rect = mapRef.value.getBoundingClientRect();
  const clickPixelX = event.clientX - rect.left;
  const clickPixelY = event.clientY - rect.top;

  const containerHeight = 1024;
  const clickPixelZ = containerHeight - clickPixelY;

  const gameX = Math.round(clickPixelX / renderRatio);
  const gameZ = Math.round(clickPixelZ / renderRatio);

  form.value.x = gameX;
  form.value.z = gameZ;
  dropForm.value.x = gameX;
  dropForm.value.z = gameZ;

  clickEffect.value = { show: false, x: clickPixelX, z: clickPixelZ };
  nextTick(() => { clickEffect.value.show = true; });

  addLog(`📍 拾取坐标: X=${gameX}, Z=${gameZ}`);
};

const spawnDrop = async () => {
  try {
    addLog(`正在生成技能掉落 [ID: ${dropForm.value.itemId}] @ (${dropForm.value.x}, ${dropForm.value.z})...`);
    await axios.post('http://localhost:3000/api/gm/spawn_drop', { ...dropForm.value, y: 0 });
    addLog(`✅ 掉落物生成成功！`);
    fetchSceneData();
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    addLog(`❌ 生成失败: ${msg}`, true);
  }
};

const calcPosition = (gameX, gameZ) => {
  return { left: `${gameX * renderRatio}px`, bottom: `${gameZ * renderRatio}px` };
};

const getObstacleStyle = (obs) => {
  let style = {
    left: `${obs.position.x * renderRatio}px`,
    bottom: `${obs.position.z * renderRatio}px`,
    transform: `translate(-50%, 50%) rotate(${obs.rotationY || 0}deg)`,
  };

  const MIN_SIZE = 4;

  if (obs.shape === "0") {
    const radius = (obs.radius || 1) * renderRatio;
    style.width = `${Math.max(radius * 2, MIN_SIZE)}px`;
    style.height = `${Math.max(radius * 2, MIN_SIZE)}px`;
  } else {
    const sizeX = (obs.size?.x || 1) * renderRatio;
    const sizeZ = (obs.size?.z || 1) * renderRatio;
    style.width = `${Math.max(sizeX, MIN_SIZE)}px`;
    style.height = `${Math.max(sizeZ, MIN_SIZE)}px`;
  }

  return style;
};

const spawnBoss = async () => {
  try {
    addLog(`正在生成 Boss [${form.value.bossId}] @ (${form.value.x}, ${form.value.z})...`);
    await axios.post('http://localhost:3000/api/gm/spawn_boss', { ...form.value, y: 0 });
    addLog(`✅ 生成成功！`);
    fetchSceneData();
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    addLog(`❌ 生成失败: ${msg}`, true);
  }
};

const fetchSceneData = async () => {
  try {
    const res = await axios.get(`http://localhost:3000/api/gm/scene/${form.value.sceneId}`);
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

watch(polling, (newVal) => {
  if (newVal) {
    addLog(`开启实时监控 (场景: ${form.value.sceneId})`);
    fetchSceneData();
    timer = setInterval(fetchSceneData, 1000);
  } else {
    if (isLoggedIn.value) addLog(`关闭实时监控`);
    if (timer) { clearInterval(timer); timer = null; }
  }
});

onUnmounted(() => { if (timer) clearInterval(timer); });
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

/* 左侧控制面板 */
.sidebar { width: 340px; background-color: #1a1a1a; border-right: 1px solid #333; padding: 15px; display: flex; flex-direction: column; gap: 15px; overflow-y: auto; flex-shrink: 0; }
:deep(.sidebar .el-card__header) { padding: 10px 15px; font-weight: bold; font-size: 14px; }
:deep(.sidebar .el-card__body) { padding: 15px; }

/* 右侧地图区域 */
.map-viewport { flex: 1; background-color: #0d0d0d; display: flex; justify-content: center; align-items: center; overflow: auto; padding: 20px; }

/* 地图样式 */
.map-container {
  position: relative;
  width: 1024px;
  height: 1024px;
  background-color: #2c3e50;
  border: 2px solid #4c4d4f;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.5);
  overflow: hidden;
  background-image: linear-gradient(#34495e 1px, transparent 1px), linear-gradient(90deg, #34495e 1px, transparent 1px);
  background-size: 32px 32px;
  flex-shrink: 0;
  transition: cursor 0.2s;
}

/* 障碍物及实体样式 */
.obstacle { position: absolute; background-color: rgba(241, 196, 15, 0.3); border: 1px solid rgba(243, 156, 18, 0.6); pointer-events: none; box-sizing: border-box; z-index: 10; transition: opacity 0.3s; }
.shape-circle { border-radius: 50%; background-color: rgba(52, 152, 219, 0.3); border-color: rgba(41, 128, 185, 0.6); }

/* 实体样式 */
.boss-dot { position: absolute; width: 16px; height: 16px; background-color: #e74c3c; border: 2px solid #fff; border-radius: 50%; transform: translate(-50%, 50%); transition: left 0.3s ease, bottom 0.3s ease; box-shadow: 0 0 10px #e74c3c; z-index: 20; }
.player-dot { position: absolute; width: 14px; height: 14px; background-color: #3498db; border: 2px solid #fff; border-radius: 50%; transform: translate(-50%, 50%); transition: left 0.3s ease, bottom 0.3s ease; box-shadow: 0 0 10px #3498db; z-index: 21; }
.drop-dot { position: absolute; width: 12px; height: 12px; background-color: #2ecc71; border: 2px solid #fff; border-radius: 50%; transform: translate(-50%, 50%); transition: left 0.3s ease, bottom 0.3s ease; box-shadow: 0 0 10px #2ecc71; z-index: 15; }

/* 实体信息浮窗 */
.entity-info { position: absolute; top: -38px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(0,0,0,0.85); padding: 4px 8px; border-radius: 4px; font-size: 12px; z-index: 30; pointer-events: none; color: #fff; border: 1px solid #555;}
.hp-bar { width: 100%; height: 4px; background: #333; margin-top: 4px; border-radius: 2px; overflow: hidden; }
.hp-fill { height: 100%; background: #2ecc71; transition: width 0.3s ease; }

/* 日志区域 */
.history-panel { background: #141414; border-radius: 4px; padding: 10px; height: 250px; overflow-y: auto; font-family: 'Consolas', monospace; font-size: 12px; border: 1px solid #333; }
.log-item { margin-bottom: 6px; line-height: 1.4; }
.log-time { color: #909399; margin-right: 8px; font-size: 11px; }
.log-content { color: #c0c4cc; }
.log-error { color: #f56c6c; }

/* 坐标点击提示效果 */
.click-ripple { position: absolute; width: 20px; height: 20px; border: 2px solid #2ecc71; border-radius: 50%; transform: translate(-50%, 50%); animation: ripple 0.6s linear forwards; pointer-events: none; z-index: 99; }
@keyframes ripple { 0% { width: 0; height: 0; opacity: 1; } 100% { width: 40px; height: 40px; opacity: 0; } }
</style>