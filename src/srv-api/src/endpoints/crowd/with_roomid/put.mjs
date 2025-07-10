import { crowd_data_update } from '../../../cmn/dynamoquery.mjs';

export async function handler_crowd_with_roomid_put(request, env, ctx) {
    try {
        const body = await request.json();
        await crowd_data_update(
            env,
            request.params.room_id,
            body.status,
            Date.now()
        );
        return new Response(null, { status: 201 });
    }
    catch (error) {
        console.error("[ERROR]", error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
