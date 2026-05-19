import { wxLogin, isLoggedIn, getUserInfo } from '~/utils/auth';

Page({
  data: {
    phoneNumber: '',
    isPhoneNumber: false,
    isCheck: false,
    isSubmit: false,
    isPasswordLogin: false,
    isWxLogging: false,
    passwordInfo: {
      account: '',
      password: '',
    },
    radioValue: '',
  },

  changeSubmit() {
    if (this.data.isPasswordLogin) {
      if (this.data.passwordInfo.account !== '' && this.data.passwordInfo.password !== '' && this.data.isCheck) {
        this.setData({ isSubmit: true });
      } else {
        this.setData({ isSubmit: false });
      }
    } else if (this.data.isPhoneNumber && this.data.isCheck) {
      this.setData({ isSubmit: true });
    } else {
      this.setData({ isSubmit: false });
    }
  },

  onPhoneInput(e) {
    const isPhoneNumber = /^[1][3,4,5,7,8,9][0-9]{9}$/.test(e.detail.value);
    this.setData({
      isPhoneNumber,
      phoneNumber: e.detail.value,
    });
    this.changeSubmit();
  },

  onCheckChange(e) {
    const { value } = e.detail;
    this.setData({
      radioValue: value,
      isCheck: value === 'agree',
    });
    this.changeSubmit();
  },

  onAccountChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, account: e.detail.value } });
    this.changeSubmit();
  },

  onPasswordChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, password: e.detail.value } });
    this.changeSubmit();
  },

  changeLogin() {
    this.setData({ isPasswordLogin: !this.data.isPasswordLogin, isSubmit: false });
  },

  /** 微信一键登录 */
  async onWxLogin() {
    if (this.data.isWxLogging) return;
    this.setData({ isWxLogging: true });

    try {
      const res = await wxLogin();
      if (res.success) {
        // 更新全局用户信息
        const app = getApp();
        app.globalData.userInfo = res.data.userInfo;
        app.eventBus.emit('login-success', res.data.userInfo);
        wx.setStorageSync('access_token', res.data.userInfo._openid);

        wx.showToast({ title: res.isNewUser ? '注册成功' : '登录成功', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/my/index' });
        }, 1000);
      } else {
        wx.showToast({ title: res.message || '登录失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '登录异常，请重试', icon: 'none' });
    } finally {
      this.setData({ isWxLogging: false });
    }
  },

  /** 验证码登录 / 密码登录（保留，后续接入短信服务） */
  async login() {
    if (this.data.isPasswordLogin) {
      // 密码登录：后续接入真实后端
      wx.showToast({ title: '暂未开放，请使用微信登录', icon: 'none' });
    } else {
      // 验证码登录：后续接入短信服务
      wx.showToast({ title: '暂未开放，请使用微信登录', icon: 'none' });
    }
  },
});
