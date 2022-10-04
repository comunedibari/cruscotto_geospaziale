import { AbstractControl,Validator } from '@angular/forms';

export function ValidateNumber(control: AbstractControl)
{
  if (control.value != null)
  {
    let value = control.value + "";
    let valid = value.match(/^[-+]?(?:[0-9]{0,30}\.)?[0-9]*(?:[Ee].*[-+]?[0-9])?$/);
    return valid ? (isNaN(control.value) ? {invalidNumber: true} : null) : {invalidNumber: true};
  }
  else
    return null;
}
