/*
 *    Date: 2018 05 07
 * Project: Nodas - EventEngine
 *
 * Copyright 2018 SIT srl
 */

var ModName = "Engine";

/* Modules */
var _hc = require("core/httpClient");
var _cfg = null;
var _log = null;

/*
 * Public functions
 */
function init(opt)
{
  _cfg = opt.config;
  _log = opt.log;

  /* Initialize http client */
  _hc.init(opt.log);
}

function run(event,callback)
{
  try
  {
    var module = require("event/"+event.type);
    var modOpt = {
      hc: _hc,
      cfg: _cfg,
      log: _log,
      event: event
    };

    /* Run module */
    _log.info(ModName+" - Run module "+event.type);

    module.run(modOpt,function(err)
    {
      if (err)
      {
        _log.error(ModName+" - Module "+event.type+": "+err.message);
        callback(err);
      }
      else
        save(event,callback);
    });
  }
  catch (err)
  {
    if (err.code != "MODULE_NOT_FOUND")
    {
      _log.error(ModName+" - Cannot run module "+event.type+": "+err.message);
      callback(err);
    }
    else
      save(event,callback);
  }
}

exports.init = init;
exports.run = run;

/*
 * Private functions
 */
function save(event,callback)
{
  var hcOpt = {
    host: _cfg.EWriter.host,
    port: _cfg.EWriter.port,
    path: "/event/insert",
    headers: {
      "content-type": "application/json",
      [_cfg.Auth.cookieName]: _cfg.Auth.innerToken
    }
  };

  _hc.post(hcOpt,JSON.stringify(event),function(hcRes)
  {
    var hcResObj = hcRes ? JSON.parse(hcRes) : null;

    if (hcResObj && hcResObj.result && hcResObj.result.id)
    {
      event.id = hcResObj.result.id;
      callback();
    }
    else
    {
      _log.error(ModName+" - Save event res: "+hcRes);
      callback({message: "Save error"});
    }
  });
}
