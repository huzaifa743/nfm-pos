const { masterDbHelpers } = require('./tenantManager');

/**
 * Log an activity for superadmin visibility.
 * @param {string} actorType - 'super_admin' | 'admin'
 * @param {number} actorId - id in super_admins or admins table
 * @param {string} actorUsername - username for display
 * @param {string} action - e.g. 'tenant_request_created', 'tenant_approved', 'tenant_rejected', 'tenant_status_changed', 'credentials_changed'
 * @param {string} [targetType] - 'tenant', 'admin', 'super_admin'
 * @param {number} [targetId]
 * @param {object} [details] - optional JSON-serializable details
 */
async function logActivity(actorType, actorId, actorUsername, action, targetType = null, targetId = null, details = null) {
  const detailsStr = details ? JSON.stringify(details) : null;
  await masterDbHelpers.run(
    `INSERT INTO activity_log (actor_type, actor_id, actor_username, action, target_type, target_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [actorType, actorId, actorUsername, action, targetType, targetId, detailsStr]
  );
}

/**
 * Get activity log (superadmin only). Optional filters.
 */
async function getActivityLog(limit = 200, offset = 0, actorType = null, action = null) {
  let sql = 'SELECT * FROM activity_log WHERE 1=1';
  const params = [];
  if (actorType) {
    sql += ' AND actor_type = ?';
    params.push(actorType);
  }
  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return masterDbHelpers.query(sql, params);
}

module.exports = { logActivity, getActivityLog };
