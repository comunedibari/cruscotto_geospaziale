import { Component, OnInit, Input,
          Output, EventEmitter,
          ViewChild}                    from '@angular/core';

import {SearchCond}                     from '../searchCondition'
import {SearchConditionComponent}       from './search-condition/search-condition.component'

@Component({
  selector: 'core-search-group',
  templateUrl: './search-group.component.html',
  styleUrls: ['./search-group.component.css']
})
export class SearchGroupComponent implements OnInit {

  @Input() group;
  @Input() config;
  @Output() manageGroup = new EventEmitter<any>();

  @ViewChild(SearchConditionComponent) childSearchCondition: SearchConditionComponent;

  constructor() { }

  ngOnInit() {}

  /* Pubblic method */
  addGroup()
  {
    this.manageGroup.emit({op:'I', id:this.group.id});
  }

  delGroup()
  {
    this.manageGroup.emit({op:'D', id:this.group.id});
  }

  /* Public methods accessible from parent component */
  isValid()
  {
    return this.childSearchCondition ? this.childSearchCondition.isValid() : true;
  }

  /* event handler*/
  onManageCondition(event)
  {
    switch(event.op)
    {
      case 'I':
        let cond = new SearchCond({
          id:this.group.conditions.length,
          attr: null,
          op: null,
          value: null
        });
        this.group.conditions.push(cond);

        break;
      case 'D':
        let c = this.group.conditions.find(c=> c.id == event.id);
        let idx = this.group.conditions.indexOf(c);
        if (idx >= 0) // && this.group.conditions.length > 1
         this.group.conditions.splice(idx,1);
        break;
    }
  }
}
