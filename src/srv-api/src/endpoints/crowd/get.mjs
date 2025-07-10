import { crowd_data_get_all } from '../../cmn/dynamoquery.mjs';

export async function handler_crowd_get(request, env, ctx) {
    try {
        let resp = {};
        for (const item of await crowd_data_get_all(env)) {
            console.log(JSON.stringify(item));
            resp[item.roomid.S] = {
                status: Number(item.status.N),
                updated_at: Number(item.updated_at.N)
            };
        }
        return new Response(JSON.stringify(resp), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=30' // 30秒間キャッシュ
            }
        });
    }
    catch (error) {
        console.error("[ERROR]", error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
