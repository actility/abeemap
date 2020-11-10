/* ******************************************************* */
/* AbeeMap_addBleBeacon                                    */
/* ******************************************************* */

/* **************** */
/* Test Event ***** */
/* **************** */
/*
{
    "headers": {
        "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJTVUJTQ1JJQkVSOjEzMjgzOCJdLCJleHAiOjE1OTQ3OTUwOTcsImp0aSI6IjA2M2YxOGM4LTJmYTUtNGE4MS1iOTY5LWM4Y2U5MDFmYmY5ZCIsImNsaWVudF9pZCI6ImNvbW11bml0eS1hcGkvbm9yYmVydC5oZXJiZXJ0K2NvbW11bml0eUBhY3RpbGl0eS5jb20ifQ.cJCoHTZQtjGjfquCkDEw-O0fxhsA1ZoE0hvv8OQX--QRYIsiY1uSXdIDlSiI5hzniQu9Q90K9IZb5lR0aphSww"
    },
    "body": "{\"bssid\":\"aa:bb:cc:dd:ee:ff\",\"coordinates\": [20.453951,44.816514],,\"name\":\"Added Test Beacon!\"}"
}
*/

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const TABLE = "AbeeMap_bleBeacons";

exports.handler = (event, context, callback) => {

    let customerId, item;

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
        item = JSON.parse(event.body);
    } catch (err) {
        responseWithSimpleMessage(400, "Invalid request body!", callback);
        return;
    }

    item.customerId = customerId;

    dynamo.put({
        TableName: TABLE,
        Item: item,
        ConditionExpression: 'attribute_not_exists(bssid)'
    }).promise()
        .then(data => {
            responseWithSimpleMessage(200, "The BLE Beacon has been added.", callback);
            return;
        })
        .catch(err => {
            if (err.code == 'ConditionalCheckFailedException') {
                responseWithSimpleMessage(400, "A BLE Beacon with this bssid already exists in the DB", callback);
                return;
            } else {
                callback(err, null);
                return
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
