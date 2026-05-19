// pages/message/index.js
import { getConversations, markRead } from '~/utils/message';
import { isLoggedIn } from '~/utils/auth';

const app = getApp();

Page({
  data: {
    conversationList: [],
    loading: true,
    hasMore: true,
    page: 1,
  },

  onLoad() {
    if (!isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.loadConversations();
  },

  onShow() {
    // 每次显示时刷新列表（可能有新消息/已读状态变化）
    if (isLoggedIn()) {
      this.setData({ page: 1, hasMore: true });
      this.loadConversations(true);
    }
  },

  /** 加载会话列表 */
  async loadConversations(refresh = false) {
    if (this._loading) return;
    this._loading = true;

    if (refresh) {
      this.setData({ loading: true });
    }

    try {
      const page = refresh ? 1 : this.data.page;
      const res = await getConversations(page, 20);

      if (res.success) {
        const list = res.data.list.map((conv) => ({
          _id: conv._id,
          name: conv.targetUser.nickName || '未知用户',
          avatar: conv.targetUser.avatarUrl || '/static/chat/avatar.png',
          lastMessage: conv.lastMessage || '',
          lastTime: conv.lastTime,
          unread: conv.unread || 0,
          targetOpenid: conv.targetUser._openid,
        }));

        this.setData({
          conversationList: refresh ? list : [...this.data.conversationList, ...list],
          hasMore: res.data.hasMore,
          page: page + 1,
          loading: false,
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('loadConversations error:', err);
      this.setData({ loading: false });
    } finally {
      this._loading = false;
    }
  },

  /** 触底加载更多 */
  onReachBottom() {
    if (this.data.hasMore && !this._loading) {
      this.loadConversations();
    }
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.loadConversations(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /** 打开对话页 */
  toChat(e) {
    const { id, targetopenid } = e.currentTarget.dataset;
    const conv = this.data.conversationList.find((c) => c._id === id);
    if (!conv) return;

    wx.navigateTo({
      url: `/pages/chat/index?conversationId=${id}&name=${encodeURIComponent(conv.name)}&avatar=${encodeURIComponent(conv.avatar)}&targetOpenid=${encodeURIComponent(conv.targetOpenid)}`,
    });

    // 标记该会话已读
    markRead(id).then(() => {
      const list = this.data.conversationList.map((c) => {
        if (c._id === id) return { ...c, unread: 0 };
        return c;
      });
      this.setData({ conversationList: list });
      this.syncUnreadCount();
    });
  },

  /** 同步未读数到全局 */
  syncUnreadCount() {
    const total = this.data.conversationList.reduce((sum, c) => sum + (c.unread || 0), 0);
    app.setUnreadNum(total);
  },
});
