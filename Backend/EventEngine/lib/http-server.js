/*
 *    Date: 2016 09 27
 * Project: Nodas - EventEngine
 *
 * Copyright 2016 SIT srl
 */

var ModName = "HttpServer";

/* Modules */
var _bodyParser = require("body-parser");
var _exp = require("express")();
var _srv = require("http").createServer(_exp);
var _sio = require("socket.io")(_srv);
var _eng = require("./engine");
var _log = null;

// Configure express
_exp.use(_bodyParser.urlencoded({extended:false}));
_exp.use(_bodyParser.json());

/*
 * Public function.
 */
function start(opt)
{
  _log = opt.log;

  /* Initialise engine */
  _eng.init(opt);

  /* Add socket.io event handler */
  _sio.on("connection",function(client)
  {
    _log.info(ModName+" - client "+client.id+" connected");

    client.on("message",function(msg)
    {
      console.info("Message from client "+client.id+":");
      console.info(msg);
    });

    client.on("disconnect",function()
    {
      _log.info(ModName+" - client "+client.id+" disconnected");
    });
  });

  /* Start http server */
  var port = opt.config.EEngine.port;

  _srv.listen(port);

  _log.info(ModName+" - =====================");
  _log.info(ModName+" - started on port "+port);
  _log.info(ModName+" - =====================");
}

exports.start = start;

/*
 * Server routing.
 */
_exp.post("/event/:type",function(req,res)
{
  _log.info(ModName+" - POST "+req.url+" from "+req.connection.remoteAddress);

  var type = req.params.type;
  var event = req.body;

  // Debug
  _log.debug(ModName+" - "+JSON.stringify(event));

  /* Send response */
  res.send({result: "ok"});

  /*
   * Process event
   */
  _eng.run(event,function(err)
  {
    if (!err)
    {
      /* Notify event to connected client */
      _log.info(ModName+" - Notify event to connected client");
      _sio.emit("event",event);
    }
  });
});

/*
_exp.get("/test",function(req,res)
{
  _log.info(ModName+" - GET "+req.url+" from "+req.connection.remoteAddress);

  res.sendfile("lib/test.html");
});
*/
