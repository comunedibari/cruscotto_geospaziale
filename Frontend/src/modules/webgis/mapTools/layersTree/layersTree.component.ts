/*
 *
 */

import {Component, OnInit, OnDestroy,
         Input}                            from '@angular/core';
import {Tree, UITreeNode}                  from 'primeng/tree';
import {TreeNode}                          from 'primeng/api';

import {Subscription}                      from 'rxjs';

import {WebgisService}                     from '../../webgis.service';

import {WGMapCategory}                     from '../../entity/wgMapCategory';
import {WGMapLayer}                        from '../../entity/wgmapLayer';
import {WGTool}                            from '../../entity/wgtool';
import * as JSZip                          from 'jszip';

@Component({
  selector: 'webgis-layersTree',
  templateUrl: './layersTree.component.html',
  styleUrls: ['./layersTree.component.css']
})

export class LayersTreeComponent implements OnInit
{
  cfg: WGTool;

  // base layers variables
  private currentBaseLayer;

  baseLayerArray:Array<WGMapLayer>;

  currentBaseLayerOpacitySliderValue:number;
  isBaseLayerControlsCollapsed:boolean;
  isBaseLayerListCollapsed:boolean;

  baseLayerBodyStyle: Object = {};
  layerBodyStyle: Object = {};

  // categories variables
  categoryArray:Array<WGMapCategory>;
  catCfg: Array<Object>;
  isLayerListCollapsed:boolean;
  selectedNode: Object;

  // user layers
//   isUserLayerListCollapsed:boolean;

  showError:boolean = false;
  err: string = "";

  // array allowed extensions into zip file
  private extShp = ['shp','shx', 'dbf', 'prj'];

  private subscription:Subscription;

  constructor(private wgSvc:WebgisService)
  {
    // Implemented drang & drop restrinction on layer tree
    UITreeNode.prototype.onDropNodeDragOver = function (event) {
      return;
    };

    Tree.prototype.allowDrop=(dragNode:any,dropNode:any,dragNodeScope:any):boolean => {
      if(dropNode && dragNode)
      {
        if(dropNode === dragNode)
          return false;

        let destItem = dropNode;
        let sourceItem = dragNode;

        //items can't be moved out of another category
        if (sourceItem.id_category != destItem.id_category)
          return false;

        //items can't be moved into another group
        if (sourceItem.id_parent != destItem.id_parent)
          return false;

        return true;
      }
    };

    // base layers
    this.baseLayerArray = this.wgSvc.getBaseLayers();

    this.isBaseLayerListCollapsed = false;

    this.isBaseLayerControlsCollapsed = true;

    this.baseLayerBodyStyle = {};

    // categories
    this.categoryArray = this.wgSvc.getCategories();

    this.catCfg = [];

    // layers
    this.isLayerListCollapsed = false;

    //user layer
//     this.isUserLayerListCollapsed = true;

    this.layerBodyStyle = {};
  }

  ngOnInit()
  {
    this.subscription = this.wgSvc.observer.subscribe((layerObj) =>
    {
      switch(layerObj['key'])
      {
        // Catch the layer visibility change event
        case 'visibilityLayer':
          // push given layer into selectedNode for layer tree (if not already pushed)
          let idCategory = layerObj['val'].id_category;

          //if (this.selectedNode[idCategory].indexOf(layerObj['val']) < 0)
          //  this.selectedNode[idCategory].push(layerObj['val']);

          // Call inizializeSelNodeTree to set flag partialSelected
          this.inizializeSelNodeTree();
          break;
      }
    });

    // initialize currentBaseLayer
    this.currentBaseLayer = this.getCurrentBaseLayer();
    this.currentBaseLayerOpacitySliderValue = this.currentBaseLayer.opacityPerc;

    this.inizializeSelNodeTree();
  }

  ngOnDestroy()
  {
    this.subscription.unsubscribe();
  }

  onBaseLayerSelect(bl)
  {
    //Retrieve currentBaseLayer
    this.currentBaseLayer = this.getCurrentBaseLayer();

    if (this.currentBaseLayer)
      // light off previous base layer
      this.currentBaseLayer.setVisibility(false);

    // light on new base layer
    bl.setVisibility(true);

    // save current base layer in component
    this.currentBaseLayer = bl;
    this.currentBaseLayerOpacitySliderValue = bl.opacityPerc;
  }

  onUserChangeBLOpacity(change): void
  {
    let op = 1 - change.value/100;

    this.currentBaseLayer.opacityPerc = change.value;
    this.currentBaseLayer.setOpacity(op);
  }

  baseLayerControlsCollapsed(): void
  {
    this.isBaseLayerControlsCollapsed = !this.isBaseLayerControlsCollapsed;
  }

  onNodeSelect(sel)
  {
    let lyr = sel.node;

    lyr.setVisibility(true);
  }

  onNodeUnselect(sel)
  {
    let lyr = sel.node;

    lyr.setVisibility(false);
  }

  onNodeDrop(event)
  {
    //this.orderLayerChanged.emit(event);
    this.wgSvc.sendMessage('layerOrder', event);
  }

  zoomItem(event)
  {
    //this.zoomLayer.emit(event);
    this.wgSvc.sendMessage('layerZoom', event);
  }

  setCfg(cfg: WGTool)
  {
    this.cfg = cfg;
  }

//   handleFileInput (file)
//   {
//     if (!file)
//       return;
//
//     this.isUserLayerListCollapsed = false;
//     let reader = new FileReader();
//     reader.readAsArrayBuffer(file[0]);
//     reader.onload = () => {
//       let zip = new JSZip();
//       let extFilesZip = null;
//       let nameFilesZip = null;
//       zip.loadAsync(file[0]).then(
//         (zip) =>
//         {
//           // process ZIP file content
//
//           // Retrieve extension foreach files
//           extFilesZip = Object.values(zip.files).map((obj) => {
//             let s = obj['name'].split('.');
//             return s[s.length-1];
//           });
//
//           // Check if into zip file there are files with extension .shp, .shx, .dbf and .prj
//           let zipOk = this.extShp.every((item) => extFilesZip.indexOf(item) !== -1);
//
//           if (zipOk)
//           {
//             let nShp = 0;
//             // Check if into shapefile there are more one geometry (more .shp file)
//             extFilesZip.forEach((item) =>
//             {
//               if (item == 'shp')
//                 nShp++;
//             });
//
//             if (nShp > 1)
//             {
//               this.showError = true;
//               this.err = "WEBGIS.SHP_GEOM_ERR";
//               return;
//             }
//
//             nameFilesZip = Object.values(zip.files).map((obj) => {
//               let s = obj['name'].split('.');
//               if (this.extShp.indexOf(s[s.length-1]) >= 0)
//                 return s[s.length-2];
//             });
//
//             // Check if the shapefile's files have the same name
//             let nameOk = nameFilesZip.every(e => e === nameFilesZip[0]);
//             if (!nameOk)
//             {
//               this.showError = true;
//               this.err = "WEBGIS.SHP_NAME_ERR";
//               return;
//             }
//           }
//           else
//           {
//             this.showError = true;
//             this.err = "WEBGIS.NO_SHP_ERR";
//             return;
//           }
//           // TODO UPLOAD FILE
//           this.showError = false;;
//         },
//         (err) =>
//         {
//           this.showError = true;
//           this.err = "MESSAGE.ZIP_FILE_ERR"
//         }
//       );
//     };
//   }
//
  /*Private function*/
  private getCurrentBaseLayer()
  {
    // with base layer setted as default or currently visible base layer
    for (let idx=0; idx<this.baseLayerArray.length; idx++)
    {
      let baseLayer = this.baseLayerArray[idx];

      if ((baseLayer._default && baseLayer.visibility) || baseLayer.visibility)
        return baseLayer;
    }
    return null;
  }

  private inizializeSelNodeTree()
  {
    // initialize selectedNode for layer tree
    this.selectedNode = {};

    // cycle on category array to retrieve layers with initial visibility true
    for (let idx=0; idx<this.categoryArray.length; idx++)
    {
      let category = this.categoryArray[idx];

      this.selectedNode[category.id] = [];
      for (let jdx = 0; jdx < category.layers.length; jdx++)
      {
        let layer = category.layers[jdx];
        if (layer.selected)
        {
          this.selectedNode[category.id].push(layer);
          this.manageParentSelNode(layer);
          if (layer.children && layer.children.length > 0)
            this.manageChildrenSelected(layer.children);
        }
        else if (layer.children && layer.children.length > 0)
            this.manageChildrenSelected(layer.children);

        if (layer.id_parent)
          this.manageParentSelNode(layer);
      }
    }
  }

  private manageParentSelNode(lyr)
  {
    if (lyr.id_parent)
    {
    let parent = this.wgSvc.getLayerObjById(lyr.id_parent);
    if (parent.children &&  parent.children.length > 0)
    {
      let allBrotherSelected = true;

      // parent layer is visible if at least one child layer is visible
      for (let zdx=0, len=parent.children.length; zdx<len; zdx++)
      {
        let brother = parent.children[zdx];

        allBrotherSelected = allBrotherSelected && brother.selected;
      }

      parent.partialSelected = !allBrotherSelected;

    }

    if (parent.id_parent)
      this.manageParentSelNode(parent);
    }
  }

  // Cycle on all children to retrieve selected layer
  private manageChildrenSelected(children)
  {
    for (let kdx=0; kdx<children.length; kdx++)
    {
      let child = children[kdx];
      if(child.selected)
      {
        this.selectedNode[child.id_category].push(child);
        this.manageParentSelNode(child);
        if (child.children && child.children.length > 0)
          this.manageChildrenSelected(child.children);
      }
      else if(child.children && child.children.length > 0)
        this.manageChildrenSelected(child.children);
    }
  }

  private getBaseLayerById(layerId:number)
  {
    let layer = null;

    for (let idx=0; idx<this.baseLayerArray.length; idx++)
    {
      let baseLayer = this.baseLayerArray[idx];

      if (baseLayer.id == layerId)
      {
        return baseLayer;
      }
    }

    return layer;
  }

}
