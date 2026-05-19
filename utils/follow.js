/**
 * 关注功能工具模块
 * 封装关注相关的云函数调用
 */

/**
 * 关注用户
 * @param {string} targetOpenid - 被关注用户的 openid
 */
export async function followUser(targetOpenid) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'follow', targetOpenid },
    });
    return res.result;
  } catch (err) {
    console.error('followUser error:', err);
    return { success: false, message: '关注失败' };
  }
}

/**
 * 取消关注
 * @param {string} targetOpenid - 被取消关注用户的 openid
 */
export async function unfollowUser(targetOpenid) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'unfollow', targetOpenid },
    });
    return res.result;
  } catch (err) {
    console.error('unfollowUser error:', err);
    return { success: false, message: '取消关注失败' };
  }
}

/**
 * 检查是否已关注某用户
 * @param {string} targetOpenid - 目标用户 openid
 * @returns {boolean} isFollowed
 */
export async function checkFollow(targetOpenid) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'checkFollow', targetOpenid },
    });
    if (res.result.success) {
      return res.result.data.isFollowed;
    }
    return false;
  } catch (err) {
    console.error('checkFollow error:', err);
    return false;
  }
}

/**
 * 获取我的关注列表
 * @param {number} page
 * @param {number} pageSize
 */
export async function getFollowList(page = 1, pageSize = 20) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'getFollowList', page, pageSize },
    });
    return res.result;
  } catch (err) {
    console.error('getFollowList error:', err);
    return { success: false, message: '获取关注列表失败' };
  }
}
