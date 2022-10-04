import { Component, OnInit,
          Input, Output,
          EventEmitter,
          OnChanges,
          SimpleChanges}                     from  '@angular/core';
import { FormControl, FormGroup, Validators} from '@angular/forms';
import { OwlDateTimeIntl, DateTimeAdapter}   from 'ng-pick-datetime';
import { ValidateNumber }                    from './customValidNumber';
import { Subject,Observable }                from 'rxjs';
import { debounceTime,switchMap,tap }        from 'rxjs/operators';
import { ModelService }                      from '../../core/model.service';

import { getInvertColor}                     from '../genUtils'

export class ItalianIntl extends OwlDateTimeIntl {
    /* Label for the cancel button */
    cancelBtnLabel = 'Cancella';
    /* Label for the set button */
    setBtnLabel = 'Imposta';
}

@Component({
  selector: 'core-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css'],
  providers: [
    {provide: OwlDateTimeIntl, useClass: ItalianIntl}
  ]
})

export class FormComponent implements OnInit {
  @Input() config;
  @Input() entity;
  @Output() fieldChanged = new EventEmitter<any>();

  id: string;
  form: FormGroup;
  formStyle = {};
  submit: boolean;
  /* search select*/
  ssOpt = [];
  loadSsOpt = new Subject<object>();
  ssLoading = false;

  // Set getInvertColor function
  formGetInvertColor = getInvertColor;

  constructor(dateTimeAdapter: DateTimeAdapter<any>, private modelSvc:ModelService)
  {
    //Change locale to Italian
    dateTimeAdapter.setLocale('it-IT');
    //Set data for search select
    this.loadSsOpt
      .pipe
      (
        debounceTime(500),
        tap(() => this.ssLoading = true),
        switchMap(term => this.reloadSsOpt(term))
      )
      .subscribe(res =>
      {
        this.ssOpt = res || [];
        this.ssLoading = false;
      });
  }

  ngOnChanges(changes: SimpleChanges)
  {
    // Look for config change
    let chConfig = changes['config'];

    //Check if the config is changed and its not null
    if (chConfig && !chConfig.isFirstChange() && chConfig.currentValue)
      this.ngOnInit();

    //Check if the entity is changed and its not null
    let chEntity = changes['entity'];

    if (chEntity && !chEntity.isFirstChange() && chEntity.currentValue)
    {
      let controllers = Object.keys(this.form.controls);
      let value: any;
      controllers.forEach(ctrlName =>
      {
        value = chEntity.currentValue[ctrlName];

        // Create object Date
        if (this.getAttributeByFieldName('type', ctrlName) == 'timestamp')
          value = value ? new Date(value) : null;

        // Check if the value is a boolean and then set Si/No/""
        if (this.getAttributeByFieldName('type', ctrlName) == 'boolean')
        {
          // Check if the field is required or has attribute withouNull == true
          // then accept only value <Si/No>, otherwise <Si/No/"">
          if (this.getAttributeByFieldName('required', ctrlName) ||
            this.getAttributeByFieldName('withoutNull', ctrlName))
            value = this.boolToString(value) != "" ?
                    this.boolToString(value) : "No";
            else
              value = this.boolToString(value);
        }

        this.form.get(ctrlName).setValue(value);
        this.setAttributeByFieldName(ctrlName,'value',value);
      });

      this.form.updateValueAndValidity();
    }
  }

  ngOnInit()
  {
    this.form = this.createFormGroup(this.config);
    // Set style maxHeight if defined
    if(this.config['maxHeight'])
    {
      this.formStyle['max-height'] = this.config['maxHeight'] + "px";
      this.formStyle['overflow-y'] = "auto";
    }
    this.id = this.config['id'];
    this.submit = false;
    this.formChanges();
  }

  /*
   * Methods
   */

  formChanges()
  {
    this.form.valueChanges.subscribe(form => {
      this.submit = false;
    });
  }

  inputColorChange(key,value,ov)
  {
    if (value === "" || value ===  null)
    {
      this.fieldChanged.emit({id:this.id, key:key, val:null, old:ov});
      this.setAttributeByFieldName(key,'value',null);
      this.form.get(key).setValue(null);
    }

    if (this.form.get(key).value && this.form.get(key).value.length >= 7)
    {
      this.fieldChanged.emit({id:this.id, key:key, val:value, old:ov});
      this.setAttributeByFieldName(key,'value',value);
    }
  }

  changeField(key,event,ov,field)
  {
    switch(field.type)
    {
      case 'text-list':
        let newLabel =  null;
        let existLabel = this.form.get(key) ? this.form.get(key).value : null;

        if (event != null && event != "")
        {
          if (existLabel === event) // input from input text
            newLabel = event;
          else // input from button
            newLabel = existLabel != null && existLabel != "" ?
                existLabel + "${" + event + "}" : "${" + event + "}";

          event = null;
        }
        else
        {
          newLabel = existLabel != null && existLabel != "" ? existLabel : "";
          event = null;
        }

        this.fieldChanged.emit({id:this.id, key:key, val:newLabel, old:ov});

        this.form.get(field.key).setValue(newLabel);
        this.form.updateValueAndValidity();
        break;
      case 'file':
        if (event) //emit event to send File
          this.fieldChanged.emit({id:this.id, key:key, val:event, old:ov});
        else  // emit event to delete File
          this.fieldChanged.emit({id:this.id, key:key, val:event, old:null});
        break;
      case 'color':
        if (!this.form.get(field.key).value)
          this.form.get(field.key).setValue(event);

        if (this.form.get(field.key).value && this.form.get(field.key).value.length >= 7)
        {
          this.fieldChanged.emit({id:this.id, key:key, val:event, old:ov});
          this.form.get(field.key).setValue(event);
          this.form.updateValueAndValidity();
          this.setAttributeByFieldName(key,'value',event);
        }
        break;
      case 'text':
      case 'textarea':
      case 'mask':
        this.fieldChanged.emit({id:this.id, key:key, val:event.target.value, old:ov});
        break;
      case 'number':
        let value = event.target.value;
        let num = (value === "" || value === null) ? null : Number(value);
        this.fieldChanged.emit({id:this.id, key:key, val:num, old:ov});
        break;
      case 'select':
      case 'searchSelect':
        let nv: any;
        if(event)
        {
          if(!field.multiple)
          {
            if(field.optionValue)
              nv = event[field.optionValue];
            else
              nv = event.id;
          }
          else
          {
            nv = [];
            for(let i = 0; i < event.length; i++)
            {
              let o = event[i];
              if(field.optionValue)
                nv.push(o[field.optionValue]);
              else
                nv.push(o.id);
            }
          }
        }
        else
          nv = null;
        let old = ov && ov.length == 0 ? null : ov;
        this.fieldChanged.emit({id:this.id, key:key, val:nv, old:old});
        break;
      case 'timestamp':
        this.fieldChanged.emit({
          id:this.id, key:key, val:event.value.getTime(), old:ov}
        );
        break;
    }
  }

  changeBoolean(field)
  {
    let ov = field.value;
    let ovEmit = null;
    let nv = "";
    let nvEmit = null;


    // Check if the field is required or has attribute withouNull == true
    // then accept only value <Si/No>, otherwise <Si/No/"">
    if (field.required || field.withoutNull)
    {
      switch(ov)
      {
        case "Si":
          nv = "No";
          ovEmit = true;
          nvEmit = false;
          break;
        case "No":
          nv = "Si";
          ovEmit = false;
          nvEmit = true;
          break;
      }
    }
    else
    {
      switch(ov)
      {
        case "Si":
          nv = "No";
          ovEmit = true;
          nvEmit = false;
          break;
        case "No":
          nv = "";
          ovEmit = false;
          nvEmit = null;
          break;
        case "":
          nv = "Si";
          ovEmit = null;
          nvEmit = true;
          break;
      }
    }

    field.value = nv;
    this.form.get(field.key).setValue(nv);
    this.form.get(field.key).markAsDirty();
    this.form.updateValueAndValidity();
    this.fieldChanged.emit({id:this.id, key:field.key, val:nvEmit, old:ovEmit});
  }

  changeButton(field)
  {
    this.fieldChanged.emit({id:this.id, key:field.key, val:null, old:null});
  }

  isInvalidField(field)
  {
    return this.form.controls[field].invalid;
  }

  errorField(field)
  {
    return Object.keys(this.form.controls[field].errors)[0];
  }

  isArray(val)
  {
    return Array.isArray(val);
  }

  isValorizedSubOptionArray(option, val)
  {
    return val.filter((item) =>
      {return !option[item];}
    ).length ==  val.length ? false : true;
  }

  getPickerType(subType)
  {
    if (!subType)
      return 'both';
    else
      return subType == 'date' ? "calendar" :"timer";
  }


  // Public methods accessible from parent component
  isValid()
  {
    this.submit = true;
    return !this.form.invalid;
  }

  /*
   * Check if form is changed then return True or False
   */
  isChanged()
  {
    let ret = false;
    let controllersToCheck = Object.keys(this.form.controls);
    for(let j = 0; j<controllersToCheck.length; j++)
    {
      let ctrlName = controllersToCheck[j];
      let ctrl = this.form.get(ctrlName);
      let value = ctrl.value;

      // Check if value isDate then convert in timestamp
      if (value && this.isDate(value))
        value = value.getTime();

      // Check if the value is a number and then convert it
      if (this.getAttributeByFieldName('type', ctrlName) == 'number')
        value = (value === "" || value === null) ? null : Number(value);

      // Check if the value is a boolean and then set true/false/null
      if (this.getAttributeByFieldName('type', ctrlName) == 'boolean')
        value = this.stringToBool(value);

      // Look if there are changed keys.
      // NOTE: Don't use ctrl.dirty because the user don't changed the value
      // in the UI (ex. field.disabled) therefore the attribute dirty is false.
      if (this.compareChgKeys(Array.isArray(value),value,ctrlName))
      {
        ret = true;
        break;
      }
    }
    return ret;
  }

  /*
   * Reset form.
   * If there is the param idFgArray reset only fields group passed otherwise reset all form
   */
  reset(idFgArray?: Array<any>)
  {
    this.submit = false;

    let controllers = Object.keys(this.form.controls);
    let value: any;

    if (!idFgArray)
    {
      controllers.forEach(ctrlName =>
      {
        value = this.entity[ctrlName];

        // Create object Date
        if (this.getAttributeByFieldName('type', ctrlName) == 'timestamp')
          value = value ? new Date(value) : null;

        // Check if the value is a boolean and then set Si/No/""
        if (this.getAttributeByFieldName('type', ctrlName) == 'boolean')
        {
          // Check if the field is required or has attribute withouNull == true
          // then accept only value <Si/No>, otherwise <Si/No/"">
          if (this.getAttributeByFieldName('required', ctrlName) ||
            this.getAttributeByFieldName('withoutNull', ctrlName))
            value = this.boolToString(value) != "" ? this.boolToString(value) : "No";
          else
           value = this.boolToString(value);
        }

        if (this.form.get(ctrlName))
        {
          this.form.get(ctrlName).setValue(value);
          this.setAttributeByFieldName(ctrlName,'value',value);
        }
      });

      this.form.updateValueAndValidity();
    }
    else
    {
      for (let z = 0; z < idFgArray.length; z++)
      {
        let idFg = idFgArray[z];
        for(let y = 0; y < this.config['fg'].length; y++)
        {
          let fg = this.config['fg'][y];
          if(fg.id == idFg)
          {
            for (let i = 0; i < fg['rows'].length; i++)
            {
              let row = fg['rows'][i];

              for (let k = 0;k < row.length;k++)
              {
                let name = row[k].key, value = this.entity[name];

                // Create object Date
                if (this.getAttributeByFieldName('type', name) == 'timestamp')
                  value = value ? new Date(value) : null;

                // Check if the value is a boolean and then set Si/No/""
                if (this.getAttributeByFieldName('type', name) == 'boolean')
                {
                  // Check if the field is required or has attribute withouNull == true
                  // then accept only value <Si/No>, otherwise <Si/No/"">
                  if (this.getAttributeByFieldName('required', name) ||
                      this.getAttributeByFieldName('withoutNull', name))
                    value = this.boolToString(value) != "" ? this.boolToString(value) : "No";
                  else
                    value = this.boolToString(value);
                }

                // Update form controller and config
                if (this.form.get(name))
                {
                  this.form.get(name).setValue(value);
                  this.setAttributeByFieldName(name,'value',value);
                }
              }

              this.form.updateValueAndValidity();
            }
          }
        }
      }
    }
  }

  /*
   * Return an array with all changed keys
   */
  getChangedKeys()
  {
    let controllersToCheck = Object.keys(this.form.controls);
    var changedKeys = [];
    controllersToCheck.forEach(ctrlName => {
      let ctrl = this.form.get(ctrlName);
      if (ctrl.dirty)
        changedKeys.push(ctrlName);
    });
    return changedKeys;
  }

  /*
   * Return an object (key-value) with all keys
   */
  getObject()
  {
    let controllers = Object.keys(this.form.controls);
    var obj = null;
    for(let i = 0; i<controllers.length; i++)
    {
      let ctrlName = controllers[i];
      let ctrl = this.form.get(ctrlName);
      let value = ctrl.value;

      // Check if value isDate then convert in timestamp
      if (value && this.isDate(value))
        value = value.getTime();

      // Check if the value is a number and then convert it
      if (this.getAttributeByFieldName('type', ctrlName) == 'number')
        value = (value === "" || value === null) ? null : Number(value);

      // Check if the value is a boolean and then set true/false/null
      if (this.getAttributeByFieldName('type', ctrlName) == 'boolean')
        value = this.stringToBool(value);

      if(!obj)
        obj = {};

      obj[ctrlName] = value;
    }
    return obj;
  }

  /*
   * Return an object (key-value) with all changed keys
   */
  getChangedObj()
  {
    let controllersToCheck = Object.keys(this.form.controls);
    var changedObj = null;
    for(let i = 0; i<controllersToCheck.length; i++)
    {
      let ctrlName = controllersToCheck[i];
      let ctrl = this.form.get(ctrlName);
      let value = ctrl.value;

      // Check if value isDate then convert in timestamp
      if (value && this.isDate(value))
        value = value.getTime();

      // Check if the value is a number and then convert it
      if (this.getAttributeByFieldName('type', ctrlName) == 'number')
        value = (value === "" || value === null) ? null : Number(value);

      // Check if the value is a boolean and then set true/false/null
      if (this.getAttributeByFieldName('type', ctrlName) == 'boolean')
        value = this.stringToBool(value);

      // Look if there are changed keys.
      // NOTE: Don't use ctrl.dirty because the user don't changed the value
      // in the UI (ex. field.disabled) therefore the attribute dirty is false.
      if (this.compareChgKeys(Array.isArray(value),value,ctrlName))
      {
        if(!changedObj)
          changedObj = {};

        changedObj[ctrlName] = value;
      }

    }
    return changedObj;
  }

  /*
   * Disable fields
   * To disable all form fields, you must pass controlsName param like undefined or null
   * otherwise if param controlsName is different of null disable only fields into array
   */
  disableFields(controlsName:Array<any>, value?: boolean)
  {
    let bDisable = value != undefined ? value : true;

    // if param controlsName is different of null disable only fields into array
    if (controlsName)
    {
      for (let z = 0; z < controlsName.length; z++)
      {
        let ctrl = controlsName[z];

        if (this.getAttributeByFieldName('type',ctrl) != 'button')
        {
          if (ctrl && bDisable)
            this.form.get(ctrl).disable();
          else if (ctrl && !bDisable)
            this.form.get(ctrl).enable();
        }

        this.setAttributeByFieldName(ctrl,'disabled', bDisable);
      }

      this.form.updateValueAndValidity();
    }
    else  // if param controlsName is null or undefined disable/enable  all fields form
    {
      let controllers = Object.keys(this.form.controls);
      controllers.forEach(ctrl =>
      {
        if (this.getAttributeByFieldName('type',ctrl) != 'button')
        {
          if (ctrl && bDisable)
            this.form.get(ctrl).disable();
          else if (ctrl && !bDisable)
            this.form.get(ctrl).enable();
        }
        this.setAttributeByFieldName(ctrl,'disabled', bDisable);
      });

      this.form.updateValueAndValidity();
    }
  }

  // Disable Fields Group
  disableFieldsGroup(aIdFg:Array<any>, value:boolean)
  {
    for (let z = 0; z < aIdFg.length; z++)
    {
      let id = aIdFg[z];
      for(let y = 0; y < this.config['fg'].length; y++)
      {
        let fg = this.config['fg'][y];
        if(fg.id == id)
        {
          this.config['fg'][y]['disabled'] = value;
          for (let i = 0; i < fg['rows'].length; i++)
          {
            let row = fg['rows'][i];

            for (let k = 0;k < row.length;k++)
            {
              let ctrl = row[k].key;

              if (this.getAttributeByFieldName('type',ctrl) == 'select')
              {
                if (ctrl && value)
                  this.form.get(ctrl).disable();
                else if (ctrl && !value)
                  this.form.get(ctrl).enable();
              }
            }

            this.form.updateValueAndValidity();
          }
        }
      }
    }
  }

  // Hidden Fields Group
  hiddenFieldsGroup(aIdFg,value)
  {
    for (let z = 0; z < aIdFg.length; z++)
    {
      let id = aIdFg[z];
      for(let y = 0; y < this.config['fg'].length; y++)
      {
        let fg = this.config['fg'][y];
        if(fg.id == id)
        {
          fg.hidden = value;

          for (let i = 0; i < fg['rows'].length; i++)
          {
            let row = fg['rows'][i];
            for(let j = 0; j < row.length; j++)
            {
              let field = row[j];
              let key = field.key;

              if (field.type != 'button')
              {
                // Remove all validators for related form control
                this.form.get(key).clearValidators();

                // Create new validators
                let validators = this.createValidators(field,fg);

                // Set validators on form control
                this.form.get(key).setValidators(validators);

                this.form.get(key).updateValueAndValidity();
              }
            }
          }
          break;
        }
      }
    }
  }

  // Hidden Fields
  hiddenFields(aKeys, value)
  {
    for (let k = 0; k < aKeys.length; k++)
    {
      let key = aKeys[k];

      for (let z = 0; z < this.config['fg'].length; z++)
      {
        let fg = this.config['fg'][z];
        for (let i = 0; i < fg['rows'].length; i++)
        {
          let row = fg['rows'][i];
          for(let j = 0; j < row.length; j++)
          {
            let field = row[j];

            if(field.key == key)
            {
              //Set hidden attribute to field
              field['hidden'] = value;

              if (field.type != 'button')
              {
                // Remove all validators for related form control
                this.form.get(key).clearValidators();

                // Create new validators
                let validators = this.createValidators(field,fg);

                // Set validators on form control
                this.form.get(key).setValidators(validators);

                this.form.get(key).updateValueAndValidity();
              }
              break;
            }
          }
        }
      }
    }
  }

  // Add Validators.required
  requireFields(aKeys,value)
  {
    for (let z = 0; z < aKeys.length; z++)
    {
      let key = aKeys[z];

      for (let z = 0; z < this.config['fg'].length; z++)
      {
        let fg = this.config['fg'][z];
        for (let i = 0; i < fg['rows'].length; i++)
        {
          let row = fg['rows'][i];
          for(let j = 0; j < row.length; j++)
          {
            let field = row[j];

            if(field.key == key)
            {
              //Set required attribute to field
              field['required'] = value;

              if (field.type != 'button')
              {
                // Remove all validators for related form control
                this.form.get(key).clearValidators();

                // Create new validators
                let validators = this.createValidators(field,fg);

                // Set validators on form control
                this.form.get(key).setValidators(validators);

                this.form.get(key).updateValueAndValidity();
              }

              break;

            }
          }
        }
      }
    }
  }

  hasKey(key):boolean
  {
    return this.form.get(key) != null;
  }

  setValueForKey(control, value)
  {
    let type = this.getAttributeByFieldName("type",control);

    switch (type)
    {
      case "boolean":
        // Check if the field is required or has attribute withouNull == true
          // then accept only value <Si/No>, otherwise <Si/No/"">
        if (this.getAttributeByFieldName('required', control) ||
            this.getAttributeByFieldName('withoutNull', control))
          value = this.boolToString(value) != "" ? this.boolToString(value) : "No";
        else
          value = this.boolToString(value);

        break;
    }

    // Set value on form and config
    this.form.get(control).setValue(value);
    this.setAttributeByFieldName(control,'value',value);

    // Update form
    this.form.updateValueAndValidity();
  }

  getValueForKey(key)
  {
    // Get value on form
    return this.form.get(key) ? this.form.get(key).value : null;
  }

  setOptionsForSearchSelect(options)
  {
    this.ssOpt = [...options];
  }

  // Use a character set [a-zA-Z] to match one digit from A–Z in lowercase and uppercase
  // or from 0-9
  keyPressInputText(value, field)
  {
    if (Object.keys(field).indexOf("onlyLetter") < 0 &&
      Object.keys(field).indexOf("onlyNumber"))
      return true;
    else if (Object.keys(field).indexOf("onlyLetter") >=0 &&
      Object.keys(field).indexOf("onlyNumber") >=0)
      return value.key.match(/^[a-zA-Z0-9]+$/) ? true : false;
    else if (Object.keys(field).indexOf("onlyLetter") >=0)
      return value.key.match(/^[a-zA-Z]+$/) ? true : false;
    else (Object.keys(field).indexOf("onlyNumber") >=0)
      return value.key.match(/^[0-9]+$/) ? true : false;

  }

  // Use a character set [0-9] to match one digit from 0-9
  keyPressInputNumber(value,val)
  {
    if (!val)
      return true;
    else
      return value.key.match(/^[0-9]+$/) ? true : false;
  }

  /*
   *  Private methods
   */
  private createFormGroup(config)
  {
    let group: any = {};
    for(let z = 0; z < config['fg'].length; z++)
    {
      let fg = config['fg'][z];
      let bFgDisabled = fg['disabled'] != undefined ? fg['disabled'] : false;
      for (let i = 0; i < fg['rows'].length; i++)
      {
        let row = fg['rows'][i];
        for(let j = 0; j < row.length; j++)
        {
          let field = row[j];

          //set Value

          // Check if the value is a boolean and then set Si/No/""
          if (field.type == 'boolean')
          {
            // Check if the field is required then accept only value <Si/No>, otherwise
            // <Si/No/"">
            if (field.required || field.withoutNull)
              field.value =
                this.entity ?
                  this.boolToString(this.entity[field.key]) != "" ?
                  this.boolToString(this.entity[field.key]) : "No" : "No";
            else
              field.value = this.entity ? this.boolToString(this.entity[field.key]) : null;
          }
          else if (field.type != 'timestamp')
            field.value = this.entity ? this.entity[field.key] : null ;
          else // convert timestamp in object Date
            field.value =
              this.entity && this.entity[field.key]?new Date(this.entity[field.key]):null;

          // set validators
          if(field.subType == 'tel')
            field.pattern = "^[0-9]+$";
          if(field.type == 'number')
            field.validateNumber = true;

          // NOTE: The button isn't add to FormGroup
          if(field.type != 'button')
          {
            let v = this.createValidators(field,fg);

            group[field.key] =
              field.disabled ? new FormControl({value:field.value, disabled: true},v) :
              new FormControl(field.value,v);

            if (field.type == 'select')
            {
              if (bFgDisabled || field.disabled)
                group[field.key].disable();
            }
          }
        }
      }

    }

    return new FormGroup(group);
  }

  private createValidators(f,fg)
  {
    var validators = [];
    if(f.required && !f.hidden && !fg.hidden)
      validators.push(Validators.required);
    if(f.validEmail)
      validators.push(Validators.email);
    if(f.minLength)
      validators.push(Validators.minLength(f.minLength));
    if(f.maxLength)
      validators.push(Validators.maxLength(f.maxLength));
    if(f.pattern)
      validators.push(Validators.pattern(f.pattern));
    if(f.validateNumber)
      validators.push(ValidateNumber); //Add custom Numeric Validator

    return validators;
  }

  private isDate(date)
  {
    return date.constructor.toString().indexOf("Date") > -1;
  }

  private getAttributeByFieldName(attr,fieldName)
  {
    for (let z = 0; z < this.config['fg'].length; z++)
    {
      let fg = this.config['fg'][z];
      for (let i = 0; i < fg['rows'].length; i++)
      {
        let row = fg['rows'][i];
        for(let j = 0; j < row.length; j++)
        {
          let field = row[j];
          if(field.key == fieldName)
            return field[attr] || null;
        }
      }
    }
  }

  private setAttributeByFieldName(fieldName, attr, value)
  {
    for (let z = 0; z < this.config['fg'].length; z++)
    {
      let fg = this.config['fg'][z];
      for (let i = 0; i < fg['rows'].length; i++)
      {
        let row = fg['rows'][i];
        for(let j = 0; j < row.length; j++)
        {
          let field = row[j];
          if(field.key == fieldName)
          {
            field[attr] = value;
            break;
          }
        }
      }
    }
  }

  private reloadSsOpt(term):Observable<object[]>
  {
    if (!term)
      return new Observable(observer => {observer.next(null);});

    for (let z = 0; z < this.config['fg'].length; z++)
    {
      let fg = this.config['fg'][z];
      for (let i = 0; i < fg['rows'].length; i++)
      {
        let row = fg['rows'][i];
        for(let j = 0; j < row.length; j++)
        {
          let field = row[j];
          if(field.type == 'searchSelect')
          {
            var url = field.searchUrl;
            var aKeys = field.searchKey;
            break;
          }
        }
      }
    }

    /* Load from server */
    let filter = {rules:[], groups:[], groupOp:"OR"};
    if(aKeys)
      for(let y = 0; y < aKeys.length; y++)
      {
        filter.rules.push(aKeys[y]+"|ILIKE|%"+term+"%");
      }
    else
      filter = null;
    let body = {filter: filter};

    return this.modelSvc.master(url,body);
  }

  private stringToBool(val)
  {
    switch(val)
    {
      case "Si":
        return true;
        break;
      case "No":
        return false;
        break;
      case "":
        return null;
        break;
    }
  }

  private boolToString(val)
  {
    switch(val)
    {
      case true:
        return "Si";
        break;
      case false:
        return "No";
        break;
      case null:
      case undefined:
        return "";
        break;
    }
  }

  private compareChgKeys(is_array, value, control)
  {
    if (is_array)
    {
      if (!this.entity[control])
        return true;
      else if (this.entity[control].length != value.length)
        return true;
      else
      {
        for (let i = 0; i < this.entity[control].length; i++)
        {
          let item = this.entity[control][i];
          if (value.indexOf(item) < 0)
            return true;
        }
        return false;
      }
    }
    else
    {
      if (value != this.entity[control])
        return true;
      else
        return false;
    }
  }
}
