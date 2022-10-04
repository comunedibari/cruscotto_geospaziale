/*
 *    Date: 2016 09 27
 * Project: Nodas - EventEngine
 *
 * Copyright 2016 SIT srl
 */

// Modules
var _config = require("config/config.json");
var _eeConf = require("config/eeConf.json");
var _logger = require("core/log.js");

/*
 * Create log.
 */
var _log = null;

try
{
  _log = _logger.createLogger(
    _config.Log.path,
    _eeConf.Log.filename,
    _eeConf.Log.category
  );
}
catch (err)
{
  console.log("CANNOT create log: " + err.message);
  process.exit(-1);
}

/*
 * Start http server.
 */
require("./lib/http-server").start({
  evmCfg: _eeConf,
  config: _config,
  log: _log
});
