Page({
  data: {
    faqList: [
      {
        question: '如何发布内容？',
        answer: '点击首页右下角的"发布"按钮，填写项目名称、描述等信息后，选择"发布"即可。也可以先保存为草稿，后续再发布。',
        expanded: false,
      },
      {
        question: '如何删除自己发布的内容？',
        answer: '进入作品详情页，如果您是作者，页面底部会显示"删除作品"按钮，点击后确认即可删除。',
        expanded: false,
      },
      {
        question: '如何联系作品作者？',
        answer: '在作品详情页，非作者用户可点击"联系作者"按钮，系统会自动创建与作者的私信会话。',
        expanded: false,
      },
      {
        question: '发布的内容为什么看不到？',
        answer: '发布的内容需要通过审核后才会展示在推荐列表中，您可以在"我的 → 数据中心"中查看审核状态。',
        expanded: false,
      },
      {
        question: '如何修改个人信息？',
        answer: '进入"我的"页面，点击头像旁的编辑图标，即可修改用户名、性别、生日、简介等个人信息。',
        expanded: false,
      },
    ],
  },

  toggleFaq(e) {
    const { index } = e.currentTarget.dataset;
    const faqList = this.data.faqList;
    faqList[index].expanded = !faqList[index].expanded;
    this.setData({ faqList });
  },

  copyEmail() {
    wx.setClipboardData({
      data: 'support@aichuangku.com',
      success() {
        wx.showToast({ title: '邮箱已复制', icon: 'success' });
      },
    });
  },

  callPhone() {
    wx.makePhoneCall({
      phoneNumber: '400-888-8888',
      fail() {
        wx.showToast({ title: '拨号失败', icon: 'none' });
      },
    });
  },

  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' });
  },
});
