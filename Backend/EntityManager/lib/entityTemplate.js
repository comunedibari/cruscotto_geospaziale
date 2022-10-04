/*
 *    Date: 2016 05 31
 *  Author: Giuseppe Falcone
 * Project: Nodas - EntityManager
 *
 * Copyright 2016 SIT srl
 */

var entityTemplate = function()
{
  this.crudUtils = require("./crudUtils");
  this.funcUtils = require("core/funcUtils");

  this.env = null;
  this.log = null;
  this.crud = null;
  this.mailer = null;
  this.httpClient = null;
  this.attachment = null;
  this.eventSender = null;
  this.csvStringify = null;

  this.moduleName = "";
  this.entityName = null;
  this.schemaName = null;
  this.tableName  = null;
  this.tableAlias = null;
  this.tableSrid  = null;
  this.attachTableName = null;
  this.attachSchemaName = null;

  // object that contains fields with field type which needed elaborations
  // REMEMBER!: this object contains field alias, if defined
  this.fieldTypeObj = null;

  // object that contains master returned fields; if null, all fields are returned
  this.masterFieldObj = null;

  // object that contains detail returned fields; if null, all fields are returned
  this.detailFieldObj = null;

  // object that contains names of insert fields; this is used only by bulk insert
  this.insertFieldObj = null;

  // object that contains csv headers: {field: "Name"}
  this.csvHeaderObj = null;

  // object that contains insert/update/delete returned fields;
  // if null, only entity id is returned
  this.retFieldObj = null;

  this.entityId = null;
  this.entityIdType = null; //TODO: insert in fieldTypeObj?

  // flag that is true if the entity supports logical delete
  // (presence of fields deleted and remove_date), false otherwise
  this.hasLogicalDelete = null;
}

entityTemplate.prototype.init = function(options)
{
  var self = this;

  self.env = options.env;
  self.log = options.log;
  self.crud = options.crud;
  self.mailer = options.mailer;
  self.httpClient = options.httpClient;
  self.attachment = options.attachment;
  self.eventSender = options.eventSender;
  self.csvStringify = options.csvStringify;
  self.entityHolder = options.entityHolder;
}

/**
 * Count function - return the number of <entity>.
 * If no queryOpt specified, SELECT COUNT(*) FROM <entity> is executed
 * and queryVal is [], otherwise queryOpt and queryVal are needed.
 */
entityTemplate.prototype.count = function(params,callback)
{
  var self = this;
  var queryOpt;
  var queryVal;

  if (params.queryOpt == undefined)
  {
    // query not defined in entity -> queryVal = []
    queryVal = [];
    queryOpt = {};

    // query name
    queryOpt.queryName = "count."+ self.moduleName;

    // transaction name (optional)
    if (params.transName)
      queryOpt.transName = params.transName;

    // fields
    queryOpt.fields = self.crudUtils.COUNT_FIELDS;

    // from
    queryOpt.from = [{
      schema: params.schemaName ? params.schemaName : self.schemaName,
      name: params.tableName ? params.tableName : self.tableName,
      type: self.crudUtils.TABLE
    }];

    // if entity has logical delete, is added condition WHERE deleted = false
    if (self.hasLogicalDelete)
      queryOpt.where = [{
        typeCond: self.crudUtils.SIMPLE_COND,
        leftSide: "deleted",
        operator: self.crudUtils.EQ,
        rightSide: false,
      }];
  }
  else
  {
    // query defined in entity
    queryOpt = params.queryOpt;
    queryVal = params.queryVal;
  }

  // build filtering condition for list pagination
  if (params.object.filter)
    _buildFilterCond(self, queryOpt, queryVal, params.object.filter);

  // crud execution
  self.crud.aggregate(queryOpt, queryVal, function(mErr, mRes){
    if (mErr)
    {
      self.log.error(self.moduleName + " - Count query error: " + mErr);
      callback(mErr, null);
      return;
    }

    // this is necessary because pg module return a string for SELECT COUNT statement
    // (the return type of the COUNT operator is bigint which, by definition,
    //  can exceed the maximum value of an int in JavaScript)
    if (mRes.count)
      mRes.count = parseInt(mRes.count);

    callback(null, mRes);
  });
}

/**
 * Master function - return the totality of <entity>.
 * If no queryOpt specified, SELECT * FROM <entity> is executed and
 * queryVal is [], otherwise queryOpt and queryVal are needed.
 */
entityTemplate.prototype.master = function(params, callback)
{
  var self = this;
  var queryOpt;
  var queryVal;

  if (params.queryOpt == undefined)
  {
    // query not defined in entity -> queryVal = []
    queryVal = [];
    queryOpt = {};

    // query name
    queryOpt.queryName = "master."+ self.moduleName;

    // transaction name (optional)
    if (params.transName)
      queryOpt.transName = params.transName;

    // fields
    if (self.masterFieldObj)
      queryOpt.fields = self.masterFieldObj;
    else
      queryOpt.fields = self.crudUtils.ALL_FIELDS;

    if (self.fieldTypeObj)
      queryOpt.fieldType = self.fieldTypeObj;

    // from
    queryOpt.from = [{
      name: params.tableName ? params.tableName : self.tableName,
      schema: params.schemaName ? params.schemaName : self.schemaName,
      type: self.crudUtils.TABLE,
      alias: self.tableAlias
    }];

    // if entity has logical delete, is added condition WHERE deleted = false
    if (self.hasLogicalDelete)
      queryOpt.where = [{
        typeCond: self.crudUtils.SIMPLE_COND,
        leftSide: "deleted",
        operator: self.crudUtils.EQ,
        rightSide: false,
      }];
  }
  else
  {
    // query defined in entity
    queryOpt = params.queryOpt;
    queryVal = params.queryVal;
  }

  // build ordering and limit/offset condition for list pagination
  if (params.object.ord)
    _buildPaginationCond(self, queryOpt, params.object.rpp,
                        params.object.cp, params.object.ord);

  // build filtering condition for list pagination
  if (params.object.filter)
    _buildFilterCond(self, queryOpt, queryVal, params.object.filter);

  // crud execution
  self.crud.select(queryOpt, queryVal, function(mErr, mRes){
    if (mErr)
    {
      self.log.error(self.moduleName + " - Master query error: " + mErr);
      callback(mErr, null);
      return;
    }

    callback(null, mRes);
  });
}

/**
 * Exec a master and export the result in csv format.
 */
entityTemplate.prototype.export = function(opt,callback)
{
  var self = this;

  /* Call master */
  self.master(opt,function(err,res)
  {
    if (err)
    {
      callback(null,err.message);
      return;
    }

    // Look for fields type
    for (var i = 0;i < res.result.length;i++)
    {
      var curObj = res.result[i];

      for (var key in curObj)
      {
        if (curObj[key] == null)
          continue;

        if (self.fieldTypeObj[key] == self.crudUtils.TIMESTAMP)
          curObj[key] = new Date(curObj[key]).toCustomString();
        else if (self.fieldTypeObj[key] == self.crudUtils.DOUBLE)
          curObj[key] = curObj[key].toString().replace(".",",");
        else if (self.fieldTypeObj[key] == self.crudUtils.BOOLEAN)
          curObj[key] = curObj[key] ? "Si" : "No";
      }
    }

    /* Generate csv */
    var csvOpt = {};

    if (self.csvHeaderObj)
    {
      csvOpt.header = true;
      csvOpt.columns = self.csvHeaderObj;
    }

    self.csvStringify(res.result,csvOpt,function(csvErr,csvRes)
    {
      var strRes = "sep=,\n"+csvRes;

      if (csvErr)
      {
        strRes = csvErr.message;
        self.log.error(self.moduleName+" - CSV stringify error: "+strRes);
      }

      callback(null,strRes);
    });
  });
}

/**
 * Detail function - return the detail of an <entity>.
 * If no queryOpt specified, SELECT * FROM <entity> WHERE id = <id> is executed
 * and queryVal consists of <id>, otherwise queryOpt and queryVal are needed.
 */
entityTemplate.prototype.detail = function(params, callback)
{
  var self = this;
  var queryOpt;
  var queryVal;

  if (params.queryOpt == undefined)
  {
    // query not defined in entity -> queryVal = []
    queryOpt = {};
    queryVal = [];

    // query name
    queryOpt.queryName = "detail."+ self.moduleName;

    // transaction name (optional)
    if (params.transName)
      queryOpt.transName = params.transName;

    // fields
    if (self.detailFieldObj)
      queryOpt.fields = self.detailFieldObj;
    else
      queryOpt.fields = self.crudUtils.ALL_FIELDS;

    if (self.fieldTypeObj)
      queryOpt.fieldType = self.fieldTypeObj;

    // from
    queryOpt.from = [{
      name: params.tableName ? params.tableName : self.tableName,
      schema: params.schemaName ? params.schemaName : self.schemaName,
      type: self.crudUtils.TABLE,
      alias: self.tableAlias
    }];

    // where
    queryOpt.where = [
    {
      typeCond: self.crudUtils.SIMPLE_COND,
      leftSide: self.entityId,
      operator: self.crudUtils.EQ,
      rightSide: "$1"
    }];
  }
  else
  {
    // query defined in entity
    queryOpt = params.queryOpt;
    queryVal = params.queryVal;
  }

  // add into queryVal as last parameter the object id (for the where condition)
  queryVal.push({"type":self.entityIdType, "value":params.id});

  // crud execution
  self.crud.select(queryOpt, queryVal, function(mErr, mRes){
    if (mErr)
    {
      self.log.error(self.moduleName + " - Detail query error: " + mErr);
      callback(mErr, null);
      return;
    }

    // if entity have attachments and if we have an entity,
    // we return them into entity detail
    if (self.attachTableName && mRes.result.length)
    {
      /*
       * SELECT * FROM <schema>.<table> WHERE entity_id = <id>
       */
      var attachQueryOpt = {
        queryName: "retrieveEntityAttach."+ self.moduleName,
        transName: params.transName,
        fields: self.crudUtils.ALL_FIELDS,
        fieldType: {insert_date: self.crudUtils.TIMESTAMP},
        from: [{
          schema: self.attachSchemaName,
          name: self.attachTableName,
          type: self.crudUtils.TABLE
        }],
        where: [{
          typeCond: self.crudUtils.SIMPLE_COND,
          leftSide: "entity_id",
          operator: self.crudUtils.EQ,
          rightSide: "$1"
        }]
      };

      // execute select on entity attach table
      self.crud.select(attachQueryOpt, [{value:params.id}], function(aErr,aRes)
      {
        if (aErr)
          self.log.error(self.moduleName +
            " - Retrieve attachment list query error: " + aErr);
        else
          // add attachment list to entity detail
          mRes.result[0].attach = aRes.result;

        callback(null, {result:mRes.result[0]});
      });
    }
    else
      callback(null, {result:mRes.result[0]});
  });
}

/**
 * Insert function - execute an insert of a new <entity>.
 * If no queryOpt specified, INSERT INTO <entity> (<field1>,<field2>,...) VALUES
 * (<value1>,<value2>,...) is executed, where fields and values list are obtained
 * from received JSON object. The element of queryVal array are <valueN>,
 * otherwise queryOpt and queryVal are needed.
 */
entityTemplate.prototype.insert = function(params, callback)
{
  var self = this;
  var queryOpt;
  var queryVal = [];
  var fieldArr = [];

  if (!params.object || self.funcUtils.isEmptyObject(params.object))
  {
    self.log.error(self.moduleName+" - Insert error: received empty object");
    callback(null,null);
    return;
  }

  // TODO: ==============> how to manage insert with select???
  for (var key in params.object)
  {
    var field     = {};
    var fieldType = {};

    field.name = key;

    // check for presence of field name into detailFieldObj
    // to verify field alias presence
    if (self.detailFieldObj && self.detailFieldObj.length>0)
    {
      for (var i=0; i<self.detailFieldObj.length; i++)
      {
        var detailField = self.detailFieldObj[i];

        if (detailField.name == key && detailField.aliasF)
        {
          field.aliasF = detailField.aliasF;
          break;
        }
      }
    }

    // check for presence of field name into fieldTypeObj
    // to verify field type that require processing
    if (self.fieldTypeObj)
    {
      for (var fieldName in self.fieldTypeObj)
      {
        if (key == fieldName)
        {
          fieldType.type = self.fieldTypeObj[fieldName];
          break;
        }
      }
    }

    fieldType.value = params.object[key];

    fieldArr.push(field);
    queryVal.push(fieldType);
  }

  if (params.queryOpt == undefined)
  {
    // query not defined in entity -> queryVal = []
    queryOpt = {};

    // query name
    queryOpt.queryName = "insert."+ self.moduleName;

    // transaction name (optional)
    if (params.transName)
      queryOpt.transName = params.transName;

    // table
    queryOpt.table = {};

    queryOpt.table.name = self.tableName;

    if (self.schemaName)
      queryOpt.table.schema = self.schemaName;

    // fields
    queryOpt.fields = fieldArr;

    if (self.fieldTypeObj)
      queryOpt.fieldType = self.fieldTypeObj;

    // returning values
    if (self.retFieldObj)
      queryOpt.returning = self.retFieldObj;
    else
      queryOpt.returning = [{
        name: self.entityId,
        type: self.entityIdType
      }];
  }
  else
  {
    // query defined in entity
    queryOpt = params.queryOpt;
  }

  // crud execution
  // queryVal is an array with 1 element (that is an array)
  self.crud.insert(queryOpt, [queryVal], function(mErr, mRes){
    if (mErr)
    {
      self.log.error(self.moduleName + " - Insert query error: " + mErr.message);
      callback(mErr, null);
      return;
    }

    callback(null, mRes);
  });
}

/**
 * Bulk insert function - execute an insert of an <entity> array.
 * params.object in an array [{<field1>:<value11>, <field2>:<value21>,...},
 * {<field1>:<value12>, <field2>:<value22>,...},...]
 * If no queryOpt specified, INSERT INTO <entity> (<field1>,<field2>,...)
 * VALUES (<value11>,<value21>,...),(<value12>,<value22>,...),...
 * is executed, where fields and values list are obtained from received JSON
 * object, otherwise queryOpt and queryVal are needed.
 */
entityTemplate.prototype.bulkInsert = function(params,callback)
{
  var self = this;
  var queryOpt;
  var fieldArr = [];
  var fieldTypeArr = [];
  var queryVal = [];
  var fieldsNumber;

  // check params.object presence
  if (!params.object || self.funcUtils.isEmptyObject(params.object))
  {
    self.log.error(self.moduleName +
      " - Bulk insert error: received empty object");
    callback(null, null);
    return;
  }

  // check if params.object is an array
  if (!Array.isArray(params.object))
  {
    self.log.error(self.moduleName +
      " - Bulk insert error: not received an array of object");
    callback(null, null);
    return;
  }

  // retrieve num of record to insert
  var objNumber = params.object.length;

  // if insertFieldObj is defined, we retrieve fields to execute insert into
  // this object; otherwise we have to find them from received params
  if (self.insertFieldObj)
  {
    // retrieve num of fields
    fieldsNumber = self.insertFieldObj.length;

    for (var idx=0; idx<fieldsNumber; idx++)
    {
      var field     = {};
      var fieldType = {};

      field.name = self.insertFieldObj[idx];

      // check for presence of field name into fieldTypeObj
      // to verify field type that require processing
      if (self.fieldTypeObj)
      {
        for (var fieldName in self.fieldTypeObj)
        {
          if (field.name == fieldName)
          {
            fieldType.type = self.fieldTypeObj[fieldName];
            break;
          }
        }
      }

      fieldArr.push(field);
      fieldTypeArr.push(fieldType);
    }
  }
  else
  {
    // get first object to retrieve field names, aliases and types
    var firstObj = params.object[0];
    // retrieve num of fields
    fieldsNumber = Object.keys(firstObj).length;

    for (var key in firstObj)
    {
      var field     = {};
      var fieldType = {};

      field.name = key;

      // check for presence of field name into detailFieldObj
      // to verify field alias presence
      if (self.detailFieldObj && self.detailFieldObj.length>0)
      {
        for (var i=0; i<self.detailFieldObj.length; i++)
        {
          var detailField = self.detailFieldObj[i];

          if (detailField.name == key && detailField.aliasF)
          {
            field.aliasF = detailField.aliasF;
            break;
          }
        }
      }

      // check for presence of field name into fieldTypeObj
      // to verify field type that require processing
      if (self.fieldTypeObj)
      {
        for (var fieldName in self.fieldTypeObj)
        {
          if (key == fieldName)
          {
            fieldType.type = self.fieldTypeObj[fieldName];
            break;
          }
        }
      }

      fieldArr.push(field);
      fieldTypeArr.push(fieldType);
    }
  }

  // valorize queryVal array
  // is an array that contains objNumber array of fieldsNumber elements
  for (var idx=0; idx<objNumber; idx++)
  {
    var rowItem = [];
    var paramsRow = params.object[idx];

    for (var jdx=0; jdx<fieldsNumber; jdx++)
    {
      var fieldObj = {
        value: paramsRow[fieldArr[jdx].name]
      };

      if (fieldTypeArr[jdx].type != undefined)
        fieldObj.type = fieldTypeArr[jdx].type;

      rowItem.push(fieldObj);
    }

    queryVal.push(rowItem);
  }

  if (params.queryOpt == undefined)
  {
    // query not defined in entity -> queryVal = []
    queryOpt = {};

    // query name
    queryOpt.queryName = "bulkInsert."+ self.moduleName;

    // transaction name (optional)
    if (params.transName)
      queryOpt.transName = params.transName;

    // table
    queryOpt.table = {};

    queryOpt.table.name = self.tableName;

    if (self.schemaName)
      queryOpt.table.schema = self.schemaName;

    // fields
    queryOpt.fields = fieldArr;

    if (self.fieldTypeObj)
      queryOpt.fieldType = self.fieldTypeObj;

    // returning values
    if (self.retFieldObj)
      queryOpt.returning = self.retFieldObj;
    else
      queryOpt.returning = [{
        name: self.entityId,
        type: self.entityIdType
      }];
  }
  else
  {
    // query defined in entity
    queryOpt = params.queryOpt;
  }

  // crud execution
  self.crud.bulkInsert(queryOpt, queryVal, function(mErr, mRes){
    if (mErr)
    {
      self.log.error(self.moduleName+" - Bulk insert error: "+mErr.message);
      callback(mErr, null);
      return;
    }

    callback(null, mRes);
  });
}

/**
 * Update function - update an <entity> with a given <id>.
 * If no queryOpt specified,
 * UPDATE <entity>
 * SET <field1>=<value1>,<field1>=<value2>,...
 * WHERE id = <id> is executed
 * where fields and values list are obtained from received JSON object
 * the element of queryVal array are <valueN>; <id> is the last element
 * otherwise queryOpt and queryVal are needed
 */
entityTemplate.prototype.update = function(params, callback)
{
  var self = this;
  var queryOpt;
  var queryVal = [];
  var fieldArr = [];

  if (!params.object || self.funcUtils.isEmptyObject(params.object))
  {
    self.log.warn(self.moduleName+" - Update: received empty object");
    callback(null, {result:{id:params.id}});
    return;
  }

  for (var key in params.object)
  {
    var field     = {};
    var fieldType = {};

    field.name = key;

    // check for presence of field name into detailFieldObj
    // to verify field alias presence
    if (self.detailFieldObj && self.detailFieldObj.length>0)
    {
      for (var i=0; i<self.detailFieldObj.length; i++)
      {
        var detailField = self.detailFieldObj[i];

        if (detailField.name == key && detailField.aliasF)
        {
          field.aliasF = detailField.aliasF;
          break;
        }
      }
    }

    // check for presence of field name into fieldTypeObj
    // to verify field type that necessity to elaboration
    if (self.fieldTypeObj)
    {
      for (var fieldName in self.fieldTypeObj)
      {
        if (key == fieldName)
        {
          fieldType.type = self.fieldTypeObj[fieldName];
          break;
        }
      }
    }

    fieldType.value = params.object[key];

    fieldArr.push(field);
    queryVal.push(fieldType);
  }

  // put in queryVal the id object as last field
  // (necessary fo where update condition)
  queryVal.push({type:self.entityIdType, value:params.id});

  if (params.queryOpt == undefined)
  {
    // query not defined in entity
    queryOpt = {};

    // query name
    queryOpt.queryName = "update."+ self.moduleName;

    // transaction name (optional)
    if (params.transName)
      queryOpt.transName = params.transName;

    // table
    queryOpt.table = {};

    queryOpt.table.name = self.tableName;

    if (self.schemaName)
      queryOpt.table.schema = self.schemaName;

    if (self.tableAlias)
      queryOpt.table.alias = self.tableAlias;

    // fields
    queryOpt.fields = fieldArr;

    if (self.fieldTypeObj)
      queryOpt.fieldType = self.fieldTypeObj;

    // where
    queryOpt.where = [
    {
      typeCond: self.crudUtils.SIMPLE_COND,
      leftSide: self.entityId,
      operator: self.crudUtils.EQ,
      rightSide: "$"+(fieldArr.length+1),
    }];

    // returning values
    if (self.retFieldObj)
      queryOpt.returning = self.retFieldObj;
    else
      queryOpt.returning = [{
        name: self.entityId,
        type: self.entityIdType
      }];
  }
  else
  {
    // query defined in entity
    queryOpt = params.queryOpt;
  }

  // Adds object key if update must to return pre-updated values
  if (params.retOldVal)
    queryOpt.retOldVal = {
      id: self.entityId
    };

  // crud execution
  self.crud.update(queryOpt, queryVal, function(mErr, mRes){
    if (mErr)
    {
      self.log.error(self.moduleName + " - Update query error: " + mErr);
      callback(mErr, null);
      return;
    }

    callback(null, {result:mRes.result[0]});
  });
}

/**
 * Delete function - remove an <entity> with a given <id>.
 * If no queryOpt specified, DELETE <entity> WHERE id = <id> is executed
 * and queryVal consists of <id>, otherwise queryOpt and queryVal are needed.
 */
entityTemplate.prototype.delete = function(params, callback)
{
  var self = this;
  var queryOpt;
  var queryVal;

  if (params.queryOpt == undefined)
  {
    // query not defined in entity
    queryOpt = {};
    queryVal = [];

    // query name
    queryOpt.queryName = "delete."+ self.moduleName;

    // transaction name (optional)
    if (params.transName)
      queryOpt.transName = params.transName;

    // table
    queryOpt.table = {};

    queryOpt.table.name = self.tableName;

    if (self.schemaName)
      queryOpt.table.schema = self.schemaName;

    if (self.tableAlias)
      queryOpt.table.alias = self.tableAlias;

    // where
    queryOpt.where = [
    {
      typeCond: self.crudUtils.SIMPLE_COND,
      leftSide: self.entityId,
      operator: self.crudUtils.EQ,
      rightSide: "$1",
    }];

    // returning values
    if (self.retFieldObj)
      queryOpt.returning = self.retFieldObj;
    else
      queryOpt.returning = [{
        name: self.entityId,
        type: self.entityIdType
      }];
  }
  else
  {
    // query defined in entity
    queryOpt = params.queryOpt;
    queryVal = params.queryVal;
  }

  // put in queryVal the id object as last field (necessary fo where delete condition)
  queryVal.push({type:self.entityIdType, value:params.id});

  // crud execution
  self.crud.delete(queryOpt, queryVal, function(mErr, mRes){
    if (mErr)
    {
      self.log.error(self.moduleName + " - Delete query error: " + mErr);
      callback(mErr, null);
      return;
    }

    callback(null, {result:mRes.result[0]});
  });
}

/**
 * Logic Delete function - logically remove an <entity> with a given <id>.
 * If no queryOpt specified, UPDATE <entity> SET deleted=true, remove_date=<now>
 * WHERE id = <id> is executed and queryVal consists of three values: true, <now>
 * and <id>, otherwise queryOpt and queryVal are needed.
 */
entityTemplate.prototype.logicDelete = function(params, callback)
{
  var self = this;
  var queryOpt;
  var queryVal;

  if (params.queryOpt == undefined)
  {
    // query not defined in entity
    queryOpt = {};
    queryVal = [];

    // query name
    queryOpt.queryName = "logicDelete."+ self.moduleName;

    // transaction name (optional)
    if (params.transName)
      queryOpt.transName = params.transName;

    // table
    queryOpt.table = {};

    queryOpt.table.name = self.tableName;

    if (self.schemaName)
      queryOpt.table.schema = self.schemaName;

    if (self.tableAlias)
      queryOpt.table.alias = self.tableAlias;

    // fields
    queryOpt.fields = [
      {name:"deleted"},
      {name:"remove_date"}
    ];

    if (self.fieldTypeObj)
      queryOpt.fieldType = {
        deleted: self.crudUtils.BOOLEAN,
        remove_date: self.crudUtils.TIMESTAMP
      };

    // where
    queryOpt.where = [
    {
      typeCond: self.crudUtils.SIMPLE_COND,
      leftSide: self.entityId,
      operator: self.crudUtils.EQ,
      rightSide: "$3",
    }];

    // returning values
    if (self.retFieldObj)
      queryOpt.returning = self.retFieldObj;
    else
      queryOpt.returning = [{
        name: self.entityId,
        type: self.entityIdType
      }];

    var now = new Date().getTime();

    queryVal.push(
      {value:true},
      {value:now, type:self.crudUtils.TIMESTAMP}
    );
  }
  else
  {
    // query defined in entity
    queryOpt = params.queryOpt;
    queryVal = params.queryVal;
  }

  // put in queryVal the id object as last field
  // (necessary fo where logic delete condition)
  queryVal.push({type:self.entityIdType, value:params.id});

  // crud execution
  self.crud.update(queryOpt, queryVal, function(mErr, mRes){
    if (mErr)
    {
      self.log.error(self.moduleName + " - LogicDelete query error: " + mErr);
      callback(mErr, null);
      return;
    }

    callback(null, {result:mRes.result[0]});
  });
}

/**
 * Upload function - Upload a single file given its entity id.
 * @param params {body,files,entity_id,sysuser_id}
 * @param callback function(err,res)
 */
entityTemplate.prototype.upload = function(params,callback)
{
  var self = this;

  var body = params.body;
  var file = params.files ? params.files[0] : null;
  var entityId = params.entity_id;
  var uploadDir = self.attachment.path;

  // Debug
  //self.log.info(body);
  //self.log.info(file);

  if (!file || entityId == null || !uploadDir)
  {
    var errMsg = "Missing parameters";

    self.log.error(self.moduleName + " - Upload error: " + errMsg);
    return callback({message: errMsg},null);
  }

  /* Move uploaded file into entity dir */
  var fs = require("fs");
  var dir = uploadDir+"/"+self.entityName;
  var filename = dir+"/"+entityId+"_"+file.originalname;

  // Look for entity dir
  if (!fs.existsSync(dir))
  {
    try {fs.mkdirSync(dir);}
    catch (err)
    {
      self.log.error(self.moduleName + " - Upload error: " + err.message);
      return callback(err,null);
    }
  }

  // Move file
  fs.rename(file.path,filename,function(err)
  {
    if (err)
    {
      var errMsg = "Cannot move file";

      self.log.error(self.moduleName + " - Upload error: " + errMsg);
      return callback({message: errMsg},null);
    }

    /* Insert record in attachment table */
    var queryOpt;
    var queryVal;
    var d = new Date();

    if (params.queryOpt == undefined)
    {
      queryOpt =
      {
        queryName: "insertAttachment",
        transName: params.transName,
        table: {name:self.attachTableName},
        fields: [
          {name:"name"},
          {name:"size"},
          {name:"descr"},
          {name:"entity_id"},
          {name:"insert_date"}],
        returning:[{name:"id"},{name:"entity_id"}]
      };

      if (self.schemaName)
        queryOpt.table.schema = self.schemaName;

      queryVal =
      [
        {value: file.originalname},
        {value: file.size},
        {value: body.descr},
        {value: entityId},
        {value: d}
      ];
    }
    else
    {
      // query defined in entity
      queryOpt = params.queryOpt;
      queryVal = params.queryVal;
    }

    self.crud.insert(queryOpt,queryVal,function(insErr,insRes)
    {
      if (insErr)
      {
        self.log.error(self.moduleName+" - Upload error: "+insErr.message);

        // Remove uploaded file
        fs.unlink(filename,function(unlErr){});
      }
      else
      {
        // adding insert_date to return value
        insRes.result.insert_date = d.getTime();
      }

      callback(insErr,insRes);
    });
  });
}

/**
 * Download function - Download a file given its name and entity id.
 * @param params {entity_id,filename}
 * @param callback function(err,res)
 */
entityTemplate.prototype.download = function(params,callback)
{
  var self = this;

  var attachDir = self.attachment.path;
  var entityId = params.entity_id;
  var filename = params.filename;

  /* Look for file */
  var fs = require("fs");
  var pathname = attachDir+"/"+self.entityName+"/"+entityId+"_"+filename;

  fs.exists(pathname,function(exists)
  {
    if (!exists)
    {
      var errMsg = "File "+pathname+" does not exist";
      self.log.error(self.moduleName+" - Download error: "+errMsg);
    }

    callback(null,exists ? pathname : null);
  });
}

/**
 * Update attachment function - Update an entity attachment given entity id and
 * attachment id.
 * @param params {object, attach_id, sysuser_id}
 * @param callback function(err,res)
 */
entityTemplate.prototype.updateAttach = function(params, callback)
{
  var self = this;

  var queryVal = [];
  var queryOpt = {};
  var fieldArr = [];

  // verify presence of object with update data
  if (!params.object || self.funcUtils.isEmptyObject(params.object))
  {
    self.log.error(self.moduleName +
      " - Update Attach query error: received empty object");
    callback(null, {result:{id:params.id}});
    return;
  }

  // retrieve fields to update
  for (var key in params.object)
  {
    var field     = {name: key};
    var fieldType = {value: params.object[key]};

    fieldArr.push(field);
    queryVal.push(fieldType);
  }

  // put in queryVal the attach_id as last field
  // (necessary fo where update condition)
  queryVal.push({value:params.attach_id});

  // query name
  queryOpt.queryName = "updateEntityAttach."+ self.moduleName;

  // transaction name (optional)
  if (params.transName)
    queryOpt.transName = params.transName;

  // table
  queryOpt.table = {};

  queryOpt.table.name = self.attachTableName;

  if (self.attachSchemaName)
    queryOpt.table.schema = self.attachSchemaName;

  // fields
  queryOpt.fields = fieldArr;

  if (self.fieldTypeObj)
    queryOpt.fieldType = self.fieldTypeObj;

  // where
  queryOpt.where = [
  {
    typeCond: self.crudUtils.SIMPLE_COND,
    leftSide: "id",
    operator: self.crudUtils.EQ,
    rightSide: "$"+(fieldArr.length+1),
  }];

  // returning
  queryOpt.returning = [{
    name: "id"
  }];

  // crud execution
  self.crud.update(queryOpt, queryVal, function(err, res)
  {
    if (err)
    {
      self.log.error(self.moduleName+" - Update attach error: "+err.message);
      callback(err, null);
      return;
    }

    callback(null, {result:res.result[0]});
  });
}

/**
 * Delete attachment function - Delete an entity attachment given attachment id.
 * @param params {attach_id, sysuser_id}
 * @param callback function(err,res)
 */
entityTemplate.prototype.deleteAttach = function(params, callback)
{
  var self = this;

  var queryVal = [];
  var queryOpt = {};

  // query name
  queryOpt.queryName = "deleteEntityAttach."+ self.moduleName;

  // transaction name (optional)
  if (params.transName)
    queryOpt.transName = params.transName;

  // table
  queryOpt.table = {};

  queryOpt.table.name = self.attachTableName;

  if (self.attachSchemaName)
    queryOpt.table.schema = self.attachSchemaName;

  // where
  queryOpt.where = [
    {
      typeCond: self.crudUtils.SIMPLE_COND,
      leftSide: "id",
      operator: self.crudUtils.EQ,
      rightSide: "$1",
    }
  ];

  // returning values
  queryOpt.returning = [
    {name: "entity_id"},
    {name: "name"}
  ];

  // put in queryVal the attach id
  queryVal.push({value:params.attach_id});

  // crud execution
  self.crud.delete(queryOpt, queryVal, function(err, res)
  {
    if (err)
    {
      self.log.error(self.moduleName+" - Delete attach error: "+err.message);
      return callback(err, null);
    }

    // on delete success -> return result to the client
    callback(null, {result:{id:params.attach_id}});

    // remove files from filesystem
    var fs       = require("fs");
    var dir      = self.attachment.path+"/"+self.entityName;
    var filename = res.result[0].entity_id + "_" + res.result[0].name;

    fs.unlink(dir+"/"+filename,function(unlErr)
    {
      if (unlErr)
        self.log.error(self.moduleName +
          " - Error on delete file " + self.entityName + "/" +
          filename + ": " + unlErr.message);
      else
        self.log.info(self.moduleName +
          " - Deleted file "+self.entityName+"/"+filename);
    });
  });
}

/**
 * get features function - returns a geoJSON invoking entity master
 * (with given filter). If there is getListFields param in the request, this
 * method returns a fields feature description
 */
entityTemplate.prototype.getFeatures = function(params, callback)
{
  var self = this;

  if (params.object.getListFields)
  {
    /*
     * we read tableName from params if it is set in getFeatures implementation,
     * otherwise we read it from self object
     */
    var tableName = params.tableName ? params.tableName : self.tableName;

    // retrieve list field
    self.crud.getListFields(params, self.schemaName, tableName,
      self.masterFieldObj,  function(err,res)
    {
      if (err || !res || !res.featureTypes)
      {
        callback({message:"Cannot retrieve getListFields on getFeatures!"},null);
        return;
      }

      callback(null, res);
    });
  }
  else
  {
    // retrieve entity master
    self.master(params,function(err,res)
    {
      if (err || !res || !res.result)
      {
        callback({message:"Cannot retrieve entity master on getFeatures!"},null);
        return;
      }

      // the response is processed to turn it into a geojson
      callback(null, _getGeoJSON(self, params.object.geomType, res.result));
    });
  }
}

//EXPORTS
exports.entityTemplate = entityTemplate;

/*
 * Private utility functions
 */

function _buildPaginationCond(self, queryOpt, rpp, cp, strOrd)
{
  var orderedById = false;

  // build ordering and limit/offset condition for list pagination
  var ordItemArr = strOrd.split(";");

  queryOpt.ordering = [];

  // cicle on order items; each item is <param>|<orderType>
  for (var idx=0; idx<ordItemArr.length; idx++)
  {
    var ordParam = ordItemArr[idx].split("|");

    if (ordParam.length == 2)
    {
      // retrieve order type
      var orderType = self.crudUtils.getOrderCode(ordParam[1]);

      if (!orderType)
        self.log.error(self.moduleName +
          " - Master query error, wrong order operator: " + ordParam[1]);
      else
      {
        queryOpt.ordering.push({field:ordParam[0], orderType:orderType});

        // check if there is an ordering by entity id
        if (!orderedById && ordParam[0] == self.entityId)
          orderedById = true;
      }
    }
    else
      self.log.error(self.moduleName +
        " - Master query error, wrong order condition: " + strOrd);
  }

  // if not is present an ordering by entity id,
  // adding it to avoid ambiguity on ordering on a not unique field
  if (!orderedById && self.entityId)
    queryOpt.ordering.push({field:self.entityId, orderType:self.crudUtils.ASC});

  if (rpp && cp)
  {
    queryOpt.returnOption = {};
    queryOpt.returnOption.limit  = rpp;
    if (cp > 1)
      queryOpt.returnOption.offset = (cp-1)*rpp;
  }
}

/*
 * Build the filter condition from filter parameter
 * If filter is a string, must be formatted in the following way:
 *   <param1>|<op1>|<value1>;<param2>|<op2>|<value2>;...
 *   This gives the condition param1 op1 value1 AND param2 op2 value2 AND ...
 *   (all filter conditions are in AND with each other)
 * If filter condition is an object
 *   (this is necessary to manage complex filter condition)
 *   this must be formatted with attributes groupOp, rules and groups
 *   (is a recursive object)
 */
function _buildFilterCond(self, queryOpt, queryVal, filter)
{
  // if filter is a string (conditions in AND between them) 
  // we have to convert it into json object
  if (typeof filter == "string")
  {
    var filterItemArr = filter.split(";");

    var cond  = [];
    var group = {};

    var numFilterItems = filterItemArr.length;

    // manage error and exit
    if (numFilterItems == 0)
    {
       self.log.error(self.moduleName + 
        " - Query error: no rules founded in filter condition " + filter);
      return;
    }

    // cicle on filter items; each item is <param>|<operator>|<value>
    for (var idx=0; idx<numFilterItems; idx++)
      cond.push(filterItemArr[idx]);

    tmpObj = (numFilterItems > 1) ? {rules:cond, groupOp:"AND"} : {rules:cond};

    filter = tmpObj;
  }

  // convert filter condition to append it to queryOpt
  var filterCond = _buildFilterItem(self, filter, queryVal);

  // verifiy where presence; if yes, adding nextCond AND at the last where item
  if (queryOpt.where)
  {
    var numWhere = queryOpt.where.length;
    queryOpt.where[numWhere-1].nextCond = self.crudUtils.AND;
  }
  else
    queryOpt.where = [];

  // append filter condition into where object
  queryOpt.where.push(filterCond);
}

/*
 * Convert filter condition object to append it to queryOpt
 */
function _buildFilterItem(self, filterObj, queryVal)
{
  var filterCond = {};

  // get typeCond based on groupOp, rules and groups value/presence
  if (filterObj.groupOp &&
      ((filterObj.rules && filterObj.rules.length >1) ||
       (filterObj.groups && filterObj.groups.length >0)))
  {
    filterCond.typeCond = self.crudUtils.COMPLEX_COND;
    // in this case create conds array
    filterCond.conds = [];
  }
  else
    filterCond.typeCond = self.crudUtils.SIMPLE_COND;

  // rules management
  if (filterObj.rules && filterObj.rules.length > 0)
  {
    // current number of filter params
    var numFilterParams = queryVal.length;

    // cycle on rule items
    for (var idx=0; idx<filterObj.rules.length; idx++)
    {
      var filterParam = filterObj.rules[idx].split("|");

      // verify presence of 3 component of filter item
      if (filterParam.length == 3)
      {
        var filterItemOperator = self.crudUtils.getSQLOperatorCode(filterParam[1]);

        // if filter item operator not exists,
        // this condition is not added -> continue on other items (if exist)
        if (!filterItemOperator)
        {
          self.log.error(self.moduleName +
            " - Query error, wrong filter operator: " + filterParam[1]);

          // remove nextCond attribute if this is the last filter item
          if (idx == filterObj.rules.length-1)
          {
            var numCondItems = filterCond.conds.length;
            delete filterCond.conds[numCondItems-1].nextCond;
          }

          continue;
        }

        // verify if the rightSide of condition (<value>) is a multivalues
        // (i.e. IN condition)
        var valueArr = filterParam[2].split(",");
        var params = [];
        var isNull = false;

        // for geometric where conditions, we check if received srid is different
        // from table srid; in this case, we add table srid to condition
        // to be able to apply a geometry transform between the two srid.
        // Srid is casted to string (because valueArr is a string array)
        switch(filterItemOperator)
        {
          // geom|IN_BBOX|xmin,ymin,xmax,ymax,srid
          case self.crudUtils.IN_BBOX:
            if (valueArr.length == 5 &&
                self.tableSrid &&
                valueArr[4] != self.tableSrid + '')
            {
              valueArr.push(self.tableSrid);
            }
            break;

          // geom|IN_BUFFER|x,y,srid,radius
          case self.crudUtils.IN_BUFFER:
            if (valueArr.length == 4 &&
                self.tableSrid &&
                valueArr[2] != self.tableSrid + '')
            {
              valueArr.push(self.tableSrid + '');
            }
            break;

          // geom|GEOM_CONTAINED|entity,field,value
          case self.crudUtils.GEOM_CONTAINED:
            var entity = self.entityHolder.getEntity(valueArr[0]);
            if (entity)
            {
              var tbName = entity.schemaName ?
                entity.schemaName + "." + entity.tableName : entity.tableName;
              var id  = valueArr[1];
              var val = valueArr[2];
              valueArr = [];
              valueArr.push("SELECT geom FROM " + tbName + " WHERE " + id + "=" + val);
            }
            break;

          // geom|GEOM_WITHIN|geom,srid
          case self.crudUtils.GEOM_WITHIN:
            if (valueArr.length == 2 &&
                self.tableSrid &&
                valueArr[1] != self.tableSrid + '')
            {
              valueArr.push(self.tableSrid + '');
            }
            break;

          default:
            break;
        }

        // cicle on values in <value> to populate params and queryVal arrays
        for(var i = 0; i < valueArr.length; i++)
        {
          switch(filterItemOperator)
          {
            case self.crudUtils.IN_BBOX:
              // Do not use injection to avoid error on parameters type
              // in ST_Transform postgis function
            case self.crudUtils.GEOM_CONTAINED:
              // in this case params is the query contained into valueArr
              // and there isn't an item to put into queryVal
              params.push(valueArr[i]);
              break;
            default:
              params.push('$'+(++numFilterParams));

              var queryValItem = {};

              queryValItem.value = valueArr[i];

              // check for presence of field name (filterParam[0]) into fieldTypeObj
              // to verify field type that require processing
              if (self.fieldTypeObj)
              {
                for (var fieldName in self.fieldTypeObj)
                {
                  if (fieldName == filterParam[0])
                  {
                    queryValItem.type = self.fieldTypeObj[fieldName];
                    break;
                  }
                }
              }

              // push object into queryVal array
              queryVal.push(queryValItem);

              break;
          }
        }

        // if params is NULL we have to remove condition because
        // in ($1 IS NULL) filter, $1 is treated as a dynamic column name,
        // which is not allowed in prepared statements, due to the protections
        // against SQL injection implemented by the database server
        if (queryVal.length &&
            typeof(queryVal[queryVal.length-1].value) == "string" &&
            queryVal[queryVal.length-1].value.toUpperCase() == "NULL")
        {
          params.pop();
          queryVal.pop();
          numFilterParams--;
          isNull = true;
        }

        // build rule condition in syntax for queryOpt object
        // (if isNull set rigth side to NULL constant)
        if (filterCond.typeCond == self.crudUtils.SIMPLE_COND)
        {
          filterCond.leftSide  = filterParam[0];
          filterCond.operator  = filterItemOperator;
          filterCond.rightSide = isNull ? self.crudUtils.NULL : params.join(",");
        }
        else
        {
          var ruleCond =
          {
            typeCond: self.crudUtils.SIMPLE_COND,
            leftSide: filterParam[0],
            operator: filterItemOperator,
            rightSide: isNull ? self.crudUtils.NULL : params.join(",")
          };

          // the nextCond attribute is not added to the last element
          if (idx < filterObj.rules.length-1 || 
              (filterObj.groups && filterObj.groups.length > 0))
            ruleCond.nextCond = self.crudUtils.getSQLOperatorCode(filterObj.groupOp);

          // append condition into filter object
          filterCond.conds.push(ruleCond);
        }
      }
      else
        self.log.error(self.moduleName +
          " - Master query error, wrong filter param: " + filterObj.rules[idx]);
    }
  }

  // groups management
  if (filterObj.groups && filterObj.groups.length > 0)
  {
    // cycle on groups
    for (var idx=0; idx<filterObj.groups.length; idx++)
    {
      // recall this function on each groups array item
      var groupCond = _buildFilterItem(self, filterObj.groups[idx], queryVal);

      // add nextCond value
      if (idx < filterObj.groups.length-1)
        groupCond.nextCond = self.crudUtils.getSQLOperatorCode(filterObj.groupOp);

      filterCond.conds.push(groupCond);
    }
  }

  return filterCond;
}

/*
 * Convert json response into a geoJSON
 */
function _getGeoJSON(self, geomType, ftArray)
{
  var geoJSON = {};

  geoJSON.type = "FeatureCollection";
  geoJSON.features = [];
  geoJSON.crs = {
    type:"name",
    properties:{"name": "urn:ogc:def:crs:EPSG::"+self.tableSrid}
  };

  for (var idx=0; idx<ftArray.length; idx++)
  {
    var item = ftArray[idx];
    var feature = {};
    feature.type = "Feature";
    feature.geometry_name = "geom";
    feature.id = item.id;
    feature.properties = {};
    feature.geometry = {};
    feature.geometry.coordinates = [];

    switch(geomType)
    {
      case "Point":
        feature.geometry.type = "Point";

        feature.geometry.coordinates.push(item.x);
        feature.geometry.coordinates.push(item.y);
        break;

      case "MultiPoint":
        feature.geometry.type = "MultiPoint";
        self.log.error(self.moduleName + ": MultiPoint not implemented yet!!");
        break;

      case "LineString":
        feature.geometry.type = "LineString";
        self.log.error(self.moduleName + ": LineString not implemented yet!!");
        break;

      case "MultiLineString":
        feature.geometry.type = "MultiLineString";
        self.log.error(self.moduleName + ": MultiLineString not implemented yet!!");
        break;

      case "Polygon":
        feature.geometry.type = "Polygon";
        self.log.error(self.moduleName + ": Polygon not implemented yet!!");
        break;

      case "MultiPolygon":
        feature.geometry.type = "MultiPolygon";
        self.log.error(self.moduleName + ": MultiPolygon not implemented yet!!");
        break;
    }

    // set properties
    for (var prop in item)
      feature.properties[prop] = item[prop];


    geoJSON.features.push(feature);
  }

  return geoJSON;
}
