const Airtable = require("airtable");
const cheerio = require("cheerio");
const stringSimilarity = require('string-similarity');
let table = "News Log";
// eslint-disable-next-line no-undef
let port = process.env.PORT;
if (port == null || port == "") {
  table = "News Log - Dev";
}


function getArticles(req, res) {
  const alertEmailURL =
    "https://mail.google.com/mail/u/3/#inbox/" + req.body.alertEmailID;
  const html = req.body.html;
  const $ = cheerio.load(html);
  const alertQueryString = getAlertQueryString(req.body.subject);
  const company = getCompany(alertQueryString);

  let linkElements = $(
    "td:nth-child(2) > table > tbody > tr:nth-child(1) > td > a"
  );
  let titleElements = $(
    "td:nth-child(2) > table > tbody > tr:nth-child(1) > td > a"
  );
  let previewElements = $(
    "td:nth-child(2) > table > tbody > tr:nth-child(2) > td"
  );
  let sourceElements = $(
    "td:nth-child(2) > table > tbody > tr:nth-child(3) > td:nth-child(1) > a"
  );
  let dateElements = $(
    "td:nth-child(2) > table > tbody > tr:nth-child(3) > td:nth-child(1)"
  );
  let groupedArticles = new Map();

  for (let i = 0; i < linkElements.length; i++) {
    let article = {
      type: "",
      title: $(titleElements[i]).text(),
      content_preview: $(previewElements[i]).text(),
      source: $(sourceElements[i]).text(),
      link: $(linkElements[i]).attr("href"),
      company: company,
      alertQueryString: alertQueryString,
      alertEmailURL: alertEmailURL,
      date: getDate($(dateElements[i]).text()),
    };

    // get the type of content
    let typeElement = $(
      titleElements[i].parentNode.parentNode.parentNode.parentNode.parentNode
        .parentNode.parentNode.parentNode.parentNode.parentNode
    )
      .prevAll("tr")
      .filter(function () {
        let type = $(this)
          .find("td > table > tbody > tr > td:nth-child(1)")
          .text()
          .trim()
          .toLowerCase();
        return (
          type === "news" ||
          type === "blogs" ||
          type === "twitter" ||
          type === "discussions"
        );
      })
      .first();

    if (typeElement.length > 0) {
      article.type = typeElement
        .find("td > table > tbody > tr > td:nth-child(1)")
        .text()
        .trim()
        .toLowerCase();
    }
    let similarKey = getSimilarKey(groupedArticles, article.title, article.content_preview);
    if (similarKey) {
      groupedArticles.get(similarKey).push(article);
    } else {
      groupedArticles.set(article.title + "_" + article.content_preview, [article]);
    }
  }

  let articlesToSave = [];

  // Now iterate over the map and create a single article for each group
  groupedArticles.forEach((articles) => {
    // Start with the first article in the group
    let articleToSave = articles[0];

    // If there are more articles in the group, concatenate their sources and links
    if (articles.length > 1) {
      for (let i = 1; i < articles.length; i++) {
        articleToSave.source += ", " + articles[i].source;
        articleToSave.link += ", " + articles[i].link;
      }
    }

    articlesToSave.push(articleToSave);
  });

  updateAirtable(articlesToSave);
  res.json(articlesToSave);
}

const base = new Airtable({
  apiKey:
    "pat6UUeva3HgsCP0B.08d49df5c164666ce8e2415f9a3e0800bb43afbf190450b4be31cd79bccd75fd",
}).base("appKfm9gouHkcTC42");
function updateAirtable(articles) {
  articles.forEach((article) => {
    base(table).create(
      {
        Company: article.company,
        "Alert Query String": article.alertQueryString,
        Type: article.type,
        Title: article.title,
        "Content Preview": article.content_preview,
        Source: article.source,
        Link: article.link,
        "Alert Email URL": article.alertEmailURL,
        Date: article.date,
      },
      function (err, record) {
        if (err) {
          console.error(err);
          return;
        }
        console.log(record.getId());
      }
    );
  });
}

function getAlertQueryString(subject) {
  // Extract the query string from the subject
  const match = subject.match(/\[Talkwalker Alerts\] Alert for (.+)/);
  if (match) {
    return match[1];
  } else {
    return null;
  }
}

function getCompany(alertQuery) {
  const portfolioCompanies = [
    "HamsaPay",
    "Prime Trust",
    "Figure",
    "Decent DAO",
    "Engiven",
    "Provenance",
    "RareMint",
    "Banq",
    "CoinRoutes",
  ];
  let companyFound = null;

  portfolioCompanies.forEach((company) => {
    if (alertQuery.toLowerCase().includes(company.toLowerCase())) {
      companyFound = company;
    }
  });

  return companyFound;
}
function getDate(dateString) {
  // Create a new Date object
  var date = new Date(dateString.split(" | ")[0]);

  // Get the year, month, and day
  var year = date.getFullYear();
  var month = date.getMonth() + 1; // getMonth returns a 0-based index
  var day = date.getDate();

  // Get the hours and minutes
  var hours = date.getHours();
  var minutes = date.getMinutes();

  // Pad the month, day, hours and minutes with leading zeros if necessary
  if (month < 10) month = "0" + month;
  if (day < 10) day = "0" + day;
  if (hours < 10) hours = "0" + hours;
  if (minutes < 10) minutes = "0" + minutes;

  // Return the formatted date and time
  return year + "-" + month + "-" + day;
}


function getSimilarKey(groupedArticles, title, contentPreview) {
  const titleSimilarityThreshold = 0.7;  // adjust this value to fit your needs
  const contentSimilarityThreshold = 0.7;  // adjust this value to fit your needs
  let similarKey = null;

  groupedArticles.forEach((_, key) => {
    const [groupKeyTitle, groupKeyContent] = key.split("_");
    const titleSimilarity = stringSimilarity.compareTwoStrings(groupKeyTitle, title);
    const contentSimilarity = stringSimilarity.compareTwoStrings(groupKeyContent, contentPreview);
    if (titleSimilarity > titleSimilarityThreshold || contentSimilarity > contentSimilarityThreshold) {
      similarKey = key;
    }
  });

  return similarKey;
}



module.exports = {
  getArticles: getArticles,
};
