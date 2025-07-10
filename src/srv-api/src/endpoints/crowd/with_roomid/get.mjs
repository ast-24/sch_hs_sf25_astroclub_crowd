import { crowd_data_get_by_roomid } from '../../../cmn/dynamoquery.mjs';

export async function handler_crowd_with_roomid_get(request, env, ctx) {
    try {
        const res = await crowd_data_get_by_roomid(env, request.params.room_id);
        const resp = {
            status: Number(res.status.N),
            updated_at: Number(res.updated_at.N)
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
