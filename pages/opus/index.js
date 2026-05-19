import { getContentDetail, deleteContent } from '~/utils/content';
import { createConversation } from '~/utils/message';
import { isLoggedIn, getUserInfo } from '~/utils/auth';
import { followUser, unfollowUser, checkFollow } from '~/utils/follow';

Page({
  data: {
    item: null,
    loading: true,
    isAuthor: false,
    isFollowed: false,
    followLoading: false,
  },

  onLoad(options) {
    if (options.id) {
      this.loadDetail(options.id);
    } else {
      this.setData({ loading: false });
    }
  },

  /** 从云数据库加载内容详情 */
  async loadDetail(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await getContentDetail(id);
      if (res.success) {
        const item = res.data;
        // cloud:// 图片转为临时链接
        await this.resolveCloudUrls(item);
        // 判断当前用户是否为作者
        const myInfo = await getUserInfo();
        const isAuthor = !!(myInfo && myInfo._openid && myInfo._openid === item._openid);
        this.setData({ item, loading: false, isAuthor });
        // 非作者时检查关注状态
        if (!isAuthor && item._openid) {
          const isFollowed = await checkFollow(item._openid);
          this.setData({ isFollowed });
        }
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('loadDetail error:', err);
      wx.showToast({ title: '加载异常', icon: 'none' });
      this.setData({ loading: false });
    }
    wx.hideLoading();
  },

  /** 将 cloud:// 链接转为可访问的临时链接 */
  resolveCloudUrls(item) {
    return new Promise((resolve) => {
      const cloudUrls = [];
      if (item.coverUrl && item.coverUrl.startsWith('cloud://')) cloudUrls.push(item.coverUrl);
      if (item.coverUrls) {
        item.coverUrls.forEach((u) => { if (u && u.startsWith('cloud://') && !cloudUrls.includes(u)) cloudUrls.push(u); });
      }
      if (cloudUrls.length === 0) { resolve(); return; }

      wx.cloud.getTempFileURL({
        fileList: cloudUrls,
        success: (res) => {
          const urlMap = {};
          res.fileList.forEach((f) => { if (f.tempFileURL) urlMap[f.fileID] = f.tempFileURL; });
          if (item.coverUrl && urlMap[item.coverUrl]) item.coverUrl = urlMap[item.coverUrl];
          if (item.coverUrls) item.coverUrls = item.coverUrls.map((u) => urlMap[u] || u);
          resolve();
        },
        fail: () => resolve(),
      });
    });
  },

  /** 拨打电话 */
  callLeader() {
    const phone = this.data.item.phone;
    if (phone) wx.makePhoneCall({ phoneNumber: phone });
  },

  /** 复制邮箱 */
  copyEmail() {
    const email = this.data.item.email;
    if (email) {
      wx.setClipboardData({ data: email, success: () => wx.showToast({ title: '邮箱已复制' }) });
    }
  },

  /** 联系作者（创建/打开会话） */
  async contactAuthor() {
    if (!isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const authorOpenid = this.data.item._openid;
    if (!authorOpenid) {
      wx.showToast({ title: '无法获取作者信息', icon: 'none' });
      return;
    }

    const myInfo = await getUserInfo();
    if (myInfo && myInfo._openid === authorOpenid) {
      wx.showToast({ title: '不能和自己聊天', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在创建会话...' });
    try {
      const res = await createConversation(authorOpenid);
      wx.hideLoading();

      if (res.success) {
        const conv = res.data.conversation;
        const authorName = this.data.item.leader || '作者';
        wx.navigateTo({
          url: `/pages/chat/index?conversationId=${conv._id}&name=${encodeURIComponent(authorName)}&avatar=&targetOpenid=${encodeURIComponent(authorOpenid)}`,
        });
      } else {
        wx.showToast({ title: res.message || '创建会话失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作异常', icon: 'none' });
    }
  },

  /** 云存储文件下载 */
  downloadFile(e) {
    const { fileid, filename } = e.currentTarget.dataset;
    wx.showLoading({ title: '生成下载链接...' });

    wx.cloud.getTempFileURL({
      fileList: [{ fileID: fileid }],
      success: (res) => {
        const tempURL = res.fileList[0].tempFileURL;
        wx.showLoading({ title: '下载中...' });

        wx.downloadFile({
          url: tempURL,
          success: (downloadRes) => {
            if (downloadRes.statusCode === 200) {
              wx.saveFile({
                tempFilePath: downloadRes.tempFilePath,
                filePath: wx.env.USER_DATA_PATH + '/' + filename,
                success: () => {
                  wx.hideLoading();
                  wx.showToast({ title: '下载成功', icon: 'success' });
                },
              });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '下载失败', icon: 'none' });
          },
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '生成链接失败', icon: 'none' });
      },
    });
  },

  /** 关注/取关作者 */
  async toggleFollow() {
    if (!isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    const { item, isFollowed, followLoading } = this.data;
    if (followLoading || !item || !item._openid) return;

    this.setData({ followLoading: true });
    try {
      let res;
      if (isFollowed) {
        res = await unfollowUser(item._openid);
      } else {
        res = await followUser(item._openid);
      }
      if (res.success) {
        this.setData({ isFollowed: !isFollowed });
        wx.showToast({ title: isFollowed ? '已取消关注' : '关注成功', icon: 'success' });
      } else {
        wx.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '操作异常', icon: 'none' });
    }
    this.setData({ followLoading: false });
  },

  /** 删除作品 */
  deleteOpus() {
    if (!this.data.isAuthor) {
      wx.showToast({ title: '无权操作', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除该作品吗？',
      confirmColor: '#e34d59',
      success: async (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '删除中...' });
        try {
          const result = await deleteContent(this.data.item._id);
          wx.hideLoading();

          if (result.success) {
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => {
              wx.navigateBack({ delta: 1 });
            }, 1500);
          } else {
            wx.showToast({ title: result.message || '删除失败', icon: 'none' });
          }
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '删除异常', icon: 'none' });
        }
      },
    });
  },
});
