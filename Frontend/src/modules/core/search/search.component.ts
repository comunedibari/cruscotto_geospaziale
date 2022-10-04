import { Component, OnInit, Input,
          Output, EventEmitter,
          ViewChild }                   from '@angular/core';

import { ContextService }               from '../context.service';

import {FormComponent}                  from '../form/form.component';

import {SearchCond}                     from './searchCondition'

import {SearchGroupComponent}           from './search-group/search-group.component'

@Component({
  selector: 'core-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit
{
  @Input() config;
  @Output() keydownSimpleSearch = new EventEmitter<any>();
  @Output() clearSimpleSearch = new EventEmitter<any>();
  @Output() filterAdvancedSearch = new EventEmitter<any>();

  @ViewChild(SearchGroupComponent) childSearchGroup: SearchGroupComponent;

  /*Local variable*/
  text: null;
  disable: boolean =  false;
  aGroups: Array<Object> = [];
  advancedSelected: boolean = false;

  constructor(private contextSvc:ContextService) { }

  ngOnInit()
  {
    this.aGroups[0] = {
      id: 0,
      opLogic: "AND",
      conditions: [new SearchCond({
        id:0,
        attr: null,
        op: null,
        value: null
      })]
    }
  }

  /*
   * Public method
   */
  //Public methods accessible from parent component
  disableSearch(value)
  {
    this.disable = value;
  }

  onSimpleSearch(ev)
  {
    if (ev.keyCode != 13)
      return;

    this.text = ev.target.value;
    let aKeys = this.config['simple']['key'];
    let res = {rules:[], groups:[], groupOp:"OR"};
    for(let i = 0; i < aKeys.length; i++)
    {
      res.rules.push(aKeys[i]+"|ILIKE|%"+this.text+"%");
    }
    this.keydownSimpleSearch.emit(res);
  }

  onSimpleClear()
  {
    this.text = null;
    this.clearSimpleSearch.emit(this.text);
  }

   onResetAdvancedSearch()
  {
    delete this.aGroups;
    this.aGroups = [{
      id: 0,
      opLogic: "AND",
      conditions:[new SearchCond(
        {
          id: 0,
          attr: null,
          op: null,
          value: null
        })]
    }];
    this.filterAdvancedSearch.emit(null);
    this.text = null;
    this.advancedSelected = false;
  }

  onAdvancedSearch()
  {
    if (!this.childSearchGroup.isValid())
      return

    // Prepare filter to send server
    let bodyToSend = {rules: [], groupOp: "", groups: []};
    for (let j = 0; j < this.aGroups.length; j++)
    {
      if (j == 0)
      {
        // No filter
        if (this.aGroups[j]['conditions'].length == 0)
        {
          bodyToSend = null;
          break;
        }

        for (let i = 0; i< this.aGroups[j]['conditions'].length; i++)
          bodyToSend.rules.push(this.aGroups[j]['conditions'][i].serialize());

        bodyToSend.groupOp = this.aGroups[j]['opLogic'];
      }
      else
      {
        let group = {rules: [], groupOp: "", groups: []};
        for (let i = 0; i< this.aGroups[j]['conditions'].length; i++)
          group.rules.push(this.aGroups[j]['conditions'][i].serialize());

        group.groupOp = this.aGroups[j]['opLogic'];
        bodyToSend.groups.push(group);
      }
    }

    this.advancedSelected = true;
    this.filterAdvancedSearch.emit(bodyToSend);
  }

  /* event handler*/
  onManageGroup(event)
  {
    switch(event.op)
    {
      case 'I':
        let cond = new SearchCond({
          id:this.aGroups[event.id]['conditions'].length,
          attr: null,
          op: null,
          value: null
        });
        let obj = {
          id: this.aGroups.length,
          opLogic: "AND",
          conditions:[cond]
        };

        this.aGroups.push(obj);

        break;
      case 'D':
        let g = this.aGroups.find(g=> g['id'] == event.id);
        let idx = this.aGroups.indexOf(g);
        if (idx >= 0 && this.aGroups.length > 1)
          this.aGroups.splice(idx,1);
        break;
    }
  }

}