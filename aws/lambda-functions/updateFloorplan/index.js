/* ******************************************************* */
/* AbeeMap_updateFloorplan                                    */
/* ******************************************************* */

/* **************** */
/* Test Event ***** */
/* **************** */
/*
{
    "headers": {
        "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJTVUJTQ1JJQkVSOjEzMjgzOCJdLCJleHAiOjE1OTQ3OTUwOTcsImp0aSI6IjA2M2YxOGM4LTJmYTUtNGE4MS1iOTY5LWM4Y2U5MDFmYmY5ZCIsImNsaWVudF9pZCI6ImNvbW11bml0eS1hcGkvbm9yYmVydC5oZXJiZXJ0K2NvbW11bml0eUBhY3RpbGl0eS5jb20ifQ.cJCoHTZQtjGjfquCkDEw-O0fxhsA1ZoE0hvv8OQX--QRYIsiY1uSXdIDlSiI5hzniQu9Q90K9IZb5lR0aphSww"
    },
    "pathParameters": {
        "floorplanId": "default"
    },
    "body": "{\"name\":\"Default floorplan\",\"geojson\":\"{}\"}"
}
*/


const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const TABLE = "AbeeMap_floorplans";

exports.handler = (event, context, callback) => {

    let customerId, floorplanId, name, geojson;

    try {
        customerId = JSON.parse(
            Buffer.from(
                (event.headers.Authorization || event.headers.authorization).split('.')[1], 
                'base64'
            ).toString('utf8')
        ).scope[0].split(':')[1];
    } catch (err) {
        responseWithSimpleMessage(400, "Invalid Authorization header!", callback);
        return;
    }

    try {
        floorplanId = event.pathParameters.floorplanId;
    } catch (err) {
        responseWithSimpleMessage(400, "Invalid floorplanId in path!", callback);
        return;
    }


    try {
        const body = JSON.parse(event.body);
        name = body.name;
        geojson = body.geojson;
    } catch (err) {
        responseWithSimpleMessage(400, "Invalid request body!", callback);
        return;
    }

    try {
        const geojsonObject = JSON.parse(geojson);
    } catch (err) {
        responseWithSimpleMessage(400, "Invalid geosjon text!", callback);
        return;
    }

    dynamo.update({
        TableName: TABLE,
        Key: { floorplanId : floorplanId, customerId: customerId },
        UpdateExpression: 'set #name = :name, #geojson = :geojson',
//        ConditionExpression: '#customerId = :customerId',
        ExpressionAttributeNames: {
            '#name' : 'name',
            '#geojson' : 'geojson',
//            '#customerId' : 'customerId',
        },
        ExpressionAttributeValues: {
            ':name' : name,
            ':geojson' : geojson,
//            ':customerId' : customerId,
        }
    }).promise()
        .then(data => {
            responseWithSimpleMessage(200, "The Floorplan has been updated.", callback);
            return;
        })
        .catch(err => {
            callback(err, null);
            return;
        });

};


function responseWithSimpleMessage(statusCode, message, callback) {
    const response = {
        statusCode: statusCode,
        isBase64Encoded: false,
        body: JSON.stringify({"message": message}),
        headers: {
            "Content-Type": "application/json"
        }
    }
    callback(null, response);
}
