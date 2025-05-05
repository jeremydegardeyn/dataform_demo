const { TRG_PROJECT_ID,DQ_DATASET } = require("includes/constants.js");

publish("test_table2")
  .schema("dataform")
  .query("SELECT 1 AS test") // Defines the query
  .type("table") // Sets the query's type, defaujlt is view
  .dependencies(["crime"]) // Specifies dataset dependencies, this has to exist in the dataform workflow
  .columns({"test": "Value is 1"}) // column desc
  ;

publish("test_table2_view")
  .schema("dataform")
  .query(ctx => `SELECT * FROM ${ctx.ref("test_table2")}`)
  ;

declare({
  schema: "dataform",
  name: "input1"
});

assert("action_assertion1")
  .schema("dataform_assertions")
  .query("select * from "+TRG_PROJECT_ID+".dataform.test_table2 where test is null")
  .dependencies(["test_table2"])
  ;

operate("action_operation1")
  .queries("insert into dataform.test_table2(test)values(2);insert into dataform.test_table2(test)values(5)")
  .dependencies(["test_table2"])
  ;

test("action_test1")
  .dataset("test_table2")
  .input("input_data", "select test from "+TRG_PROJECT_ID+".dataform.test_table2 where test = 1")
  .expect("select 1 as test")
  ;