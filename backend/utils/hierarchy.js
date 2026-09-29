const db = require('../models');

/**
 * Returns an array of user_ids that the given user has access to.
 * - Admin: null (meaning full access to all users / no filter)
 * - Manager: [managerId, ...all subordinate IDs (recursive)]
 * - Rep / User: [userId]
 */
const getAccessibleUserIds = async (user) => {
  if (!user) return [];
  const userId = user.user_id || user.id;

  // Verify latest role from DB in case token is stale
  let role = user.role;
  if (userId) {
    const dbUser = await db.user.findByPk(userId, { attributes: ['user_id', 'role'] });
    if (dbUser) {
      role = dbUser.role;
    }
  }

  if (role === 'admin') {
    return null; // null = full access (no filter)
  }

  if (role === 'manager') {
    const subordinateIds = await getAllSubordinateIds(userId);
    return [userId, ...subordinateIds];
  }

  // Regular user / rep
  return [userId];
};

/**
 * Recursively fetch all subordinate user IDs under a manager.
 */
const getAllSubordinateIds = async (managerId) => {
  const subordinates = await db.user.findAll({
    where: { manager_id: managerId },
    attributes: ['user_id', 'role'],
  });

  let ids = [];
  for (const sub of subordinates) {
    ids.push(sub.user_id);
    if (sub.role === 'manager') {
      const nested = await getAllSubordinateIds(sub.user_id);
      ids.push(...nested);
    }
  }

  return [...new Set(ids)];
};

module.exports = {
  getAccessibleUserIds,
  getAllSubordinateIds,
};
