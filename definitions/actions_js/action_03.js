const { SRC_PROJECT_ID,DQ_DATASET } = require("includes/constants.js");

var q = "select * from "+SRC_PROJECT_ID+"."+DQ_DATASET+".springer";



publish("springer")
  //.schema("dataform")
  .schema(DQ_DATASET)
  .query(q)
  .type("table")
  ;