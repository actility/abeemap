/* ******************************************************* */
/* AbeeMap_getResolvedMsg                                  */
/* ******************************************************* */

/* **************** */
/* Test Event ***** */
/* **************** */
/*
{
    "headers": {
        "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJTVUJTQ1JJQkVSOjEzMjgzOCJdLCJleHAiOjE1OTQ3OTUwOTcsImp0aSI6IjA2M2YxOGM4LTJmYTUtNGE4MS1iOTY5LWM4Y2U5MDFmYmY5ZCIsImNsaWVudF9pZCI6ImNvbW11bml0eS1hcGkvbm9yYmVydC5oZXJiZXJ0K2NvbW11bml0eUBhY3RpbGl0eS5jb20ifQ.cJCoHTZQtjGjfquCkDEw-O0fxhsA1ZoE0hvv8OQX--QRYIsiY1uSXdIDlSiI5hzniQu9Q90K9IZb5lR0aphSww"
    }
}
*/

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const TABLE = "AbeeMap_resolvedMsg";


exports.handler = (event, context, callback) => {

    let customerId;

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

    customerId = '100' + customerId;

    const devEUI = (event.queryStringParameters || {}).devEUI;
    const limit = (event.queryStringParameters || {}).limit || 50;

    const params = {
        TableName: TABLE,
        ScanIndexForward: false,
        Limit: limit
    };

    if (devEUI) {
        params.KeyConditionExpression = "#devEUI = :devEUI";
        params.FilterExpression = "#custId = :custId";
        params.ExpressionAttributeNames = { "#devEUI": "deviceEUI", "#custId": "customerId"};
        params.ExpressionAttributeValues = { ":devEUI": devEUI, ":custId": customerId };
    } else {
        params.IndexName = "CustomerIdIndex";
        params.KeyConditionExpression = "#custId = :custId";
        params.ExpressionAttributeNames = { "#custId": "customerId" };
        params.ExpressionAttributeValues = { ":custId": customerId };
    }

    console.log(JSON.stringify(params, null, 2));

    dynamo.query(params, function(err, data) {
        if (err) {
            callback(err, null);
        } else {
            const response = {
                statusCode: 200,
                isBase64Encoded: false,
                body: JSON.stringify(data.Items, null, 2),
                headers: {
                    "Content-Type": "application/json"
                }
            };
            callback(null, response);
            return;
        }
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
