export async function handler_rooms_get(request, env, ctx) {
    try {
        /*
            DBのデータは
            {
                ":room_id": {
                    "name": "<教室名>",
                    "desc": "<教室の説明>",
                    "floor": <教室の階数>
                },
                ...
            }
            という形式になっている
            ※設定はAPI経由ではなく管理者がCloudflare Workers KVのコンソールから行う
        */
        if (!env.astroclub_sf25_db_minidata) {
            return new Response('KV binding not found', { status: 500 });
        }
        let rooms_data = await env.astroclub_sf25_db_minidata.get('rooms');
        if (!rooms_data) {
            return new Response('No rooms data found', { status: 404 });
        }
        // rooms_dataがJSON文字列の場合、パースして再度stringifyして返す
        let json;
        try {
            json = JSON.parse(rooms_data);
        } catch (e) {
            return new Response('Invalid rooms data (not JSON): ' + String(e), { status: 500 });
        }
        return new Response(JSON.stringify(json), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600' // 1時間キャッシュ(更新がほぼありえないので)
            }
        });
    } catch (error) {
        console.error("[ERROR]", error);
        return new Response('Internal Server Error', { status: 500 });
    }
}