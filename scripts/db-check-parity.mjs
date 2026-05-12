import postgres from "postgres";

const leftUrl = process.env.DB_PARITY_LEFT_URL?.trim();
const rightUrl = process.env.DB_PARITY_RIGHT_URL?.trim();
const leftName = process.env.DB_PARITY_LEFT_NAME?.trim() || "left";
const rightName = process.env.DB_PARITY_RIGHT_NAME?.trim() || "right";

if (!leftUrl || !rightUrl) {
  console.error("DB_PARITY_LEFT_URL and DB_PARITY_RIGHT_URL are required.");
  process.exit(1);
}

async function snapshot(url) {
  const sql = postgres(url, { ssl: "require", max: 1, connect_timeout: 45 });
  try {
    const cols = await sql.unsafe(`
      select table_name, column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema='public'
      order by table_name, ordinal_position
    `);
    const indexes = await sql.unsafe(`
      select tablename as table_name, indexname
      from pg_indexes
      where schemaname='public'
      order by tablename, indexname
    `);
    return { cols, indexes };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const [left, right] = await Promise.all([snapshot(leftUrl), snapshot(rightUrl)]);

const keyCol = (r) => `${r.table_name}.${r.column_name}|${r.data_type}|${r.is_nullable}`;
const keyIdx = (r) => `${r.table_name}.${r.indexname}`;

const leftCols = new Set(left.cols.map(keyCol));
const rightCols = new Set(right.cols.map(keyCol));
const leftIdx = new Set(left.indexes.map(keyIdx));
const rightIdx = new Set(right.indexes.map(keyIdx));

const onlyLeftCols = [...leftCols].filter((k) => !rightCols.has(k));
const onlyRightCols = [...rightCols].filter((k) => !leftCols.has(k));
const onlyLeftIdx = [...leftIdx].filter((k) => !rightIdx.has(k));
const onlyRightIdx = [...rightIdx].filter((k) => !leftIdx.has(k));

if (onlyLeftCols.length || onlyRightCols.length || onlyLeftIdx.length || onlyRightIdx.length) {
  console.error(`db-check-parity: mismatch between ${leftName} and ${rightName}`);
  if (onlyLeftCols.length) console.error(`Only in ${leftName} columns:`, onlyLeftCols.join(", "));
  if (onlyRightCols.length) console.error(`Only in ${rightName} columns:`, onlyRightCols.join(", "));
  if (onlyLeftIdx.length) console.error(`Only in ${leftName} indexes:`, onlyLeftIdx.join(", "));
  if (onlyRightIdx.length) console.error(`Only in ${rightName} indexes:`, onlyRightIdx.join(", "));
  process.exit(1);
}

console.log(`db-check-parity: ok (${leftName} == ${rightName})`);
