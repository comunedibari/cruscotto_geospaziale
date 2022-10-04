/*
 *    Date: 2016 05 31
 * Project: Nodas - EntityManager
 *
 * Copyright 2016 SIT srl
 */

var ModName = "EntityHolder";

var _fs = require("fs");
var _mailer = require("core/mailer");
var _httpClient = require("core/httpClient");
var _eventSender = require("core/eventSender");
var _csvStringify = require("csv-stringify");

var _log = null;
var _defSchema = null;
var _entityTable = {}
var _entityOptions = null;

/*
 * Initialize entity holder.
 */
function init(crud,log,defSchema,envConf,smtpConf,attachmentConf)
{
  _log = log;
  _defSchema = defSchema ? defSchema : "public";

  // Configure mailer
  _mailer.configure(smtpConf);

  // Init eventSender
  _eventSender.init(_log);

  // Init httpClient
  _httpClient.init(_log);

  // Initialize entity options with general options
  _entityOptions =
  {
    log: _log,
    crud: crud,
    env: envConf,
    mailer: _mailer,
    httpClient: _httpClient,
    attachment: attachmentConf,
    eventSender: _eventSender,
    csvStringify: _csvStringify,
    entityHolder: this
  };
}

/*
 * Get entity with given name.
 */
function getEntity(name)
{
  if (_entityTable[name])
    return _entityTable[name];

  // Load entity
  var fileName = "entity/" + name + ".js";

  try
  {
    var entityClass = require(fileName)[name];
    var entityObj = new entityClass(_defSchema);

    entityObj.init(_entityOptions);

    // Store entity
    _entityTable[name] = entityObj;

    // Return entity
    _log.info(ModName+" - Loaded succesfully entity "+name);

    return entityObj;
  }
  catch (err)
  {
    _log.error(ModName+" - Cannot load entity "+name+": "+err.message);
    return null;
  }
}

/*
 * Execute an entity method with given params.
 */
function execute(entityName,method,params,callback)
{
  var headLog = ModName + " - execute " + entityName + "/" + method + " - ";
  var entityObj = getEntity(entityName);

  if (!entityObj)
  {
    callback(null);
    return;
  }

  // Check for method presence into entity
  if (!entityObj[method])
  {
    _log.error(headLog+entityName+" doesn't have method "+method);
    callback(null);
  }
  else
  {
    // Invoke method on entity
    entityObj[method](params,function(eErr,eRes)
    {
      if (eErr)
      {
        // stringify because message could is an object
        _log.error(headLog + "Error: " + JSON.stringify(eErr.message));

        callback({error: eErr.message});
        return;
      }

      _log.info(headLog + "Done");
      callback(eRes);
    });
  }
}

/*
 * Exports.
 */
exports.init = init;
exports.execute = execute;
exports.getEntity = getEntity;
