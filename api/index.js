const app = require('../backend/app');
const db = require('../backend/models');

// Sync database tables on first invocation
let dbSynced = false;

const handler = async (req, res) => {
  try {
    if (!dbSynced) {
      await db.sequelize.sync({ force: false });
      dbSynced = true;
    }
    return app(req, res);
  } catch (err) {
    console.error('Function error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

module.exports = handler;
