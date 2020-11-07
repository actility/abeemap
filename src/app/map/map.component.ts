import { Component, OnInit } from '@angular/core';

import { Map, View, Overlay, Feature } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer, Image as ImageLayer } from 'ol/layer';
import { fromLonLat, transform, transformExtent } from 'ol/proj';
import { GeoJSON } from 'ol/format';
import { OSM as OSMSource, Vector as VectorSource, ImageStatic as ImageStaticSource } from 'ol/source';
import { Point, Geometry, LineString } from 'ol/geom';
import { Style, Icon, Circle, Fill, Stroke } from 'ol/style';

import { DxCoreApiService } from '../dx-core-api.service';
import { AwsApiService } from '../aws-api.service';

// import { CONFIG } from '../environments/environment';
import { ConfigService } from '../config.service';

const defaultZoom = 5;

const greenCircleBackground  = [0x57, 0xc4, 0x51, 0.4]; // #57c451
const greenCircleStroke      = [0x31, 0x85, 0x2c, 0.3]; // #31852c
const yellowCircleBackground = [0xa9, 0xae, 0x39, 0.5]; // #a9ae39
const yellowCircleStroke     = [0x79, 0x7c, 0x29, 0.3]; // #797c29
const redCircleBackground    = [0xd7, 0x3e, 0x3e, 0.1]; // #d73e3e
const redCircleStroke        = [0x9a, 0x1f, 0x1f, 0.3]; // #9a1f1f

const blueCircleBackground   = [0x98, 0xcc, 0xfd, 0.4]; // #98ccfd
const blueCircleStroke       = [0x46, 0x86, 0xc6, 0.3]; // #4686c6

const grayCircleBackground   = [0x94, 0x94, 0x94, 0.4]; // #949494
const grayCircleStroke       = [0x6a, 0x6a, 0x6a, 0.3]; // #6a6a6a


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

const GATEWAY_STYLE = new Style({
  image: new Icon( {
      anchor: [0.5, 0.5],
      ///// anchorXUnits: 'fraction', // 'pixels',
      ///// anchorYUnits: 'fraction', // 'pixels',
      opacity: 1.0,
      scale: 0.5,
      src: 'assets/loraWAN_gw_2.png',
  })
});

const BEACON_STYLE = new Style({
  image: new Icon( {
      anchor: [0.5, 0.5],
      ///// anchorXUnits: 'fraction', // 'pixels',
      ///// anchorYUnits: 'fraction', // 'pixels',
      opacity: 1.0,
      scale: 0.5,
      src: 'assets/ble_beacon_1.png',
  })
});

const LINE_STYLE = new Style({
  stroke: new Stroke({
    color: '#0000FF',
    width: 2,
  }),
});

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {

  // isHandset: boolean;
  // isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
  //  .pipe(
  //    map(result => result.matches),
  //    shareReplay()
  //  );

  timeout: any;

  deviceEUI: '';
  limit: '100';

  devs = [];

  showGateways = true;
  showBeacons = true;
  showMarkers = true;
  showCircles = true;
  showLines = true;

  map: any;
  points = [];


  /* MAP VIEW */
  mapView = new View({
    center: fromLonLat(this.configService.DEFAULT_MAP_CENTER),
    zoom: this.configService.DEFAULT_MAP_ZOOM
  });

  /* MAP LAYER */
  mapTileSource = new OSMSource();
  mapTileLayer = new TileLayer({
    source: this.mapTileSource,
    zIndex: 10,
  });

  /* FLOORPLAN LAYER */
  floorplanImageStaticSource = new ImageStaticSource({
    url: this.configService.FLOORPLAN_PATH,
    imageExtent: transformExtent(
      [
        this.configService.FLOORPLAN_EXT.east, this.configService.FLOORPLAN_EXT.north,
        this.configService.FLOORPLAN_EXT.west, this.configService.FLOORPLAN_EXT.south
      ],
      'EPSG:4326', 'EPSG:3857'
    )
  });
  floorplanImageLayer = new ImageLayer({
    source: this.floorplanImageStaticSource,
    zIndex: 20,
  });

  floorplanVectorSource = new VectorSource({
    format: new GeoJSON(),
    loader: (extent, resolution, projection) => {
      this.awsApiService.getFloorplan('default').subscribe( (floorplan) => {
        this.floorplanVectorSource.addFeatures(
          this.floorplanVectorSource.getFormat().readFeatures(
            floorplan[0].geojson,
            { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }
          ) as Feature<Geometry>[]
        );
      });
    },
    // features: new GeoJSON().readFeatures(floorplanGeoJSON, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'}),
  });
  floorplanVectorLayer = new VectorLayer({
    source: this.floorplanVectorSource,
    style: FLOORPLAN_STYLE,
    zIndex: 20,
  });

  /* BEACONS LAYER */
  beaconsVectorSource = new VectorSource({
    format: new GeoJSON(),
    loader: (extent, resolution, projection) => {
      this.awsApiService.getBleBeaconFeatures().subscribe( (beaconsGeoJSON) => {
        this.beaconsVectorSource.addFeatures(
          this.beaconsVectorSource.getFormat().readFeatures(
            beaconsGeoJSON,
            { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }
          ) as Feature<Geometry>[]
        );
      });
    },
    // features: (new GeoJSON()).readFeatures(geoJsonTestData, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'}),
  });
  beaconsVectorLayer = new VectorLayer({
      source: this.beaconsVectorSource,
      style: BEACON_STYLE,
      zIndex: 30,
  });

  /* GATEWAYS LAYER */
  gatewaysVectorSource = new VectorSource({
    format: new GeoJSON(),
    loader: (extent, resolution, projection) => {
//      this.awsApiService.getGatewayFeatures().subscribe( (gatewaysGeoJSON) => {
      this.dxCoreApiService.getGatewayFeatures().subscribe( (gatewaysGeoJSON) => {
        this.gatewaysVectorSource.addFeatures(
          this.gatewaysVectorSource.getFormat().readFeatures(
            gatewaysGeoJSON,
            { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }
          ) as Feature<Geometry>[]
        );
      });
    },
    // features: (new GeoJSON()).readFeatures(geoJsonTestData, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'}),
  });
  gatewaysVectorLayer = new VectorLayer({
      source: this.gatewaysVectorSource,
      style: GATEWAY_STYLE,
      zIndex: 40,
  });

  /* MARKER CIRCLES LAYER */
  circlesVectorSource = new VectorSource();
  circlesVectorLayer = new VectorLayer({
      source: this.circlesVectorSource,
      style: this.circleStyleFunction,
      zIndex: 50,
  });

  /* MARKERS LAYER */
  markersVectorSource = new VectorSource();
  markersVectorLayer = new VectorLayer({
      source: this.markersVectorSource,
      style: this.markerStyleFunction,
      zIndex: 60,
  });

  /* MARKER LINES LAYER */
  linesVectorSource = new VectorSource();
  linesVectorLayer = new VectorLayer({
      source: this.linesVectorSource,
      style: LINE_STYLE,
      zIndex: 70
  });


  constructor(
    private dxCoreApiService: DxCoreApiService,
    private awsApiService: AwsApiService,
    private configService: ConfigService,
  ) { }

  ngOnInit(): void {

    this.deviceEUI = '';
    this.limit = '100';

    setTimeout( () => {
      this.getDevs();
      this.initMap();
      this.loadMarkers();
    } , 200);

  }


  getDevs(): void {
    // this.isLoading = true;
    this.dxCoreApiService.getDevices().subscribe(
      (data) => {
        // this.isLoading = false;
        this.devs = data;
        console.log(data);
      },
      (error) => {
        // this.isLoading = false;
        this.devs = [];
        // this.reportError(error.error.message.message);
      }
    );
  }




  markerStyleFunction(feature, resolution) {
      let imgSource = 'assets/';
      switch (feature.get('rawPositionType')) {
          case 'RawPositionByWifiSolver':
            imgSource += 'marker-icon-green.png';
            break;
          case 'RawPositionByAgpsSolver':
            imgSource += 'marker-icon-yellow.png';
            break;
          case 'RawPositionByGpsSolver':
            imgSource += 'marker-icon-red.png';
            break;
          case 'RawPositionByBleSolver':
            imgSource += 'marker-icon-blue.png';
            break;
          default:
              // alert('kakukk');
              imgSource += 'marker-icon-gray.png';
              break;
      }
      return new Style({
          image: new Icon( {
              anchor: [0.5, 1.0],
              ///// anchorXUnits: 'fraction', // 'pixels',
              ///// anchorYUnits: 'fraction', // 'pixels',
              opacity: 1.0,
              scale: feature.get('latest') ? 0.6 : 0.4,
              src: imgSource
          })
      });
  }

  circleStyleFunction(feature, resolution) {
      let colorCircleBackground = [];
      let colorCircleStroke = [];
      switch (feature.get('rawPositionType')) {
          case 'RawPositionByWifiSolver':
              colorCircleBackground = greenCircleBackground;
              colorCircleStroke     = greenCircleStroke;
              break;
          case 'RawPositionByAgpsSolver':
              colorCircleBackground = yellowCircleBackground;
              colorCircleStroke     = yellowCircleStroke;
              break;
          case 'RawPositionByGpsSolver':
              colorCircleBackground = redCircleBackground;
              colorCircleStroke     = redCircleStroke;
              break;
          case 'RawPositionByBleSolver':
              colorCircleBackground = blueCircleBackground;
              colorCircleStroke     = blueCircleStroke;
              break;
          default:
              colorCircleBackground = grayCircleBackground;
              colorCircleStroke     = grayCircleStroke;
              break;
      }
      return new Style({
          image: new Circle( {
              radius: feature.get('radius') / resolution,
              fill: new Fill({color: colorCircleBackground}),
              stroke: new Stroke({color: colorCircleStroke, width: 1}),
              ///// anchor: [0.5, 0.5],
              ///// anchorXUnits: 'fraction', // 'pixels',
              ///// anchorYUnits: 'fraction', // 'pixels',
          })
      });
  }

  initMap() {

      this.map = new Map({
          target: 'map',
          layers: [
            this.mapTileLayer,
            this.floorplanImageLayer,

            this.floorplanVectorLayer,

            this.markersVectorLayer,
            this.circlesVectorLayer,
            this.linesVectorLayer,
            this.beaconsVectorLayer,
            this.gatewaysVectorLayer,
          ],
          view: this.mapView,
      });

      const markerTextElement = document.getElementById('marker-text-overlay');
      const markerTextOverlay = new Overlay({
          element: markerTextElement,
          ///// positioning: 'bottom-center'
      });
      this.map.on('click', (event) => {
          const features = [];
          this.map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
              if ((layer === this.markersVectorLayer) || (layer === this.beaconsVectorLayer) || (layer === this.gatewaysVectorLayer)) {
                  features.push(feature);
              }
          });
          const info = features.map( (f) => f.get('text') );
          if (info.length > 0) {
              markerTextElement.innerHTML = info.join('<br>');
              markerTextOverlay.setPosition(event.coordinate);
              this.map.addOverlay(markerTextOverlay);
          } else {
              this.map.removeOverlay(markerTextOverlay);
          }
      });

  }

  zoomTo(coordinates, zoomLevel) {
    const z = this.mapView.getZoom();
    this.mapView.animate({
      zoom: z - 1,
      duration: 600
    }, {
      center: fromLonLat(coordinates),
      zoom: zoomLevel,
      duration: 1400
    });
  }

  zoomToLatest() {
    this.zoomTo(this.points[0].coordinates, 16);
  }

  loadMarkers() {

    // const that = this;

    this.awsApiService.getResolvedPoints(this.deviceEUI, this.limit).subscribe(
      (points) => {

        const markerFeatures = [];
        const circleFeatures = [];
        const lineStringCoordinates = [];

        if (points && (points.length > 0)) {
          this.points = points;

          let time: string;
          let T: string;
          for (let i = (points.length - 1); i >= 0; i--) {
            // console.log(i);
            try {
              time = this.formatTime(points[i].time);
              T = parseFloat(points[i].processedFeed.temperatureMeasure).toFixed(1) + 'C°';
              if (points[i].rawPosition) {

                const markerFeature = new Feature({
                  geometry: new Point( fromLonLat(points[i].coordinates) ),
                  text: `Device: ${points[i].deviceEUI}; ${time}; ${T}; ${( i === 0 ) ? '<br> Latest known location' : ''}`,
                  radius: points[i].horizontalAccuracy,
                  rawPositionType: points[i].rawPosition ? points[i].rawPosition.rawPositionType : 'Unknown',
                  latest: (i === 0),
                });
                markerFeature.setStyle(this.markerStyleFunction);
                markerFeatures.push(markerFeature);

                const circleFeature = new Feature({
                  geometry: new Point( fromLonLat(points[i].coordinates) ),
                  radius: points[i].horizontalAccuracy,
                  rawPositionType: points[i].rawPosition ? points[i].rawPosition.rawPositionType : 'Unknown'
                });
                circleFeature.setStyle(this.circleStyleFunction);
                circleFeatures.push(circleFeature);

                lineStringCoordinates.push( transform(points[i].coordinates, 'EPSG:4326', 'EPSG:3857') );

              }

            } catch (err) {
              continue;
            }
          }
        }

        const lineStringFeature = new Feature({
          geometry: new LineString(lineStringCoordinates),
        });

        this.markersVectorSource.clear(true);
        this.markersVectorSource.addFeatures(markerFeatures);
        this.circlesVectorSource.clear(true);
        this.circlesVectorSource.addFeatures(circleFeatures);
        this.linesVectorSource.clear(true);
        this.linesVectorSource.addFeature(lineStringFeature);

      }
    );
  }


  updateMarkers() {
    if (this.showMarkers) {
      this.map.addLayer(this.markersVectorLayer);
    } else {
      this.map.removeLayer(this.markersVectorLayer);
    }
  }

  updateCircles() {
    if (this.showCircles) {
      this.map.addLayer(this.circlesVectorLayer);
    } else {
      this.map.removeLayer(this.circlesVectorLayer);
    }
  }


  updateBeacons() {
    if (this.showBeacons) {
      this.map.addLayer(this.beaconsVectorLayer);
    } else {
      this.map.removeLayer(this.beaconsVectorLayer);
    }
  }

  updateGateways() {
    if (this.showGateways) {
      this.map.addLayer(this.gatewaysVectorLayer);
    } else {
      this.map.removeLayer(this.gatewaysVectorLayer);
    }
  }

  updateLines() {
    if (this.showLines) {
      this.map.addLayer(this.linesVectorLayer);
    } else {
      this.map.removeLayer(this.linesVectorLayer);
    }
  }

  formatTime(time) {
    const d = new Date(time);
    const d1 = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return d1.toISOString().slice(0, 19).replace('T', ' ');
  }

}
