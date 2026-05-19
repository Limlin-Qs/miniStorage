// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 云函数：message
 * 消息/会话管理
 *
 * 数据库集合：
 *   conversations: { _id, members:[openid1,openid2], lastMessage, lastTime, unreadCount:{openid1:n, openid2:n}, createTime, updateTime }
 *   messages: { _id, conversationId, from, to, content, type, read, createTime }
 *
 * 调用方式：
 *   wx.cloud.callFunction({ name: 'message', data: { action: 'xxx', ... } })
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  switch (event.action) {
    case 'createConversation':
      return await createConversation(OPENID, event.targetOpenid);
    case 'getConversations':
      return await getConversations(OPENID, event.page, event.pageSize);
    case 'sendMessage':
      return await sendMessage(OPENID, event.conversationId, event.content, event.type);
    case 'getMessages':
      return await getMessages(OPENID, event.conversationId, event.page, event.pageSize);
    case 'markRead':
      return await markRead(OPENID, event.conversationId);
    case 'getUnreadCount':
      return await getUnreadCount(OPENID);
    default:
      return { code: 400, success: false, message: '未知操作' };
  }
};

/**
 * 创建/获取会话
 * 两个用户之间只允许有一个会话，已存在则返回现有会话
 * @param {string} openid - 发起者 openid
 * @param {string} targetOpenid - 对方 openid
 */
async function createConversation(openid, targetOpenid) {
  if (!targetOpenid) {
    return { code: 400, success: false, message: '缺少对方用户ID' };
  }
  if (openid === targetOpenid) {
    return { code: 400, success: false, message: '不能和自己创建会话' };
  }

  const convCol = db.collection('conversations');

  try {
    // 查找是否已存在会话（members 包含双方）
    const { data: existing } = await convCol
      .where({
        members: _.all([openid, targetOpenid]),
      })
      .get();

    if (existing.length > 0) {
      return {
        code: 200,
        success: true,
        data: { conversation: existing[0], isNew: false },
      };
    }

    // 新建会话
    const convData = {
      members: [openid, targetOpenid],
      lastMessage: '',
      lastTime: db.serverDate(),
      unreadCount: { [openid]: 0, [targetOpenid]: 0 },
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    };

    const { _id } = await convCol.add({ data: convData });
    convData._id = _id;

    return {
      code: 200,
      success: true,
      data: { conversation: convData, isNew: true },
    };
  } catch (err) {
    return { code: 500, success: false, message: '创建会话失败：' + err.message };
  }
}

/**
 * 获取会话列表
 * 返回当前用户参与的所有会话，按最后消息时间倒序
 * @param {string} openid
 * @param {number} page
 * @param {number} pageSize
 */
async function getConversations(openid, page = 1, pageSize = 20) {
  const convCol = db.collection('conversations');

  try {
    const query = { members: openid };
    const { total } = await convCol.where(query).count();

    const { data: list } = await convCol
      .where(query)
      .orderBy('lastTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    // 为每个会话补充对方用户信息
    const usersCol = db.collection('users');
    const result = [];
    for (const conv of list) {
      const targetOpenid = conv.members.find((m) => m !== openid);
      let targetUser = { nickName: '未知用户', avatarUrl: '' };
      try {
        const { data: users } = await usersCol.where({ _openid: targetOpenid }).limit(1).get();
        if (users.length > 0) {
          targetUser = { nickName: users[0].nickName, avatarUrl: users[0].avatarUrl, _openid: users[0]._openid };
        }
      } catch (e) {}

      result.push({
        ...conv,
        targetUser,
        unread: (conv.unreadCount && conv.unreadCount[openid]) || 0,
      });
    }

    return {
      code: 200,
      success: true,
      data: {
        list: result,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    };
  } catch (err) {
    return { code: 500, success: false, message: '获取会话列表失败：' + err.message };
  }
}

/**
 * 发送消息
 * @param {string} openid - 发送者 openid
 * @param {string} conversationId - 会话ID
 * @param {string} content - 消息内容
 * @param {string} type - 消息类型: text/image/system
 */
async function sendMessage(openid, conversationId, content, type = 'text') {
  if (!conversationId || !content) {
    return { code: 400, success: false, message: '缺少必要参数' };
  }

  const convCol = db.collection('conversations');
  const msgCol = db.collection('messages');

  try {
    // 验证会话存在且用户是成员
    const { data: conv } = await convCol.doc(conversationId).get();
    if (!conv.members || !conv.members.includes(openid)) {
      return { code: 403, success: false, message: '无权在此会话中发言' };
    }

    const toOpenid = conv.members.find((m) => m !== openid);

    // 写入消息
    const msgData = {
      conversationId,
      from: openid,
      to: toOpenid,
      content,
      type,
      read: false,
      createTime: db.serverDate(),
    };

    const { _id } = await msgCol.add({ data: msgData });
    msgData._id = _id;

    // 更新会话：最后消息、未读计数
    const unreadUpdate = {};
    unreadUpdate[`unreadCount.${toOpenid}`] = _.inc(1);

    await convCol.doc(conversationId).update({
      data: {
        lastMessage: type === 'text' ? content : '[图片]',
        lastTime: db.serverDate(),
        updateTime: db.serverDate(),
        ...unreadUpdate,
      },
    });

    return {
      code: 200,
      success: true,
      data: { message: msgData },
    };
  } catch (err) {
    return { code: 500, success: false, message: '发送消息失败：' + err.message };
  }
}

/**
 * 获取会话消息列表（分页，倒序）
 * @param {string} openid
 * @param {string} conversationId
 * @param {number} page
 * @param {number} pageSize
 */
async function getMessages(openid, conversationId, page = 1, pageSize = 20) {
  if (!conversationId) {
    return { code: 400, success: false, message: '缺少会话ID' };
  }

  const convCol = db.collection('conversations');
  const msgCol = db.collection('messages');

  try {
    // 验证权限
    const { data: conv } = await convCol.doc(conversationId).get();
    if (!conv.members || !conv.members.includes(openid)) {
      return { code: 403, success: false, message: '无权查看此会话' };
    }

    const query = { conversationId };
    const { total } = await msgCol.where(query).count();

    // 消息按时间正序排列，分页取最新的
    // 先算出需要跳过多少条
    const skip = Math.max(0, total - page * pageSize);
    const limit = total - skip;

    const { data: list } = await msgCol
      .where(query)
      .orderBy('createTime', 'asc')
      .skip(skip)
      .limit(Math.min(limit, pageSize))
      .get();

    return {
      code: 200,
      success: true,
      data: {
        list,
        total,
        page,
        pageSize,
        hasMore: skip > 0,
      },
    };
  } catch (err) {
    return { code: 500, success: false, message: '获取消息失败：' + err.message };
  }
}

/**
 * 标记会话消息为已读
 * @param {string} openid
 * @param {string} conversationId
 */
async function markRead(openid, conversationId) {
  if (!conversationId) {
    return { code: 400, success: false, message: '缺少会话ID' };
  }

  const convCol = db.collection('conversations');
  const msgCol = db.collection('messages');

  try {
    // 将对方发来的未读消息标记为已读
    await msgCol
      .where({
        conversationId,
        to: openid,
        read: false,
      })
      .update({ data: { read: true } });

    // 重置会话中自己的未读计数
    const unreadReset = {};
    unreadReset[`unreadCount.${openid}`] = 0;

    await convCol.doc(conversationId).update({
      data: unreadReset,
    });

    return { code: 200, success: true, message: '已标记为已读' };
  } catch (err) {
    return { code: 500, success: false, message: '标记已读失败：' + err.message };
  }
}

/**
 * 获取当前用户总未读消息数
 * @param {string} openid
 */
async function getUnreadCount(openid) {
  const convCol = db.collection('conversations');

  try {
    // 查询当前用户参与的所有会话
    const { data: convs } = await convCol.where({ members: openid }).get();

    let total = 0;
    convs.forEach((conv) => {
      total += (conv.unreadCount && conv.unreadCount[openid]) || 0;
    });

    return {
      code: 200,
      success: true,
      data: { unreadCount: total },
    };
  } catch (err) {
    return { code: 500, success: false, message: '获取未读数失败：' + err.message };
  }
}
