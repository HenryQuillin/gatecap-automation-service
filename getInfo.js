const Airtable = require("airtable");
const axios = require("axios");
const puppeteer = require("puppeteer-extra");

// Add stealth plugin and use defaults
const pluginStealth = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");

var base = new Airtable({
  apiKey:
    "pat6UUeva3HgsCP0B.08d49df5c164666ce8e2415f9a3e0800bb43afbf190450b4be31cd79bccd75fd",
}).base("appKfm9gouHkcTC42");

async function getInfo(req, res) {
  try {
    let record = await base("Deal Flow").find(req.body.newlyAddedRecordID);
    let recordName = record.fields["Name"];
    recordName = "yellowheart";
    const permalink = await getUUID(recordName);

    // await getBasicInfo(permalink);

    const data = await scrapePage(permalink);
    console.log(data);
    updateAirtable(data, req.body.newlyAddedRecordID);

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
    .launch({ headless: "new", executablePath: executablePath() })
    .then(async (browser) => {
      const page = await browser.newPage();

      await page.goto("https://www.crunchbase.com/login", {
        waitUntil: "networkidle2",
        timeout: 12000,
      });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "screenshot.png" });

      try {
        await page.type("#mat-input-5", "alfred@gate-cap.com");
        await page.type("#mat-input-6", "KVVE@9810Fm6pKs4");

        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle0" }),
          page.click(".login"),
        ]);

        await page.goto(
          "https://www.crunchbase.com/discover/organization.companies",
          { waitUntil: "networkidle2", timeout: 12000 }
        );

        await page.type("#mat-input-1", permalink);
        await page.keyboard.press("Enter");

        await page.waitForTimeout(1000);

        let headers = await page.$$eval(
          "grid-column-header > .header-contents > div",
          (elements) =>
            elements.filter((e) => e.innerText).map((e) => e.innerText)
        );
        let contents = await page.$$eval(
          "grid-row > grid-cell > div > field-formatter",
          (elements) => elements.map((e) => e.innerText)
        );

        let res = {};
        for (let i = 0; i < contents.length; i++) {
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
    url: `https://api.crunchbase.com/api/v4/entities/organizations/${permalink}?field_ids=short_description%2C%20twitter%2C%20linkedin%2C%20facebook%2C%20image_url\n`,
    headers: {
      "X-cb-user-key": "9011e1fdbe5146865162bb45b036aa92",
      Cookie: "cid=CiheL2R/ki9+eQAaGtHbAg==",
    },
  };
  try {
    const response = await axios.request(config);
    const data = response.data;
    let flatData = { ...data.properties, ...data.properties.identifier };

    delete flatData.identifier;

    return flatData;
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
