const express = require("express");

const bodyParser = require("body-parser");
const { getArticles } = require("./getArticles");
const { getInfo } = require("./getInfo");


const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/extract", (req, res) => {
  getArticles(req, res);
});
  
app.post("/getinfo", async (req, res) => {
  getInfo(req, res);
});

// eslint-disable-next-line no-undef
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, () => console.log("App listening on port " + port));
