
const Airtable = require("airtable");
const axios = require("axios");
var base = new Airtable({
  apiKey:
    "pat6UUeva3HgsCP0B.08d49df5c164666ce8e2415f9a3e0800bb43afbf190450b4be31cd79bccd75fd",
}).base("appKfm9gouHkcTC42");


async function getInfo(req, res) {

  try {
    let record = await base("Deal Flow").find(req.body.newlyAddedRecordID);
    const recordName = record.fields["Name"];
    const permalink = await getUUID(recordName);
    res.status(200).json(permalink);
    


  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }

}

async function getUUID(name) {
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `https://api.crunchbase.com/api/v4/autocompletes?query=${encodeURIComponent(name)}&collection_ids=organizations&limit=1`,
    headers: { 
      'X-cb-user-key': '9011e1fdbe5146865162bb45b036aa92'
    }
  };

  try {
    let response = await axios.request(config);
    console.log(JSON.stringify(response.data.entities[0]));
    return response.data.entities[0].identifier.permalink;
  } catch (error) {
    console.error(error);
  }
}

  // try {
  //   let record = await base("Deal Flow").find(req.body.newlyAddedRecordID);
  //   const recordName = record.fields["Name"];
  //   let data = JSON.stringify({
  //     field_ids: [
  //       "identifier",
  //       "short_description",
  //       "website_url",
  //       "twitter",
  //       "linkedin",
  //       "facebook",
  //       "image_url",
  //     ],
  //     order: [
  //       {
  //         field_id: "rank_org",
  //         sort: "asc",
  //       },
  //     ],
  //     query: [
  //       {
  //         type: "predicate",
  //         field_id: "identifier",
  //         operator_id: "includes",
  //         values: [recordName],
  //       },
  //       {
  //         type: "predicate",
  //         field_id: "facet_ids",
  //         operator_id: "includes",
  //         values: ["company"],
  //       },
  //     ],
  //     limit: 50,
  //   });
  //   let config = {
  //     method: "post",
  //     maxBodyLength: Infinity,
  //     url: "https://api.crunchbase.com/api/v4/searches/organizations",
  //     headers: {
  //       "X-cb-user-key": "9011e1fdbe5146865162bb45b036aa92",
  //       "Content-Type": "application/json",
  //     },
  //     data: data,
  //   };
  
  //   let response = await axios.request(config);
  
  //   if (response.statusText == "OK") {
  //     let data = await response.data;
  //     if (data.entities && data.entities.length > 0) {
  //       data = data.entities[0];
  
  
  //       updateAirtable(record.id, data, base);
  //       res.send("Success");
  
  
  //     } else {
  //       console.error("No entities found in first API response");
  //     }
  //   } else {
  //     console.error(
  //       "First API request failed:",
  //       response.status,
  //       response.statusText
  //     );
  //   }



  // } catch (error) {
  //   console.error(error);
  // }



function updateAirtable(id, data, base){
  let websiteUrl = data.properties.website_url || "";
  let imageUrl = data.properties.image_url || "";
  let linkedin = data.properties.linkedin.value || "";
  let facebook = data.properties.facebook.value || "";
  let twitter = data.properties.twitter.value || "";
  let description = data.properties.short_description || "";

  base("Deal Flow").update([
    {
      id: id,
      fields: {
        "Website URL": websiteUrl,
        "Logo URL": imageUrl,
        Linkedin: linkedin,
        Facebook: facebook,
        Twitter: twitter,
        Description: description,
        "Diligence Status": "Pending" ,
        Logo: [
          {
            url: imageUrl,
            filename: "Logo",
          },
        ],
      },
    },
  ], function(err, records) {
    if (err) {
      console.error(err);
      return;
    }
    records.forEach(function(record) {
      console.log(record.get("Title"));
    });
  });
  
}


module.exports = {
  getInfo: getInfo,
};
2;
