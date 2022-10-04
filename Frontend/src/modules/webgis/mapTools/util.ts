
import {LayersTreeComponent} from './layersTree/layersTree.component';
import {PrintComponent}      from './print/print.component';
import {MeasureComponent}    from './measure/measure.component';
import {LegendComponent}     from './legend/legend.component';
import {SearchComponent}     from './search/search.component';
import {QueryComponent}      from './query/query.component';

// map toolId with tool class
const toolDict = {
  layersTree: LayersTreeComponent,
  print:      PrintComponent,
  measures:   MeasureComponent,
  legend:     LegendComponent,
  search:     SearchComponent,
  query:      QueryComponent
};

/*
 * return tool class given its id
 */
export function getMapToolsClass(toolId:string)
{
  return toolDict[toolId];
}