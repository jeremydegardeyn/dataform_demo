// Hash helper
const hashExpr = ref => `TO_HEX(SHA256(CAST(${ref} AS STRING)))`;

/**
 * Build child field expressions for a (possibly nested) STRUCT.
 * @param {Array<object>} fields      BigQuery field objects
 * @param {string[]} piiPaths         Full PII paths (e.g. "struct1.column2")
 * @param {string} matchBase          Absolute path base for this struct (e.g. "struct1" or "outer.inner")
 * @param {string} refBase            SQL reference base for this struct (e.g. "struct1" or "x" or "x.child")
 * @returns {string[]}                ["<expr> AS child1", "<expr> AS child2", ...]
 */
function buildStructFieldsExpr(fields, piiPaths, matchBase, refBase) {
  const out = [];

  for (const child of fields || []) {
    const childMatch = `${matchBase}.${child.name}`;      // absolute path for matching
    const childRef   = `${refBase}.${child.name}`;        // SQL reference for value

    // Repeated STRUCT
    if (child.type === "RECORD" && child.mode === "REPEATED") {
      const inner = buildRowStructFieldsExpr(child.fields, piiPaths, childMatch, "y");
      out.push(
        `ARRAY(SELECT AS STRUCT ${inner.join(", ")} FROM UNNEST(${childRef}) AS y) AS ${child.name}`
      );
      continue;
    }

    // Non-repeated STRUCT
    if (child.type === "RECORD" && child.mode !== "REPEATED") {
      const nested = buildStructFieldsExpr(child.fields, piiPaths, childMatch, childRef);
      out.push(`STRUCT(${nested.join(", ")}) AS ${child.name}`);
      continue;
    }

    // Repeated primitive
    if (child.mode === "REPEATED" && child.type !== "RECORD") {
      if (piiPaths.includes(childMatch)) {
        out.push(
          `ARRAY(SELECT ${hashExpr("z")} FROM UNNEST(${childRef}) AS z) AS ${child.name}`
        );
      } else {
        out.push(`${childRef} AS ${child.name}`);
      }
      continue;
    }

    // Primitive
    if (piiPaths.includes(childMatch)) {
      out.push(`${hashExpr(childRef)} AS ${child.name}`);
    } else {
      out.push(`${childRef} AS ${child.name}`);
    }
  }

  return out;
}

/**
 * Build child expressions for one row of a REPEATED STRUCT (row alias provided).
 * @param {Array<object>} fields
 * @param {string[]} piiPaths
 * @param {string} matchBase   absolute path (e.g. "struct1")
 * @param {string} rowAlias    alias inside UNNEST (e.g. "x","y")
 */
function buildRowStructFieldsExpr(fields, piiPaths, matchBase, rowAlias) {
  // refBase is the row alias; absolute matchBase stays absolute
  return buildStructFieldsExpr(fields, piiPaths, matchBase, rowAlias);
}

/**
 * Top-level field expression builder.
 * @param {object} field       BigQuery field object
 * @param {string[]} piiPaths
 * @returns {string}           "<expr> AS field_name"
 */
function buildTopFieldExpr(field, piiPaths) {
  const full = field.name;

  // Repeated STRUCT
  if (field.type === "RECORD" && field.mode === "REPEATED") {
    const inner = buildRowStructFieldsExpr(field.fields, piiPaths, full, "x");
    return `ARRAY(SELECT AS STRUCT ${inner.join(", ")} FROM UNNEST(${full}) AS x) AS ${field.name}`;
  }

  // Non-repeated STRUCT
  if (field.type === "RECORD" && field.mode !== "REPEATED") {
    const nested = buildStructFieldsExpr(field.fields, piiPaths, full, full);
    return `STRUCT(${nested.join(", ")}) AS ${field.name}`;
  }

  // Repeated primitive
  if (field.mode === "REPEATED" && field.type !== "RECORD") {
    if (piiPaths.includes(full)) {
      return `ARRAY(SELECT ${hashExpr("x")} FROM UNNEST(${full}) AS x) AS ${field.name}`;
    }
    return `${full} AS ${field.name}`;
  }

  // Primitive
  if (piiPaths.includes(full)) {
    return `${hashExpr(full)} AS ${field.name}`;
  }
  return `${full} AS ${field.name}`;
}

/**
 * Generate CREATE OR REPLACE ... SELECT that scrubs all PII paths.
 * @param {string} projectId
 * @param {string} datasetId
 * @param {string} tableId
 * @param {string[]} piiPaths
 * @param {Array<object>} schema   BigQuery schema (fields array)
 */
function generateRecursiveHashSQL(tablePath, piiPaths, schema) {
  const selectItems = (schema || []).map(f => buildTopFieldExpr(f, piiPaths));
  return `CREATE OR REPLACE TABLE ${tablePath} AS SELECT ${selectItems.join(",\n  ")} FROM ${tablePath}`;
}

/**
 * Generate a MERGE that scrubs PII paths only for affected rows.
 * @param {string} tablePath   fully qualified table name
 * @param {string[]} piiPaths  list of PII paths (absolute)
 * @param {Array<object>} schema   BigQuery schema (fields array)
 * @param {string} whereClause condition for affected rows (e.g. "id = 27")
 */
function generateRecursiveHashMergeSQL(tablePath, piiPaths, schema) {
  // Build select with scrubbed fields
  const selectItems = (schema || []).map(f => buildTopFieldExpr(f, piiPaths));
  const scrubSelect = `SELECT ${selectItems.join(",\n  ")} FROM ${tablePath} WHERE id = 1`;

  // Wrap in MERGE
  return `
MERGE ${tablePath} AS T
USING (${scrubSelect}) AS S
ON T.id = S.id
WHEN MATCHED THEN UPDATE SET
  ${schema.map(f => `${f.name} = S.${f.name}`).join(",\n  ")}
`;
}

module.exports = { generateRecursiveHashSQL, generateRecursiveHashMergeSQL };
