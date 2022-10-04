/*
 *    Date: 2017 01 16
 * Project: Nodas - EntityManager
 *
 * Copyright 2017 SIT srl
 */

var ModName = "CrudPg";

var _pg = require("pg");
var _utils = require("./crudUtils");

var _log = null;
var _cfg = null;
var _pool = null;
var _transaction = {};

var Crud = function(options)
{
  _log = options.log;
  _cfg = options.moduleCfg;

  /* Create connection pool */
  var dbCfg = _cfg.crud.db;

  _pool = new _pg.Pool({
    max: dbCfg.poolSize,
    user: dbCfg.user,
    host: dbCfg.host,
    port: dbCfg.port,
    database: dbCfg.name,
    password: dbCfg.pwd,
    idleTimeoutMillis: 10000
  });

  _pool.on("error",function(err,client)
  {
    _log.error(ModName+" - idle client error: "+err.message);
  });
};

/**
 * Using pool don't need to open a db connection, but exec only a test.
 * @param callback function(err)
 */
Crud.prototype.open = function(callback)
{
  _pool.connect(function(err,client,release)
  {
    if (err)
      _log.error(ModName+" - cannot connect to db: "+err.message);
    else
      _log.info(ModName+" - succesfully connected to db");

    release();
    callback(err);
  });
};

/**
 * Close db connection.
 */
Crud.prototype.close = function()
{
  _log.info(ModName + " - closing db connection");
  _pool.end();
};

/**
 * Execute a select statement.
 * @param opt select configuration object with possible parameters ($1,$2,...);
 * if object contains queryString attribute use it as sql statement
 * @param values array containing the values (and types) to supply
 * as select parameters; empty array if query has no parameters
 * @param callback function(err,res)
 */
Crud.prototype.select = function(opt,values,callback)
{
  // Get SQL statement
  var sqlStatement = opt.queryString ? opt.queryString : _buildSelect(opt);

  // Get select values
  var sqlValues = values.length ? _getQueryParamsArray(values) : values;

  // If there is a transaction get its client, otherwise use pool
  var client = opt.transName ? _transaction[opt.transName].client : _pool;

  // Exec query
  _log.info(ModName+" - query to execute: "+sqlStatement);
  _log.info(ModName+" - query values: "+sqlValues.toString());

  client.query(sqlStatement,sqlValues,function(err,res)
  {
    if (err)
    {
      _log.error(ModName+" - select error: "+sqlStatement+" -> "+err.message);
      callback(err,null);
      return;
    }

    // Process result
    _log.info(ModName+" - select done: "+res.rows.length+" rows received");
    try
    {
      _log.info(ModName+" - "+JSON.stringify(res.rows).substr(0,300));
    }
    catch(err)
    {
      _log.error(ModName+" - error on print select result (stringify error)");
    }

    if (res.rows.length && opt.fieldType)
    {
      for (var i = 0;i < res.rows.length;i++)
      {
        var row = res.rows[i];

        for (var key in opt.fieldType)
        {
          var type = opt.fieldType[key];

          switch (type)
          {
            case _utils.TIMESTAMP:
              if (row[key]) row[key] = row[key].getTime();
              break;
          }
        }
      }
    }

    callback(null,{result: res.rows});
  });
}

/**
 * Execute an insert statement.
 * @param opt insert configuration object
 * @param values array with values (and types) to supply as insert parameters
 * @param callback function(err,res)
 */
Crud.prototype.insert = function(opt,values,callback)
{
  // Get SQL statement
  var sqlStatement = opt.queryString ? opt.queryString : _buildInsert(opt,1);

  // Get insert values
  var sqlValues = _getQueryParamsArray(values);

  // If there is a transaction get its client, otherwise use pool
  var client = opt.transName ? _transaction[opt.transName].client : _pool;

  // Exec query
  _log.info(ModName+" - query to execute: "+sqlStatement.substr(0,300));
  _log.info(ModName+" - query values: "+sqlValues.toString().substr(0,300));

  client.query(sqlStatement,sqlValues,function(err,res)
  {
    if (err)
    {
      _log.error(ModName+" - insert error: "+sqlStatement+" -> "+err.message);
      callback(err,null);
      return;
    }

    // Process result
    var toRet = {result: {}};

    if (res.rows && res.rows.length)
    {
      // query object has returning configuration
      if (opt.returning && opt.returning.length)
      {
        for (var idx = 0; idx < opt.returning.length; idx++)
        {
          var retItem = opt.returning[idx];
          var retItemName = retItem.alias ? retItem.alias : retItem.name;

          switch (retItem.type)
          {
            case _utils.TIMESTAMP:
              toRet.result[retItemName] = res.rows[0][retItemName].getTime();
              break;
            default:
              toRet.result[retItemName] = res.rows[0][retItemName];
              break;
          }
        }
      }
      else // query object hasn't returning configuration (query specified by queryString)
      {
        for (var idx = 0; idx < res.rows.length; idx++)
        {
          var item = res.rows[idx];

          for (key in item)
          {
            toRet.result[key] = item[key];
          }
        }
      }

      _log.info(ModName + " - insert done: " + JSON.stringify(toRet).substr(0,300));
    }
    else
    {
      // no return value query
      _log.info(ModName + " - insert done with any result");
    }

    callback(null,toRet);
  });
}

/**
 * Execute a bulk insert statement.
 * @param opt insert configuration object
 * @param values array with values (and types) to supply as insert parameters
 * @param callback function(err,res)
 */
Crud.prototype.bulkInsert = function(opt,values,callback)
{
  // Get SQL statement
  var sqlStatement = opt.queryString ? opt.queryString :
    _buildInsert(opt,values.length);

  // Get insert values
  var sqlValues = _getQueryParamsArray(values);

  // If there is a transaction get its client, otherwise use pool
  var client = opt.transName ? _transaction[opt.transName].client : _pool;

  // Exec query
  _log.info(ModName+" - query to execute: "+sqlStatement.substr(0,300));
  try
  {
    _log.info(ModName+" - query values: "+sqlValues.toString().substr(0,300));
  }
  catch(err)
  {
    _log.error(ModName+" - error on print select result (stringify error)");
  }

  client.query(sqlStatement,sqlValues,function(err,res)
  {
    if (err)
    {
      //_log.error(ModName+" - insert error: "+sqlStatement+" -> "+err.message);
      _log.error(ModName+" - insert error: "+err.message);

      callback(err,null);
      return;
    }

    // Process result
    var toRet = {result: []};

    if (res.rows && res.rows.length && opt.returning && opt.returning.length)
    {
      var logMsg = [];

      for (var jdx = 0;jdx < res.rows.length;jdx++)
      {
        var item = {};

        for (var idx = 0;idx < opt.returning.length;idx++)
        {
          var retItem = opt.returning[idx];
          var retItemName = retItem.alias ? retItem.alias : retItem.name;

          switch (retItem.type)
          {
            case _utils.TIMESTAMP:
              item[retItemName] = res.rows[jdx][retItemName].getTime();
              break;
            default:
              item[retItemName] = res.rows[jdx][retItemName];
              break;
          }

          logMsg.push(retItemName + "=" + item[retItemName]);
        }

        toRet.result.push(item);
      }

      _log.info(ModName+" - bulk insert done: "+res.rows.length+" rows");
      _log.info(ModName+" - bulk insert return: "+logMsg.join().substr(0,300));
    }
    else
    {
      // no return value query
      _log.info(ModName+" - bulk insert done with any results");
    }

    callback(null,toRet);
  });
}

/**
 * Execute an update statement.
 * @param opt update configuration object
 * @param values array with values (and types) to supply as update parameters
 * @param callback function(err,res)
 */
Crud.prototype.update = function(opt,values,callback)
{
  // Get SQL statement
  var sqlStatement = opt.queryString ? opt.queryString : _buildUpdate(opt);

  // Get update values
  var sqlValues = _getQueryParamsArray(values);

  // If there is a transaction get its client, otherwise use pool
  var client = opt.transName ? _transaction[opt.transName].client : _pool;

  // Exec query
  _log.info(ModName + " - query to execute: " + sqlStatement);
  _log.info(ModName + " - query values: " + sqlValues.toString().substr(0,300));

  client.query(sqlStatement,sqlValues,function(err,res)
  {
    if (err)
    {
      _log.error(ModName + " - update error: " + sqlStatement + " -> " + err.message);

      callback(err,null);
      return;
    }

    // Process result
    var toRet = {result: []};

    if (res.rows && res.rows.length)
    {
      // query object has returning configuration
      if (opt.returning && opt.returning.length)
      {
        // cycle on returning option to convert array into object
        var returningObj = {};

        for (var jdx = 0; jdx < opt.returning.length; jdx++)
        {
          var item = opt.returning[jdx];
          returningObj[item.alias || item.name] = item.type;
        }

        // cycle on returned rows
        for (var idx = 0; idx < res.rows.length; idx++)
        {
          var row = res.rows[idx];
          var item = {};

          // cycle on row attributes
          for (var attribute in row)
          {
            switch (returningObj[attribute])
            {
              case _utils.TIMESTAMP:
                item[attribute] = row[attribute].getTime();
                break;
              default:
                item[attribute] = row[attribute];
                break;
            }
          }

          toRet.result.push(item);
        }
//      old version to remove after test (13.06.2019)
//         // cycle on returned rows
//         for (var idx = 0; idx < res.rows.length; idx++)
//         {
//           var row = res.rows[idx];
//           var item = {};
// 
//           // cycle on returning option
//           for (var jdx = 0; jdx < opt.returning.length; jdx++)
//           {
//             var retItem = opt.returning[jdx];
//             var retItemName = retItem.alias ? retItem.alias : retItem.name;
// 
//             switch (retItem.type)
//             {
//               case _utils.TIMESTAMP:
//                 item[retItemName] = row[retItemName].getTime();
//                 break;
//               default:
//                 item[retItemName] = row[retItemName];
//                 break;
//             }
//           }
// 
//           toRet.result.push(item);
//         }

      }
      else // query object hasn't returning configuration (query specified by queryString)
      {
        // cycle on returned rows
        for (var idx = 0; idx < res.rows.length; idx++)
        {
          var row = res.rows[idx];
          var item = {};

          for (key in row)
          {
            item[key] = row[key];
          }

          toRet.result.push(item);
        }
      }

      _log.info(ModName + " - update done: " + res.rows.length+" row");
      _log.info(ModName + " - " + JSON.stringify(toRet.result).substr(0,300));
    }
    else
    {
      // no return value query
      _log.info(ModName + " - update done with any result");
    }

    callback(null,toRet);
  });
}

/**
 * Execute a delete statement.
 * @param opt delete configuration object
 * @param values array with values (and types) to supply as delete parameters
 * @param callback function(err,res)
 */
Crud.prototype.delete = function(opt,values,callback)
{
  // Get SQL statement
  var sqlStatement = opt.queryString ? opt.queryString : _buildDelete(opt);

  // Get delete values
  var sqlValues = values.length ? _getQueryParamsArray(values) : values;

  // If there is a transaction get its client, otherwise use pool
  var client = opt.transName ? _transaction[opt.transName].client : _pool;

  // Exec query
  _log.info(ModName+" - query to execute: "+sqlStatement);
  _log.info(ModName+" - query values: "+sqlValues.toString());

  client.query(sqlStatement,sqlValues,function(err,res)
  {
    if (err)
    {
      _log.error(ModName+" - delete error: "+sqlStatement+" -> "+err.message);

      callback(err,null);
      return;
    }

    // Process result
    var toRet = {result: []};

    if (res.rows && res.rows.length)
    {
      // query object has returning configuration
      if (opt.returning && opt.returning.length)
      {
        for (var jdx = 0; jdx < res.rows.length; jdx++)
        {
          var item = {};

          for (var idx = 0; idx < opt.returning.length; idx++)
          {
            var retItem = opt.returning[idx];
            var retItemName = retItem.alias ? retItem.alias : retItem.name;

            switch (retItem.type)
            {
              case _utils.TIMESTAMP:
                item[retItemName] = res.rows[jdx][retItemName].getTime();
                break;
              default:
                item[retItemName] = res.rows[jdx][retItemName];
                break;
            }
          }

          toRet.result.push(item);
        }
      }
      else // query object hasn't returning configuration (query specified by queryString)
      {
        for (var idx = 0; idx < res.rows.length; idx++)
        {
          toRet.result.push(res.rows[idx]);
        }
      }

      _log.info(ModName+" - delete done: "+res.rows.length+" row");
      _log.info(ModName+" - "+JSON.stringify(toRet).substr(0,300));
    }
    else
    {
      // no return value query
      _log.info(ModName+" - delete done with any results");
    }

    callback(null,toRet);
  });
}

/**
 * Execute an aggregate statement (a single result from a set of input values)
 * @param opt aggregate query configuration object
 * @param values array with values (and types) to supply as query parameters
 * @param callback function(err,res)
 */
Crud.prototype.aggregate = function(opt,values,callback)
{
  // Get SQL statement
  var sqlStatement = opt.queryString ? opt.queryString : _buildSelect(opt);

  // Get aggregate values
  var sqlValues = values.length ? _getQueryParamsArray(values) : values;

  // If there is a transaction get its client, otherwise use pool
  var client = opt.transName ? _transaction[opt.transName].client : _pool;

  // Exec query
  _log.info(ModName+" - query to execute: "+sqlStatement);
  _log.info(ModName+" - query values: "+sqlValues.toString());

  client.query(sqlStatement,sqlValues,function(err,res)
  {
    if (err)
    {
      _log.error(ModName+" - aggregate error: "+sqlStatement+" -> "+err.message);
      callback(err,null);
      return;
    }

    // Process result
    _log.info(ModName+" - aggregate done: "+
      (res.rows ? JSON.stringify(res.rows) : ""));

    if (res.rows && res.rows.length && opt.fieldType)
    {
      var row = res.rows[0]; //can have only 1 result

      for (var key in opt.fieldType)
      {
        var type = opt.fieldType[key];

        switch (type)
        {
          case _utils.TIMESTAMP:
            if (row[key]) row[key] = row[key].getTime();
            break;
        }
      }
    }

    callback(null,res.rows[0]);
  });
}

/**
 * Begin a transaction statement.
 * @param transName transaction unique name
 * @param callback function(err)
 */
Crud.prototype.beginTransaction = function(transName,callback)
{
  _pool.connect(function(err,client,release)
  {
    if (err)
    {
      _log.error(ModName+" - cannot get client for transaction "+
        transName+": "+err.message);

      callback(err);
      return;
    }

    client.query("BEGIN;",[],function(qErr,qRes)
    {
      if (qErr)
      {
        _log.error(ModName+" - cannot begin transaction "+
          transName+": "+qErr.message);
        release();
      }
      else
      {
        _log.info(ModName+" - BEGIN transaction "+transName);

        // Store transaction
        _transaction[transName] = {client:client,release:release};
      }

      callback(qErr);
    });
  });
}

/**
 * Commit a transaction.
 * @param transName transaction unique name
 * @param callback function(err)
 */
Crud.prototype.commitTransaction = function(transName,callback)
{
  var client = _transaction[transName].client;

  client.query("COMMIT;",[],function(err,res)
  {
    if (err)
      _log.error(ModName+" - cannot commit transaction "+
        transName+": "+err.message);
    else
      _log.info(ModName+" - COMMIT transaction "+transName);

    // Release client and remove transaction
    _transaction[transName]["release"]();

    delete _transaction[transName];

    // Exit
    callback(err);
  });
}

/**
 * Rollback a transaction.
 * @param transName transaction unique name
 * @param callback function(err)
 */
Crud.prototype.rollbackTransaction = function(transName,callback)
{
  var client = _transaction[transName].client;

  client.query("ROLLBACK;",[],function(err,res)
  {
    if (err)
      _log.error(ModName+" - cannot rollback transaction "+
        transName+": "+err.message);
    else
      _log.info(ModName+" - ROLLBACK transaction "+transName);

    // Release client and remove transaction
    _transaction[transName]["release"]();

    delete _transaction[transName];

    // Exit
    callback(err);
  });
}

/**
 * Retrieve table schema
 * @param tableName the table name
 */
Crud.prototype.getSchema = function (opt, tableName, callback)
{
  // check input parameter
  if (!tableName || tableName == "")
  {
    var msg = "No table name to getSchema method!";
    _log.info(ModName + " - " + msg);
    callback({message:msg},null);
  }

  var sqlStatement =
    "SELECT table_schema AS schema "+
    "FROM INFORMATION_SCHEMA.tables "+
    "WHERE table_name = $1";

  // If there is a transaction get its client, otherwise use pool
  var client = opt.transName ? _transaction[opt.transName].client : _pool;

  // Exec query
  _log.info(ModName + " - query to execute: " + sqlStatement);
  _log.info(ModName + " - query values: " + tableName);

  client.query(sqlStatement,[tableName],function(err,res)
  {
    if (err)
    {
      _log.error(ModName + " - getSchema error: "+sqlStatement+" -> "+err.message);

      callback(err,null);
      return;
    }

    // Process result
    _log.info(ModName+" - select done: "+res.rows.length+" rows received");

    try
    {
      _log.info(ModName+" - "+JSON.stringify(res.rows).substr(0,300));
    }
    catch(err)
    {
      _log.error(ModName + " - error on print getSchema result (stringify error)");
    }

    if (!res.rows || res.rows.length != 1)
    {
      _log.error(ModName +
        " - getSchema error -> query return no or more than one result!");

      callback(err,null);
      return;
    }

    callback(null,{result: res.rows[0].schema});
  });
}

/**
 * Retrieve table fields properties (name and type)
 * @param schema the table schema
 * @param table the table name
 * @param aMasterFields array of fields selected by master method
 */
Crud.prototype.getListFields = function(opt, schema, table, aMasterFields, callback)
{
  /*
   * Query to execute:
   *
   * SELECT column_name AS name, data_type
   * FROM
   * WHERE table_schema = <1> AND
   *       table_name = <2>
   * ORDER BY ordinal_position ASC
   *
   */
  var queryOpt = {
    queryName: "retrieveFeatureFieldsList",
    fields:[
      {name:"column_name", aliasF:"name"},
      {name:"data_type"}
    ],
    from:[{
      schema: "INFORMATION_SCHEMA",
      name: "columns",
      type: _utils.TABLE
    }],
    where:[{
      typeCond: _utils.SIMPLE_COND,
      leftSide: "table_schema",
      operator: _utils.EQ,
      rightSide: "$1",
      nextCond: _utils.AND
    },{
      typeCond: _utils.SIMPLE_COND,
      leftSide: "table_name",
      operator: _utils.EQ,
      rightSide: "$2"
    }],
    ordering: [{field:"ordinal_position",orderType:_utils.ASC}]
  };

  var queryVal = [
    {value: schema},
    {value: table}
  ];

  // Get SQL statement
  var sqlStatement = _buildSelect(queryOpt);

  // Get select where values
  var sqlValues = _getQueryParamsArray(queryVal);

  // If there is a transaction get its client, otherwise use pool
  var client = opt.transName ? _transaction[opt.transName].client : _pool;

  // Exec query
  _log.info(ModName + " - query to execute: " + sqlStatement);
  _log.info(ModName + " - query values: " + sqlValues);

  client.query(sqlStatement, sqlValues, function(err,res)
  {
    if (err || !res.rows || !res.rows.length)
    {
      var msg = err ? err.message : "no rows returned!";

      _log.error(ModName + " - getListFields error on table " +
        schema + "." + table + " -> " + msg);

      callback(err,null);
      return;
    }

    // Process result
    _log.info(ModName+" - select done: "+res.rows.length+" rows received");

    try
    {
      _log.info(ModName+" - "+JSON.stringify(res.rows).substr(0,300));
    }
    catch(err)
    {
      _log.error(ModName + " - error on print getListFields result (stringify error)");
    }

    // convert result into a mapserver DescribeFeatureType response json format
    var fieldList = {
      featureTypes:[{
        typeName: table,
        properties: []
      }]
    };

    /*
     * Cycle on fields; if aMasterFields is valorized, we consider only these
     * fields, otherwise we consider all fields returned by query
     */
    for (var idx=0; idx<res.rows.length; idx++)
    {
      var fieldToAdd = false;

      if (aMasterFields && aMasterFields.length)
      {
        for (var jdx=0; jdx<aMasterFields.length; jdx++)
        {
          if (aMasterFields[jdx].name == res.rows[idx].name)
          {
            fieldToAdd = true;
            break;
          }
        }
      }
      else
        fieldToAdd = true;

      if (fieldToAdd)
      {
        var item = {};

        item.name = res.rows[idx].name;

        switch(res.rows[idx].data_type)
        {
          case "integer":
          case "smallint":
            item.type = "xsd:int";
            item.localType = "int";
            break;

          case "boolean":
            item.type = "xsd:boolean";
            item.localType = "boolean";
            break;

          case "character":
          case "character varying":
            item.type = "xsd:string";
            item.localType = "string";
            break;

          case "timestamp with time zone":
          case "timestamp without time zone":
            item.type = "xsd:date-time";
            item.localType = "date-time";
            break;

          case "double precision":
            item.type = "xsd:number";
            item.localType = "number";
            break;

          default:
            _log.info(ModName + " - getListFields - row " + res.rows[idx].name
              + " on table " + schema + "." + table + " has an unmanaged data type: "
              + res.rows[idx].data_type);
        }

        fieldList.featureTypes[0].properties.push(item);
      }
    }

    callback(null, fieldList);
  });
}


exports.Crud = Crud;

/*
 * -------------------------
 * Private utility functions
 * -------------------------
 */

/**
 * Assemble a SELECT statement starting from a configuration object
 * @param selectOpt JSON object with query configuration parameters
 * @return string value representing SQL SELECT statement
 */
function _buildSelect(selectOpt)
{
  var sqlSelectString = "";

  // manage WITH option
  if (selectOpt.with)
  {
    sqlSelectString += "WITH ";

    if (selectOpt.with.type && selectOpt.with.type == _utils.RECURSIVE)
      sqlSelectString += "RECURSIVE ";

    sqlSelectString += selectOpt.with.subQueryName + " AS (";
    sqlSelectString += _buildSelect(selectOpt.with.as);
    sqlSelectString += ") ";
  }

  sqlSelectString += _buildSimpleSelect(selectOpt);

  // adding UNION
  if (selectOpt.union && selectOpt.union.length > 0)
  {
    for (var idx=0; idx<selectOpt.union.length; idx++)
    {
      sqlSelectString += " UNION ";
      sqlSelectString += _buildSimpleSelect(selectOpt.union[idx]);
    }
  }

  // adding EXCEPT
  if (selectOpt.except)
  {
    sqlSelectString += " EXCEPT ";
    sqlSelectString += _buildSimpleSelect(selectOpt.except);
  }

  // adding INTERSECT
  if (selectOpt.intersect)
  {
    sqlSelectString += " INTERSECT ";
    sqlSelectString += _buildSimpleSelect(selectOpt.intersect);
  }

  // adding ORDER BY clause
  if (selectOpt.ordering && selectOpt.ordering.length > 0)
  {
    sqlSelectString += " ORDER BY ";

    for (var idx=0; idx<selectOpt.ordering.length; idx++)
    {
      var orderingItem = selectOpt.ordering[idx];

      // check for presence of table alias
      sqlSelectString += orderingItem.alias ?
        orderingItem.alias + "." + orderingItem.field :
        orderingItem.field;

      // check for presence of order type (ASC/DESC)
      if (orderingItem.orderType)
      {
        switch(orderingItem.orderType)
        {
          case _utils.ASC:
            sqlSelectString += " ASC";
            break;
          case _utils.DESC:
            sqlSelectString += " DESC";
            break;
          default:
            _log.error(ModName +
              " - " + "undefined orderType on query: " + orderingItem.orderType);
            break;
        }
      }

      if (idx < selectOpt.ordering.length-1)
        sqlSelectString += ", ";
    }
  }

  // adding LIMIT (and eventually OFFSET) clause
  if (selectOpt.returnOption)
  {
    var retOpt = selectOpt.returnOption
    sqlSelectString += " LIMIT ";
    sqlSelectString += retOpt.limit;

    if (retOpt.offset)
      sqlSelectString += " OFFSET "+retOpt.offset;
  }

  return sqlSelectString;
}

/**
 * Assemble a simple SELECT statement
 * (without UNION, ORDER BY, LIMIT and OFFSET clauses)
 * starting from a configuration object
 * @param selectOpt JSON object with query configuration parameters
 * @return string value representing SQL SELECT statement
 */
function _buildSimpleSelect(selectOpt)
{
  if (!selectOpt.fields || !selectOpt.from)
  {
    var errMsg = "No fields or from in select options";
    _log.error(ModName + " - " + errMsg + " "+ JSON.stringify(selectOpt));
    return;
  }

  var sqlSelectString = "SELECT ";

  // adding fields
  if (typeof(selectOpt.fields) == "string")
  {
    switch(selectOpt.fields)
    {
      case _utils.ALL_FIELDS:
        sqlSelectString += " * ";
        break;

      case _utils.COUNT_FIELDS:
        sqlSelectString += " COUNT(*) ";
        break;

      default:
        _log.error(ModName +
          " - " + "undefined field value on query: " + selectOpt.fields);
        break;
    }
  }
  else
  {
    for (var idx=0; idx<selectOpt.fields.length; idx++)
    {
      var field = selectOpt.fields[idx];

      // check presence of alias on table name
      var fieldName = field.aliasT ? field.aliasT+"."+field.name : field.name;

      // check presence of SQL operator on field
      if (field.operator)
      {
        switch(field.operator)
        {
          case _utils.DISTINCT:
            fieldName = "DISTINCT("+fieldName+")";
            break;

          case _utils.UPPER:
            fieldName = "UPPER("+fieldName+")";
            break;

          case _utils.LOWER:
            fieldName = "LOWER("+fieldName+")";
            break;

          case _utils.MAX:
            fieldName = "MAX("+fieldName+")";
            break;

          case _utils.MIN:
            fieldName = "MIN("+fieldName+")";
            break;

          case _utils.SUM:
            fieldName = "SUM("+fieldName+")";
            break;

          case _utils.COUNT:
            fieldName = "COUNT("+fieldName+")";
            break;

          case _utils.POINT_DISTANCE:
            var txtPoint  = "POINT(" + field.attrs.x + " " + field.attrs.y + ")";
            var geomPoint = "ST_GeomFromText('" + txtPoint + "'," + field.attrs.srs + ")";
            fieldName = "ST_Distance(" + geomPoint + "," + fieldName + ")";
            break;

          case _utils.X_COORD_POINT:
            if (field.attrs && field.attrs.srid)
              fieldName = "ST_X(ST_Transform("+fieldName+"," + field.attrs.srid + "))";
            else
              fieldName = "ST_X("+fieldName+")";
            break;

          case _utils.Y_COORD_POINT:
            if (field.attrs && field.attrs.srid)
              fieldName = "ST_Y(ST_Transform("+fieldName+"," + field.attrs.srid + "))";
            else
              fieldName = "ST_Y("+fieldName+")";
            break;

          case _utils.X_MIN:
            fieldName = "ST_XMin("+fieldName+")";
            break;

          case _utils.X_MAX:
            fieldName = "ST_XMax("+fieldName+")";
            break;

          case _utils.Y_MIN:
            fieldName = "ST_YMin("+fieldName+")";
            break;

          case _utils.Y_MAX:
            fieldName = "ST_YMax("+fieldName+")";
            break;

          // this is an aggregate function !! needs a group by to work
          case _utils.EXTENT:
            if (field.attrs && field.attrs.srid)
              fieldName = "ST_Extent(ST_Transform("+fieldName+"," + field.attrs.srid + "))";
            else
              fieldName = "ST_Extent(" + fieldName+")";
            break;

          case _utils.SRID:
            fieldName = "ST_Srid(" + fieldName+")";
            break;

          case _utils.GEOJSON:
            if (field.attrs && field.attrs.srid)
              fieldName = "ST_AsGeoJSON(ST_Transform("+fieldName+"," + field.attrs.srid + "))";
            else
              fieldName = "ST_AsGeoJSON(" + fieldName + ")";
            break;

            // return a postgis geometry !!!!
//           case _utils.TRANSFORM:
//             fieldNAme = "ST_Transform(" + fieldName + ", " + field.attrs.srs + ")";
//             break;

          case _utils.OVER:
            fieldName = fieldName + " OVER (" + field.attrs.partition + ")";

            if (field.attrs.cast)
              fieldName = "(" + fieldName + ")::" + field.attrs.cast;

            break;

          case _utils.ARRAY_AGG:
            fieldName = "ARRAY_AGG("+fieldName+")";
            break;

          default:
            _log.error(ModName +
              " - " + "undefined field operator on query: " + field.operator);
            break;
        }
      }

      // check presence of alias on table field
      fieldName += field.aliasF ? " AS "+field.aliasF : "";

      // adding field on sql statement
      sqlSelectString += fieldName;

      if (idx < selectOpt.fields.length-1)
        sqlSelectString += ", ";
    }
  }

  // adding FROM
  if (selectOpt.from && selectOpt.from.length > 0)
  {
    sqlSelectString += " FROM ";

    for (var idx=0; idx<selectOpt.from.length; idx++)
    {
      var fromItem = selectOpt.from[idx];
      var fromCond = "";

      switch(fromItem.type)
      {
        case _utils.TABLE:
          fromCond  = fromItem.schema ? fromItem.schema+"." : "";
          fromCond += fromItem.alias ?
            fromItem.name+" AS "+fromItem.alias :
            fromItem.name;
          break;

        case _utils.SELECT:
          fromCond = fromItem.alias ? 
            "("+_buildSelect(fromItem.query)+") AS "+fromItem.alias :
            "("+_buildSelect(fromItem.query)+")";
          break;

        case _utils.FUNCTION:
          fromCond  = fromItem.schema ? fromItem.schema+"." : "";
          fromCond += fromItem.alias ?
            fromItem.name+" AS "+fromItem.alias :
            fromItem.name;
          break;

        default:
          _log.error(ModName +
            " - " + "undefined from type on query: " + fromItem.type);
          return;
          break;
      }

      // adding from item on sql statement
      sqlSelectString += fromCond;

      if (idx < selectOpt.from.length-1)
        sqlSelectString += ", ";
    }
  }

  // adding JOINS
  if (selectOpt.join && selectOpt.join.length > 0)
  {
    for (var idx=0; idx<selectOpt.join.length; idx++)
    {
      var joinItem = selectOpt.join[idx];
      var join;

      // switch on join type
      switch(joinItem.join)
      {
        case _utils.JOIN:
          join = " JOIN ";
          break;
        case _utils.INNER:
          join = " INNER JOIN ";
          break;
        case _utils.LEFT:
          join = " LEFT JOIN ";
          break;
        case _utils.LEFT_OUTER:
          join = " LEFT OUTER JOIN ";
          break;
        case _utils.RIGHT:
          join = " RIGHT JOIN ";
          break;
        case _utils.RIGHT_OUTER:
          join = " RIGHT OUTER JOIN ";
          break;
        case _utils.FULL:
          join = " FULL JOIN ";
          break;
        case _utils.FULL_OUTER:
          join = " FULL OUTER JOIN ";
          break;
        case _utils.CROSS:
          join = " CROSS JOIN ";
          break;
        default:
          _log.error(ModName +
            " - " + "undefined join type on query: " + joinItem.join);
          return;
          break;
      }

      sqlSelectString += join;

      // switch on join element type
      switch(joinItem.type)
      {
        case _utils.TABLE:
          sqlSelectString += joinItem.schema ? joinItem.schema+"." : "";
          sqlSelectString += joinItem.alias ?
            joinItem.tableName+" AS "+joinItem.alias :
            joinItem.tableName;
          break;
        case _utils.SELECT:
          sqlSelectString += joinItem.alias ?
            "("+_buildSelect(joinItem.query)+") AS "+joinItem.alias :
            "("+_buildSelect(joinItem.query)+")";
          break;
        default:
          _log.error(ModName +
            " - " + "undefined join element type on query: " + joinItem.type);
          return;
          break;
      }

      sqlSelectString += " ON ";
      sqlSelectString += _buildWhereCondition(joinItem.cond);

      if (idx < selectOpt.join.length-1)
        sqlSelectString += " ";
    }
  }

  // adding WHERE clause
  if (selectOpt.where && selectOpt.where.length > 0)
  {
    sqlSelectString += " WHERE ";
    sqlSelectString += _buildWhereCondition(selectOpt.where);
  }

  // adding GROUP BY clause
  if (selectOpt.grouping && selectOpt.grouping.length > 0)
  {
    sqlSelectString += " GROUP BY ";

    for (var idx=0; idx<selectOpt.grouping.length; idx++)
    {
      var groupingItem = selectOpt.grouping[idx];

      // check for presence of table alias
      sqlSelectString += groupingItem.alias ?
        groupingItem.alias + "." + groupingItem.field :
        groupingItem.field;

      if (idx < selectOpt.grouping.length-1)
        sqlSelectString += ", ";
    }
  }

  // adding HAVING clause
  if (selectOpt.having && selectOpt.having.length > 0)
  {
    // TODO
    sqlSelectString += " HAVING ";
  }

  return sqlSelectString;
}

/**
 * Assemble an INSERT statement starting from a configuration object
 * @param insertOpt JSON object with query configuration parameters
 * @param numRecToInsert number of record to insert
 * @return string value representing SQL INSERT statement
 */
function _buildInsert(insertOpt, numRecToInsert)
{
  if (!insertOpt.table.name)
  {
    var errMsg = "No table name insert options";
    _log.error(ModName + " - " + errMsg + " "+ JSON.stringify(insertOpt));
    return;
  }

  var numFields = 0;
  var sqlInsertString = "INSERT INTO ";

  // adding table name
  sqlInsertString += insertOpt.table.schema ? insertOpt.table.schema+"." : "";
  sqlInsertString += insertOpt.table.name;

  // adding field list
  if (insertOpt.fields && insertOpt.fields.length>0)
  {
    numFields = insertOpt.fields.length;

    var fieldsList = " (";

    // adding fields
    for (var idx=0; idx<insertOpt.fields.length; idx++)
    {
      var field = insertOpt.fields[idx];

      var fieldName = field.name;

      fieldsList += fieldName;

      if (idx<insertOpt.fields.length-1)
        fieldsList += ", ";
    }

    fieldsList += ") ";

    sqlInsertString += fieldsList;
  }

  // adding values
  if (insertOpt.select)
  {
    var subquery = _buildSelect(insertOpt.select);
    sqlInsertString += subquery;
  }
  else
  {
    sqlInsertString += "VALUES ";

    for (var idx=0; idx<numRecToInsert; idx++)
    {
      sqlInsertString += "(";

      for (var jdx=1; jdx<=insertOpt.fields.length; jdx++)
      {
        sqlInsertString+= ("$"+((idx*numFields)+jdx));

        if (jdx<insertOpt.fields.length)
          sqlInsertString += ", ";
      }

      sqlInsertString += (idx<numRecToInsert-1) ? ")," : ") ";
    }
  }

  // adding returning
  if (insertOpt.returning && insertOpt.returning.length>0)
  {
    sqlInsertString += " RETURNING ";

    for (var idx=0; idx<insertOpt.returning.length; idx++)
    {
      var retItem = insertOpt.returning[idx];

      if (retItem.query)
      {
        sqlInsertString += "(" + _buildSimpleSelect(retItem.query) + ")";
      }
      else
      {
        sqlInsertString += retItem.name;

        if (retItem.alias)
          sqlInsertString += (" AS " + retItem.alias);
      }

      if (idx<insertOpt.returning.length-1)
        sqlInsertString += ", ";
    }
  }

  return sqlInsertString;
}

/**
 * Assemble an UPDATE statement starting from a configuration object
 * @param updateOpt JSON object with query configuration parameters
 *        if updateOpt.retOldVal is defined, update statement is builded
 *        to return also pre-updated fields values.
 *
 *        SIMPLE UPDATE:
 * 
 *          UPDATE <table> AS <alias>
 *          SET <field1> = <val1>, <field1> = <val1>, ...
 *          WHERE <condition>
 *          RETURNING <field_a> AS <aa>, <field_b> AS <ab>, ...
 *
 * 
 *        UPDATE WITH RETURNING OLD VALUES:
 * 
 *          UPDATE <table> AS NEW
 *          SET <field1> = <val1>, <field1> = <val1>, ...
 *          FROM <table> AS OLD
 *          WHERE <condition> AND
 *                OLD.<id> = NEW.<id>
 *          RETURNING NEW.<field_a> AS <aa>, NEW.<field_b> AS <ab>, ...,
 *                    OLD.<field1>, OLD.<field2>, ...
 *
 * @return string value representing SQL UPDATE statement
 */
function _buildUpdate(updateOpt)
{
  if (!updateOpt.fields || updateOpt.fields.length == 0)
  {
    var errMsg = "No fields in update options";
    _log.error(ModName + " - " + errMsg + " "+ JSON.stringify(updateOpt));
    return;
  }

  var newTableAlias = null;
  var oldTableAlias = null;

  // setting table aliases if update must return pre-updated fields values
  if (updateOpt.retOldVal)
  {
    newTableAlias = "NEW";
    oldTableAlias = "OLD";
  }

  var sqlUpdateString = "UPDATE ";

  // build table name
  var tableName = updateOpt.table.schema ?
    updateOpt.table.schema + "." + updateOpt.table.name :
    updateOpt.table.name;

  // build table alias
  // (if exist alias into updateOpt and update must return pre-updated
  //  fields values, we use this alias instead of newTableAlias)
  var tableAlias = updateOpt.table.alias ? updateOpt.table.alias :
    (updateOpt.retOldVal ? newTableAlias : "");

  sqlUpdateString += (tableName + (tableAlias != "" ? " AS " + tableAlias : " "));

  // adding field list
  sqlUpdateString += " SET ";

  var fieldsList = "";

  for (var idx=1; idx<=updateOpt.fields.length; idx++)
  {
    fieldsList += (updateOpt.fields[idx-1].name + " = $"+idx);

    if (idx<updateOpt.fields.length)
      fieldsList += ", ";
  }

  sqlUpdateString += fieldsList;

  // additional statement clause if update must return pre-updated fields values
  if (updateOpt.retOldVal)
  {
    // adding from clause
    sqlUpdateString += (" FROM " + tableName + " AS " + oldTableAlias);

    // check and adding fields aliases in where condition object
    for (var idx=0, len=updateOpt.where.length; idx<len; idx++)
    {
      switch(updateOpt.where[idx].typeCond)
      {
        case _utils.SIMPLE_COND:
            updateOpt.where[idx].leftAlias = tableAlias;
          break;

        case _utils.COMPLEX_COND:
          for (var jdx=0, length=updateOpt.where[idx].length; jdx<length; jdx++)
            updateOpt.where[idx][jdx].leftAlias = tableAlias;
          break;

        default:
          _log.error(ModName + " - condition type not contemplated in update " +
            "query that return pre-updated fields values: " +
            updateOpt.where[idx].typeCond);
          break;
      }
    }
  }

  // adding where clause
  if (updateOpt.where && updateOpt.where.length > 0)
  {
    sqlUpdateString += " WHERE ";

    if (updateOpt.retOldVal)
      sqlUpdateString += "(";

    sqlUpdateString += _buildWhereCondition(updateOpt.where);

    if (updateOpt.retOldVal)
    {
      sqlUpdateString += (" AND " + oldTableAlias + "." + updateOpt.retOldVal.id +
        " = " + newTableAlias + "." + updateOpt.retOldVal.id + ") ");
    }
  }

  // adding returning
  if (updateOpt.returning && updateOpt.returning.length > 0)
  {
    sqlUpdateString += " RETURNING ";

    for (var idx=0; idx<updateOpt.returning.length; idx++)
    {
      var retItem = updateOpt.returning[idx];

      if (retItem.query)
      {
        sqlUpdateString += "(" + _buildSimpleSelect(retItem.query) + ")";
      }
      else
      {
        // if update return pre-updated fields values
        // we add newTableAlias on the return fields
        sqlUpdateString += updateOpt.retOldVal ?
          newTableAlias + "." + retItem.name :
          retItem.name;

        if (retItem.alias)
          sqlUpdateString += (" AS " + retItem.alias);
      }

      if (idx<updateOpt.returning.length-1)
        sqlUpdateString += ", ";
    }

    // if update must to return pre-updated fields values
    // we have to add these to the returning clause
    if (updateOpt.retOldVal)
    {
      sqlUpdateString += ", ";

      for (var idx=0, len=updateOpt.fields.length; idx<len; idx++)
      {
        sqlUpdateString += (oldTableAlias + "." + updateOpt.fields[idx].name);

        if (idx < len-1)
          sqlUpdateString += ", ";
      }
    }
  }

  return sqlUpdateString;
}

/**
 * Assemble an DELETE statement starting from a configuration object
 * @param deleteOpt JSON object with query configuration parameters
 * @return string value representing SQL DELETE statement
 */
function _buildDelete(deleteOpt)
{
  if (!deleteOpt.table.name)
  {
    var errMsg = "No table name delete options";
    _log.error(ModName + " - " + errMsg + " "+ JSON.stringify(deleteOpt));
    return;
  }

  // TODO: implement also logical delete!!!!!!!!!!!

  var sqlDeleteString = "DELETE FROM ";

  // adding table name
  sqlDeleteString += deleteOpt.table.schema ? deleteOpt.table.schema+"." : "";
  sqlDeleteString += deleteOpt.table.alias ?
    deleteOpt.table.name+" AS "+deleteOpt.table.alias : deleteOpt.table.name;

  // adding where clause
  if (deleteOpt.where && deleteOpt.where.length > 0)
  {
    sqlDeleteString += " WHERE ";
    sqlDeleteString += _buildWhereCondition(deleteOpt.where);
  }

  // adding returning
  if (deleteOpt.returning && deleteOpt.returning.length>0)
  {
    sqlDeleteString += " RETURNING ";

    for (var idx=0; idx<deleteOpt.returning.length; idx++)
    {
      var retItem = deleteOpt.returning[idx];

      if (retItem.query)
      {
        sqlDeleteString += "(" + _buildSimpleSelect(retItem.query) + ")";
      }
      else
      {
        sqlDeleteString += retItem.name;

        if (retItem.alias)
          sqlDeleteString += (" AS " + retItem.alias);
      }

      if (idx<deleteOpt.returning.length-1)
        sqlDeleteString += ", ";
    }
  }

  return sqlDeleteString;
}

/**
 * Recursive function to assemble WHERE clause on sql statement
 * @param whereOpt json object configuring the WHERE clause
 * @return string value containing the WHERE clause
 */
function _buildWhereCondition(whereOpt)
{
  var condition = "";

  for (var idx=0; idx<whereOpt.length; idx++)
  {
    var whereItem = whereOpt[idx];

    condition += "(";

    // check for simple or complex or subquery condition
    if (whereItem.typeCond == _utils.COMPLEX_COND)
      // if complex condition, recall this function
      condition += _buildWhereCondition(whereItem.conds);
    else
    {
      // check for presence of table alias on left-hand side
      if (whereItem.leftAlias)
        condition += whereItem.leftAlias + ".";

      // check for presence of table alias on right-hand side
      var rightItem;

      // it type cond is SUBQUERY, the right side of where condition is a query
      if (whereItem.typeCond == _utils.SUBQUERY_COND)
        rightItem = " (" + _buildSimpleSelect(whereItem.rightSide) + ") ";
      else
      {
        if (whereItem.rightAlias)
          rightItem = whereItem.rightAlias + "." + whereItem.rightSide;
        else
          rightItem = whereItem.rightSide;
      }

      switch(whereItem.operator)
      {
        case _utils.LT:
          condition += whereItem.leftSide + " < " + rightItem;
          break;

        case _utils.LE:
          condition += whereItem.leftSide + " <= " + rightItem;
          break;

        case _utils.EQ:
          condition += whereItem.leftSide + " = " + rightItem;
          break;

        case _utils.DATE_EQ:
          var rightItemArr = rightItem.split(',');

          if (rightItemArr.length != 2)
            _log.error(ModName +
              " - Equal date filter needs 2 params. Received " + rightItem + "!");
          else
            condition += whereItem.leftSide + ">=" + rightItemArr[0] + " AND " +
              whereItem.leftSide + "<=" + rightItemArr[1];
          break;

        case _utils.GE:
          condition += whereItem.leftSide + " >= " + rightItem;
          break;

        case _utils.GT:
          condition += whereItem.leftSide + " > " + rightItem;
          break;

        case _utils.NE:
          condition += whereItem.leftSide + " != " + rightItem;
          break;

        case _utils.LIKE:
          condition += whereItem.leftSide + " LIKE " + rightItem;
          break;

        case _utils.ILIKE:
          condition += whereItem.leftSide + " ILIKE " + rightItem;
          break;

        case _utils.IS:
          condition += whereItem.leftSide + " IS " + rightItem;
          break;

        case _utils.IS_NOT:
          condition += whereItem.leftSide + " IS NOT " + rightItem;
          break;

        case _utils.IN:
          condition += whereItem.leftSide + " IN (" + rightItem + ")";
          break;

        case _utils.NOT_IN:
          condition += whereItem.leftSide + " NOT IN (" + rightItem + ")";
          break;

        case _utils.BETWEEN:
          var firstItem, secondItem;
          if (rightItem[0].lowAlias)
            firstItem = rightItem[0].lowAlias + "." + rightItem[0].lowValue;
          else
            firstItem = rightItem[0].lowValue;

          if (rightItem[1].upAlias)
            secondItem = rightItem[1].upAlias + "." + rightItem[1].upValue;
          else
            secondItem = rightItem[1].upValue;

          condition += whereItem.leftSide + " BETWEEN " + firstItem +
            " AND " + secondItem + " ";
          break;

        case _utils.ANY:
          condition += rightItem + " = ANY (" + whereItem.leftSide + ")";
          break;

        case _utils.IN_BBOX:
          var rightItemArr = rightItem.split(',');

          if (rightItemArr.length == 5)
          {
            // in this case bbox and table have same srid
            // ST_MakeEnvelope(xmin, ymin, xmax, ymax, srid) && geom
            condition += " ST_MakeEnvelope (" + rightItem + ") && " +
              whereItem.leftSide;
          }
          else if (rightItemArr.length == 6)
          {
            // in this case bbox and table have different srid ->
            // we have to convert geom on same srid
            // ST_Transform(
            //   ST_MakeEnvelope(xmin, ymin, xmax, ymax, sridBbox),
            //   sridTable
            // ) && geom
            condition += " ST_Transform(ST_MakeEnvelope (" +
              rightItemArr[0] + "," + rightItemArr[1] + "," +
              rightItemArr[2] + "," + rightItemArr[3] + "," +
              rightItemArr[4] + "), " + rightItemArr[5] + ") && " +
              whereItem.leftSide;
          }
          else
          {
            _log.error(ModName +
              " - wrong parameter to IN_BBOX condition: " + rightItem);
          }
          break;

        case _utils.IN_BUFFER:
          var rightItemArr = rightItem.split(',');

          if (rightItemArr.length == 4) // buffer and table have same srid
          {
            if (rightItemArr[2]*1 == 4326)
            {
              // srid equals to 4326 -> work with geography to use distance in meters
              // ST_DWITHIN('Point(lon lat)'::geography, geom, radius)
              condition += "ST_DWITHIN('POINT(" +
               rightItemArr[0] + " " + rightItemArr[1] + ")'::geography, " +
               whereItem.leftSide + ", " + rightItemArr[3] + ")";
            }
            else
            {
              // srid different from 4326 -> work with geometry
              // ST_DWITHIN(ST_SetSRID(ST_Point(x, y), srid), geom, radius)
              condition += "ST_DWITHIN(ST_SetSRID(ST_Point(" +
                rightItemArr[0] + ", " + rightItemArr[1] + "), " +
                rightItemArr[2] + "), " + whereItem.leftSide + ", " +
                rightItemArr[3] + ")";
            }
          }
          else if (rightItemArr.length == 5) // buffer and table have different srid
          {
            if (rightItemArr[4]*1 == 4326)
            {
              // table srid equal to 4326
              // ST_DWITHIN(
              //   ST_Transform(
              //     ST_SetSRID(ST_Point(x, y), sridBuffer),
              //     4326
              //   )::geography,
              //   geom,
              //   radius
              // )
              condition += "ST_DWITHIN(ST_Transform(ST_SetSRID(ST_Point(" +
                rightItemArr[0] + ", " + rightItemArr[1] + "), " +
                rightItemArr[2] + "), 4326)::geography, " + 
                whereItem.leftSide + ", " + rightItemArr[3] + ")";
            }
            else if (rightItemArr[2]*1 == 4326)
            {
              // buffer srid equal to 4326
              // ST_DWITHIN(
              //   ST_Transform(
              //     ST_SetSRID(ST_Point(lon, lat), 4326),
              //     sridTable::int
              //   ),
              //   geom,
              //   radius
              // )
              condition += "ST_DWITHIN(ST_Transform(ST_SetSRID(ST_Point(" +
                rightItemArr[0] + ", " + rightItemArr[1] + "), 4326), " +
                rightItemArr[4] + "::int), " + whereItem.leftSide + ", " +
                rightItemArr[3] + ")";
            }
            else
            {
              // srid different from each other and different from 4326
              // ST_DWITHIN(
              //   ST_Transform(
              //     ST_SetSRID(ST_Point(x, y), sridBuffer),
              //     sridTable::int
              //   ),
              //   geom,
              //   radius
              // )
              condition += "ST_DWITHIN(ST_Transform(ST_SetSRID(ST_Point(" +
                rightItemArr[0] + ", " + rightItemArr[1] + "), " +
                rightItemArr[2] + "), " + rightItemArr[4] + "::int), " +
                whereItem.leftSide + ", " + rightItemArr[3] + ")";
            }
          }
          else
            _log.error(ModName +
              " - wrong parameter to IN_BUFFER condition: " + rightItem);

          break;

        case _utils.GEOM_CONTAINED:
          var rightItemArr = rightItem.split(',');
//           if (rightItemArr.length == 4)
//           {
//             condition += "ST_Contains(" +
//               "(SELECT geom FROM " + rightItemArr[3] +
//               " WHERE " + rightItemArr[2] +
//               "=" + rightItemArr[1] + "), geom) IS TRUE";
//           }

          // use _ST_Contains instead of ST_Contains because appears more performing
          condition += "_ST_Contains((" + rightItemArr[0] + "), geom) IS TRUE";

          break;

        case _utils.GEOM_WITHIN:
          if (rightItemArr.length == 2) // geom and table have same srid
          {
            condition += "ST_Within((" + rightItem[0] + "), geom) IS TRUE";
          }
          else if (rightItemArr.length == 3) // geom and table have different srid
          {
            condition += "ST_Within((ST_Transform(" + rightItemArr[0] + "," +
              rightItemArr[2]+ ")), geom) IS TRUE";
          }
          else
            _log.error(ModName +
              " - wrong parameter to GEOM_WITHIN condition: " + rightItem);

          break;

        default:
          _log.error(ModName +
            " - undefined operator on query: " + whereItem.operator);
          break;
      }
    }

    condition += ")";

    // check for next condition
    if (whereItem.nextCond)
    {
      switch(whereItem.nextCond)
      {
        case _utils.AND:
          condition += " AND ";
          break;
        case _utils.OR:
          condition += " OR ";
          break;
        default:
          _log.error(ModName +
            " - " + "undefined logic condition on query: " + whereItem.nextCond);
          break;
      }
    }
  }

  return condition;
}

/**
 * Adjust query parameter value
 * @param paramsObjArr array of json object configuring the query params
 * @param valueArr param value array
 * @return js array containing param value to execute the query
 */
function _getQueryParamsArray(paramsObjArr)
{
  var retArr = [];

  if (!Array.isArray(paramsObjArr[0]))
    paramsObjArr = [paramsObjArr];

  for (var idx=0; idx<paramsObjArr.length; idx++)
  {
    var paramRow = paramsObjArr[idx];

    for (var jdx=0; jdx<paramRow.length; jdx++)
    {
      var paramObj = paramRow[jdx];

      switch (paramObj.type)
      {
        case _utils.TIMESTAMP:
          //Sometimes value is a string
          var date = paramObj.value == null ? null :
            new Date(paramObj.value * 1);

          retArr.push(date);
          break;

        default:
          retArr.push(paramObj.value);
          break;
      }
    }
  }

  return retArr;
}
