const test = require('node:test');
const assert = require('node:assert/strict');
const { createVisitSchemaInitializer } = require('./ensureVisitColumns');
const defineVisitModel = require('../models/visits.model');

let attributes;
defineVisitModel({ define: (_name, definition) => { attributes = definition; return {}; } }, {
  INTEGER: 'INTEGER', TINYINT: 'TINYINT', TEXT: 'TEXT', FLOAT: 'FLOAT', DATE: 'DATE', DATEONLY: 'DATEONLY',
  STRING: (length) => `VARCHAR(${length})`,
});

const completionColumns = ['exit_lat', 'exit_lng', 'exit_at', 'visit_outcome'];

function makeDatabase() {
  const table = Object.fromEntries(Object.keys(attributes)
    .filter((column) => !completionColumns.includes(column))
    .map((column) => [column, { ...attributes[column] }]));
  const added = [];
  let descriptions = 0;
  const qi = {
    async describeTable(tableName) {
      assert.equal(tableName, 'visits');
      descriptions++;
      return { ...table };
    },
    async addColumn(tableName, column, definition) {
      assert.equal(tableName, 'visits');
      if (table[column]) {
        throw Object.assign(new Error('Duplicate column'), { original: { code: 'ER_DUP_FIELDNAME', errno: 1060 } });
      }
      table[column] = definition;
      added.push(column);
    },
  };
  return { table, added, qi, get descriptions() { return descriptions; },
    db: { sequelize: { getQueryInterface: () => qi }, visit: { getAttributes: () => attributes } },
  };
}

test('upgrades an old visits table by adding only the four missing completion columns', async () => {
  const fixture = makeDatabase();
  const existingStatus = fixture.table.status;
  await createVisitSchemaInitializer(fixture.db)();

  assert.deepEqual(fixture.added, completionColumns);
  assert.equal(fixture.table.status, existingStatus);
  assert.deepEqual(fixture.table.exit_lat, { type: 'FLOAT', allowNull: true });
  assert.deepEqual(fixture.table.exit_at, { type: 'DATE', allowNull: true });
  assert.deepEqual(fixture.table.visit_outcome, { type: 'VARCHAR(30)', allowNull: true });
});

test('concurrent requests wait for the same initialization and subsequent requests reuse it', async () => {
  const fixture = makeDatabase();
  const initialize = createVisitSchemaInitializer(fixture.db);
  await Promise.all([initialize(), initialize(), initialize()]);
  await initialize();

  assert.equal(fixture.descriptions, 1);
  assert.deepEqual(fixture.added, completionColumns);
});

test('a database already containing the columns receives no schema changes', async () => {
  const fixture = makeDatabase();
  for (const column of completionColumns) fixture.table[column] = attributes[column];
  await createVisitSchemaInitializer(fixture.db)();
  assert.deepEqual(fixture.added, []);
});

test('separate Vercel instances tolerate a column added concurrently by another instance', async () => {
  const fixture = makeDatabase();
  await Promise.all([
    createVisitSchemaInitializer(fixture.db)(),
    createVisitSchemaInitializer(fixture.db)(),
  ]);
  assert.deepEqual(fixture.added, completionColumns);
});

test('a failed initialization reports the error and resumes after a later retry', async () => {
  const fixture = makeDatabase();
  const addColumn = fixture.qi.addColumn;
  let fail = true;
  fixture.qi.addColumn = async (...args) => {
    if (args[1] === 'exit_lng' && fail) {
      fail = false;
      throw Object.assign(new Error('ALTER permission denied'), { original: { code: 'ER_TABLEACCESS_DENIED_ERROR' } });
    }
    return addColumn(...args);
  };
  const initialize = createVisitSchemaInitializer(fixture.db);
  await assert.rejects(initialize(), /ALTER permission denied/);
  assert.deepEqual(fixture.added, ['exit_lat']);

  await initialize();
  assert.equal(fixture.descriptions, 2);
  assert.deepEqual(fixture.added, completionColumns);
});
