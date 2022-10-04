import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule,HttpClient } from '@angular/common/http';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';

import { ColorPickerModule } from 'ngx-color-picker';

import { TableModule } from 'primeng/table';
import {InputMaskModule} from 'primeng/inputmask';

import { TranslateModule,TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import './dateUtils';

/*
 * Core components
 */
import { PaginationComponent } from './pagination/pagination.component';
import { CollectionComponent } from './collection/collection.component';
import { FormComponent } from './form/form.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { TableComponent } from './table/table.component';
import { AlertComponent } from './alert/alert.component';
import { ModalMessageComponent } from './modal-message/modal-message.component';
import { SearchComponent } from './search/search.component';
import { SearchGroupComponent } from './search/search-group/search-group.component';
import { SearchConditionComponent } from './search/search-group/search-condition/search-condition.component';

/*
 * Configure TranslateLoader
 */
export function HttpLoaderFactory(http:HttpClient)
{
  return new TranslateHttpLoader(http,"/er/i18n/master?lang=","");
}

/*
 * Core module definition
 */
@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    NgbModule,
    NgSelectModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
    TableModule,
    InputMaskModule,
    ColorPickerModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  declarations: [
    CollectionComponent,
    FormComponent,
    PaginationComponent,
    ToolbarComponent,
    TableComponent,
    AlertComponent,
    ModalMessageComponent,
    SearchComponent,
    SearchGroupComponent,
    SearchConditionComponent
  ],
  exports: [
    NgSelectModule,
    ColorPickerModule,
    TranslateModule,
    TableModule,
    PaginationComponent,
    CollectionComponent,
    FormComponent,
    ToolbarComponent,
    TableComponent,
    AlertComponent,
    SearchComponent,
    SearchGroupComponent,
    SearchConditionComponent
  ]
})

export class CoreModule {}
