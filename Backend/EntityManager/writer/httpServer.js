/*
 *    Date: 2016 06 06
 * Project: Nodas - EntityWriter
 *
 * Copyright 2016 SIT srl
 */

var ModName = "HttpServer";

// Modules
var _exp = require("express");
var _multer = require("multer");
var _emConf = require("config/emConf.json"); //essential for multer
var _bodyParser = require("body-parser");
var _entityHolder = require("../lib/entityHolder");
var _authentication = require("../lib/authentication").authentication;

// Module variables
var _auth = null;
var _log = null;
var _ws = _exp();

// Configure http server (middleware cookie-parser NOT installed)
_ws.use(_multer({dest: _emConf.attachment.path}).any());
_ws.use(_bodyParser.urlencoded({extended: false}));
_ws.use(_bodyParser.json({limit:"1mb"}));
_ws.use(_bodyParser.text());

/*
 * Public function.
 */
function init(opt,callback)
{
  var config = opt.config;
  var emConf = opt.emConf;

  _log = opt.log;
  

  // Configure and start http server
  var port = config.EWriter.port;
  var server = _ws.listen(port);
  server.setTimeout(600000);

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

  _auth = new _authentication(
  {
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

exports.init = init;

/*
 * Server routing.
 */

// Passable method: insert|newPassword
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

    var params =
    {
      req: req,
      query: req.query,
      object: req.body,
      sio_id: req.headers["it_app_sio"],
      sysuser_id: checkRes ? checkRes.result.sysuser_id : null
    };

    _entityHolder.execute(entity,method,params,function(exRes)
    {
      if (exRes) res.send(exRes);
      else res.sendStatus(404);
    });
  });
});

// Passable method: update
_ws.put("/:entity/:method/:id",function(req,res)
{
  var entity = req.params.entity;
  var method = req.params.method;

  _log.info(ModName+" - PUT "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(checkErr,checkRes)
  {
    if (checkErr)
    {
      res.sendStatus(401);
      return;
    }

    var params =
    {
      id: req.params.id,
      req: req,
      object: req.body,
      query: req.query,
      sio_id: req.headers["it_app_sio"],
      sysuser_id: checkRes ? checkRes.result.sysuser_id : null
    };

    _entityHolder.execute(entity,method,params,function(exRes)
    {
      if (exRes) res.send(exRes);
      else res.sendStatus(404);
    });
  });
});

// Passable method: delete|logicDelete
_ws.delete("/:entity/:method/:id",function(req,res)
{
  var entity = req.params.entity;
  var method = req.params.method;

  _log.info(ModName+" - DELETE "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(checkErr,checkRes)
  {
    if (checkErr)
    {
      res.sendStatus(401);
      return;
    }

    var params =
    {
      id: req.params.id,
      req: req,
      object: req.query,
      sio_id: req.headers["it_app_sio"],
      sysuser_id: checkRes ? checkRes.result.sysuser_id : null
    };

    _entityHolder.execute(entity,method,params,function(exRes)
    {
      if (exRes) res.send(exRes);
      else res.sendStatus(404);
    });
  });
});

/*
 * Attachment (insert/upload, update, delete).
 */
_ws.post("/:entity/:entityId/:method",function(req,res)
{
  _log.info(ModName+" - POST "+req.url+" from "+req.connection.remoteAddress);

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
      body: req.body,
      files: req.files,
      entity_id: req.params.entityId,
      sysuser_id: checkRes ? checkRes.result.sysuser_id : null
    };

    _entityHolder.execute(req.params.entity,req.params.method,params,function(exRes)
    {
      if (exRes)
      {
        res.set("Content-Type","text/html");
        res.send(exRes);
      }
      else
        res.sendStatus(404);
    });
  });
});

_ws.put("/:entity/attach/update/:attachId",function(req,res)
{
  _log.info(ModName+" - PUT "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(checkErr,checkRes)
  {
    if (checkErr)
    {
      res.sendStatus(401);
      return;
    }

    var params =
    {
      object: req.body,
      attach_id: req.params.attachId,
      sysuser_id: checkRes ? checkRes.result.sysuser_id : null
    };

    _entityHolder.execute(req.params.entity,"updateAttach",params,function(exRes)
    {
      if (exRes)
      {
        res.set("Content-Type","text/html");
        res.send(exRes);
      }
      else
        res.sendStatus(404);
    });
  });
});

_ws.delete("/:entity/attach/delete/:attachId",function(req,res)
{
  _log.info(ModName+" - DELETE "+req.url+" from "+req.connection.remoteAddress);

  _auth.checkRequest(req,function(checkErr,checkRes)
  {
    if (checkErr)
    {
      res.sendStatus(401);
      return;
    }

    var params =
    {
      object: req.query,
      attach_id: req.params.attachId,
      sysuser_id: checkRes ? checkRes.result.sysuser_id : null
    };

    _entityHolder.execute(req.params.entity,"deleteAttach",params,function(exRes)
    {
      if (exRes)
      {
        res.set("Content-Type","text/html");
        res.send(exRes);
      }
      else
        res.sendStatus(404);
    });
  });
});
