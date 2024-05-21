// you can see the dependency metadata is figured at the RTCIceGatherer
// my thinking is, this means we cannot create a dynamic list and loop thru each of those
// the list has to be a hard coded cont
const datasetNames = ["2016", "2017"];

operate("action_operation2")
  .queries("update staging.stg_schedules set year=2017 where extract(month from starttime)=4")
  .dependencies(["stg_schedules"])
  ;

operate("action_operation3")
  .queries("create or replace table dataform.schedules_years as (select distinct year from staging.stg_schedules)")
  .dependencies(["stg_schedules"])
  ;

datasetNames.forEach(datasetNames => {
  publish("stg_schedules_" + datasetNames).query(
    ctx => `
      select * 
      from ${ctx.ref("stg_schedules")}
      where year = 
    ` + datasetNames
  );
});
