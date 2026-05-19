import { getMyContentList } from '~/utils/content';

Page({
  data: {
    status: 'all',
    statusText: '全部发布',
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
  },

  onLoad(options) {
    const statusMap = {
      all: '全部发布',
      published: '已发布',
      reviewing: '审核中',
      draft: '草稿箱',
    };
    const status = options.status || 'all';
    this.setData({
      status,
      statusText: statusMap[status] || '全部发布',
    });
    this.loadData(true);
  },

  /** 加载我的发布列表 */
  async loadData(isRefresh = false) {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const page = isRefresh ? 1 : this.data.page;
      const res = await getMyContentList(this.data.status, page);

      if (res.success) {
        const newList = isRefresh ? res.data.list : [...this.data.list, ...res.data.list];
        this.setData({
          list: newList,
          page: page + 1,
          hasMore: res.data.hasMore,
        });
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 触底加载更多 */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadData();
    }
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.loadData(true).then(() => wx.stopPullDownRefresh());
  },

  /** 查看详情 */
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/opus/index?id=${id}` });
    }
  },
});
