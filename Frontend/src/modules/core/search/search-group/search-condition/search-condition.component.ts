import { Component, OnInit, Input,
          Output, EventEmitter,
          ViewChild}                   from '@angular/core';


import {FormComponent}                  from '../../../form/form.component';

import { ContextService }               from '../../../context.service';

@Component({
  selector: 'core-search-condition',
  templateUrl: './search-condition.component.html',
  styleUrls: ['./search-condition.component.css']
})
export class SearchConditionComponent implements OnInit {

  @Input() condition;
  @Input() idx;
  @Input() condLength;
  @Input() config;

  @Output() manageCondition = new EventEmitter<any>();

  @ViewChild(FormComponent) formCondition: FormComponent;

  dAdvancedSource: Object = null;

  searchCondFormCfg =
  {
    id: "searchCondFormCfg",
    fg:
    [
      {
        rows:
        [
          [
            {
              key: "attr",
              type: "select",
              label: "Attributi",
              width: 4,
              options:  [],
              required: true
            },
            {
              key: "op",
              type: "select",
              label: "Operazione",
              width: 4,
              options: [],
              required: true
            },
            {
              key: "value",
              type: "text",
              label: "Valore",
              width: 4,
              required: false
            }
          ]
        ]
      }
    ]
  };

  constructor(private contextSvc:ContextService) { }

  ngOnInit()
  {
    if (this.config['advanced']['source'])
    {
      let attributes = [];

      this.dAdvancedSource = {};
      for (let idx = 0; idx<this.config['advanced']['source'].length; idx++)
      {
        let item = this.config['advanced']['source'][idx];
        attributes.push({id: item['id'], name: item['name']});
        this.dAdvancedSource[item['id']] = item;
      }

      this.searchCondFormCfg.fg[0].rows[0][0].options = [...attributes];
    }

    if (this.condition)
    {
      if (this.dAdvancedSource)
      {
        let obj = this.dAdvancedSource[this.condition.attr];
        if (obj)
        {
          let op = this.contextSvc.getContext('operator').filter((elem) => {
            let bFound = false;
            for (let j = 0; j < obj.operators.length; j++)
            {
              if (elem['id'] == obj.operators[j])
                bFound = true;
            }
            if (bFound)
              return true;
            else
              return false;
          });

          this.searchCondFormCfg['fg'][0]['rows'][0][1].options = [...op];
          this.searchCondFormCfg['fg'][0]['rows'][0][2]['type'] = obj.type;
          switch(obj.type)
          {
            case 'select':
              this.searchCondFormCfg['fg'][0]['rows'][0][2]['options'] = [...obj.options];
              break;

            case 'timestamp':
            case 'text':
              if (obj.subType)
                this.searchCondFormCfg['fg'][0]['rows'][0][2]['subType'] = obj.subType;

              if (obj.pattern)
                this.searchCondFormCfg['fg'][0]['rows'][0][2]['pattern'] = obj.pattern;
              break;
          }
        }
      }
    }
  }

  /* Public methods */
  addCondition()
  {
    if (!this.formCondition.isValid())
      return;
    this.manageCondition.emit({op:'I'});
  }

  delCondition(id)
  {
    this.manageCondition.emit({op:'D', id:id});
  }

  /* Public methods accessible from parent component */
  isValid()
  {
    return this.formCondition.isValid();
  }

  /* event handler*/
  onSearchCondFormChanged(event)
  {
    this.formCondition.entity.update(this.formCondition.getChangedObj());

    switch(event.key)
    {
      case 'attr':
        let obj = this.dAdvancedSource[event.val];
        let op = this.contextSvc.getContext('operator').filter((elem) => {
          let bFound = false;
          for (let j = 0; j < obj.operators.length; j++)
          {
            if (elem['id'] == obj.operators[j])
              bFound = true;
          }
          if (bFound)
            return true;
          else
            return false;
        });

        this.searchCondFormCfg['fg'][0]['rows'][0][1].options = [...op];
        this.searchCondFormCfg['fg'][0]['rows'][0][2]['type'] = obj.type;
        switch(obj.type)
        {
          case 'select':
            this.searchCondFormCfg['fg'][0]['rows'][0][2]['options'] = [...obj.options];
            break;

          case 'timestamp':
          case 'text':
            if (obj.subType)
              this.searchCondFormCfg['fg'][0]['rows'][0][2]['subType'] = obj.subType;

            if (obj.pattern)
              this.searchCondFormCfg['fg'][0]['rows'][0][2]['pattern'] = obj.pattern;
            break;
        }
        break;

      case 'op':
        switch (event.val)
        {
          case "IS_NULL":
          case "IS_NOT":
            this.formCondition.disableFields(['value'],true);
            this.formCondition.setValueForKey('value',null);
            break;

          default:
            this.formCondition.disableFields(['value'],false);
        }
        break;
    }
  }
}
