/* ********************************************************* */
/* AbeeMap_addMsg                                            */
/* ********************************************************* */

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const FROM_TPE_TABLE = 'AbeeMap_decodedMsg';
const FROM_TPXLE_TABLE = 'AbeeMap_resolvedMsg';
const BLE_BEACON_TABLE = 'AbeeMap_bleBeacons';

exports.handler = function(event, context, callback) {

    if ('DevEUI_uplink' in event) {
        

        if (!event.DevEUI_uplink.DevEUI.startsWith('20635')) {
            console.log("This message was not sent by an Abeeway Device!");
            return;
        }


        /* This is just for compatibility with previous code */
        let payload = event.DevEUI_uplink.payload;
        console.log('DECODED PAYLOAD RECEIVED:\n')
        // console.log(JSON.stringify(payload, null, 2));
        for (let key in payload) {
            event.DevEUI_uplink['_'+key] = payload[key];
        }


        event.DevEUI_uplink.DevEUI = event.DevEUI_uplink.DevEUI.toUpperCase();
        save_to_db(FROM_TPE_TABLE, event.DevEUI_uplink, context, null);

        if( 'bleBssids' in payload ) {
            
            let queryParams = {
                TableName: BLE_BEACON_TABLE,
                IndexName: "CustomerIdIndex",
                KeyConditionExpression: "#custId = :custId",
                ExpressionAttributeNames: { "#custId": "CustomerID" },
                ExpressionAttributeValues: { ":custId": event.DevEUI_uplink.CustomerID.substring(3) }
            }
            // console.log(JSON.stringify(queryParams, null, 4));

            let resolved = {
                deviceEUI: event.DevEUI_uplink.DevEUI.toUpperCase(),
                customerId: event.DevEUI_uplink.CustomerID,
                time: event.DevEUI_uplink.Time,
                
                processedFeed: {
                    temperatureMeasure: event.DevEUI_uplink.payload.temperatureMeasure
                },
                
                rawPosition: {
                    rawPositionType: "RawPositionByBleSolver"
                },
                coordinates: [],
            };

            dynamo.query({
                TableName: BLE_BEACON_TABLE,
                IndexName: "CustomerIdIndex",
                KeyConditionExpression: "#custId = :custId",
                ExpressionAttributeNames: { "#custId": "customerId" },
                ExpressionAttributeValues: { ":custId": event.DevEUI_uplink.CustomerID.substring(3) }
            }).promise()
                .then(data => {

                    const BEACONS = data.Items;
                    
                    const bleBssids = payload.bleBssids;
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
                        
                        resolved.rawPosition.coordinates = bestKnownBleBssidCoordinates;
                        resolved.coordinates[0] = bestKnownBleBssidCoordinates[0];
                        resolved.coordinates[1] = bestKnownBleBssidCoordinates[1];
                        resolved.horizontalAccuracy = 3;
                        
                    } else {
                        console.log("There are no known BLE Beacons in the message!");
                        return;
                    }

                    // console.log("\n" + JSON.stringify(resolved, null,4));
                    
                    save_to_db(FROM_TPXLE_TABLE, resolved, context, callback);
                    
                })
                .catch(err => {
                    callback(err, null);
                });

        }


    } else if ('deviceEUI' in event) {
        
        console.log('RESOLVED PAYLOAD RECEIVED:\n');
        // console.log(JSON.stringify(event, null, 2));
        
        if (!(event.rawPosition)) {
            console.log("This is not Position Message!!!");
            return;
        }
        
        if ( event.rawPosition && (event.rawPosition.rawPositionType == "RawPositionByBleSolver")) {

        } else {
            
            event.deviceEUI = event.deviceEUI.toUpperCase();
            
            save_to_db(FROM_TPXLE_TABLE, event, context, callback);
            
            console.log("Inserting msg to table!");
            // console.log(JSON.stringify(event, null, 2));
            dynamo.put({
                TableName: FROM_TPXLE_TABLE,
                Item: event,
            }).promise()
                .then(data => {
                    console.log("Added msg:")
                    // console.log(JSON.stringify(data, null, 2));
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
            console.log("MESSAGE SAVED:\n");
            // console.log("\n"+JSON.stringify(item, null, 2));
            // console.log("\n"+JSON.stringify(data, null, 2));
            if (callback) {
                context.succeed();
                callback(null, item);
            }
        })
        .catch(err => {
            console.error("UNABLE TO SAVE MSG. Error JSON:");
            // console.log(JSON.stringify(err, null, 2));
            if (callback) {
                context.fail();
                callback(err, null);
            }
        });
};
