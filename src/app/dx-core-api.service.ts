import { Injectable } from '@angular/core';

import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable ,  of, throwError, forkJoin} from 'rxjs';
import { mergeMap} from 'rxjs/operators';
import { catchError, map, tap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

// import { CONFIG } from '../environments/environment';
import { ConfigService } from './config.service';

import { AuthService } from './auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DxCoreApiService {

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private configService: ConfigService,
  ) { }

  getDevices(): Observable<any> {

    const h = new HttpHeaders()
      .set('Accept', 'application/json');
    // const p = new HttpParams()
      // .set('renewToken', encodeURIComponent(renewToken))
      // .set('validityPeriod', encodeURIComponent(validityPeriod));

    return this.http.get<any>(
      (
        this.configService.DXAPI_URLS[ this.authService.userId.split('/')[0] ] ||
        this.configService.DXAPI_URLS[this.configService.DXAPI_DEFAULT_PREFIX]
      ) + '/core/latest/api/devices',
      {
        // params: p,
        headers: h
      }
    )
      .pipe(
        map( array => {
            return array.filter( element => {
              return element.EUI.startsWith('20635F');
            });
        }),
        tap(_ => this.log(`Devices have been retreived`)),
        catchError(this.handleError<any>('getDevices'))
      );

  }

  getGateways(): Observable<any> {

    const url = (
      this.configService.DXAPI_URLS[ this.authService.userId.split('/')[0] ] ||
      this.configService.DXAPI_URLS[this.configService.DXAPI_DEFAULT_PREFIX]
    ) + '/core/latest/api/baseStations';
    const h = new HttpHeaders()
      .set('Accept', 'application/json');
    // const p = new HttpParams()
      // .set('renewToken', encodeURIComponent(renewToken))
      // .set('validityPeriod', encodeURIComponent(validityPeriod));

    return this.http
      .get<any>(
        url,
        { headers: h }
      )
      .pipe(
        mergeMap( (gateways: any) => forkJoin(
          gateways.map( (gateway: any) => this.http
            .get<any>(
              url + '/' + gateway.ref,
              { headers: h }
            )
          )
        )),
        tap(_ => this.log('Gateways have been retrieved')),
        catchError(this.handleError<any>('getGateways'))
      );

  }

  /* This format change is required for Open Layers */
  getGatewayFeatures(): Observable<any> {
    return this.getGateways()
      .pipe(
        map( (points: any) => {
          return {
            type: 'FeatureCollection',
            features: points.map( (point: any) => {
              return {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [point.statistics.lastGeoLongitude, point.statistics.lastGeoLatitude]
                },
                properties: {
                  name: point.name,
                  gatewayId: point.id,
                  text: `Gateway: ${point.name}; ${point.id}`,
                }
              };
            }),
          };
        }),
        tap(_ => this.log('Gateways have been retrieved')),
        catchError(this.handleError<any>('getGateways'))
      );
  }


  private handleError<T>(operation = 'operation', result?: T) {

    return (error: any): Observable<T> => {

      console.error(`${operation} failed: ${error.error.message.message}`);

      if ( (error.error.code === 401) || (error.error.code === 403) ) {

        this.snackBar.open(
          error.error.message,
          'login',
          { panelClass: ['red-snackbar'] },
        )
          .onAction().subscribe(() => {
            this.authService.deleteSession();
            this.authService.login();
          });

        // return null;

      } else {
        return throwError(error);
        // return of(result as T);
      }

    };
  }

  private log(message: string) {
    this.snackBar.open(message, '', {
      panelClass: ['green-snackbar'],
      duration: 2000,
    });
    console.log(message);
  }

}
