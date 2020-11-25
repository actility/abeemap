import { Component, OnInit } from '@angular/core';

import { DxCoreApiService } from '../dx-core-api.service';
import { AwsApiService } from '../aws-api.service';

@Component({
  selector: 'app-decoded-messages',
  templateUrl: './decoded-messages.component.html',
  styleUrls: ['./decoded-messages.component.css']
})
export class DecodedMessagesComponent implements OnInit {

  DevEUI: '';
  messageType: '';
  limit: '100';

  devs = [];

  isLoading = true;
  elements = [];

  componentTitle = 'Decoded Message Logs';
  // elementName = 'device';
  elementIdPropertyName = 'ref';
  displayedColumns: string[] = [
    'DevEUI',
    'Time',
    '_temperature',
    '_mode',
    '_messageType',
    '_eventType',
    '_fixType',
    '_bssids',
  ];


  constructor(
    private dxCoreApiService: DxCoreApiService,
    private awsApiService: AwsApiService
  ) {}

  ngOnInit(): void {
    this.DevEUI = '';
    this.messageType = '';
    this.limit = '100';
    this.getDevs();
    this.getMessages();
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

  get(): void {
    this.isLoading = true;
    this.dxCoreApiService.getDevices().subscribe(
      (data) => {
        this.isLoading = false;
        this.elements = data;
      },
      (error) => {
        this.isLoading = false;
        this.elements = [];
        // this.reportError(error.error.message.message);
      }
    );
  }

  getMessages(): void {
    this.isLoading = true;
    this.awsApiService.getDecodedPoints(this.DevEUI, this.messageType, this.limit).subscribe(
      (data) => {
        this.isLoading = false;
        this.elements = data;
      },
      (error) => {
        this.isLoading = false;
        this.elements = [];
        // this.reportError(error.error.message.message);
      }
    );
  }

  formatTime(time) {
    const d = new Date(time);
    const d1 = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return d1.toISOString().slice(0, 19).replace('T', ' ');
  }

  formatBssids(element) {

    const bssids = element._bleBssids || element._wifiBssids;
    if ( !bssids ) { return ''; }

    let bssidsString = '';
    for (const bssid of bssids) {
      bssidsString += bssid.bssid.replace(/\:/g, '') + ':' + bssid.rssi + 'dBm ';
    }
    return bssidsString;
  }

  formatMode(element) {
    let mode = '';
    try {
      mode = element._deviceConfiguration.mode;
    } catch (err) { }
    return mode;
  }

}
