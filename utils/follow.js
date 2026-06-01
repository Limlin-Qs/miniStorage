/**
 * 关注功能工具模块（关注作品）
 * 封装关注相关的云函数调用
 */

/**
 * 关注作品
 * @param {string} opusId - 作品ID
 */
export async function followOpus(opusId) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'follow', opusId },
    });
    return res.result;
  } catch (err) {
    console.error('followOpus error:', err);
    return { success: false, message: '关注失败' };
  }
}

/**
 * 取消关注作品
 * @param {string} opusId - 作品ID
 */
export async function unfollowOpus(opusId) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'unfollow', opusId },
    });
    return res.result;
  } catch (err) {
    console.error('unfollowOpus error:', err);
    return { success: false, message: '取消关注失败' };
  }
}

/**
 * 检查是否已关注某作品
 * @param {string} opusId - 作品ID
 * @returns {boolean} isFollowed
 */
export async function checkFollowOpus(opusId) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'checkFollow', opusId },
    });
    if (res.result.success) {
      return res.result.data.isFollowed;
    }
    return false;
  } catch (err) {
    console.error('checkFollowOpus error:', err);
    return false;
  }
}

/**
 * 获取我的关注作品列表
 * @param {number} page
 * @param {number} pageSize
 */
export async function getFollowOpusList(page = 1, pageSize = 20) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'getFollowList', page, pageSize },
    });
    return res.result;
  } catch (err) {
    console.error('getFollowOpusList error:', err);
    return { success: false, message: '获取关注列表失败' };
  }
}
