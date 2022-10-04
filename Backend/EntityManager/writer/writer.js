/*
 *    Date: 2016 06 06
 * Project: Nodas - EntityWriter
 *
 * Copyright 2016 SIT srl
 */

var ModName = "EntityWriter";

// Modules
var _config = require("config/config.json");
var _emConf = require("config/emConf.json");
var _logger = require("core/log.js");

/*
 * Create log.
 */
var _log = null;

try
{
  _log = _logger.createLogger(
    _config.Log.path,
    _emConf.writer.logProperties.fileName,
    _emConf.writer.logProperties.category
  );
}
catch (err)
{
  console.log(ModName+": CANNOT create log: " + err.message);
  process.exit(-1);
}

/*
 * Create http server.
 */
var _httpSrv = require("./httpServer.js");

_httpSrv.init({config:_config, emConf:_emConf, log:_log},function(err)
{
  if (err)
  {
    _log.error("CANNOT init http server: " + err.message);
    process.exit(-1);
  }
});

/*
 * Extend Date object prototype.
 */
Date.prototype.toCustomString = function()
{
  var year = this.getFullYear(),
    mon = ("0" + (this.getMonth()+1)).slice(-2),
    day = ("0" + this.getDate()).slice(-2),
    hou = ("0" + this.getHours()).slice(-2),
    min = ("0" + this.getMinutes()).slice(-2);

  if (hou == "00" && min == "00" && this.getSeconds() == 0)
    return day + "/" + mon + "/" + year;

  return day + "/" + mon + "/" + year + " " + hou + ":" + min;
}