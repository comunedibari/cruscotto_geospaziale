interface Date {
  datetimeString():string;
  dateString():string;
  timeString():string;
  isDate():boolean;
}

Date.prototype.datetimeString = function()
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

Date.prototype.dateString = function()
{
  var year = this.getFullYear(),
    mon = ("0" + (this.getMonth()+1)).slice(-2),
    day = ("0" + this.getDate()).slice(-2);

  return day + "/" + mon + "/" + year;
}

Date.prototype.timeString = function()
{
  var hou = ("0" + this.getHours()).slice(-2),
    min = ("0" + this.getMinutes()).slice(-2);

  return hou + ":" + min;
}

Date.prototype.isDate = function()
{
  return (this instanceof Date && !isNaN(this.valueOf()));
}
