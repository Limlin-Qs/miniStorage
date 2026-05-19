import { isLoggedIn, getUserInfo, logout } from '~/utils/auth';
import request from '~/api/request';
import useToastBehavior from '~/behaviors/useToast';

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    service: [
      {
        name: '腾讯文档',
        image: '/static/icon_doc.png',
        appId: 'wxdeab69eb5190c02e',
        path: 'pages/home/home',
      },
      {
        name: '腾讯会议',
        image: '/static/icon_meeting.png',
        appId: 'wxfec5b356c4235ed6',
      },
      {
        name: '金山文档',
        image: '/static/icon_ksdoc.png',
        appId: 'wxd6b6e39e02f0a3cb',
      },
      {
        name: '石墨文档',
        image: '/static/icon_shimo.jpg',
        appId: 'wx3c4e4e6ab4e9eb2d',
      },
    ],
    personalInfo: {},
    gridList: [
      { name: '全部发布', icon: 'root-list', type: 'all', url: '/pages/dataCenter/index?status=all' },
      { name: '审核中', icon: 'search', type: 'reviewing', url: '/pages/dataCenter/index?status=reviewing' },
      { name: '已发布', icon: 'upload', type: 'published', url: '/pages/dataCenter/index?status=published' },
      { name: '草稿箱', icon: 'file-copy', type: 'draft', url: '/pages/dataCenter/index?status=draft' },
    ],
    settingList: [
      { name: '联系客服', icon: 'service', type: 'service', url: '/pages/service/index' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ],
  },

  onLoad() {
    this.getServiceList();
  },

  async onShow() {
    await this.refreshUserInfo();
  },

  /** 刷新用户信息（从云数据库） */
  async refreshUserInfo() {
    const loggedIn = isLoggedIn();
    if (!loggedIn) {
      this.setData({ isLoad: false, personalInfo: {} });
      return;
    }

    try {
      const userInfo = await getUserInfo(true);
      if (userInfo) {
        this.setData({
          isLoad: true,
          personalInfo: {
            _id: userInfo._id,
            name: userInfo.nickName || '微信用户',
            image: userInfo.avatarUrl || '',
            star: userInfo.star || '',
            gender: userInfo.gender || 0,
            birth: userInfo.birth || '',
            address: userInfo.address || '',
            brief: userInfo.brief || '',
            photos: userInfo.photos || [],
            city: userInfo.city || '',
            phone: userInfo.phone || '',
          },
        });
        const app = getApp();
        app.globalData.userInfo = userInfo;
      }
    } catch (err) {
      console.error('refreshUserInfo error:', err);
    }
  },

  getServiceList() {
    request('/api/getServiceList').then((res) => {
      const { service } = res.data.data;
      this.setData({ service });
    }).catch(() => {});
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onNavigateTo() {
    wx.navigateTo({ url: '/pages/my/info-edit/index' });
  },

  onEleClick(e) {
    const { name, url, type, appId, path } = e.currentTarget.dataset.data;
    if (appId) {
      wx.navigateToMiniProgram({
        appId,
        path: path || '',
        envVersion: 'release',
        fail(err) {
          wx.showToast({ title: '暂无法打开', icon: 'none' });
          console.warn('navigateToMiniProgram fail:', err?.errMsg || err);
        },
      });
      return;
    }
    if (url) {
      wx.navigateTo({ url });
      return;
    }
    this.onShowToast('#t-toast', name);
  },
});
