import { DynamoDBClient, ScanCommand, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";

const region = "ap-northeast-1";
const tablename = "crowd-status";

let dynamocl = null;

async function dynamocl_init(env) {
    if (!dynamocl) {
        dynamocl = new DynamoDBClient({
            region: region,
            credentials: {
                accessKeyId: env.AWS_ACCESS_KEY_ID,
                secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
        });
    }
}

export async function crowd_data_get_all(env) {
    await dynamocl_init(env);
    return (await dynamocl.send(new ScanCommand({ TableName: tablename }))).Items;
}

export async function crowd_data_get_by_roomid(env, roomid) {
    await dynamocl_init(env);

    return (await dynamocl.send(new GetItemCommand({
        TableName: tablename,
        Key: {
            "roomid": { S: roomid }
        }
    }))).Item;
}


export async function crowd_data_update(env, roomid, status, updated_at = Date.now()) {
    await dynamocl_init(env);

    await dynamocl.send(new PutItemCommand({
        TableName: tablename,
        Item: {
            "roomid": { S: roomid },
            "status": { N: String(status) },
            "updated_at": { N: String(Number(updated_at)) }
        }
    }));
}