var express = require("express"),
    fs = require("fs"),
    bodyParser = require("body-parser"),
    app = express(),
    __profile = __dirname + "/profile"

app.use(express.static(__dirname + "/src/generic"))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

app.get("/",function(req,res) {
    res.redirect(301,"freshtab.html")
})

app.get("/js/environment.js",function(req,res) {
    fs.readFile(__dirname + "/src/environment/development.js","utf8",function(error,data){
        res.send(data)
    })
})

app.post("/telemetry",function(req,res) {
    console.log(JSON.stringify(req.body))

    res.send("{}")
})

app.get("/fs/mkdir",function(req,res) {
    try {
        fs.mkdirSync(__profile + "/" + req.query.folder)

        res.send("true")
    }
    catch(ex) {
        res.send("false")
    }
})

app.get("/fs/read",function(req,res) {
    fs.readFile(__profile + "/" + req.query.folder + "/" + req.query.file,"utf8",function(error,data){
        if (error) throw error

        res.send(data)
    })
})

app.get("/fs/write",function(req,res) {
    fs.writeFile(__profile + "/" + req.query.folder + "/" + req.query.file,req.query.content,"utf8",function(err){
        if (err) res.send("false")

        res.send("true")
    })
})

app.get("/fs/exists",function(req,res) {
    var exists = fs.existsSync(__profile + "/" + req.query.folder + "/" + req.query.file)

    res.send(exists?"true":"false")
})

app.get("*",function(req,res){
    res.status(404).send()
})

var server = app.listen(3000,function(){
    var host = server.address().address, port = server.address().port

    console.log("Listening at http://%s:%s", host, port)
})
