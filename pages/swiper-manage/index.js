import { getSwipers, uploadImage } from '~/utils/content';

Page({
  data: {
    swiperList: [],
    loading: false,
    saving: false,
  },

  onLoad() {
    this.loadSwipers();
  },

  /** 加载现有轮播图 */
  async loadSwipers() {
    this.setData({ loading: true });
    try {
      const res = await getSwipers();
      if (res.success) {
        const list = (res.data || []).map((item) => ({
          image: item.image || '',
          link: item.link || '',
        }));
        this.setData({ swiperList: list.length > 0 ? list : [{ image: '', link: '' }] });
      } else {
        this.setData({ swiperList: [{ image: '', link: '' }] });
      }
    } catch (err) {
      console.error('loadSwipers error:', err);
      this.setData({ swiperList: [{ image: '', link: '' }] });
    }
    this.setData({ loading: false });
  },

  /** 添加一条 */
  addItem() {
    const list = this.data.swiperList;
    list.push({ image: '', link: '' });
    this.setData({ swiperList: list });
  },

  /** 删除一条 */
  removeItem(e) {
    const idx = e.currentTarget.dataset.index;
    const list = this.data.swiperList;
    if (list.length <= 1) {
      wx.showToast({ title: '至少保留一张', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张轮播图吗？',
      success: (res) => {
        if (res.confirm) {
          list.splice(idx, 1);
          this.setData({ swiperList: list });
        }
      },
    });
  },

  /** 选择图片 */
  chooseImage(e) {
    const idx = e.currentTarget.dataset.index;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: async (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...' });
        const fileID = await uploadImage(tempPath, `swiper/banner_${Date.now()}.jpg`);
        wx.hideLoading();
        if (fileID) {
          this.setData({ [`swiperList[${idx}].image`]: fileID });
          wx.showToast({ title: '上传成功', icon: 'success' });
        } else {
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      },
    });
  },

  /** 链接输入 */
  onLinkChange(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ [`swiperList[${idx}].link`]: e.detail.value });
  },

  /** 上移 */
  moveUp(e) {
    const idx = e.currentTarget.dataset.index;
    if (idx === 0) return;
    const list = this.data.swiperList;
    const tmp = list[idx - 1];
    list[idx - 1] = list[idx];
    list[idx] = tmp;
    this.setData({ swiperList: list });
  },

  /** 下移 */
  moveDown(e) {
    const idx = e.currentTarget.dataset.index;
    const list = this.data.swiperList;
    if (idx >= list.length - 1) return;
    const tmp = list[idx + 1];
    list[idx + 1] = list[idx];
    list[idx] = tmp;
    this.setData({ swiperList: list });
  },

  /** 保存到云数据库 */
  async save() {
    if (this.data.saving) return;

    const list = this.data.swiperList;
    // 过滤空图
    const validList = list.filter((item) => item.image);
    if (validList.length === 0) {
      wx.showToast({ title: '请至少上传一张图片', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'content',
        data: { action: 'updateSwipers', list: validList },
      });
      wx.hideLoading();
      if (res.result && res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1200);
      } else {
        wx.showToast({ title: res.result?.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('save swipers error:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
    this.setData({ saving: false });
  },

  /** 返回 */
  onBack() {
    wx.navigateBack();
  },
});
