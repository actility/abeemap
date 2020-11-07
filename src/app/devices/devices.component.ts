import { Component, OnInit } from '@angular/core';

import { DxCoreApiService } from '../dx-core-api.service';

@Component({
  selector: 'app-devices',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.css'],
})
export class DevicesComponent implements OnInit {
  isLoading = true;
  elements = [];

  componentTitle = 'Devices';
  elementName = 'device';
  elementIdPropertyName = 'ref';
  displayedColumns: string[] = ['EUI', 'name'];

  constructor(private dxCoreApiService: DxCoreApiService) {}

  ngOnInit(): void {
    this.get();
    // this.getGateways();
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

  /*
  getGateways(): void {
    // this.isLoading = true;
    this.dxCoreApiService.getGatewayFeatures().subscribe(
      (data) => {
        // this.isLoading = false;
        // this.elements = data;
        console.log(data);
      },
      (error) => {
        // this.isLoading = false;
        // this.elements = [];
        // this.reportError(error.error.message.message);
      }
    );
  }
*/
}
