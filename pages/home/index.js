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
    followPage: 1,
    hasMore: true,
    followHasMore: true,
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

    const tab = this.data.currentTab;

    try {
      if (tab === 'recommend') {
        await this.loadRecommend(isRefresh);
      } else if (tab === 'follow') {
        await this.loadFollow(isRefresh);
      }
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 加载推荐列表 */
  async loadRecommend(isRefresh = false) {
    const page = isRefresh ? 1 : this.data.page;
    const [listRes, swiperRes] = await Promise.all([
      getContentList('recommend', page),
      isRefresh ? getSwipers() : Promise.resolve(null),
    ]);

    if (listRes.success) {
      const newCardInfo = isRefresh
        ? listRes.data.list
        : [...this.data.cardInfo, ...listRes.data.list];

      this.setData({
        cardInfo: newCardInfo,
        page: page + 1,
        hasMore: listRes.data.hasMore,
      });
    }

    if (swiperRes && swiperRes.success) {
      this.setData({ swiperList: swiperRes.data });
    }
  },

  /** 加载关注列表 */
  async loadFollow(isRefresh = false) {
    const page = isRefresh ? 1 : this.data.followPage;
    const listRes = await getContentList('follow', page);

    if (listRes.success) {
      const newFocusCardInfo = isRefresh
        ? listRes.data.list
        : [...this.data.focusCardInfo, ...listRes.data.list];

      this.setData({
        focusCardInfo: newFocusCardInfo,
        followPage: page + 1,
        followHasMore: listRes.data.hasMore,
      });
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
    const { currentTab, hasMore, followHasMore, loading } = this.data;
    if (loading) return;
    if (currentTab === 'recommend' && hasMore) {
      this.loadData();
    } else if (currentTab === 'follow' && followHasMore) {
      this.loadData();
    }
  },

  /** Tab 切换 */
  onTabChange(e) {
    const tab = e.detail.value;
    this.setData({
      currentTab: tab,
      cardInfo: [],
      focusCardInfo: [],
      page: 1,
      followPage: 1,
      hasMore: true,
      followHasMore: true,
    });
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
