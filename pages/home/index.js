import Message from 'tdesign-miniprogram/message/index';
import { getContentList, getSwipers } from '~/utils/content';

Page({
  data: {
    enable: false,
    swiperList: [],
    cardInfo: [],
    focusCardInfo: [],
    currentTab: 'recommend',
    page: 1,
    hasMore: true,
    loading: false,
  },

  async onLoad(option) {
    if (option.oper) {
      let content = '';
      if (option.oper === 'release') content = '发布成功';
      else if (option.oper === 'save') content = '保存成功';
      this.showOperMsg(content);
    }
    await this.loadData(true);
  },

  onShow() {
    // 非首次进入时刷新（如从详情页返回）
    if (this._loaded) {
      this.loadData(true);
    }
    this._loaded = true;
  },

  /** 加载数据 */
  async loadData(isRefresh = false) {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const page = isRefresh ? 1 : this.data.page;
      const [listRes, swiperRes] = await Promise.all([
        getContentList(this.data.currentTab, page),
        isRefresh ? getSwipers() : Promise.resolve(null),
      ]);

      if (listRes.success) {
        const newCardInfo = isRefresh
          ? listRes.data.list
          : [...this.data.cardInfo, ...listRes.data.list];

        this.setData({
          cardInfo: newCardInfo,
          focusCardInfo: newCardInfo.slice(0, 3),
          page: page + 1,
          hasMore: listRes.data.hasMore,
        });
      }

      if (swiperRes && swiperRes.success) {
        this.setData({ swiperList: swiperRes.data });
      }
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 下拉刷新 */
  onRefresh() {
    this.setData({ enable: true });
    this.loadData(true).then(() => {
      setTimeout(() => this.setData({ enable: false }), 500);
    });
  },

  /** 触底加载更多 */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadData();
    }
  },

  /** Tab 切换 */
  onTabChange(e) {
    this.setData({ currentTab: e.detail.value, cardInfo: [], page: 1, hasMore: true });
    this.loadData(true);
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
    wx.navigateTo({ url: '/pages/release/index' });
  },

  /** 跳转作品详情 */
  handleGoToOpus(e) {
    const id = e.detail.id || e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/opus/index?id=${id}` });
    }
  },
});
