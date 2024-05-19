// just an example to illustrate it is possible to define and call repeatable functions
function dummy() {
  return `"x"`;
}

// another function example showing dynamic sql content can be generated
// in a way this can act as a framework
function render_script(table, dimensions, metrics_min, metrics_max, metrics_dcount) {
    return `
        select
        ${dimensions.map(field => `${field} as ${field}`).join(",")},
        ${metrics_min.map(field => `min(${field}) as min_${field}`).join(",\n")},
        ${metrics_max.map(field => `max(${field}) as max_${field}`).join(",\n")},
        ${metrics_dcount.map(field => `count(distinct ${field}) as dcount_${field}`).join(",\n")},
        from ${table}
        group by ${dimensions.map((field, i) => `${i + 1}`).join(", ")}
      `;
}

// this statement is necessary to make the functions available to the rest of the repo
module.exports = { dummy , render_script };