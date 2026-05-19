/**
 * 消息数据访问模块
 * 封装消息/会话相关的云函数调用
 */

/**
 * 创建/获取与某用户的会话
 * @param {string} targetOpenid - 对方用户的 openid
 * @returns {object} { conversation, isNew }
 */
export async function createConversation(targetOpenid) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'message',
      data: { action: 'createConversation', targetOpenid },
    });
    return res.result;
  } catch (err) {
    console.error('createConversation error:', err);
    return { success: false, message: '创建会话失败' };
  }
}

/**
 * 获取会话列表
 * @param {number} page
 * @param {number} pageSize
 */
export async function getConversations(page = 1, pageSize = 20) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'message',
      data: { action: 'getConversations', page, pageSize },
    });
    return res.result;
  } catch (err) {
    console.error('getConversations error:', err);
    return { success: false, message: '获取会话列表失败' };
  }
}

/**
 * 发送消息
 * @param {string} conversationId - 会话ID
 * @param {string} content - 消息内容
 * @param {string} type - 消息类型 text/image
 */
export async function sendMessage(conversationId, content, type = 'text') {
  try {
    const res = await wx.cloud.callFunction({
      name: 'message',
      data: { action: 'sendMessage', conversationId, content, type },
    });
    return res.result;
  } catch (err) {
    console.error('sendMessage error:', err);
    return { success: false, message: '发送消息失败' };
  }
}

/**
 * 获取会话消息列表
 * @param {string} conversationId
 * @param {number} page
 * @param {number} pageSize
 */
export async function getMessages(conversationId, page = 1, pageSize = 20) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'message',
      data: { action: 'getMessages', conversationId, page, pageSize },
    });
    return res.result;
  } catch (err) {
    console.error('getMessages error:', err);
    return { success: false, message: '获取消息失败' };
  }
}

/**
 * 标记会话消息为已读
 * @param {string} conversationId
 */
export async function markRead(conversationId) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'message',
      data: { action: 'markRead', conversationId },
    });
    return res.result;
  } catch (err) {
    console.error('markRead error:', err);
    return { success: false, message: '标记已读失败' };
  }
}

/**
 * 获取当前用户总未读消息数
 */
export async function getUnreadCount() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'message',
      data: { action: 'getUnreadCount' },
    });
    return res.result;
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return { success: false, data: { unreadCount: 0 } };
  }
}
