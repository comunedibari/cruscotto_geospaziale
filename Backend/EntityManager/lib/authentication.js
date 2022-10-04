/*
 *    Date: 2016 05 31
 *  Author: Giuseppe Falcone
 * Project: Nodas - EntityManager
 *
 * Copyright 2016 SIT srl
 */

var _log = null;
var _crud = null;
var _authConf = {};

var authentication = function(options)
{
  _log  = options.log;
  _crud = options.crud;
  _authConf = options.authConf;

  // Class attributes
  this.moduleName = "authentication";
  this.dbSchema = _authConf.dbSchema ? _authConf.dbSchema : "public";

  this.crudUtils = require("./crudUtils");
  this.funcUtils = require("core/funcUtils");

  // Entity methods that don't need authentication
  this.whiteEntity = {
    i18n: ["master"],
    auth: ["newPassword"],
    login: ["doLogin","doLoginNew","getToken"],
    userExt: ["getUserOtherwiseAdd"],
    wgLayer: ["download","getFile"],
    wgStyle: ["polygonSLD"],
    wgLegend: ["image"],
    wgLegendClass: ["image"],
    vipUser: ["login"],
    landfill: ["cityList"],
    loginWSO2:["check"]
  };
}

/*
 * Check the request to verify:
 * 1. if IP request address is into white list;
 * 2. if entity method is in white list;
 * 3. if the user sessions is expired.
 */
authentication.prototype.checkRequest = function(req, callback)
{
  var self = this;

  // Check IP address
  if (_authConf.whiteListIP.indexOf(req.connection.remoteAddress) >= 0)
  {
    _log.info(self.moduleName+ " - "+req.connection.remoteAddress+
      " is in white list; bypass token control.");

    // IP is in white list -> check token is unnecessary
    callback(null,null);
    return;
  }

  // Check entity method
  var entity = req.params.entity;
  var method = req.params.method;

  if (entity && method)
  {
    var aMethod = self.whiteEntity[entity];

    if (aMethod && aMethod.indexOf(method) >= 0)
    {
      callback(null,null);
      return;
    }
  }

  // recovery token from request
  var token = self.getTokenFromReq(req);

  // verify token presence
  if (token == null)
  {
    _log.error(self.moduleName + " - missing token from request");

    callback({message:"missing token from request"},null);
    return;
  }

  if (token == _authConf.innerToken)
  {
    // token is equal to innerToken -> request sent from system inner module
    callback(null,null);
    return;
  }

  // verify if session is valid and update her
  self.verifySession(token,function(err,res)
  {
    callback(err,res);
  });
}

/*
 * Recovery session token from request
 * Token can be stored in a cookie or in a request headers (with same name)
 */
authentication.prototype.getTokenFromReq = function(req)
{
  var self = this;
  var token = null;
  var cookie = req.cookies;

  if (self.funcUtils.isEmptyObject(cookie) || !cookie[_authConf.cookieName])
    token = req.headers[_authConf.cookieName];
  else
    token = cookie[_authConf.cookieName];

  // If token not found, look for it in query string
  if (!token && req.query[_authConf.cookieName])
    token = req.query[_authConf.cookieName];

  return token;
}

/*
 * Control and update session. If the session has not expired,
 * last_access_date and expiration_date fields are updated.
 */
authentication.prototype.verifySession = function(token, callback)
{
  var self = this;
  var nowTs = new Date().getTime();

  // verify if session has expired
  // if sessionTimeout < 0, session never expires -> no need to control,
  // only update last_access_date
  if (_authConf.sessionTimeout > 0)
  {
    var selectOpt =
    {
      queryName: "selectSession",
      fields:[
        {name:"last_access_date"},
        {name:"expiration_date"}
      ],
      fieldType:{
        last_access_date: self.crudUtils.TIMESTAMP,
        expiration_date: self.crudUtils.TIMESTAMP
      },
      from: [
        {schema:self.dbSchema, name:"session", type:self.crudUtils.TABLE}
      ],
      where:[
        {
          typeCond: self.crudUtils.SIMPLE_COND,
          leftSide: "token",
          operator: self.crudUtils.EQ,
          rightSide: "$1"
        }
      ]
    };

    var selectVal = [];
    selectVal.push({value:token});

    _crud.select(selectOpt, selectVal, function(errSel, resSel)
    {
      if (errSel)
        return callback(errSel);

      if (resSel.result && resSel.result.length == 0)
      {
        callback({message:"No rows found in session table for token: "+token});
      }
      else
      {
        var lastAccessDate = resSel.result[0].last_access_date || 0;

        // session has not expired -> update
        if (lastAccessDate+_authConf.sessionTimeout*1000 > nowTs)
        {
          self.updateSession(nowTs,token,function(errUpd,resUpd)
          {
            callback(errUpd, resUpd);
          });
        }
        else
        {
          callback({message:"Session has expired!"});
        }
      }
    });
  }
  else
  {
    // update session table without any session control
    self.updateSession(nowTs,token,function(errUpd,resUpd)
    {
      callback(errUpd,resUpd);
    });
  }
}

/*
 * Update session table last_access_date with now value.
 * If session has a timeout, we have to update also expiration_date.
 */
authentication.prototype.updateSession = function(nowTs,token,callback)
{
  var self = this;

  // valorize query configuration object
  var numQueryParam = 2;
  var fields = [{name:"last_access_date"}];
  var fieldType = {last_access_date: self.crudUtils.TIMESTAMP};

  var updateVal = [];
  updateVal.push({value:new Date(nowTs)});

  // if session has a timeout, we have to update also expiration_date
  if (_authConf.sessionTimeout > 0)
  {
    fields.push({name:"expiration_date"});
    fieldType.expiration_date = self.crudUtils.TIMESTAMP;

    updateVal.push({value:new Date(nowTs+(_authConf.sessionTimeout*1000))});

    numQueryParam++;
  }

  var updateOpt =
  {
    queryName: "updateSession",
    table: {schema:self.dbSchema, name:"session"},
    fields: fields,
    fieldType: fieldType,
    where:[
      {
        typeCond: self.crudUtils.SIMPLE_COND,
        leftSide: "token",
        operator: self.crudUtils.EQ,
        rightSide: "$"+numQueryParam
      }
    ],
    returning:[
      {name:"id"},
      {name:"sysuser_id"}
    ]
  };

  // value of the query WHERE param
  updateVal.push({value:token});

  _crud.update(updateOpt,updateVal,function(errUpd,resUpd)
  {
    callback(errUpd, {result: resUpd.result[0]});
  });
}

/*
 * Exports
 */
exports.authentication = authentication;
