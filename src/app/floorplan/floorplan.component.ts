import { Component, OnInit } from '@angular/core';

import { Map, View, Feature } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { fromLonLat, transform, transformExtent } from 'ol/proj';
import { OSM as OSMSource, Vector as VectorSource } from 'ol/source';
import { Style, Stroke, Fill } from 'ol/style';
import { GeoJSON } from 'ol/format';
import { Point, Geometry, LineString } from 'ol/geom';

import { Location } from '@angular/common';

// import { MatSnackBar} from '@angular/material';

import { AwsApiService } from '../aws-api.service';

import { CONFIG } from '../../environments/environment';


const FLOORPLAN_STYLE = new Style({
  stroke: new Stroke({
    color: 'blue',
    lineDash: [4],
    width: 3,
  }),
  fill: new Fill({
    color: 'rgba(0, 0, 255, 0.1)',
  }),
});

const DEFAULT_FLOORPLAN_ID = 'default';

@Component({
  selector: 'app-floorplan',
  templateUrl: './floorplan.component.html',
  styleUrls: ['./floorplan.component.css']
})
export class FloorplanComponent implements OnInit {

  dismissibleAlert = true;

  map: any;
  floorplan: any;

  mapView: any;
  mapTileLayer: any;
  floorplanVectorSource: any;
  floorplanVectorLayer: any;



  constructor(
    // private route: ActivatedRoute,
    private location: Location,
    private awsApiService: AwsApiService,
    // private snackBar: MatSnackBar,
  ) { }

  ngOnInit() {
    this.get();
  }

  initMap() {

    /* MAP LAYER */
    this.mapTileLayer = new TileLayer({
      source: new OSMSource(),
      zIndex: 10,
    });

    /* FLOORPLAN LAYER */
    this.floorplanVectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(this.floorplan.geojson, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'}),
    });
    this.floorplanVectorLayer = new VectorLayer({
      source: this.floorplanVectorSource,
      style: FLOORPLAN_STYLE,
      zIndex: 20,
    });

    /* MAP VIEW */
    this.mapView = new View();
    this.mapView.fit(
      this.floorplanVectorSource.getFeatures()[0].getGeometry(),
      {
        padding: [10, 10, 10, 10]
      }
    );

    /* FLOORPLAN LAYER */
    this.map = new Map({
        target: 'map',
        layers: [
          this.mapTileLayer,
          this.floorplanVectorLayer,
        ],
        view: this.mapView,
    });
  }

  updateFloorplan(): void {

  }

  get(): void {
    this.awsApiService.getFloorplan(DEFAULT_FLOORPLAN_ID).subscribe(
      (data: any) => {
        this.floorplan = data[0];
        this.initMap();
        // this.reportSuccess(data.message.message);
      },
      (error) => {
        // this.reportError(error.error.message.message);
      }
    );
  }

  save(): void {

    const floorplanUpdateFields: any = {
      name: this.floorplan.name,
      geojson: this.floorplan.geojson
    };

/*
    this.awsApiService.updateFloorplan(DEFAULT_FLOORPLAN_ID, floorplanUpdateFields).subscribe(
      (data) => {
        // this.reportSuccess(data.message.message);
        // this.goBack();
      },
      (error) => {
        // this.reportError(error.error.message.message);
      }
    );
*/

  }

  goBack(): void {
    this.location.back();
  }


/*
  private reportError(message: string): void {
    if (message) {
      this.snackBar.open(message, 'close', {
        panelClass: ['red-snackbar']
      });
    }
  }

  private reportSuccess(message: string): void {
    this.snackBar.open(message, '', {
      panelClass: ['green-snackbar'],
      duration: 2000,
    });
  }
*/

}
