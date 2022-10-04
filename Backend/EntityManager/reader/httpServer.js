/*
 *    Date: 2016 05 31
 * Project: Nodas - EntityReader
 *
 * Copyright 2016 SIT srl
 */

var ModName = "HttpServer";

// Modules
var _exp = require("express");
var _bodyParser = require("body-parser");
var _entityHolder = require("../lib/entityHolder");
var _authentication = require("../lib/authentication").authentication;

// Module variables
var _auth = null;
var _log = null;
var _ws = _exp();

// Configure http server (middleware cookie-parser NOT installed)
_ws.use(_bodyParser.urlencoded({extended:false}));
_ws.use(_bodyParser.json());

/*
 * Public function.
 */
function start(opt,callback)
{
  var config = opt.config;
  var emConf = opt.emConf;
  var port = config.EReader.port;

  _log = opt.log;
  
  // Start http server
  _ws.listen(port);

  _log.info(ModName+" -");
  _log.info(ModName+" - =====================");
  _log.info(ModName+" - started on port "+port);
  _log.info(ModName+" - =====================");
  _log.info(ModName+" -");

  // Create crud
  var crudClass = require(emConf.crud.path).Crud;

  var crud = new crudClass(
  {
    log: _log,
    moduleCfg: emConf
  });

  // Init entity holder
  _entityHolder.init(crud,_log,emConf.crud.defSchema,
    config.Env,emConf.smtp,emConf.attachment);

  // Create authentication object
  var authConf = emConf.authentication;

  authConf.cookieName = config.Auth.cookieName;
  authConf.innerToken = config.Auth.innerToken;

  _auth = new _authentication({
    log: _log,
    crud: crud,
    authConf: authConf
  });

  // Open db connection
  crud.open(function(err)
  {
    callback(err);
  });
}

exports.start = start;


/**
 * Server routing.
 */
_ws.get("/session/isValid",function(req,res)
{
  _log.info(ModName+" - GET "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(crErr,crRes)
  {
    if (crErr)
      _log.error(ModName+" - "+crErr.message);

    res.send({result: crErr ? false : true});
  });
});


_ws.get("/login/userInfo", function(req, res)
{
  _log.info(ModName+" - GET "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(checkErr,checkRes)
  {
    if (checkErr)
    {
      res.sendStatus(401);
      return;
    }

    var params = {token: _auth.getTokenFromReq(req)};

    _entityHolder.execute("login","userInfo",params,function(exRes)
    {
      if (exRes) res.send(exRes);
      else res.sendStatus(404);
    });
  });
});


_ws.get("/camera/stream/:type",function(req,res)
{
  _log.info(ModName+" - GET "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(crErr,crRes)
  {
    if (crErr)
    {
      res.sendStatus(401);
      return;
    }

    /* Call camera stream */
    var exOpt =
    {
      id: req.query.id,
      type: req.params.type,
      sysuser_id: crRes ? crRes.result.sysuser_id : null,
      req: req,
      res: res
    };

    _entityHolder.execute("camera","stream",exOpt,function(exRes)
    {
      if (exRes) res.send(exRes)
      else res.sendStatus(404);
    });
  });
});


// Possible method: count/master/export
_ws.get("/:entity/:method",function(req,res)
{
  var entity = req.params.entity;
  var method = req.params.method;

  _log.info(ModName+" - GET "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(checkErr,checkRes)
  {
    if (checkErr)
    {
      res.sendStatus(401);
      return;
    }

    var params =
    {
      req: req,
      object: req.query,
      sysuser_id: checkRes ? checkRes.result.sysuser_id : null
    };

    _entityHolder.execute(entity,method,params,function(exRes)
    {
      if (exRes != null)
      {
        if (method == "export")
          res.attachment(entity+".csv");

        res.send(exRes);
      }
      else
        res.sendStatus(404);
    });
  });
});

// Possible method: count/master/export
_ws.post("/:entity/:method",function(req,res)
{
  var entity = req.params.entity;
  var method = req.params.method;

  _log.info(ModName+" - POST "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(checkErr,checkRes)
  {
    if (checkErr)
    {
      res.sendStatus(401);
      return;
    }

    // Add query params to body, to send them to entity
    for (var key in req.query)
      req.body[key] = req.query[key];

    var params =
    {
      req: req,
      object: req.body,
      sysuser_id: checkRes ? checkRes.result.sysuser_id : null
    };

    _entityHolder.execute(entity,method,params,function(exRes)
    {
      if (exRes != null)
      {
        if (method == "export")
          res.attachment(entity+".csv");

        res.send(exRes);
      }
      else
        res.sendStatus(404);
    });
  });
});

// Passable method: detail/wholeDetail
_ws.get("/:entity/:method/:id", function(req,res)
{
  var entity = req.params.entity;
  var method = req.params.method;
  var id = req.params.id;

  _log.info(ModName+" - GET "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(checkErr,checkRes)
  {
    if (checkErr)
    {
      res.sendStatus(401);
      return;
    }

    var params = {object:req.query, req:req, id:id};

    _entityHolder.execute(entity,method,params,function(exRes)
    {
      if (exRes) res.send(exRes);
      else res.sendStatus(404);
    });
  });
});

/*
 * Download/Get file.
 * method: download (default) or getFile
 */
_ws.get("/:entity/:entityId/:method/:filename",function(req,res)
{
  _log.info(ModName+" - GET "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(checkErr,checkRes)
  {
    if (checkErr)
    {
      res.sendStatus(401);
      return;
    }

    var fileName = req.query.file ? req.query.file : req.params.filename;
    var params =
    {
      req: req,
      object: req.query,
      filename: fileName,
      entity_id: req.params.entityId,
      sysuser_id: checkRes ? checkRes.result.sysuser_id : null
    };

    _entityHolder.execute(req.params.entity,"download",params,function(exRes)
    {
      if (!exRes)
      {
        res.sendStatus(404);
      }
      else
      {
        if (req.params.method == "getFile")
          res.sendfile(exRes);
        else
          res.download(exRes,fileName);
      }
    });
  });
});

/*
 * Get now timestamp from server.
 */
_ws.get("/getNow",function(req,res)
{
  _log.info(ModName+" - GET "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(checkErr,checkRes)
  {
    if (checkErr)
    {
      res.sendStatus(401);
      return;
    }

    res.send({result: new Date().getTime()});
  });
});
