/*
 * Invert color function
 *
 */

export function getInvertColor(hex: string): string
{
  if (!hex)
    return 'black';

  if (hex.indexOf('#') === 0)
    hex = hex.slice(1);

  // convert 3-digit hex to 6-digits.
  if (hex.length === 4)
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];

  if (hex.length !== 8)
    return 'black';

  // invert color components
  let r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
      g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
      b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);

  // pad each with zeros and return
  let zeros = new Array(2).join('0');

  // opacity is always set to ff 
  let inv = '#' +
    (zeros + r).slice(-2) +
    (zeros + g).slice(-2) +
    (zeros + b).slice(-2) +
    "ff";

  return inv;
};
