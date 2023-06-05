const express = require("express");

const bodyParser = require("body-parser");
const { getArticles } = require("./getArticles");

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/extract", (req, res) => {
  getArticles(req, res);
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, () => console.log("App listening on port " + port));
