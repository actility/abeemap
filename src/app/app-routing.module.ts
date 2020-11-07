import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { UserComponent } from './user/user.component';
import { DevicesComponent } from './devices/devices.component';
import { DeviceComponent } from './device/device.component';
import { FloorplanComponent } from './floorplan/floorplan.component';
import { BleBeaconsComponent } from './ble-beacons/ble-beacons.component';
import { BleBeaconComponent } from './ble-beacon/ble-beacon.component';
import { DecodedMessagesComponent } from './decoded-messages/decoded-messages.component';
import { ResolvedMessagesComponent } from './resolved-messages/resolved-messages.component';
import { MessageComponent } from './message/message.component';
import { MapComponent } from './map/map.component';
import { CodecToolComponent } from './codec-tool/codec-tool.component';
import { SettingsComponent } from './settings/settings.component';
import { LoginComponent } from './login/login.component';

import { AuthGuard } from './auth/auth.guard';

const routes: Routes = [

  {
    path: '',
    redirectTo: 'map',
    pathMatch: 'full',
    canActivate: [ AuthGuard ],
  },
  {
    path: '#',
    redirectTo: 'map',
    pathMatch: 'full',
    canActivate: [ AuthGuard ],
  },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [ AuthGuard ],
  },

  {
    path: 'user',
    component: UserComponent,
    canActivate: [ AuthGuard ],
  },

  {
    path: 'devices',
    component: DevicesComponent,
    canActivate: [ AuthGuard ],
  },
  {
    path: 'devices/:DevEUI',
    component: DeviceComponent,
    canActivate: [ AuthGuard ],
  },

  {
    path: 'ble-beacons',
    component: BleBeaconsComponent,
    canActivate: [ AuthGuard ],
  },
  {
    path: 'ble-beacons/:bssid',
    component: BleBeaconComponent,
    canActivate: [ AuthGuard ],
  },
  {
    path: 'floorplan',
    component: FloorplanComponent,
    canActivate: [ AuthGuard ],
  },

  {
    path: 'resolved-messages',
    component: ResolvedMessagesComponent,
    canActivate: [ AuthGuard ],
  },
  {
    path: 'resolved-messages/:_id',
    component: MessageComponent,
    canActivate: [ AuthGuard ],
  },

  {
    path: 'map',
    component: MapComponent,
    canActivate: [ AuthGuard ],
  },

  {
    path: 'decoded-messages',
    component: DecodedMessagesComponent,
    canActivate: [ AuthGuard ],
  },

  {
    path: 'codec-tool',
    component: CodecToolComponent,
    canActivate: [ AuthGuard ],
  },

  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [ AuthGuard ],
  },

  {
    path: 'login',
    component: LoginComponent,
  },

];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [ AuthGuard ]
})
export class AppRoutingModule { }
