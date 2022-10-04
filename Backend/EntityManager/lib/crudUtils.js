/*
 *    Date: 2016 05 31
 *  Author: Giuseppe Falcone
 * Project: Nodas - EntityManager
 *
 * Copyright 2016 SIT srl
 */

// DB_TYPE
var _PGSQL_  = "PGSQL";

// SQL CRUD statement flag
var _SELECT_ = "SELECT";
var _INSERT_ = "INSERT";
var _DELETE_ = "DELETE";
var _UPDATE_ = "UPDATE";

// special SQL values
var _NULL         = "NULL";
var _ALL_FIELDS   = "ALL_FIELDS";
var _COUNT_FIELDS = "COUNT_FIELDS";
var _RECURSIVE    = "RECURSIVE";

// SQL datatypes
var _INTEGER   = 0;
var _LONG_INT  = 1;
var _FLOAT     = 2;
var _DOUBLE    = 3;
var _CHAR      = 4;
var _STRING    = 5;
var _DATE      = 6;
var _DATETIME  = 7;
var _TIMESTAMP = 8;
var _BOOLEAN   = 9;

// SQL operators
var _LT        = 10;
var _LE        = 11;
var _EQ        = 12;
var _DATE_EQ   = 33;
var _GE        = 13;
var _GT        = 14;
var _NE        = 15;
var _LIKE      = 16;
var _ILIKE     = 17;
var _AND       = 18;
var _OR        = 19;
var _NOT       = 20;
var _IN        = 21;
var _BETWEEN   = 22;
var _DISTINCT  = 23;
var _IS        = 24;
var _NOT_IN    = 25;
var _UPPER     = 26;
var _LOWER     = 27;
var _IS_NOT    = 28;
var _MAX       = 29;
var _MIN       = 30;
var _SUM       = 31;
var _COUNT     = 32;
var _OVER      = 33;
var _ARRAY_AGG = 34;
var _ANY       = 35;

// SQL GEOM OPERATOR
var _IN_BBOX        = 41;
var _IN_BUFFER      = 42;
var _GEOM_CONTAINED = 43;
var _GEOM_WITHIN    = 44;

// order
var _ASC       = 51;
var _DESC      = 52;

// FROM type
var _TABLE    = "TABLE";
var _SELECT   = "SELECT";
var _FUNCTION = "FUNCTION";

// JOIN type
var _JOIN        = 61;
var _INNER       = 62;
var _LEFT        = 63;
var _LEFT_OUTER  = 64;
var _RIGHT       = 65;
var _RIGHT_OUTER = 66;
var _FULL        = 67;
var _FULL_OUTER  = 68;
var _CROSS       = 69;

// conditions flag
var _SIMPLE_COND    = "SIMPLE";
var _COMPLEX_COND   = "COMPLEX";
var _SUBQUERY_COND  = "SUBQUERY";
var _AGGREGATE_COND = "AGGREGATE";

// query params placeholder
var _QUERY_PARAM    = "_QUERY_PARAM";

// geometric functions
var _POINT_DISTANCE = "POINT_DISTANCE";
var _X_COORD_POINT  = "X_COORD_POINT";
var _Y_COORD_POINT  = "Y_COORD_POINT";
var _EXTENT         = "EXTENT";
var _SRID           = "SRID";
var _GEOJSON        = "GEOJSON";
var _X_MIN          = "X_MIN";
var _X_MAX          = "X_MAX";
var _Y_MIN          = "Y_MIN";
var _Y_MAX          = "Y_MAX";
//var _TRANSFORM      = "TRANSFORM";

// json mapping order operator with queryString values
var orderMap =
{
  ASC:  _ASC,
  DESC: _DESC
};

// json mapping SQL operator with queryString values
var sqlOperatorMap =
{
  LT: _LT,
  LE: _LE,
  EQ: _EQ,
  DATE_EQ: _DATE_EQ,
  GE: _GE,
  GT: _GT,
  NE: _NE,
  LIKE: _LIKE,
  ILIKE: _ILIKE,
  AND: _AND,
  OR: _OR,
  NOT: _NOT,
  IN:_IN,
  BETWEEN: _BETWEEN,
  DISTINCT: _DISTINCT,
  IS: _IS,
  NOT_IN: _NOT_IN,
  UPPER: _UPPER,
  LOWER: _LOWER,
  IS_NOT: _IS_NOT,
  MAX: _MAX,
  MIN: _MIN,
  SUM: _SUM,
  COUNT: _COUNT,
  OVER: _OVER,
  ARRAY_AGG: _ARRAY_AGG,
  ANY: _ANY,
  IN_BBOX: _IN_BBOX,
  IN_BUFFER: _IN_BUFFER,
  GEOM_CONTAINED: _GEOM_CONTAINED,
  GEOM_WITHIN: _GEOM_WITHIN
};

// function to retrieve order operator given its key
function _getOrderCode(orderKey)
{
  return orderMap[orderKey];
}

// function to retrieve SQL operator given its key
function _getSQLOperatorCode(opKey)
{
  return sqlOperatorMap[opKey];
}

/*
 * EXPORTS
 */
exports.getOrderCode       = _getOrderCode;
exports.getSQLOperatorCode = _getSQLOperatorCode;

exports.PGSQL        = _PGSQL_;

exports.SELECT       = _SELECT_;
exports.INSERT       = _INSERT_;
exports.DELETE       = _DELETE_;
exports.UPDATE       = _UPDATE_;

exports.NULL         = _NULL;
exports.ALL_FIELDS   = _ALL_FIELDS;
exports.COUNT_FIELDS = _COUNT_FIELDS;
exports.RECURSIVE    = _RECURSIVE;

exports.INTEGER      = _INTEGER;
exports.LONG_INT     = _LONG_INT;
exports.FLOAT        = _FLOAT;
exports.DOUBLE       = _DOUBLE;
exports.CHAR         = _CHAR;
exports.STRING       = _STRING;
exports.DATE         = _DATE;
exports.DATETIME     = _DATETIME;
exports.TIMESTAMP    = _TIMESTAMP;
exports.BOOLEAN      = _BOOLEAN;

exports.LT           = _LT;
exports.LE           = _LE;
exports.EQ           = _EQ;
exports.DATE_EQ      = _DATE_EQ;
exports.GE           = _GE;
exports.GT           = _GT;
exports.NE           = _NE;
exports.LIKE         = _LIKE;
exports.ILIKE        = _ILIKE;
exports.AND          = _AND;
exports.OR           = _OR;
exports.NOT          = _NOT;
exports.IN           = _IN;
exports.BETWEEN      = _BETWEEN;
exports.DISTINCT     = _DISTINCT;
exports.IS           = _IS;
exports.NOT_IN       = _NOT_IN;
exports.UPPER        = _UPPER;
exports.LOWER        = _LOWER;
exports.IS_NOT       = _IS_NOT;
exports.MAX          = _MAX;
exports.MIN          = _MIN;
exports.SUM          = _SUM;
exports.COUNT        = _COUNT;
exports.OVER         = _OVER;
exports.ARRAY_AGG    = _ARRAY_AGG;
exports.ANY          = _ANY;

exports.IN_BBOX        = _IN_BBOX;
exports.IN_BUFFER      = _IN_BUFFER;
exports.GEOM_CONTAINED = _GEOM_CONTAINED;
exports.GEOM_WITHIN    = _GEOM_WITHIN;

exports.ASC          = _ASC;
exports.DESC         = _DESC;

exports.TABLE        = _TABLE;
exports.SELECT       = _SELECT;
exports.FUNCTION     = _FUNCTION;

exports.JOIN         = _JOIN;
exports.INNER        = _INNER;
exports.LEFT         = _LEFT;
exports.LEFT_OUTER   = _LEFT_OUTER;
exports.RIGHT        = _RIGHT;
exports.RIGHT_OUTER  = _RIGHT_OUTER;
exports.FULL         = _FULL;
exports.FULL_OUTER   = _FULL_OUTER;
exports.CROSS        = _CROSS;

exports.SIMPLE_COND     = _SIMPLE_COND;
exports.COMPLEX_COND    = _COMPLEX_COND;
exports.AGGREGATE_COND  = _AGGREGATE_COND;
exports.SUBQUERY_COND   = _SUBQUERY_COND;

exports.QUERY_PARAM     = _QUERY_PARAM;

exports.POINT_DISTANCE  = _POINT_DISTANCE;
exports.X_COORD_POINT   = _X_COORD_POINT;
exports.Y_COORD_POINT   = _Y_COORD_POINT;
exports.EXTENT          = _EXTENT;
exports.SRID            = _SRID;
exports.GEOJSON         = _GEOJSON;
exports.X_MIN           = _X_MIN;
exports.X_MAX           = _X_MAX;
exports.Y_MIN           = _Y_MIN;
exports.Y_MAX           = _Y_MAX;
//exports.TRANSFORM       = _TRANSFORM;

/*
 * Sample JSON of query definition
 *
 *
 * // SELECT
 *
 *  {
 *    queryName: "query1",
 *    with:
 *    {
 *      type:"_RECURSIVE", subQueryName: "", as:{}
 *    }
 *    fields:
 *    [
 *      {name: "alertcode", aliasT: "f", aliasF: "ac",
 *       operator: "_DISTINCT", attrs:{<possible operator attribute>}}
 *    ],
 *    fieldType: {start_date: _TIMESTAMP, end_date: _TIMESTAMP},
 *    from:
 *    [
 *      {schema : "schema_name", name: "firealert", alias: "f", type: "_TABLE"},
 *      {
 *        query: {....}, // nested select object
 *        alias: "f",
 *        type: "_SELECT"
 *      }
 *    ],
 *    join:
 *    [
 *      {
 *        type: "_TABLE",
 *        join: "_LEFT",
 *        schema : "schema_name",
 *        tableName: "",
 *        alias: "",
 *        cond:
 *        [
 *          {
 *            typeCond: "_SIMPLE_COND",
 *            leftSide: "alertsource", leftAlias: "f",
 *            operator: "_EQ",
 *            rightSide: "alertsource", rightAlias: "f",
 *            nextCond: "_AND"
 *          },
 *          {
 *            typeCond: "_SIMPLE_COND",
 *            leftSide: "alertsource", leftAlias: "f",
 *            operator: "_BETWEEN",
 *            rightSide: [{lowValue:"",lowAlias:""},{upValue:"",upAlias:""}],
 *            nextCond: "_AND"
 *          }
 *        ]
 *      },
 *      {
 *        type: "_SELECT", join: "_LEFT",
 *        query: {....}, // nested select object
 *        alias: ""
 *      }
 *    ],
 *    where:
 *    [
 *      {
 *        typeCond: "_SIMPLE_COND",
 *        leftSide: "alertcode", leftAlias: "f",
 *        operator: "_LIKE",
 *        rightAlias: "", rightSide: "$1",
 *        nextCond: "_AND"
 *      },
 *      {
 *        typeCond: "_COMPLEX_COND",
 *        conds:
 *        [
 *          {
 *            typeCond: "_SIMPLE_COND",
 *            leftSide: "alertsource", leftAlias: "f",
 *            operator: "_EQ",
 *            rightSide: "_NULL",
 *            nextCond: "_OR"
 *          },
 *          {
 *            typeCond: "_SIMPLE_COND",
 *            leftSide: "alertsource", leftAlias: "f",
 *            operator: "_EQ",
 *            rightSide: "$2"
 *          }
 *        ]
 *      }
 *    ],
 *    grouping: [{field:"", alias:""},{}],
 *    having: [{},{}],
 *    union: [{},{}],
 *    except: {},
 *    intersect: {},
 *    ordering: [{field: "", alias: "", orderType: "_DESC"}],
 *    returnOption": {limit: 10, offset: 15}
 *  }
 *
 *
 *  // INSERT
 *
 *  {
 *    queryName: "query1",
 *    table: {schema : "schema_name", name: "table"},
 *    fields: [
 *      {name: "alertcode",aliasF: "ac"},
 *      ...
 *    ],
 *    select: {},
 *    returning: [
 *      {name: "alertcode", alias: "ac", type: "_STRING"},
 *      {name: "training_id", query:{ <SIMPLE SELECT OBJECT>}},
 *      ...
 *    ]
 *  }
 *
 *
 *  // UPDATE
 *
 *  {
 *    queryName: "query1",
 *    table: {schema : "schema_name", name: "table", alias: "T"},
 *    fields: [
 *      {
 *        name: "alertcode",
 *        aliasF: "ac"  // TODO: alias in field update ?
 *      }
 *    ],
 *    fieldType: {start_date: _TIMESTAMP, end_date: _TIMESTAMP},
 *    where: [
 *      {
 *        typeCond: "_SIMPLE_COND",
 *        leftSide: "alertcode", leftAlias: "f",
 *        operator: "_LIKE",
 *        rightAlias: "", rightSide: "$1",
 *        nextCond: "_AND"
 *      },
 *      ...
 *    ],
 *    returning: [
 *      {name: "alertcode", alias: "ac", type: "_STRING"}
 *    ]
 *  }
 *
 *
 *  // DELETE
 *
 *  {
 *    queryName: "query1",
 *    table: {schema : "schema_name", name: "table", alias: "T"},
 *    where: [
 *      {
 *        typeCond: "_SIMPLE_COND",
 *        leftSide: "alertcode", leftAlias: "f",
 *        operator: "_LIKE",
 *        rightAlias: "", rightSide: "$1",
 *        nextCond: "_AND"
 *      },
 *      ...
 *    ],
 *    returning: [
 *      {name: "alertcode", alias: "ac", type: "_STRING"}
 *    ]
 *  }
 *
 */
