import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule } from '../core/core.module';

import { ArcComponent } from './arc/arc.component';
import { StreetComponent } from './street/street.component';
import { NumberComponent } from './number/number.component';
import { BuildingComponent } from './building/building.component';

import { TemplateComponent } from './template/template.component';

@NgModule({
  imports: [
    CommonModule,
    CoreModule
  ],
  declarations: [
    ArcComponent,
    StreetComponent,
    NumberComponent,
    BuildingComponent,
    TemplateComponent
  ],
  exports: [
    ArcComponent,
    StreetComponent,
    NumberComponent,
    BuildingComponent
  ],
  bootstrap: [
    ArcComponent,
    StreetComponent,
    NumberComponent,
    BuildingComponent
  ]
})

export class DictionaryModule {}
