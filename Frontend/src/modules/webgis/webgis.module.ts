import {NgModule}                 from '@angular/core';
import {CommonModule}             from '@angular/common';
import {FormsModule}              from '@angular/forms';

import {NgbModule}                from '@ng-bootstrap/ng-bootstrap';

import {SidebarModule}            from 'ng-sidebar';
import {SliderModule}             from 'primeng/slider';
import {TreeModule}               from 'primeng/tree';
import {DragDropModule}           from 'primeng/dragdrop';
import {TreeDragDropService}      from 'primeng/api';


import {MapComponent}             from './map/map.component';
import {PrintComponent}           from './mapTools/print/print.component';
import {MeasureComponent}         from './mapTools/measure/measure.component';
import {LayersTreeComponent}      from './mapTools/layersTree/layersTree.component';
import {LayerComponent}           from './mapTools/layersTree/layer/layer.component';
import {LegendComponent}          from './mapTools/legend/legend.component';
import {SearchComponent}          from './mapTools/search/search.component';
import {SearchConditionComponent} from './mapTools/search/search-condition/search-condition.component';
import {QueryComponent}           from './mapTools/query/query.component';
import {EditComponent}            from './edit/edit.component';
import {ConfigComponent}          from './config/config.component';
import {ConfigBslayComponent}     from './config-bslay/config-bslay.component';
import {ConfigLayerComponent}     from './config-layer/config-layer.component';
import {ConfigStyleComponent}     from './config-style/config-style.component';
import {ConfigUserStyleComponent} from './config-user-style/config-user-style.component';

import {CoreModule}               from '../core/core.module';


@NgModule({
  imports: [
    CommonModule,
    NgbModule,
    SidebarModule.forRoot(),
    SliderModule,
    TreeModule,
    DragDropModule,
    FormsModule,
    CoreModule
  ],
  declarations: [
    MapComponent,
    PrintComponent,
    EditComponent,
    MeasureComponent,
    LayerComponent,
    LayersTreeComponent,
    ConfigComponent,
    ConfigBslayComponent,
    ConfigLayerComponent,
    ConfigStyleComponent,
    EditComponent,
    LegendComponent,
    SearchComponent,
    ConfigUserStyleComponent,
    SearchConditionComponent,
    QueryComponent
  ],
  exports: [
    MapComponent,
    ConfigComponent
  ],
  bootstrap: [
    ConfigComponent
  ],
  entryComponents: [
    PrintComponent,
    LegendComponent,
    MeasureComponent,
    LayersTreeComponent,
    SearchComponent,
    QueryComponent,
    ConfigUserStyleComponent
  ],
  providers: [TreeDragDropService]
})

export class WebgisModule {}
