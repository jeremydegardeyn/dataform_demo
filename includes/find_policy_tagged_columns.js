/**
 * Returns a new BigQuery client instance.
 * @returns {Promise<BigQuery>}
 */
async function createBigQueryClient() {
  const { BigQuery } = require("@google-cloud/bigquery");
  return new BigQuery();
}

/**
 * Returns a new Data Catalog PolicyTagManagerClient instance.
 * @returns {Promise<PolicyTagManagerClient>}
 */
async function createDataCatalogClient() {
  const { PolicyTagManagerClient } = require("@google-cloud/datacatalog");
  return new PolicyTagManagerClient();
}

/**
 * Fetch policy tag display name & description from Data Catalog.
 * @param {string} policyTagId - Full resource name of the policy tag.
 * @returns {Promise<{display_name: string, description: string}>}
 */
async function getPolicyTagDetails(policyTagId) {
  const client = await createDataCatalogClient();
  const [policyTag] = await client.getPolicyTag({ name: policyTagId });
  return {
    display_name: policyTag.displayName,
    description: policyTag.description || ""
  };
}

/**
 * Recursively finds all columns in a schema that have policy tags.
 * Handles nested RECORD/STRUCT fields and repeated fields.
 * @param {Array} schema - Array of BigQuery schema field definitions.
 * @param {string} parentPath - Path prefix for nested fields.
 * @returns {Promise<Array<{path: string, policyTag: string}>>}
 */
async function findColumnsWithPolicyTags(schema, parentPath = "") {
  let columnsWithPolicyTags = [];

  for (const field of schema) {
    const fieldName = field.name;
    const fieldType = field.type;
    const fullPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;

    if (field.policyTags && field.policyTags.names && field.policyTags.names.length > 0) {
      for (const tag of field.policyTags.names) {
        const details = await getPolicyTagDetails(tag);
        columnsWithPolicyTags.push({
          path: fullPath,
          policyTag: details.display_name
        });
      }
    }

    // Dive deeper into nested fields
    if (fieldType === "RECORD" && field.fields) {
      columnsWithPolicyTags = columnsWithPolicyTags.concat(
        await findColumnsWithPolicyTags(field.fields, fullPath)
      );
    }

    if (field.mode === "REPEATED" && field.fields) {
      columnsWithPolicyTags = columnsWithPolicyTags.concat(
        await findColumnsWithPolicyTags(field.fields, fullPath)
      );
    }
  }

  return columnsWithPolicyTags;
}

/**
 * Get a BigQuery table schema and return all columns with policy tags.
 * @param {string} projectId
 * @param {string} datasetId
 * @param {string} tableId
 * @returns {Promise<Array<{path: string, policyTag: string}>>}
 */
async function getPolicyTaggedColumnsFromTable(projectId, datasetId, tableId) {
  const bq = await createBigQueryClient();
  const dataset = bq.dataset(datasetId, { projectId });
  const table = dataset.table(tableId, { projectId });
  const [tableMetadata] = await table.get();
  return await findColumnsWithPolicyTags(tableMetadata.metadata.schema.fields || []);
}

/**
 * Write the output of getPolicyTaggedColumnsFromTable to a BigQuery table.
 * The target table must exist with schema: path STRING, policyTag STRING.
 * @param {string} sourceProject
 * @param {string} sourceDataset
 * @param {string} sourceTable
 * @param {string} targetProject
 * @param {string} targetDataset
 * @param {string} targetTable
 */
async function writePolicyTaggedColumnsToTable(sourceProject, sourceDataset, sourceTable) {
  const bq = await createBigQueryClient();

  const data = await getPolicyTaggedColumnsFromTable(sourceProject, sourceDataset, sourceTable);

  if (data.length === 0) {
    console.log("No policy tagged columns found, nothing to write.");
    return;
  }

  // Prepare rows for insertion
  const rows = data.map(({ path, policyTag }) => ({ path, policyTag }));

  const dataset = bq.dataset(sourceDataset, { projectId: sourcetProject });
  const table = dataset.table("policy_tag_test", { projectId: sourceProject });

  // Insert rows into the target table
  try {
    await table.insert(rows);
    console.log(`Inserted ${rows.length} rows into ${targetProject}.${targetDataset}.policy_tag_test`);
  } catch (error) {
    console.error("Error inserting rows:", error);
    throw error;
  }

  // return 'select "hello world"';
}

// function generateDynamicSQL(sourceProject, sourceDataset, sourceTable) {
//   getPolicyTaggedColumnsFromTable(sourceProject, sourceDataset, sourceTable)

//   return `SELECT 1 FROM ${sourceProject}.${sourceDataset}.${sourceTable}`;
// }

 function generateDynamicSQL(sourceProject, sourceDataset, sourceTable) {

  //const bq =  createBigQueryClient();
  const { BigQuery } = require("@google-cloud/bigquery");
  const bq = new BigQuery();
  const dataset = bq.dataset(sourceDataset, { sourceProject });
  const table = dataset.table(sourceTable, { sourceProject });
  const [tableMetadata] =  table.get();

  return `SELECT 1 FROM ${sourceProject}.${sourceDataset}.${sourceTable}`;
  
  // const policyTaggedColumns = await getPolicyTaggedColumnsFromTable(
  //   sourceProject,
  //   sourceDataset,
  //   sourceTable
  // );

  // if (!policyTaggedColumns || policyTaggedColumns.length === 0) {
  //   return `SELECT "No policy tags found" AS message`;
  // }

  // // Turn the array into a SQL VALUES list
  // const valuesSql = policyTaggedColumns
  //   .map(({ path, policyTag }) => `("${path}", "${policyTag}")`)
  //   .join(",\n");

  // return `
  //   WITH policy_tags AS (
  //     SELECT * FROM UNNEST([
  //       STRUCT(path STRING, policyTag STRING)
  //       ${valuesSql}
  //     ])
  //   )
  //   SELECT * FROM policy_tags
  // `;
}


module.exports = {
  createBigQueryClient,
  createDataCatalogClient,
  getPolicyTagDetails,
  findColumnsWithPolicyTags,
  getPolicyTaggedColumnsFromTable,
  writePolicyTaggedColumnsToTable,
  generateDynamicSQL
};
