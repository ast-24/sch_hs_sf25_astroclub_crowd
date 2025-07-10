import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";

export async function handler_crowd_get(request, env, ctx) {
    let res = {};
    for (const item of (await (new DynamoDBClient({ credentials: fromEnv() })).send(new ScanCommand({ TableName: "crowd-status" }))).Items) {
        res[item.room_id.S] = {
            status: Number(item.status.N),
            updated_at: Number(item.updated_at.N)
        };
    }
    return new Response(JSON.stringify(res), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=30' // 30秒間キャッシュ
        }
    });
}
