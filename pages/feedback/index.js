Page({
  data: {
    feedbackType: 'bug',
    typeOptions: [
      { value: 'bug', label: '功能异常' },
      { value: 'suggest', label: '功能建议' },
      { value: 'other', label: '其他' },
    ],
    content: '',
    contact: '',
    submitting: false,
  },

  onTypeChange(e) {
    this.setData({ feedbackType: e.detail.value });
  },

  onContentChange(e) {
    this.setData({ content: e.detail.value });
  },

  onContactChange(e) {
    this.setData({ contact: e.detail.value });
  },

  async onSubmit() {
    const { content, feedbackType, contact, submitting } = this.data;
    if (submitting) return;

    if (!content.trim()) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      const db = wx.cloud.database();
      await db.collection('feedback').add({
        data: {
          type: feedbackType,
          content: content.trim(),
          contact: contact.trim(),
          createdAt: db.serverDate(),
          status: 'pending',
        },
      });

      wx.showToast({ title: '提交成功，感谢反馈', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      console.error('submit feedback error:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
