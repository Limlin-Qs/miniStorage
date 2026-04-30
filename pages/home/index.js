import Message from 'tdesign-miniprogram/message/index';
import request from '~/api/request';

// 获取应用实例
// const app = getApp()
const db = wx.cloud.database();

Page({
  data: {
    enable: false,
    swiperList: [],
    // 存储从数据库获取的所有项目数据
    projects: [],
    cardInfo: [],
    // 发布
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName'), // 如需尝试获取用户信息可改为false
  },
  // 生命周期
  async onReady() {
    const [cardRes, swiperRes] = await Promise.all([
      request('/home/cards').then((res) => res.data),
      request('/home/swipers').then((res) => res.data),
    ]);

    this.setData({
      cardInfo: cardRes.data,
      focusCardInfo: cardRes.data.slice(0, 3),
      swiperList: swiperRes.data,
    });
  },
  onLoad(option) {
    // 在home页面加载时，从数据库获取所有项目数据
    this.fetchProjects();
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true,
      });
    }
    if (option.oper) {
      let content = '';
      if (option.oper === 'release') {
        content = '发布成功';
      } else if (option.oper === 'save') {
        content = '保存成功';
      }
      this.showOperMsg(content);
    }
  },
  // 数据库中项目信息获取
  fetchProjects() {
    wx.showLoading({ title: '加载中...' });
    db.collection('projectSet').get({
      success: (res) => {
        this.setData({
          projects: res.data // 将获取到的数据存入页面data
        });
        wx.hideLoading();
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
        console.error(err);
      }
    });
  },
  onRefresh() {
    this.refresh();
  },
  async refresh() {
    this.setData({
      enable: true,
    });
    const [cardRes, swiperRes] = await Promise.all([
      request('/home/cards').then((res) => res.data),
      request('/home/swipers').then((res) => res.data),
    ]);

    setTimeout(() => {
      this.setData({
        enable: false,
        cardInfo: cardRes.data,
        swiperList: swiperRes.data,
      });
    }, 1500);
  },
  showOperMsg(content) {
    Message.success({
      context: this,
      offset: [120, 32],
      duration: 4000,
      content,
    });
  },
  goRelease() {
    wx.navigateTo({
      url: '/pages/release/index',
    });
  },
   // 处理从卡片组件传递过来的跳转事件
   handleGoToOpus(e) {
    // 获取从卡片组件传递过来的项目ID
    const projectId = e.detail.id;
    
    // 跳转到 opus 页面，并传递项目ID作为参数
    // wx.navigateTo({
    //   url: `/pages/opus/index?id=${projectId}`
    // });
    wx.navigateTo({
      url: `/pages/opus/index`
    });
  }
});
