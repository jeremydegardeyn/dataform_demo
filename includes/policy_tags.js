const datagovProject = "strongsville-city-schools"
const pi_taxonomy = "8678378231237580896"
const regulatory_delete_taxonomy = "7693680332137469110"

const pi_base = "projects/" + datagovProject + "/locations/us/taxonomies/" + pi_taxonomy + "/policyTags/"
const regulatory_delete_base = "projects/" + datagovProject + "/locations/us/taxonomies/" + regulatory_delete_taxonomy + "/policyTags/"

const regulatory_delete_email_address_id = regulatory_delete_base + "5923396026180915396"
const regulatory_delete_customer_id = regulatory_delete_base + "1939754752863472770"

const email_address_id = pi_base +  "5641304534866435701"
const location = pi_base + "7960051088540944825"
const street_address = pi_base + "5252551267560698124"
const person_name = pi_base + "8681289058619599169"
const first_name = pi_base + "2502069886258682258"
const last_name = pi_base + "4965122447105377438"
const phone_number = pi_base + "3363490109226205199"

module.exports = { 
    datagovProject, 
    regulatory_delete_email_address_id,
    regulatory_delete_customer_id,
    email_address_id,
    location,
    street_address,
    person_name,
    first_name,
    last_name,
    phone_number
};