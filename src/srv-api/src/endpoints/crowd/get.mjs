import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

export async function handler_crowd_get(request, env, ctx) {
    try {
        let res = {};
        for (const item of (await (new DynamoDBClient({
            region: "ap-northeast-1", // 必要に応じて
            credentials: {
                accessKeyId: env.AWS_ACCESS_KEY_ID,
                secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
        })).send(new ScanCommand({ TableName: "crowd-status" }))).Items) {
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
    catch (error) {
        console.error("Error fetching crowd data:", error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
