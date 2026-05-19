// app.js
import createBus from './utils/eventBus';
import { wxLogin, isLoggedIn } from './utils/auth';
import { getUnreadCount } from './utils/message';

App({
  onLaunch() {
    // 云开发初始化
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-3gv3rmsx1d6d0b7e',
        traceUser: true,
      });
    }

    // 版本更新管理
    const updateManager = wx.getUpdateManager();
    updateManager.onCheckForUpdate(() => {});
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        },
      });
    });

    // 自动静默登录
    this.silentLogin();

    // 获取未读消息数
    this.refreshUnreadCount();

    // 开启会话列表实时监听（用于未读数更新）
    this.startConversationWatcher();
  },

  globalData: {
    userInfo: null,
    unreadNum: 0,
  },

  eventBus: createBus(),

  /** 静默登录：启动时自动调用云函数完成登录/注册 */
  async silentLogin() {
    try {
      const res = await wxLogin();
      if (res.success) {
        this.globalData.userInfo = res.data.userInfo;
        this.eventBus.emit('login-success', res.data.userInfo);

        // 同步设置 access_token 兼容旧逻辑
        wx.setStorageSync('access_token', res.data.userInfo._openid);

        // 登录后刷新未读数
        this.refreshUnreadCount();
        this.startConversationWatcher();
      }
    } catch (err) {
      console.error('silentLogin error:', err);
    }
  },

  /** 获取未读消息数量（从云函数） */
  async refreshUnreadCount() {
    if (!isLoggedIn()) return;
    try {
      const res = await getUnreadCount();
      if (res.success) {
        this.setUnreadNum(res.data.unreadCount);
      }
    } catch (err) {
      console.error('refreshUnreadCount error:', err);
    }
  },

  /** 设置未读消息数量 */
  setUnreadNum(unreadNum) {
    this.globalData.unreadNum = unreadNum;
    this.eventBus.emit('unread-num-change', unreadNum);
  },

  /** 开启会话列表实时监听 */
  startConversationWatcher() {
    if (!isLoggedIn()) return;
    if (this._convWatcherClosed) return; // 已达重连上限，不再重试

    // 先关闭旧监听
    this.stopConversationWatcher();

    try {
      const db = wx.cloud.database();
      const openid = this.globalData.userInfo?._openid;
      if (!openid) return;

      this._convWatchRetryCount = (this._convWatchRetryCount || 0) + 1;

      this._convWatcher = db
        .collection('conversations')
        .where({ members: openid })
        .watch({
          onChange: () => {
            // 连接成功，重置重试计数
            this._convWatchRetryCount = 0;
            // 会话列表变化时刷新未读数
            this.refreshUnreadCount();
            this.eventBus.emit('conversations-updated');
          },
          onError: (err) => {
            console.warn('conversation watcher error:', err?.errMsg || err);
            // 超过3次重连失败则放弃，避免无限重连
            if (this._convWatchRetryCount >= 3) {
              console.warn('conversation watcher: 已达最大重试次数，停止监听');
              this._convWatcherClosed = true;
              return;
            }
            // 延迟重连
            setTimeout(() => this.startConversationWatcher(), 5000);
          },
        });
    } catch (err) {
      console.error('startConversationWatcher error:', err);
    }
  },

  /** 关闭会话监听 */
  stopConversationWatcher() {
    if (this._convWatcher) {
      try {
        this._convWatcher.close();
      } catch (e) {
        // 忽略 close 异常（如 task not found）
      }
      this._convWatcher = null;
    }
  },
});
