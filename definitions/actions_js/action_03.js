const { TRG_PROJECT_ID,DATASET } = require("includes/constants.js");

var q = "select * from "+TRG_PROJECT_ID+"."+DATASET+".springer";



publish("springer")
  .schema("dataform")
  .query(q)
  .type("table")
  ;