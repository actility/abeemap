import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {
  HttpClientModule,
  HTTP_INTERCEPTORS,
  HttpClient,
} from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LayoutModule } from '@angular/cdk/layout';

import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppMaterialModule } from './app-material.module';

import { AppComponent } from './app.component';
import { NavigationComponent } from './navigation/navigation.component';
import { AlertDialogComponent } from './dialogs/alert-dialog/alert-dialog.component';
import { DeviceComponent } from './device/device.component';
import { DevicesComponent } from './devices/devices.component';
import { FloorplanComponent } from './floorplan/floorplan.component';
import { BleBeaconComponent } from './ble-beacon/ble-beacon.component';
import { BleBeaconsComponent } from './ble-beacons/ble-beacons.component';
import { MapComponent } from './map/map.component';
import { SettingsComponent } from './settings/settings.component';
import { MessageComponent } from './message/message.component';
import { ResolvedMessagesComponent } from './resolved-messages/resolved-messages.component';
import { DecodedMessagesComponent } from './decoded-messages/decoded-messages.component';
import { CodecToolComponent } from './codec-tool/codec-tool.component';
import { UserComponent } from './user/user.component';
import { LoginComponent } from './login/login.component';

import { AuthService } from './auth/auth.service';
import { AuthInterceptor } from './auth/auth.interceptor';

import { DxAdminApiService } from './dx-admin-api.service';
import { HomeComponent } from './home/home.component';

import { of, Observable, ObservableInput } from '../../node_modules/rxjs';
import { map, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';

function loadConfig(
  httpClient: HttpClient,
  configService: ConfigService
): () => Promise<boolean> {
  return (): Promise<boolean> => {
    return new Promise<boolean>((resolve: (a: boolean) => void): void => {
      httpClient
        .get('assets/config.json')
        .pipe(
          map((x: ConfigService) => {
            configService.AWS_API_URL = x.AWS_API_URL;
            configService.DXAPI_URLS = x.DXAPI_URLS;
            configService.DXAPI_DEFAULT_PREFIX = x.DXAPI_DEFAULT_PREFIX;
            configService.DEFAULT_MAP_CENTER = x.DEFAULT_MAP_CENTER;
            configService.DEFAULT_MAP_ZOOM = x.DEFAULT_MAP_ZOOM;
            configService.OAUTH2 = x.OAUTH2;

            resolve(true);
          }),
          catchError(
            (
              err: { status: number },
              caught: Observable<void>
            ): ObservableInput<{}> => {
              resolve(false);
              return of({});
            }
          )
        )
        .subscribe();
    });
  };
}

@NgModule({
  declarations: [
    AppComponent,
    NavigationComponent,
    AlertDialogComponent,
    DeviceComponent,
    DevicesComponent,
    FloorplanComponent,
    BleBeaconComponent,
    BleBeaconsComponent,
    MapComponent,
    SettingsComponent,
    MessageComponent,
    DecodedMessagesComponent,
    ResolvedMessagesComponent,
    CodecToolComponent,
    UserComponent,
    LoginComponent,
    HomeComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    LayoutModule,
    FormsModule,
    ReactiveFormsModule,

    AppRoutingModule,
    AppMaterialModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: loadConfig,
      deps: [HttpClient, ConfigService],
      multi: true,
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    DxAdminApiService,
    AuthService,
  ],
  entryComponents: [AlertDialogComponent],
  bootstrap: [AppComponent],
})
export class AppModule {}
