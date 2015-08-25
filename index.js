var express = require("express"),
    request = require("request"),
    app = express()

app.use(express.static(__dirname + "/build/dev"))
app.use("/views", express.static(__dirname + "/views"))
app.use("/generic", express.static(__dirname + "/generic"))
app.use("/mobile", express.static(__dirname + "/specific/mobile"))
app.use("/ios", express.static(__dirname + "/build/dev/tool_iOS"))
app.set("views", __dirname + "/views");
app.set("view engine", "jade");

app.get("/",function(req,res) {
    res.render("index")
})

app.get("/m",function(req,res) {
    res.render("mobile")
})

app.get("/ios",function(req,res) {
    res.render("ios")
})

app.get("/proxy",function(req,res){
    request(req.query.url).pipe(res)
})

app.get("*",function(req,res){
    res.status(404).send()
})

var server = app.listen(3000,function(){
    var host = server.address().address, port = server.address().port

    console.log("Listening at http://%s:%s", host, port)
})
