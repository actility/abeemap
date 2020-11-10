/* ******************************************************* */
/* AbeeMap_getBleBeacons                                   */
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

const TABLE = "AbeeMap_bleBeacons";


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

    dynamo.query({
        TableName: TABLE,
        IndexName: "CustomerIdIndex",
        KeyConditionExpression: "#custId = :custId",
        ExpressionAttributeNames: { "#custId": "customerId" },
        ExpressionAttributeValues: { ":custId": customerId }
    }).promise()
        .then(data => {
            // console.log(data.Items);
            const response = {
                statusCode: 200,
                isBase64Encoded: false,
                body: JSON.stringify(data.Items),
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Credentials": true,
                    "Access-Control-Expose-Headers": "*",
                    "Access-Control-Max-Age": 600,
                }
            };
            callback(null, response);
            return;
        })
        .catch(err => {
            callback(err, null);
            return
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
