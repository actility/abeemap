
/* ********************************************************* */
/* AbeeMap_addMsg                                            */
/* ********************************************************* */

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const http = require('https');
const CODEC_HOST = 'dx-api-dev1.thingpark.com';
const CODEC_PATH = '/location-driver/latest/api/decode';
const CODEC_AUTHORIZATION_HEADER = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJTVUJTQ1JJQkVSOjEzMjgzOCJdLCJleHAiOjE1OTQ3OTUwOTcsImp0aSI6IjA2M2YxOGM4LTJmYTUtNGE4MS1iOTY5LWM4Y2U5MDFmYmY5ZCIsImNsaWVudF9pZCI6ImNvbW11bml0eS1hcGkvbm9yYmVydC5oZXJiZXJ0K2NvbW11bml0eUBhY3RpbGl0eS5jb20ifQ.cJCoHTZQtjGjfquCkDEw-O0fxhsA1ZoE0hvv8OQX--QRYIsiY1uSXdIDlSiI5hzniQu9Q90K9IZb5lR0aphSww';


const API_OPTIONS = {
  method: 'POST',
  host: CODEC_HOST,
  path: CODEC_PATH,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': CODEC_AUTHORIZATION_HEADER,
  }
};
const FROM_TPE_TABLE = 'AbeeMap_decodedMsg';
const FROM_TPXLE_TABLE = 'AbeeMap_resolvedMsg';
const BLE_BEACON_TABLE = 'Abeemap_BleBeacons';

exports.handler = function(event, context, callback) {

    if ('DevEUI_uplink' in event) {
        
        if (!event.DevEUI_uplink.DevEUI.startsWith('20635')) {
            console.log("This message was not sent by an Abeeway Device!");
            return;
        }
        
        const formattedForCodec = {
            "direction": "uplink",
            "sourceTime": event.DevEUI_uplink.Time,
            "meta": {
                "lorawan": {
                    "fPort": event.DevEUI_uplink.FPort
                }
            },
            "thing": {
                "model": {
                    "producerId": "abeeway",
                    "moduleId": "micro-tracker",
                    "version": "3"
                },
                "application": {
                    "producerId": "abeeway",
                    "moduleId": "asset-tracker",
                    "version": "1"
                }
            },
            "raw": {
                "binary": event.DevEUI_uplink.payload_hex
            }
        };
        
        // console.log('FORMATTED FOR CODEC:\n', JSON.stringify(formattedForCodec, null, 2));
        
        console.log('CALLING THE ABEEWAY DRIVER API...');
        let dataStr = '';
        const req = http.request(API_OPTIONS, (res) => {
            res.on('data', data => {
                dataStr += data;
            });
            res.on('end', () => {
                // event.DevEUI_uplink.payloadDecoded = JSON.parse(dataStr);
                let driverResponse = JSON.parse(dataStr);
                console.log('DRIVER API RESPONSE RECEIVED:\n', JSON.stringify(driverResponse, null, 2));

                for (let key in driverResponse.message) {
                    event.DevEUI_uplink['_'+key] = driverResponse.message[key];
                }
                
                event.DevEUI_uplink.DevEUI = event.DevEUI_uplink.DevEUI.toUpperCase();
                
                save_to_db(FROM_TPE_TABLE, event.DevEUI_uplink, context, callback);
                
            });
        }).on('error', err => {
            console.error(err.name + ': ' + err.message);
            context.done(null, 'FAILURE');
            callback(err, null);
        });
        req.write(JSON.stringify(formattedForCodec));
        req.end();
        
    } else if ('deviceEUI' in event) {
        
        if (!(event.rawPosition)) {
            console.log("This is not Position Message!!!");
            return;
        }
        
        if ( event.rawPosition && (event.rawPosition.rawPositionType == "RawPositionByBleSolver")) {
            
            dynamo.query({
                TableName: BLE_BEACON_TABLE,
                IndexName: "CustomerIdIndex",
                KeyConditionExpression: "#custId = :custId",
                ExpressionAttributeNames: { "#custId": "customerId" },
                ExpressionAttributeValues: { ":custId": event.customerId.substring(3) }
            }).promise()
                .then(data => {
                    const BEACONS = data.Items;
                    
                    const bleBssids = event.rawPosition.bleBssids;
                    let bestKnownBleBssid = undefined;
                    let bestKnownBleBssidCoordinates = undefined;
                    
                    for (let bleBssidKey in bleBssids) {
                        for (let beaconKey in BEACONS) {
                            
                            if (BEACONS[beaconKey].bssid.toLowerCase() == bleBssids[bleBssidKey].bssid.toLowerCase()) {
                                
                                if (bestKnownBleBssid) {
                                    if (bestKnownBleBssid.rssi < bleBssids[bleBssidKey].rssi) {
                                        bestKnownBleBssid = bleBssids[bleBssidKey];
                                        bestKnownBleBssidCoordinates = BEACONS[beaconKey].coordinates;
                                    }
                                } else {
                                    bestKnownBleBssid = bleBssids[bleBssidKey];
                                    bestKnownBleBssidCoordinates = BEACONS[beaconKey].coordinates;
                                }
                                continue;
                            }
                        }
                    }
                    if (bestKnownBleBssidCoordinates) {
                        console.log(bestKnownBleBssid.bssid);
                        event.rawPosition.coordinates = bestKnownBleBssidCoordinates;
                        event.coordinates[0] = bestKnownBleBssidCoordinates[0];
                        event.coordinates[1] = bestKnownBleBssidCoordinates[1];
                        event.horizontalAccuracy = 3;
                    } else {
                        console.log("There are no known BLE Beacons in the message!");
                        return;
                    }
                    
                    event.deviceEUI = event.deviceEUI.toUpperCase();
                    
                    save_to_db(FROM_TPXLE_TABLE, event, context, callback);
                    
                })
                .catch(err => {
                    callback(err, null);
                });
                
        } else {
            
            event.deviceEUI = event.deviceEUI.toUpperCase();
            
            save_to_db(FROM_TPXLE_TABLE, event, context, callback);
            
            console.log("Inserting msg to table!");
            console.log(JSON.stringify(event, null, 2));
            dynamo.put({
                TableName: FROM_TPXLE_TABLE,
                Item: event,
            }).promise()
                .then(data => {
                    console.log("Added msg:", JSON.stringify(data, null, 2));
                    context.succeed();
                    callback(null, data);
                })
                .catch(err => {
                    console.error("Unable to add msg. Error JSON:", JSON.stringify(err, null, 2));
                    context.fail();
                    callback(err, null);
                });
                
        }
        
    } else {
        context.fail();
        return;
    }

};

let save_to_db = (tableName, item, context, callback) => {
    console.log("SAVING MSG TO DB...");
    // console.log(JSON.stringify(Item, null, 2));
    dynamo.put({
        TableName: tableName,
        Item: item,
    }).promise()
        .then(data => {
            console.log("MESSAGE SAVED:\n", JSON.stringify(item, null, 2));
            context.succeed();
            callback(null, item);
        })
        .catch(err => {
            console.error("UNABLE TO SAVE MSG. Error JSON:", JSON.stringify(err, null, 2));
            context.fail();
            callback(err, null);
        });
};
