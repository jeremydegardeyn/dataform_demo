/**
 * Generate a MERGE that scrubs PII paths only for affected rows.
 * @param {string} tablePath   fully qualified table name
 * @param {string[]} piiPaths  list of PII paths (absolute)
 * @param {Array<object>} schema   BigQuery schema (fields array)
 * @param {string} whereClause condition for affected rows (e.g. "id = 27")
 */
function generateRecursiveHashMergeSQL(tablePath, piiPaths, schema, whereClause) {
  // Build select with scrubbed fields
  const selectItems = (schema || []).map(f => buildTopFieldExpr(f, piiPaths));
  const scrubSelect = `SELECT ${selectItems.join(",\n  ")} FROM ${tablePath} WHERE ${whereClause}`;

  // Wrap in MERGE
  return `
MERGE ${tablePath} AS T
USING (${scrubSelect}) AS S
ON T.id = S.id
WHEN MATCHED THEN UPDATE SET
  ${schema.map(f => `${f.name} = S.${f.name}`).join(",\n  ")}
`;
}

module.exports = { generateRecursiveHashMergeSQL };
