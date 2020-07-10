import { Injectable } from '@angular/core';

import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable ,  of, throwError, } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { MatSnackBar} from '@angular/material/snack-bar';

import { CONFIG } from '../environments/environment';
// import { AuthService } from './auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DxAdminApiService {

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    // private authService: AuthService,
  ) { }

  getToken(grantType, clientId, clientSecret, renewToken, validityPeriod): Observable<any> {

    const dxApiPrefix: string = clientId.split('/')[0];

    const formData = '' +
      'grant_type=' + encodeURIComponent(grantType) +
      '&client_id=' + encodeURIComponent(clientId) +
      '&client_secret=' + encodeURIComponent(clientSecret);

    const h = new HttpHeaders()
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json');
    const p = new HttpParams()
      .set('renewToken', encodeURIComponent(renewToken))
      .set('validityPeriod', encodeURIComponent(validityPeriod));

    return this.http.post<any>(
      (CONFIG.DXAPI_URLS[dxApiPrefix] || CONFIG.DXAPI_URLS[CONFIG.DXAPI_DEFAULT_PREFIX]) + '/admin/latest/api/oauth/token',
      formData,
      { params: p, headers: h }
    )
      .pipe(
        tap(_ => this.log(`Token has been retreived for ${clientId}`)),
        catchError(this.handleError<any>('getToken'))
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
            // this.authService.deleteSession();
            // this.authService.login();
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
      duration: 3000,
    });
    // console.log(message);
  }

}
