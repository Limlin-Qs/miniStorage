import { isLoggedIn, logout } from '~/utils/auth';
import useToastBehavior from '~/behaviors/useToast';

Page({
  behaviors: [useToastBehavior],

  data: {
    menuData: [
      [
        { title: '通用设置', url: '', icon: 'app' },
        { title: '通知设置', url: '', icon: 'notification' },
      ],
      [
        { title: '深色模式', url: '', icon: 'image' },
        { title: '字体大小', url: '', icon: 'chart' },
        { title: '播放设置', url: '', icon: 'sound' },
      ],
      [
        { title: '账号安全', url: '', icon: 'secured' },
        { title: '隐私', url: '', icon: 'info-circle' },
      ],
    ],
    isLoggedIn: false,
  },

  onShow() {
    this.setData({ isLoggedIn: isLoggedIn() });
  },

  onEleClick(e) {
    const { title, url } = e.currentTarget.dataset.data;
    if (url) return;
    this.onShowToast('#t-toast', title);
  },

  /** 退出登录 */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
          this.setData({ isLoggedIn: false });
          wx.showToast({ title: '已退出登录', icon: 'success' });
          setTimeout(() => {
            wx.switchTab({ url: '/pages/my/index' });
          }, 1000);
        }
      },
    });
  },
});
