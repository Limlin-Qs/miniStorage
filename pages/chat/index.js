// pages/chat/index.js
import { getMessages, sendMessage, markRead } from '~/utils/message';
import { isLoggedIn, getUserInfo } from '~/utils/auth';

const app = getApp();

Page({
  data: {
    myAvatar: '/static/chat/avatar.png',
    myOpenid: '',
    conversationId: '',
    name: '',
    avatar: '',
    targetOpenid: '',
    messages: [],
    input: '',
    anchor: '',
    keyboardHeight: 0,
    page: 1,
    hasMore: false,
    loading: false,
    sending: false,
  },

  async onLoad(options) {
    const { conversationId, name, avatar, targetOpenid } = options;
    if (!conversationId) {
      wx.showToast({ title: '会话不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({
      conversationId,
      name: decodeURIComponent(name || ''),
      avatar: decodeURIComponent(avatar || ''),
      targetOpenid: decodeURIComponent(targetOpenid || ''),
    });

    // 获取自己的信息
    const userInfo = await getUserInfo();
    if (userInfo) {
      this.setData({
        myAvatar: userInfo.avatarUrl || '/static/chat/avatar.png',
        myOpenid: userInfo._openid || '',
      });
    }

    // 加载历史消息
    this.loadMessages();

    // 标记已读
    markRead(conversationId);

    // 开启数据库实时监听（新消息推送）
    this.startWatcher();
  },

  onUnload() {
    // 关闭实时监听
    this.stopWatcher();
  },

  /** 开启消息实时监听 */
  startWatcher() {
    const { conversationId } = this.data;
    if (!conversationId) return;

    try {
      const db = wx.cloud.database();
      this._watcher = db
        .collection('messages')
        .where({ conversationId })
        .watch({
          onChange: (snapshot) => {
            if (snapshot.type === 'init') return;
            // 有新消息变更
            snapshot.docschanges.forEach((change) => {
              if (change.dataType === 'add') {
                const msg = change.doc;
                // 避免重复（自己发送的消息已经手动添加过了）
                const exists = this.data.messages.some(
                  (m) => m._id === msg._id
                );
                if (!exists) {
                  const messages = [...this.data.messages, this.formatMessage(msg)];
                  this.setData({ messages });
                  wx.nextTick(this.scrollToBottom);

                  // 如果是对方发的消息，标记已读
                  if (msg.from !== this.data.myOpenid) {
                    markRead(this.data.conversationId);
                  }
                }
              }
            });
          },
          onError: (err) => {
            console.error('watcher error:', err);
          },
        });
    } catch (err) {
      console.error('startWatcher error:', err);
    }
  },

  /** 关闭实时监听 */
  stopWatcher() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  },

  /** 格式化消息对象，用于前端显示 */
  formatMessage(msg) {
    return {
      _id: msg._id,
      from: msg.from === this.data.myOpenid ? 0 : 1,
      content: msg.content,
      type: msg.type || 'text',
      time: msg.createTime ? new Date(msg.createTime).getTime() : Date.now(),
      read: msg.read,
      sending: false,
    };
  },

  /** 加载消息列表 */
  async loadMessages() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const res = await getMessages(this.data.conversationId, this.data.page, 20);
      if (res.success) {
        const messages = res.data.list.map((msg) => this.formatMessage(msg));
        this.setData({
          messages: this.data.page === 1 ? messages : [...messages, ...this.data.messages],
          hasMore: res.data.hasMore,
          page: this.data.page + 1,
          loading: false,
        });

        if (this.data.page === 2) {
          wx.nextTick(this.scrollToBottom);
        }
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('loadMessages error:', err);
      this.setData({ loading: false });
    }
  },

  /** 滚动到底部 */
  scrollToBottom() {
    this.setData({ anchor: 'bottom' });
  },

  /** 键盘高度变化 */
  handleKeyboardHeightChange(e) {
    const { height } = e.detail;
    this.setData({ keyboardHeight: height || 0 });
    wx.nextTick(this.scrollToBottom);
  },

  handleBlur() {
    this.setData({ keyboardHeight: 0 });
  },

  handleInput(e) {
    this.setData({ input: e.detail.value });
  },

  /** 发送消息 */
  async sendMessage() {
    const { conversationId, input: content, messages } = this.data;
    if (!content.trim() || this.data.sending) return;

    const contentStr = content.trim();

    // 乐观更新：先在 UI 上显示消息
    const tempMsg = {
      _id: 'temp_' + Date.now(),
      from: 0,
      content: contentStr,
      type: 'text',
      time: Date.now(),
      read: true,
      sending: true,
    };

    this.setData({ input: '', messages: [...messages, tempMsg], sending: true });
    wx.nextTick(this.scrollToBottom);

    try {
      const res = await sendMessage(conversationId, contentStr, 'text');
      if (res.success) {
        // 替换临时消息为真实消息
        const newMessages = this.data.messages.map((m) => {
          if (m._id === tempMsg._id) {
            return { ...m, _id: res.data.message._id, sending: false };
          }
          return m;
        });
        this.setData({ messages: newMessages });
      } else {
        // 发送失败，标记
        const newMessages = this.data.messages.map((m) => {
          if (m._id === tempMsg._id) {
            return { ...m, sending: false, failed: true };
          }
          return m;
        });
        this.setData({ messages: newMessages });
        wx.showToast({ title: '发送失败', icon: 'none' });
      }
    } catch (err) {
      const newMessages = this.data.messages.map((m) => {
        if (m._id === tempMsg._id) {
          return { ...m, sending: false, failed: true };
        }
        return m;
      });
      this.setData({ messages: newMessages });
      wx.showToast({ title: '发送异常', icon: 'none' });
    } finally {
      this.setData({ sending: false });
    }
  },
});
