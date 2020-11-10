import { Component, OnInit } from '@angular/core';

import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM as OSMSource, Vector as VectorSource } from 'ol/source';
import { Style, Stroke, Fill } from 'ol/style';
import { GeoJSON } from 'ol/format';

import { Location } from '@angular/common';

import { MatSnackBar} from '@angular/material/snack-bar';

import { AwsApiService } from '../aws-api.service';


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
  floorplan = { floorplanId: '', name: '', geojson: '' };

  mapView: any;
  mapTileLayer: any;
  floorplanVectorSource: any;
  floorplanVectorLayer: any;



  constructor(
    // private route: ActivatedRoute,
    private location: Location,
    private awsApiService: AwsApiService,
    private snackBar: MatSnackBar,
  ) {
    // this.get();
  }

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
    /*
    this.floorplanVectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(this.floorplan.geojson, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'}),
    });
    */

    let feature: any;
    try {
      feature = new GeoJSON().readFeatures(this.floorplan.geojson, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
    }
    catch (err) {
      this.floorplan.geojson = '{ "type": "FeatureCollection", "features": [] }';
      feature = new GeoJSON().readFeatures(this.floorplan.geojson, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
    }

    this.floorplanVectorSource = new VectorSource();
    this.floorplanVectorSource.addFeatures( feature );

    this.floorplanVectorLayer = new VectorLayer({
      source: this.floorplanVectorSource,
      style: FLOORPLAN_STYLE,
      zIndex: 20,
    });

    /* MAP VIEW */
    this.mapView = new View();
    try {
      this.mapView.fit(
        this.floorplanVectorSource.getFeatures()[0].getGeometry(),
        {
          padding: [10, 10, 10, 10]
        }
      );
    }
    catch (err) {}

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

    let features: any;
    try {
      features = new GeoJSON().readFeatures(this.floorplan.geojson, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
      this.reportSuccess('The GeoJSON definition has been updated!');
    }
    catch (err) {
      this.reportError('Invalid GeoJSON text.');
      this.floorplan.geojson = '{ "type": "FeatureCollection", "features": [] }';
      features = new GeoJSON().readFeatures(this.floorplan.geojson, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
    }

    this.floorplanVectorSource.clear();
    this.floorplanVectorSource.addFeatures( features );
    try {
      this.mapView.fit(
        this.floorplanVectorSource.getFeatures()[0].getGeometry(),
        {
          padding: [100, 100, 100, 100]
        }
      );
    }
    catch (err) { }

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

    this.awsApiService.updateFloorplan(
      DEFAULT_FLOORPLAN_ID,
      this.floorplan.name,
      this.floorplan.geojson
    ).subscribe(
      (data) => {
        // this.reportSuccess(data.message.message);
        // this.goBack();
      },
      (error) => {
        // this.reportError(error.error.message.message);
      }
    );

  }

  goBack(): void {
    this.location.back();
  }


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

}
