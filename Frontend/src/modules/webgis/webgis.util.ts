// This enum is binded with db context wg_style_fill
export enum StyleFillPattern
{
  FILL     = 1,
  LINE_0   = 2,
  LINE_90  = 3,
  LINE_45  = 4,
  LINE_315 = 5,
  POINT    = 6,
  SQUARE   = 7,
  RHOMBUS  = 8,
  STROKE   = 9
};

// This enum is binded with db context wg_style_stroke
export enum StyleStrokePattern
{
  DASH     = 2
};

// This enum is binded with db context wgShapeType
export enum StyleType
{
  IMAGE   = "image",
  LINE    = "line",
  POLYGON = "polygon",
  SHAPE   = "shape",
  TEXT    = "text"
};

// This enum maps a geometry part to render for a style
export enum StyleGeomToRender
{
  VERTEX  = 1,
  CENTER  = 2
};

// This enum is binded with db wg_map_rs
export enum SR
{
  MONTEMARIO            = 1,
  WGS84PSEUDOMERCATOR   = 2,
  WGS84DD               = 3,
  UTM33                 = 4,
  WGS84DMS              = 5
};

// This enum is binded with db context wgShapeType
export enum ShapeType
{
  CIRCLE   = 1,
  SQUARE   = 2,
  TRIANGLE = 3
};

// This enum is binded with db context wgLayerType
export enum LayerTypology
{
  LAYER    = 1,
  COMPOSED = 3,
  GROUP    = 2,
  RASTER   = 4
};

export enum ServiceType
{
  WMS          = 'WMS',
  VECTOR       = 'WFS',
  GEOJSON      = 'GEOJSON',
  OSM          = 'OSM',
  XYZ          = 'XYZ',
  IMAGE_STATIC = 'IMAGE'
};

export enum GeometryType
{
  POINT         = 'Point',
  MULTI_POINT   = 'MultiPoint',
  LINE          = 'LineString',
  MULTI_LINE    = 'MultiLineString',
  POLYGON       = 'Polygon',
  MULTI_POLYGON = 'MultiPolygon',
  GEOMETRY      = 'Geometry'
};

export enum OutputFormat
{
  PNG     = 'image/png',
  GEOJSON = 'application/json'
};

// add on to drawing mode
export enum DrawAddOn
{
  REGULAR_SHAPE  = 'REGULAR'
};

// delete feature mode (single or multiple feature selection)
export enum DeleteMode
{
  SINGLE   = 'SINGLE',
  MULTIPLE = 'MULTIPLE'
};

// add feature mode (single or multiple feature insert)
export enum AddMode
{
  SINGLE   = 'SINGLE',
  MULTIPLE = 'MULTIPLE'
};

// add feature source (from user drawing or from copy from another layer)
export enum AddSource
{
  DRAW = 'DRAW',
  COPY = 'COPY'
};

// modify feature mode (only attributes, only geom or attributes and/or geometry)
export enum ModifyMode
{
  ONLY_ATTR = 'ONLY_ATTR',
  ONLY_GEOM = 'ONLY_GEOM',
  ATTR_GEOM = 'ATTR_GEOM'
};

// edit statu dictionary
export enum EditStatus
{
  INITIALIZE = 1,
  BEGIN_EDIT = 2,
  STOP_EDIT  = 3,
  RESET      = 4
};

// query mode
// (on map click on single feature shows popup info or return, by callback, feature id)
export enum QueryMode
{
  POPUP = 1,
  ID    = 2
};

// hilight mode
// (when hilighting a feature we could choose to deselect those already hilighted or add it to these)
export enum HilightMode
{
  SINGLE = 1,
  APPEND = 2
};

// Maximum number of features that can be displayed in the search tool
export var maxFeatureInSearch:number = 800;
/**
 * Retrieve the decimal number places to show on coordinates based on coords units
 */
export function getCoordNumDec(coordsUnits:string):number
{
  let numDec = 2;

  switch(coordsUnits)
  {
    case "m":
    case "ft":
      numDec = 2;
      break;

    case "degrees":
      numDec = 6;
      break;
  }

  return numDec;
};

/**
 * Convert DMS string DD° MM' SS.S" into decimal degrees DD.XXXXXXX
 */
export function fromDMSToDD(dmsDegree:string):number
{
  let parts = dmsDegree.split(' ');

  let degrees = parts[0].slice(0, -1);
  let minutes = parts[1].slice(0, -1);
  let seconds = parts[2].slice(0, -1);

  let dd = Number(degrees) + Number(minutes)/60 + Number(seconds)/(60*60);

  // Truncate to appropriate decimal's digits
  if(dd != null)
  {
    let truncateDD = dd.toFixed(getCoordNumDec("degrees"));
    // convert string to number
    dd = +truncateDD;
  }

  return dd;
}

/**
 * Convert decimal degrees DD.XXXXXXX into DMS string DD° MM' SS.S"
 */
export function fromDDToDMS(decDegree:number):string
{
  let normalizedDegrees = ((decDegree + 180) % 360) < 0 ?
    ((decDegree + 180) % 360)  :
    ((decDegree + 180) % 360) - 180;

  let x = Math.abs(3600 * normalizedDegrees);
  let precision = Math.pow(10, 1);

  let deg = Math.floor(x / 3600);
  let min = Math.floor((x - deg * 3600) / 60);
  let sec = x - (deg * 3600) - (min * 60);

  sec = Math.ceil(sec * precision) / precision;

  if (sec >= 60) {
    sec = 0;
    min += 1;
  }

  if (min >= 60) {
    min = 0;
    deg += 1;
  }

  return deg + '\u00b0 ' + padNumber(min, 2) + '\u2032 ' +
    padNumber(sec, 2, 1) + '\u2033';
}

/**
 * Format number with padding
 * (third parameter is optional)
 */
export function padNumber(num:number, width:number, opt_precision?:number):string
{
  var numberString = opt_precision !== undefined ?
  num.toFixed(opt_precision) : '' + num;

  var decimal = numberString.indexOf('.');
  decimal = decimal === -1 ? numberString.length : decimal;

  return decimal > width ?
    numberString : new Array(1 + width - decimal).join('0') + numberString;
};

/**
 * return epsg code (i.e. xxx) from string 'EPSG:xxx'
 */
export function getCodeFromEpsgString(epsgString:string):number
{
  let code:number = null;

  let idx = epsgString.toUpperCase().indexOf('EPSG:');

  if (idx == 0)
    code = Number(epsgString.slice(epsgString.indexOf(':')+1, epsgString.length));

  return code;
}