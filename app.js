const express = require('express');

const bodyParser = require('body-parser');
const Airtable = require('airtable');

const app = express();
app.use(bodyParser.json({limit: '10mb'}));
const cheerio = require('cheerio');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.post('/extract', (req, res) => {
    getArticlesV2(req, res);


});

function getArticlesV2(req, res) { 
    const html = req.body.html;
    const $ = cheerio.load(html);
    let articles = [];
    
    let linkElements = $("td:nth-child(2) > table > tbody > tr:nth-child(1) > td > a");
    let titleElements = $("td:nth-child(2) > table > tbody > tr:nth-child(1) > td > a");
    let previewElements = $("td:nth-child(2) > table > tbody > tr:nth-child(2) > td");
    let sourceElements = $("td:nth-child(2) > table > tbody > tr:nth-child(3) > td:nth-child(1) > a");

    for (let i = 0; i < linkElements.length; i++) {
        let article = {
            "type": "",
            "title": $(titleElements[i]).text(),
            "content_preview": $(previewElements[i]).text(),
            "source": $(sourceElements[i]).text(),
            "link": $(linkElements[i]).attr('href')
        };
        
        // get the type of content
        let typeElement = $(titleElements[i].parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode).prevAll('tr').filter(function() {
            let type = $(this).find('td > table > tbody > tr > td:nth-child(1)').text().trim().toLowerCase();
            return type === 'news' || type === 'blogs' || type === 'twitter' || type === 'discussion';
        }).first();
        
        if (typeElement.length > 0) {
            article.type = typeElement.find('td > table > tbody > tr > td:nth-child(1)').text().trim().toLowerCase();
        }
        
        articles.push(article);
    }
    updateAirtable(articles);
    res.json(articles);
     
}




function getArticlesV1(req, res) { 
    const html = req.body.html;
    const alertQueryString = getAlertQueryString(req.body.subject);
    const company = getCompany(alertQueryString);
    const $ = cheerio.load(html);
    let articles = [];
    
    let linkElements = $("td:nth-child(2) > table > tbody > tr:nth-child(1) > td > a");
    let titleElements = $("td:nth-child(2) > table > tbody > tr:nth-child(1) > td > a");
    let previewElements = $("td:nth-child(2) > table > tbody > tr:nth-child(2) > td");
    let sourceElements = $("td:nth-child(2) > table > tbody > tr:nth-child(3) > td:nth-child(1) > a");

    for (let i = 0; i < linkElements.length; i++) {
        let article = {
            "company": company,
            "alertQueryString": alertQueryString,
            "type": "News",
            "title": $(titleElements[i]).text(),
            "content_preview": $(previewElements[i]).text(),
            "source": $(sourceElements[i]).text(),
            "link": $(linkElements[i]).attr('href')
        };
        articles.push(article);
    }
    updateAirtable(articles);

    res.json(articles);
}


const base = new Airtable({ apiKey: 'pat6UUeva3HgsCP0B.08d49df5c164666ce8e2415f9a3e0800bb43afbf190450b4be31cd79bccd75fd' }).base('appKfm9gouHkcTC42');
function updateAirtable(articles) {
    articles.forEach(article => {
        base('News Log').create({
                "Company": article.company,
                "Alert Query String": article.alertQueryString,
                "Type": article.type,
                "Title": article.title,
                "Content Preview": article.content_preview,
                "Source": article.source,
                "Link": article.link

        }, function(err, record) {
            if (err) { console.error(err); return; }
            console.log(record.getId());
        });
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
    const portfolioCompanies = ["HamsaPay", "Prime Trust", "Figure", "Decent DAO", "Engiven", "Provenance", "RareMint", "Banq", "Coinroutes"];
    let companyFound = null;

    portfolioCompanies.forEach(company => {
        if (alertQuery.includes(company)) {
            companyFound = company;
        }
    });

    return companyFound;
}
  



let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, () => console.log('App listening on port '+port));