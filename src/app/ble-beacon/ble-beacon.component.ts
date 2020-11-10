import { Component, OnInit } from '@angular/core';



import { Map, View, Overlay, Feature } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer, Image as ImageLayer } from 'ol/layer';
import { toLonLat, fromLonLat, transform, transformExtent } from 'ol/proj';
import { OSM as OSMSource, Vector as VectorSource, ImageStatic as ImageStaticSource } from 'ol/source';
import { Style, Icon, Stroke, Fill } from 'ol/style';
import { GeoJSON } from 'ol/format';
import { Point, Geometry, LineString } from 'ol/geom';

import { DragAndDrop, Modify } from 'ol/interaction';

import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

// import { MatSnackBar} from '@angular/material';

import { BleBeacon } from '../bleBeacon';
import { AwsApiService } from '../aws-api.service';

// import { CONFIG } from '../../environments/environment';
import { ConfigService } from '../config.service';


const BEACON_STYLE = new Style({
  image: new Icon( {
      anchor: [0.5, 0.5],
      opacity: 1.0,
      scale: 0.5,
      src: 'assets/ble_beacon_1.png',
  })
});

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
  selector: 'app-ble-beacon',
  templateUrl: './ble-beacon.component.html',
  styleUrls: ['./ble-beacon.component.css']
})
export class BleBeaconComponent implements OnInit {

  mapView: any;
  mapTileLayer: any;
  floorplanVectorSource: any;
  floorplanVectorLayer: any;
  floorplan: any;
  beaconFeature: any;
  beaconVectorSource: any;
  beaconVectorLayer: any;
  beaconModify: any;
  bleBeacon: BleBeacon;
  map: any;

  formTypeIsCreate = false;

  dismissibleAlert = true;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private awsApiService: AwsApiService,
    private configService: ConfigService,
    // private snackBar: MatSnackBar,
  ) { }

  ngOnInit() {

    this.initMap();
    const bssid = this.route.snapshot.paramMap.get('bssid');
    if (bssid === 'create') {
      this.formTypeIsCreate = true;
      this.getFloorplanThenBeacon();
    } else {
      this.formTypeIsCreate = false;
      this.getFloorplanThenBeacon();
    }
  }

  initMap() {

    /* MAP VIEW */
    this.mapView = new View({
      center: fromLonLat(this.configService.DEFAULT_MAP_CENTER),
      zoom: this.configService.DEFAULT_MAP_ZOOM,
    });

    /* MAP LAYER */
    this.mapTileLayer = new TileLayer({
      source: new OSMSource(),
      zIndex: 10,
    });

    /* BEACON LAYER */
    this.beaconFeature = new Feature(
      new Point(fromLonLat(this.configService.DEFAULT_MAP_CENTER))
    );
    this.beaconVectorSource = new VectorSource({
      features: [this.beaconFeature]
    });
    this.beaconVectorLayer = new VectorLayer({
        source: this.beaconVectorSource,
        style: BEACON_STYLE,
        zIndex: 30
    });

    this.beaconModify = new Modify({
      source: this.beaconVectorSource
    });

    /* FLOORPLAN LAYER */
    this.floorplanVectorSource = new VectorSource();
    this.floorplanVectorLayer = new VectorLayer({
      source: this.floorplanVectorSource,
      style: FLOORPLAN_STYLE,
      zIndex: 20,
    });

    this.map = new Map({
        target: 'map',
        layers: [
          this.mapTileLayer,
          this.floorplanVectorLayer,
          this.beaconVectorLayer,
        ],
        view: this.mapView,
    });
    this.map.addInteraction(this.beaconModify);
    this.beaconModify.on('modifyend', evt => {
      this.bleBeacon.coordinates = transform(
          this.beaconFeature.getGeometry().getCoordinates(),
          'EPSG:3857',
          'EPSG:4326'
      );
    });
  }

  getDefaultBeacon(): void {
  }

  getBeacon(): void {

    if (this.formTypeIsCreate) {
      this.zoomToFloorplan();
      this.bleBeacon = {
        bssid: '',
        name: '',
        coordinates: toLonLat(this.mapView.getCenter()),
      };
      this.updateBeaconPositionOnMap();
    } else {
      const bssid = this.route.snapshot.paramMap.get('bssid');
      this.awsApiService.getBleBeacon(bssid).subscribe(
        (data: BleBeacon) => {
          this.bleBeacon = data;
          this.updateBeaconPositionOnMap();
          this.zoomToBeacon();
          // this.reportSuccess(data.message.message);
        },
        (error) => {
          // this.reportError(error.error.message.message);
        }
      );
    }

  }

  updateBeaconPositionOnMap(): void {
    this.beaconFeature.getGeometry().setCoordinates(fromLonLat(this.bleBeacon.coordinates));
  }

  zoomToBeacon(): void {
    this.mapView.setCenter(fromLonLat(this.bleBeacon.coordinates));
    this.mapView.setZoom(this.configService.DEFAULT_MAP_ZOOM);
  }

  create(): void {

    this.awsApiService.createBleBeacon(this.bleBeacon).subscribe(
      (data) => {
        // this.reportSuccess(data.message.message);
        // this.goBack();
      },
      (error) => {
        // this.reportError(error.error.message.message);
      }
    );

  }

  save(): void {

    const bleBeaconUpdateFields: BleBeacon = {
      name: this.bleBeacon.name,
      coordinates: [
        this.bleBeacon.coordinates[0],
        this.bleBeacon.coordinates[1],
      ],
    };

    const bssid = this.route.snapshot.paramMap.get('bssid');
    this.awsApiService.updateBleBeacon(bssid, bleBeaconUpdateFields).subscribe(
      (data) => {
        // this.reportSuccess(data.message.message);
        // this.goBack();
      },
      (error) => {
        // this.reportError(error.error.message.message);
      }
    );

  }

  getFloorplanThenBeacon(): void {
    this.awsApiService.getFloorplan(DEFAULT_FLOORPLAN_ID).subscribe(
      (data: any) => {
        this.floorplan = data[0];
        this.updateFloorplanOnMap();

        this.zoomToFloorplan();

        this.getBeacon();

        // this.reportSuccess(data.message.message);
      },
      (error) => {
        // this.reportError(error.error.message.message);
      }
    );
  }

  updateFloorplanOnMap(): void {

    let features: any;
    try {
      features = new GeoJSON().readFeatures(this.floorplan.geojson, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
      // this.reportSuccess('The GeoJSON definition has been updated!');
    }
    catch (err) {
      // this.reportError('Invalid GeoJSON text.');
      this.floorplan.geojson = '{ "type": "FeatureCollection", "features": [] }';
      features = new GeoJSON().readFeatures(this.floorplan.geojson, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
    }

    this.floorplanVectorSource.clear();
    this.floorplanVectorSource.addFeatures( features );

  }

  zoomToFloorplan(): void {
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
