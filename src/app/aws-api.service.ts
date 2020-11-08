import { Injectable } from '@angular/core';

import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable , of, throwError, } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { MatSnackBar} from '@angular/material/snack-bar';

import { ConfigService } from './config.service';

import { AuthService } from './auth/auth.service';

const TERI_OFFICE = { lon: 20.38612, lat: 44.80152 };
const PALACE_HOTEL = { lon: 20.454031, lat: 44.816524 }; // d: 0.067911, 0.015004‬
const SITE = PALACE_HOTEL;

const HEADERS = new HttpHeaders()
  // .set('Content-Type', 'application/x-www-form-urlencoded')
  .set('Content-Type', 'application/json')
  .set('Accept', 'application/json');

@Injectable({
  providedIn: 'root'
})
export class AwsApiService {

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    this.awsApiUrl = this.configService.AWS_API_URL || `https://${window.location.hostname}/api`;
  }

  awsApiUrl: string;

  getResolvedPoints(devEUI?: string, limit?: string) {

    let p = new HttpParams();
    if (devEUI) { p = p.set('devEUI', devEUI); }
    if (limit) { p = p.set('limit', limit); }

    return this.http.get<any>(
      this.awsApiUrl + '/resolved_messages',
      { params: p, headers: HEADERS }
    )
      .pipe(
        tap(_ => this.log(`Points have been retreived`)),
        catchError(this.handleError<any>('getPoints'))
      );

  }

  getDecodedPoints(devEUI?: string, messageType?: string, limit?: string) {

    let p = new HttpParams();
    if (devEUI) { p = p.set('devEUI', devEUI); }
    if (messageType) { p = p.set('messageType', messageType); }
    if (limit) { p = p.set('limit', limit); }

    return this.http.get<any>(
      this.awsApiUrl + '/decoded_messages',
      { params: p, headers: HEADERS }
    )
      .pipe(
        tap(_ => this.log(`Points have been retreived`)),
        map( (rows) => {
          return rows.map( (row) => {
            if (row._bssids) {
              let formatted = '';
              for ( const bssid in row._bssids ) {
                if (row._bssids.hasOwnProperty(bssid)) {
                  if (formatted) { formatted += '\n '; }
                  formatted += bssid.replace(/\:/g, '').toUpperCase() + ', ' + row._bssids[bssid] + 'dBm';
                }
              }
              row._bssids = formatted;
            }
            return row;
          });
        }),
        catchError(this.handleError<any>('getPoints'))
      );

  }

  getBleBeacons() {

    return this.http.get<any>(
      this.awsApiUrl + '/ble_beacon',
      { headers: HEADERS }
    )
      .pipe(
        tap(_ => this.log(`Beacons have been retreived`)),
        catchError(this.handleError<any>('getBleBeacons'))
      );
  }

  /* This format change is required for Open Layers */
  getBleBeaconFeatures() {
    return this.getBleBeacons()
      .pipe(
        map( (points) => {
          return {
            type: 'FeatureCollection',
            features: points.map( point => {
              return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: point.coordinates,
                },
                properties: {
                    name: point.name,
                    bleBssId: point.bssid,
                    text: `Beacon: ${point.name}; ${point.bssid}`,
                }
              };
            }),
          };
        }),
        tap(_ => this.log(`Beacons have been retreived`)),
        catchError(this.handleError<any>('getBleBeaconFeatures'))
      );
  }

  getBleBeacon(bssid: string) {

    return this.http.get<any>(
      this.awsApiUrl + '/ble_beacon/' + bssid,
      { headers: HEADERS }
    )
      .pipe(
        map( data => data[0] ),
        tap(_ => this.log(`Beacon have been retreived`)),
        catchError( this.handleError<any>('getBleBeacon'))
      );
  }

  createBleBeacon(bleBeacon: any) {

    return this.http.post<any>(
      this.awsApiUrl + '/ble_beacon',
      bleBeacon,
      { headers: HEADERS }
    )
      .pipe(
        tap(_ => this.log(`Beacon has been created`)),
        catchError(this.handleError<any>('updateBleBeacon'))
      );
  }

  updateBleBeacon(bssid: string, bleBeacon: any) {

    return this.http.put<any>(
      this.awsApiUrl + '/ble_beacon/' + bssid,
      bleBeacon,
      { headers: HEADERS }
    )
      .pipe(
        tap(_ => this.log(`Beacon has been modified`)),
        catchError(this.handleError<any>('updateBleBeacon'))
      );
  }

  deleteBleBeacon(bssid: string) {

    return this.http.delete<any>(
      this.awsApiUrl + '/ble_beacon/' + bssid
    )
      .pipe(
        tap(_ => this.log(`Beacon has been deleted`)),
        catchError(this.handleError<any>('deleteBleBeacon'))
      );
  }

  getFloorplan(floorplanId) {
    return this.http.get<any>(
      this.awsApiUrl + '/floorplan/' + floorplanId,
      // '../assets/floorplans/floorplan_01.geojson',
      { headers: HEADERS }
    )
      .pipe(
        // map( (body) => body[0].geojson ),
        tap(_ => this.log(`Floorplan has been retreived`)),
        catchError(this.handleError<any>('getFloorplan'))
      );
  }

  updateFloorplan(floorplanId: string, name: string, geojson: any) {

    return this.http.put<any>(
      this.awsApiUrl + '/floorplan/' + floorplanId,
      { name, geojson },
      { headers: HEADERS }
    )
      .pipe(
        tap(_ => this.log(`Floorplan has been modified`)),
        catchError(this.handleError<any>('updateFloorplan'))
      );
  }

  private handleError<T>(operation = 'operation', result?: T) {


    return (error: any): Observable<T> => {

      console.error(`${operation} failed: ${error.error.message}`);

      if ( error.status === 400 ) {
        this.snackBar.open( error.error.message, 'x', { panelClass: ['red-snackbar'] } )
          .onAction().subscribe( () => {} );
        return of(error as T);
      } else if ( (error.status === 401) || (error.status === 403) ) {
        this.snackBar.open( error.error.message, 'login', { panelClass: ['red-snackbar'] } )
          .onAction().subscribe( () => {
            // this.authService.deleteSession();
            // this.authService.login();
          });
        return of(error as T);
      } else {
        return throwError(error);
        // return of(result as T);
      }

    };
  }

  private log(message: string) {
    this.snackBar.open(message, '', {
      panelClass: ['green-snackbar'],
      duration: 3000,
    });
    // console.log(message);
  }

}
