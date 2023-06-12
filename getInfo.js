const Airtable = require("airtable");
const axios = require("axios");
const puppeteer = require("puppeteer-extra");

// Add stealth plugin and use defaults
const pluginStealth = require("puppeteer-extra-plugin-stealth");

var base = new Airtable({
  apiKey:
    "pat6UUeva3HgsCP0B.08d49df5c164666ce8e2415f9a3e0800bb43afbf190450b4be31cd79bccd75fd",
}).base("appKfm9gouHkcTC42");

async function getInfo(req, res) {
  try {
    let record = await base("Deal Flow").find(req.body.newlyAddedRecordID);
    let recordName = record.fields["Name"];
    const permalink = await getUUID(recordName);

    const data1 = await getBasicInfo(permalink);

    const data2 = await scrapePage(permalink);
    const data = { ...data1, ...data2 };
    console.log(data);
    await updateAirtable(data, req.body.newlyAddedRecordID);

    res.json({ status: "success" });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
}

async function getUUID(name) {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://api.crunchbase.com/api/v4/autocompletes?query=${encodeURIComponent(
      name
    )}&collection_ids=organizations&limit=1`,
    headers: {
      "X-cb-user-key": "9011e1fdbe5146865162bb45b036aa92",
    },
  };

  try {
    let response = await axios.request(config);
    return response.data.entities[0].identifier.permalink;
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  getInfo: getInfo,
};

async function scrapePage(permalink) {
  puppeteer.use(pluginStealth());
  return puppeteer
    .launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    .then(async (browser) => {
      const page = await browser.newPage();
      // await page.screenshot({ path: "screenshot.png" });

      await page.goto("https://www.crunchbase.com/login", {
        waitUntil: "networkidle2",
        timeout: 22000,
      });

      await page.screenshot({ path: "screenshot.png" });

      try {
        await page.type("#mat-input-5", "alfred@gate-cap.com");
        await page.type("#mat-input-6", "KVVE@9810Fm6pKs4");
        await page.screenshot({ path: "screenshot.png" });

        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle0" }),
          page.click(".login"),
        ]);

        await page.goto(
          "https://www.crunchbase.com/discover/saved/view-for-automation/2fe3a89b-0a52-4f11-b3e7-b7ec2777f00a",
          { waitUntil: "networkidle2", timeout: 25000 }
        );

        await page.type("#mat-input-1", permalink);
        await page.keyboard.press("Enter");

        await page.waitForTimeout(1500);

        let headers = await page.$$eval(
          "grid-column-header > .header-contents > div",
          (elements) => {
            let validElements = elements
              .filter((e) => e.innerText)
              .map((e) => e.innerText);

            if (validElements[validElements.length - 1] === "ADD COLUMN") {
              validElements.pop();
            }

            return validElements;
          }
        );

        let contents = await page.$$eval(
          "grid-row:first-of-type > grid-cell > div > field-formatter",
          (elements) => elements.map((e) => e.innerText)
        );

        let res = {};
        for (let i = 0; i < headers.length; i++) {
          res[headers[i]] = contents[i];
        }
        await page.close();

        return res;
      } catch (error) {
        console.log(error);
      }

      return {};
    });
}

async function getBasicInfo(permalink) {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://api.crunchbase.com/api/v4/entities/organizations/${permalink}?field_ids=facebook%2Ctwitter%2Clinkedin%2Cshort_description%2Cimage_url`,
    headers: {
      "X-cb-user-key": "9011e1fdbe5146865162bb45b036aa92",
      Cookie: "cid=CiheL2R/ki9+eQAaGtHbAg==",
    },
  };
  try {
    const response = await axios.request(config);
    const data = response.data;
    let websiteUrl = data.properties.website_url || "—";
    let imageUrl = data.properties.image_url || "";
    let linkedin =
      (data.properties.linkedin && data.properties.linkedin.value) || "—";
    let facebook =
      (data.properties.facebook && data.properties.facebook.value) || "—";
    let twitter =
      (data.properties.twitter && data.properties.twitter.value) || "—";
    let description = data.properties.short_description || "—";
    let dataToReturn = {
      "Website URL": websiteUrl,
      "Logo URL": imageUrl,
      Linkedin: linkedin,
      Facebook: facebook,
      Twitter: twitter,
      Description: description,
      Logo: [
        {
          url: imageUrl,
          filename: "Logo",
        },
      ],
      "Diligence Status": "Pending",
    };
    return dataToReturn;
  } catch (error) {
    console.log("Failed the crunchbase.com/api/v4/entities request" + error);
  }
}

async function updateAirtable(data, recordID) {
  console.log("updateAirtable ran");
  base("Deal Flow").update(
    [
      {
        id: recordID,
        fields: data,
      },
    ],
    function (err, records) {
      if (err) {
        console.error(err);
        return;
      }
      records.forEach(function (record) {
        console.log("Updated ", record.get("Name"));
      });
    }
  );
}
