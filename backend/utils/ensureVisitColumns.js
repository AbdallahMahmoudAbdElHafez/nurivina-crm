// استكمال أعمدة الزيارات القديمة دون تغيير الأعمدة أو البيانات الموجودة.
const visitColumns = [
  'status',
  'approval_type',
  'rejection_reason',
  'deviation_meters',
  'created_doctor_id',
  'created_clinic_id',
  'exit_lat',
  'exit_lng',
  'exit_at',
  'visit_outcome',
];

async function ensureVisitColumns(db) {
  const qi = db.sequelize.getQueryInterface();
  const table = await qi.describeTable('visits');
  const attributes = db.visit.getAttributes();

  for (const column of visitColumns) {
    if (table[column]) continue;

    const attribute = attributes[column];
    const definition = { type: attribute.type, allowNull: attribute.allowNull };
    if (attribute.defaultValue !== undefined) definition.defaultValue = attribute.defaultValue;

    try {
      await qi.addColumn('visits', column, definition);
    } catch (err) {
      // قد يضيف مثيل Vercel آخر العمود نفسه بعد قراءة وصف الجدول.
      const cause = err.original || err.parent || err;
      if (cause.code !== 'ER_DUP_FIELDNAME' && cause.errno !== 1060) throw err;
    }
  }
}

function createVisitSchemaInitializer(db) {
  let initialization = null;
  return () => {
    if (!initialization) {
      initialization = ensureVisitColumns(db).catch((err) => {
        // السماح بالمحاولة مجدداً بعد عودة الاتصال أو إصلاح صلاحيات قاعدة البيانات.
        initialization = null;
        throw err;
      });
    }
    return initialization;
  };
}

module.exports = { createVisitSchemaInitializer };
