const app = getApp();

Component({
  data: {
    value: '',
    unreadNum: 0,
    list: [
      {
        icon: 'home',
        value: 'index',
        label: '首页',
      },
      {
        icon: 'chat',
        value: 'notice',
        label: '消息',
      },
      {
        icon: 'user',
        value: 'my',
        label: '我的',
      },
    ],
  },
  lifetimes: {
    ready() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        const nameRe = /pages\/(\w+)\/index/.exec(curPage.route);
        if (nameRe && nameRe[1]) {
          this.setData({ value: nameRe[1] });
        }
      }

      // 同步全局未读消息数量
      this.setUnreadNum(app.globalData.unreadNum);
      app.eventBus.on('unread-num-change', (unreadNum) => {
        this.setUnreadNum(unreadNum);
      });
    },
    detached() {
      // 移除监听
      app.eventBus.off('unread-num-change');
    },
  },
  methods: {
    handleChange(e) {
      const { value } = e.detail;
      wx.switchTab({ url: `/pages/${value}/index` });
    },

    setUnreadNum(unreadNum) {
      this.setData({ unreadNum });
    },
  },
});
